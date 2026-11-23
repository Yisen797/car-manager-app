# 运营后台合规与安全说明

适用范围：`server/admin/` 运营后台及其接口。目标是满足“正规公司流程”的基本要求：
最小化收集、最小权限、可追溯、可响应、可审计。本文档同时列出上线前必须确认的事项。

## 1. 数据最小化

- 后台列表默认只展示运营所需字段：用户昵称、**脱敏手机号**、会员等级、积分、订单数、最近活跃。
- 完整手机号仅在 super 角色主动点击「查看完整手机号」时返回，且该动作**必写审计**。
- 后台不存储、不展示车主的身份证号、银行卡号、驾驶证照片等敏感信息；
  若业务数据中出现此类字段，导出与日志均按敏感字段过滤（`sanitizeDetail`）。
- 内部备注、隐私申请等后台自有数据与车主业务数据分表存放。
- 用户数据导出（`GET /api/admin/users/:id/export`）仅 super 可用，写审计，返回单用户数据。

## 2. PII 处理

| 场景 | 做法 |
|---|---|
| 列表/详情手机号 | `138****8000` 形式脱敏 |
| 审计日志 detail | 写入前递归删除 `password/passwd/secret/token/idcard/身份证/bankcard/银行卡` 等键；字符串中 11 位手机号自动脱敏 |
| 登录日志 | 只记录用户名、角色、IP、结果，**不记录密码** |
| 密码存储 | `scrypt` + 16 字节随机盐，不存明文/可逆密文 |
| 会话令牌 | 只存 SHA-256 哈希，8 小时过期，退出/改密/停用后失效 |
| 错误响应 | 统一 JSON，不返回 SQL、堆栈或内部路径 |

注意：`GET /api/admin/users/:id/export` 返回的是完整用户数据，属于合规导出动作，
必须由 super 在收到合法请求后执行；导出结果不应长期落地在个人终端。

## 3. 访问控制

- 独立管理员体系，不复用车主短信令牌。
- 四种角色：`super` / `ops` / `finance` / `support`，权限映射位于 `server/admin/auth.mjs`。
- 默认拒绝：接口未声明权限校验即不可访问；`support` 无法取消订单、无法查看审计与入驻审核。
- 登录失败限流：同 IP + 用户名 15 分钟 5 次，超限锁定 15 分钟，并记录 `admin.login_blocked`。
- 引导账号：`NODE_ENV=production` 且未配置 `CGJ_ADMIN_USER`/`CGJ_ADMIN_PASSWORD` 时，
  拒绝默认账号登录（返回 503）。
- 旧版 `x-admin-key` 兼容：内部映射为 super；production 未显式设置 `CGJ_ADMIN_KEY` 时禁用默认密钥。
  **正式环境必须设置强随机密钥，或停止使用兼容密钥。**
- 管理员停用后立即删除其全部会话；修改密码后全部会话失效。
- 后台页面响应头：CSP（nonce，无 `unsafe-inline`）、`X-Frame-Options: DENY`、
  `X-Content-Type-Options: nosniff`、`Referrer-Policy: no-referrer`、`Permissions-Policy`。

## 4. 审计留存

审计表：`admin_audit`（`actor, role, action, target_type, target_id, detail, ip, created_at`）。

已覆盖的动作：

- 登录成功 / 失败 / 限流、退出、改密
- 订单取消/退款、内部备注
- 入驻通过 / 驳回
- 发票开具
- 反馈状态流转
- 查看完整手机号、用户数据导出、隐私申请
- 管理员创建 / 启停
- 数据重置

规则：

- 审计接口**只读**，不提供删除或修改接口。
- 建议在线保留 **180 天**；如法规或合同要求更长，按更长期限执行。
- 到期清理由运维在维护窗口手工执行并先备份，例如：

  ```sql
  -- 先备份：sqlite3 car-manager.db ".backup 'audit-backup.db'"
  DELETE FROM admin_audit WHERE created_at < date('now', '-180 day');
  ```

  该操作不经后台接口，需双人复核并保留操作记录。
