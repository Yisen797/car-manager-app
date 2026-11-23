# 车管家后端（Node 内置 HTTP + SQLite）

零第三方依赖：只用 Node 内置的 `node:http`、`node:sqlite`、`node:crypto`。
需要 **Node >= 22.5**（本项目开发环境为 Node 24）。

## 启动

```bash
# 在项目根目录
node server/index.mjs
# 或
cd server && npm start
```

默认地址 `http://0.0.0.0:8787`，管理端 `http://localhost:8787/admin`，
数据库文件 `server/data/car-manager.db`（首次启动自动建表并写入平台商家种子数据）。

运营后台（登录、角色权限、审计日志、订单/入驻/发票/反馈处理）见
[`server/admin/README.md`](admin/README.md)，合规说明见 [`server/admin/COMPLIANCE.md`](admin/COMPLIANCE.md)。

环境变量：

| 变量 | 默认值 | 说明 |
|---|---|---|
| `PORT` | `8787` | 监听端口 |
| `CGJ_HOST` | `0.0.0.0` | 监听地址 |
| `CGJ_DATA_DIR` | `server/data` | 数据目录 |
| `CGJ_DB` | `<DATA_DIR>/car-manager.db` | SQLite 文件完整路径 |
| `CGJ_DEV_SMS` | `1` | `0` 关闭演示验证码（改为随机码，接口不回传） |
| `CGJ_ADMIN_KEY` | `cheguanjia-admin` | 管理端密钥，**正式环境必须修改** |
| `CGJ_ALLOW_RESET` | `1` | `0` 关闭 `/api/admin/reset` |
| `CGJ_AMAP_KEY` | 空 | 高德 **Web 服务** Key；配置后附近门店使用实时 POI 数据 |
| `CGJ_INVITE_DAILY_LIMIT` | `50` | 每个邀请人每日计入的邀请上限 |
| `CGJ_INVITE_MONTHLY_LIMIT` | `500` | 每个邀请人每月计入的邀请上限 |
| `CGJ_INVITE_IP_HOURLY` | `20` | 同一 IP 每小时绑定次数上限 |
| `CGJ_INVITE_DEVICE_HOURLY` | `5` | 同一设备每小时绑定次数上限 |
| `CGJ_QUIET` | — | `1` 关闭请求日志 |

## 自测

```bash
node server/test.mjs          # 主接口 49 项
node server/invite/test.mjs   # 邀请 57 项
node server/admin/test.mjs    # 运营后台 69 项
```

会启动一个临时实例（临时数据库 + 随机端口），覆盖登录、种子数据、状态读写、
乐观并发、多端同步、账号隔离、退出登录、管理端与重置，结束后自动清理。

## 前端接入

前端默认是**纯本地模式**（数据只存本机 Storage），构建时传入 `VITE_API_BASE` 即启用云端同步：

```bash
# 开发（后端先启动）
VITE_API_BASE=http://localhost:8787 npm run dev:h5

# 构建 H5
VITE_API_BASE=http://192.168.1.10:8787 npm run build:h5
```

行为：

- 登录时向 `POST /api/auth/login` 换取令牌，随后拉取云端状态覆盖本地（首次登录服务端会写入演示种子数据）
- 之后每次本地状态变更（`saveState`）防抖 800ms 推送到 `PUT /api/state`
- 服务端用 `revision` 做乐观并发：冲突返回 409，客户端自动重新拉取，**以云端为准**
- 后端不可达时自动退回本地模式，恢复正常后继续同步
- 不配置 `VITE_API_BASE` 时，行为与 v1.6.0 完全一致（无任何网络请求）

> 令牌存在 `car_manager_token`（uni Storage）。退出登录会清除令牌。

分端注意：

- **微信小程序**：需要在公众平台把后端域名加入 `request` 合法域名（必须是 HTTPS）
- **安卓 APK**：Capacitor WebView 默认只允许 HTTPS 明文例外很少，正式接入请用 HTTPS 域名
- **H5**：后端已开启 CORS；生产建议前端与后端同域由 Nginx 反代 `/api`

