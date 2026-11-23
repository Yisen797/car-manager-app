# 运营后台（server/admin）

车管家运营后台：独立管理员体系、角色权限、全量操作审计、订单/商家/发票/反馈运营。
零第三方依赖，仅使用 Node 内置模块（`node:http`、`node:sqlite`、`node:crypto`），
Node >= 22.5（本机 Node 24）。

## 启动

```bash
# 项目根目录
node server/index.mjs

# 后台页面
http://localhost:8787/admin
```

后台表（`admin_users`、`admin_sessions`、`admin_audit`、`admin_order_notes`、
`admin_privacy_requests`）由本模块在首次请求时懒创建，**不修改 `server/db.mjs`**。

## 环境变量

| 变量 | 默认值 | 说明 |
|---|---|---|
| `CGJ_ADMIN_USER` | — | 引导管理员用户名 |
| `CGJ_ADMIN_PASSWORD` | — | 引导管理员密码 |
| `CGJ_ADMIN_KEY` | `cheguanjia-admin` | 旧版 `x-admin-key` 兼容密钥（用于旧脚本 / server/test.mjs） |
| `NODE_ENV` | — | 设为 `production` 时：未配置引导账号则拒绝默认账号登录；未设置 `CGJ_ADMIN_KEY` 时禁用默认兼容密钥 |
| `CGJ_ALLOW_RESET` | `1` | `0` 关闭 `/api/admin/reset` |
| `CGJ_QUIET` | — | `1` 关闭请求/错误日志 |

### 引导账号规则

1. 同时设置 `CGJ_ADMIN_USER` 与 `CGJ_ADMIN_PASSWORD`：首次用这组账号登录时自动创建 `super` 管理员。
2. 两者都未设置且非 `production`：开发默认账号 `admin` / `cheguanjia-admin`，启动后控制台告警。
3. `NODE_ENV=production` 且未设置：登录返回 503，**禁止默认账号**。

引导账号只用于“首次创建”；创建后以数据库中的密码哈希为准。修改环境变量不会改变已存在账号的密码。

密码使用 `scrypt`（N=16384, r=8, p=1）+ 16 字节随机盐；会话令牌 32 字节随机，
数据库只存 SHA-256 哈希，8 小时过期。

## 角色与权限

| 角色 | 权限 |
|---|---|
| `super` 超级管理员 | 全部（含审计、账号管理、查看完整手机号、导出/删除申请、数据重置） |
| `ops` 运营 | 订单读写/取消/备注、商家入驻审核、商家只读、用户只读 |
| `finance` 财务 | 订单只读/取消退款、发票开具、商家只读、用户只读 |
| `support` 客服 | 反馈处理、订单只读、用户只读 |

权限常量在 `server/admin/auth.mjs` 的 `ROLE_PERMS`。新增角色/权限时只需扩展该映射。

## 接口清单

所有接口返回 `{ ok: true, ... }` 或 `{ ok: false, error: { code, message } }`。
除登录外均需 `Authorization: Bearer <token>`。

### 登录与会话

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/admin/login` | `{username,password}` → `{token,expiresAt,user,permissions}` |
| GET | `/api/admin/session` | 当前管理员与权限 |
| POST | `/api/admin/logout` | 注销当前令牌 |
| POST | `/api/admin/password` | `{oldPassword,newPassword}`；改密后所有会话失效 |

同一 IP + 用户名 15 分钟内失败 5 次即锁定 15 分钟。

### 概览

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/admin/overview` | 用户/订单/GMV/商家/待审核 + 今日订单、今日成交、待开发票、待处理反馈、启用管理员 |

### 订单

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/admin/orders` | `page,pageSize,status,phone,orderNo,keyword`；返回 `total`、`sumAmount` |
| GET | `/api/admin/orders/:id` | `?userId=` 可选；订单、用户（脱敏）、车辆、时间线、内部备注 |
| POST | `/api/admin/orders/:id/cancel` | `{userId?,reason}`；仅 `pending/waiting`；已支付写“原路退回（模拟）” |
| POST | `/api/admin/orders/:id/notes` | `{userId?,note}` 内部备注（仅后台可见） |

取消/退款/备注与客户端 `cancelOrder` 规则一致，并递增该用户 `user_prefs.revision`，
客户端下次推送会收到 409 后自动拉取最新数据；同时写入站内信。

### 用户

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/admin/users` | `page,pageSize,keyword`；手机号默认脱敏 |
| GET | `/api/admin/users/:id` | 用户信息 + 订单/车辆/发票/反馈统计 |
| POST | `/api/admin/users/:id/reveal-phone` | 仅 super；查看完整手机号，写审计 |
| GET | `/api/admin/users/:id/export` | 仅 super；导出用户完整数据，写审计 |
| POST | `/api/admin/users/:id/privacy-requests` | 仅 super；登记 `{type:export\|delete, reason}` |
| GET | `/api/admin/privacy-requests` | 仅 super；隐私申请列表 |