- 审计日志与业务库同库，建议纳入每日备份；备份文件按同等敏感级别保管。
- 时间字段使用服务器本地时间 `YYYY-MM-DD HH:MM`，跨时区部署时需统一服务器时区。

## 5. 用户数据权利（导出 / 删除）

- 后台提供「登记用户数据申请」：`POST /api/admin/users/:id/privacy-requests`
  - `type=export`：数据导出申请
  - `type=delete`：数据删除申请
  - 记录申请人、时间、原因，并写审计；`GET /api/admin/privacy-requests` 查看待办。
- 当前实现只**登记申请**，不自动删除数据（避免误删与级联风险）。
  **TODO（上线前确定）**：删除流程需人工复核，按以下顺序处理并留存记录：
  1. 核验请求人身份（手机号 + 验证码或线下材料）；
  2. 导出必要留存数据（财务凭证按法规保留期限）；
  3. 删除 `user_prefs`、`cars`、`orders`、`coupons`、`messages`、`points_log`、
     `redemptions`、`invoices`、`feedbacks`、`invite_records`、`merchant_apps`、
     `enterprise_apps`、`sessions` 中该用户数据；
  4. 将 `admin_privacy_requests.status` 标记为 `done`（需新增后台处理入口时再实现）。
- 数据导出结果仅用于响应本人请求，不得用于营销或二次分发。

## 6. 事件响应

发现异常（例如审计中出现大量 `admin.login_failed`、异常 `user.phone.reveal`、非工作时间的 `data.reset`）：

1. **止损**：在「账号管理」停用可疑账号（会话立即失效）；必要时修改 `CGJ_ADMIN_KEY` 并重启服务。
2. **取证**：导出 `admin_audit` 相关时间段记录与服务器访问日志，保持原始备份，不要修改。
3. **评估**：确认涉及的用户数据范围、是否发生导出/删除、是否涉及支付或发票。
4. **通知**：按公司制度与适用法规，在要求时限内通知负责人/受影响用户/监管方。
5. **修复**：轮换管理员密码与兼容密钥；复核权限映射；补充限流与监控。
6. **复盘**：记录时间线、根因、改进项，更新本文档与上线检查清单。

建议监控告警：

- 单账号连续登录失败 ≥ 5 次；
- `user.phone.reveal` / `user.data.export` 频率异常；
- `data.reset`、`admin.create`、`admin.status` 等高风险动作；
- 非工作时间的管理端写操作。

## 7. 上线检查清单

- [ ] 设置 `NODE_ENV=production`
- [ ] 设置强随机 `CGJ_ADMIN_USER` / `CGJ_ADMIN_PASSWORD`（首次登录后立即改密）
- [ ] 设置强随机 `CGJ_ADMIN_KEY`，或确认旧兼容接口不再使用
- [ ] 设置 `CGJ_ALLOW_RESET=0`（生产禁止演示数据重置）
- [ ] 全站 HTTPS；`/admin` 仅对办公网/VPN 开放（Nginx IP 白名单）
- [ ] 确认 `GET /api/admin/overview` 等旧接口未被公网匿名访问（必须带密钥或 Bearer）
- [ ] 审计日志保留策略（180 天）与备份任务已配置
- [ ] 数据库文件权限最小化，备份加密
- [ ] 管理员账号按岗位分配，离岗即停用；至少保留两个 super（避免单点）
- [ ] 验证 `node server/admin/test.mjs` 与 `node server/test.mjs` 全部通过
- [ ] 抽查后台页面响应头：CSP / X-Frame-Options / nosniff / Referrer-Policy
- [ ] 确认日志中不含密码、完整身份证号、完整银行卡号
- [ ] 隐私申请处理人与流程已指定，响应时限已明确
- [ ] 事件响应联系人与升级路径已确认