## 接口

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/health` | 健康检查 |
| POST | `/api/auth/sms` | 发送验证码，body `{phone}` |
| POST | `/api/auth/login` | 登录/注册，body `{phone, code}` → `{token, state}` |
| POST | `/api/auth/wechat` | 演示微信登录，body `{phone?}` |
| POST | `/api/auth/logout` | 注销当前令牌 |
| GET | `/api/me` | 当前用户与数据版本 |
| GET | `/api/state` | 当前用户完整状态（含 `revision`） |
| PUT | `/api/state` | 整包同步，body `{state, baseRevision}`；冲突返回 409 |
| GET | `/api/merchants?city=` | 商家列表 |
| GET | `/api/coupon-templates` | 优惠券模板 |
| GET | `/api/poi/nearby?category=&lng=&lat=&radius=&page=&size=` | 附近门店（高德 POI 代理，无 Key 时返回演示数据） |
| GET | `/api/poi/search?keyword=&city=` | 门店关键字搜索（商户入驻定位） |
| GET | `/api/geo/reverse?lng=&lat=` | 坐标 → 地址（商户自动定位后回填） |
| GET | `/api/geo/code?address=&city=` | 地址 → 坐标（商户只填地址时自动补点） |
| GET | `/api/integrations` | 第三方集成配置状态 |
| GET | `/api/invite/check?code=` | 邀请码是否有效（公开，不返回用户信息） |
| GET | `/api/invite/me` | 邀请码/人数/记录/已领取/已绑定邀请人/上限用量 |
| POST | `/api/invite/bind` | 绑定邀请人（幂等；同一被邀请人只算一次） |
| POST | `/api/invite/claim` | 领取阶梯奖励（幂等） |
| GET | `/api/admin/overview` | 管理端统计（需 `x-admin-key`） |
| GET | `/api/admin/{users\|orders\|merchants\|applications}` | 管理端列表（需密钥） |
| POST | `/api/admin/reset` | 清空演示数据（需密钥） |

鉴权方式：`Authorization: Bearer <token>`，令牌 30 天有效。

## 数据表

`users`、`user_prefs`、`cars`、`orders`、`coupons`、`merchant_apps`、`enterprise_apps`、
`merchants`、`messages`、`points_log`、`redemptions`、`invoices`、`feedbacks`、
`invite_records`、`sessions`。

每张业务表保留关键检索列（状态、金额、时间、城市等）+ `data_json` 完整对象，
这样前端数据结构演进时不需要频繁改表。平台样例商家与用户入驻商家通过 `owner_user_id` 区分。

## 邀请活动（v1.9.0）

- 二维码由前端本地生成，内容为邀请链接 + 随机邀请码（`CG` + 8 位），不含手机号
- 服务端表：`invite_codes`、`invite_bindings`（`invitee_user_id UNIQUE`）、
  `invite_claims`（`(user_id, reward_id) UNIQUE`）、`invite_audit`，在本模块内懒创建
- 规则：一个被邀请人只能绑定一个邀请人；不能自邀；重复扫码/登录不计数；
  领奖幂等；设备/IP 限流；邀请人每日/每月上限；审计脱敏
- 合规：单层级邀请（不做多级返佣）、18 周岁+实名手机号、奖励不可提现、
  税费/隐私说明、规则调整提前 7 天公示
- 正式上线需把 `src/config/invite.js` 的 `INVITE_LANDING_URL`（或构建变量
  `VITE_INVITE_LANDING_URL`）替换为正式短链/小程序码地址

## 第三方集成（免费优先）

### 高德 POI 附近门店

- **申请**：高德开放平台控制台 → 个人/企业实名认证 → 创建应用 → 添加 Key，服务平台选 **Web 服务**
- **免费额度**：个人非商业 5000 次/月（认证起 1 年）、企业 50000 次/月；超出约 30 元/万次（以控制台为准）
- **配置**：`CGJ_AMAP_KEY=你的Key node server/index.mjs`
- **用途**：
  - 顾客端：洗车 / 维修 / 救援 / 充电 / 加油 / 停车场周边搜索（`pages/nearby`）
  - 商家端：入驻时按店名搜索门店、自动定位反查地址、只填地址时自动转坐标
- **缓存与限流**：同分类 + 坐标缓存 10 分钟；每 IP 30 次/分钟
- **安全**：Key 只在后端，前端只调用 `/api/poi/nearby`；建议在高德控制台绑定服务器 IP 白名单
- **降级**：未配置 Key 或上游失败时，自动返回 `src/data/nearby.mjs` 的演示数据，前端显示"演示数据"提示
- **合规**：页面标注"门店数据由高德地图提供"，仅做信息查询与导航，不代收费用

### 暂未接入（需付费或资质）

- **违章查询**：聚合数据等付费接口（约 9 元/100 次起，10 次免费试用），需车牌 + 车架号 + 发动机号；代缴需持牌服务商合作
- **同城跑腿**：顺丰同城 / 闪送 / 达达开放平台，需企业认证、店铺、预充值
- **代驾**：滴滴代驾商户开放平台 / e代驾，需企业商户资质
- **车险比价**：需保险中介牌照或持牌机构授权
- **二手车估值**：车300 / 精真估，需 B 端签约
- 完整对比见项目根目录 `HANDOFF.md` 的「第三方接入能力总表」

## 部署示例（单机）

```bash
# 1. 拷贝项目到服务器（或用 git）
# 2. 启动（建议用 systemd 托管）
CGJ_ADMIN_KEY='换成强随机密钥' PORT=8787 node server/index.mjs
```

Nginx 反向代理（HTTPS 由证书负责）：

```nginx
location /api/ {
    proxy_pass http://127.0.0.1:8787;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
location = /admin {
    proxy_pass http://127.0.0.1:8787;
}
```

## 当前边界（下一阶段）

- 业务规则（会员折扣、优惠券核销、积分、邀请奖励）仍在前端计算，后端整包持久化；
  下一阶段应把关键规则（下单、支付、核销、退款）下沉为服务端接口，前端只读展示
- 验证码为演示模式；接入真实短信服务商后设置 `CGJ_DEV_SMS=0`
- 支付为模拟，没有接入微信支付/退款/对账
- 没有限流、风控、审计日志；正式上线前需补齐
- 单进程 SQLite，适合早期用户量；更大规模应迁移到 PostgreSQL/MySQL