### 商家入驻

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/admin/applications` | `page,pageSize,status,keyword`；附各状态计数 `counts` |
| POST | `/api/admin/applications/:id/approve` | `{userId}`；生成/更新 `merchants`、升级用户角色、递增 revision |
| POST | `/api/admin/applications/:id/reject` | `{userId,reason}`；原因至少 5 字 |
| GET | `/api/admin/merchants` | 商家列表（只读，兼容旧接口） |

`userId` 是 `merchant_apps` 复合主键的一部分。申请 ID 跨用户重复时接口返回 409，需显式传 `userId`。

### 发票 / 反馈

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/admin/invoices` | `page,pageSize,status,keyword` |
| POST | `/api/admin/invoices/:id/issue` | `{userId,invoiceNo?,remark?}`；`issuing → issued` |
| GET | `/api/admin/feedbacks` | `page,pageSize,status,type,keyword` |
| POST | `/api/admin/feedbacks/:id/status` | `{userId,status,reply?}`；仅 `pending→processing→resolved` |

### 审计 / 账号 / 重置

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/admin/audit` | `page,pageSize,action,actor,targetType,from,to`；只读 |
| GET | `/api/admin/operators` | 仅 super；管理员列表 |
| POST | `/api/admin/operators` | 仅 super；`{username,password,role,displayName}` |
| POST | `/api/admin/operators/:id/status` | 仅 super；`{status:active\|disabled}`，停用后会话立即失效 |
| POST | `/api/admin/reset` | 仅 super；清空车主业务数据（受 `CGJ_ALLOW_RESET` 控制） |

### 旧版兼容（x-admin-key）

以下接口继续支持 `x-admin-key: <CGJ_ADMIN_KEY>`（也支持 `?key=`），内部映射为 `super` 会话：

- `GET /api/admin/overview`
- `GET /api/admin/{users|orders|merchants|applications}`
- `POST /api/admin/reset`

兼容模式下用户列表返回完整手机号（保持旧行为）；Bearer 登录的新接口一律脱敏。
生产环境建议设置强随机 `CGJ_ADMIN_KEY` 或改用 Bearer；未设置时 production 下默认密钥被禁用。

## 文件结构

```
server/admin/
├── index.mjs      # 挂载入口：/admin 页面（CSP/安全头）、/api/admin 分发、错误兜底
├── auth.mjs       # scrypt 密码、会话令牌、角色权限、登录限流、兼容密钥
├── db.mjs         # 后台表懒创建、审计、备注、隐私申请、revision
├── routes.mjs     # 全部业务接口与 RBAC 校验
├── test.mjs       # 端到端自测（临时库 + 随机端口）
├── README.md      # 本文件
└── COMPLIANCE.md  # 合规与安全说明
```

## 自测

```bash
node server/admin/test.mjs   # 后台专项：登录、RBAC、审计、订单/审核/发票/反馈、兼容接口
node server/test.mjs         # 原后端全量测试（不应被后台改动影响）
```

两个测试都会启动临时实例、使用临时 SQLite、结束后清理，不影响开发数据。

## 维护说明

- **忘记密码**：用另一个 super 账号在「账号管理」重置；若唯一 super 丢失，可生成哈希后手工更新：

  ```bash
  node --input-type=module -e "import {hashPassword} from './server/admin/auth.mjs'; console.log(hashPassword('NewPass123'))"
  # 然后 UPDATE admin_users SET password_hash='<输出>' WHERE username='...';
  ```

  或删除该 `admin_users` 行后，用环境变量引导账号重新首次登录。
- **审计留存**：见 `COMPLIANCE.md`。审计表不提供删除接口，过期清理由运维按保留策略手工执行。
- **新增角色/权限**：改 `auth.mjs` 的 `ROLE_PERMS`；接口里用 `requirePerm(ctx, auth, 'xxx')` 校验。
- **新增后台页面模块**：在 `admin.html` 的 `NAV` / `VIEWS` 中追加配置与 `routes.mjs` 接口。
- **数据库**：所有查询均参数化；写操作使用 `BEGIN IMMEDIATE / COMMIT / ROLLBACK`（`withTx`）。
- **安全头**：`/admin` 返回 CSP（nonce，无 `unsafe-inline`）、`X-Frame-Options: DENY`、
  `X-Content-Type-Options: nosniff`、`Referrer-Policy: no-referrer`、`Permissions-Policy`。
