# 车管家 · 交接文档（新对话先读这里）

> 最后更新：2026-11-04 · v1.9.0 · 本次提交（`git log -1`）· 基线 v1.8.1 `142f4e4`
> 项目路径：`<项目根目录>`

## 一句话

uni-app (Vue3) 全品类汽车服务平台，**41 个页面**，支持 H5 / 微信小程序 / 安卓 APK 三端。
v1.7.0 起自带**零依赖后端**（Node 内置 HTTP + SQLite），前端默认仍是纯本地演示，
构建时配置 `VITE_API_BASE` 即启用真实账号、云端持久化与多端同步。
v1.8.0 增加洗车美容与高德 POI 附近门店，运营后台升级为「管理员登录 + 角色权限 + 全量审计」。

## 当前状态

| 项目 | 值 |
|---|---|
| 应用版本 | `1.9.0`（`version.json`） |
| versionCode | `11` |
| 数据版本 | `schemaVersion 6`（本地结构未变） |
| Git 基线 | v1.8.1 `142f4e4`；v1.9.0 本提交（`git log -1`） |
| 产物 | `车管家.apk`（约 3.2 MB，已签名，纯本地模式） |
| 构建 | H5 / 微信小程序通过 |
| 测试 | `flow.mjs` 12 + `flow-booking.mjs` 11 + `flow-booking-map.mjs` 8 + `flow-nearby.mjs` 10 + `flow-merchant-loc.mjs` 12 + `flow-car-plate.mjs` 12 + 邀请 57 + 邀请 E2E 26 + `server/test.mjs` 49 + `server/admin/test.mjs` 69 + `cloud-e2e.mjs` 12，全部 PASS |

## 快速开始

```bash
cd <项目根目录>
npm install                       # 已安装可跳过
npm run dev:h5                    # http://localhost:5173（纯本地）
npm run build:h5
npm run build:mp-weixin           # 产物 dist/build/mp-weixin
bash tools/build-apk.sh           # 约 40 秒，依赖 %ANDROID_BUILD% 工具链

# 后端（可选）
node server/index.mjs             # http://localhost:8787，运营后台 /admin
VITE_API_BASE=http://localhost:8787 npm run dev:h5
node server/test.mjs              # 后端 49 项自测（临时库）
node server/admin/test.mjs        # 运营后台 69 项自测

# 真实附近门店（免费 Key）
CGJ_AMAP_KEY=你的高德Web服务Key node server/index.mjs
# 生产后台账号（不设置则开发默认 admin/cheguanjia-admin）
CGJ_ADMIN_USER=admin CGJ_ADMIN_PASSWORD='强密码' NODE_ENV=production node server/index.mjs
```

自测：

```bash
node tools/static-server.mjs dist/build/h5 5173
node tools/flow.mjs
node tools/flow-booking.mjs
node tools/flow-nearby.mjs
node tools/flow-merchant-loc.mjs
node tools/flow-booking-map.mjs
node tools/flow-car-plate.mjs
node server/invite/test.mjs
node tools/flow-invite-qr.mjs   # 需先构建 VITE_API_BASE 版本
node server/test.mjs
node server/admin/test.mjs

# 云端模式（顺序很重要）
node server/index.mjs
VITE_API_BASE=http://127.0.0.1:8787 npm run build:h5
node tools/flow-booking.mjs       # 先产生跨设备数据
node tools/cloud-e2e.mjs          # 再用全新浏览器验证云端恢复
```

> 测试脚本会自动跳过「首次启动定位权限」弹窗，不要删那段逻辑，否则会遮挡自动化点击。

## 必读代码地图

| 文件 | 作用 |
|---|---|
| `src/store/index.js` | ★ 全局状态、订单状态机、登录、商家、积分、邀请、版本迁移、存储锁、云同步钩子 |
| `src/data/mock.js` | ★ 服务、会员档位与价格、评价、Banner |
| `src/data/seed.mjs` | ★ 前后端共用种子数据（商家/订单/车辆/券/站内信），`.mjs` 保证 Node 可直接 import |
| `src/data/cities.js` | 全国 370 城（自动生成，勿手改） |
| `src/data/points.js` | 积分商城商品 |
| `src/data/invite.js` | 邀请阶梯奖励 |
| `src/config/api.js` | 后端地址 `VITE_API_BASE`，留空 = 纯本地 |
| `src/api/client.js` | uni.request 封装、令牌存取 |
| `src/api/sync.js` | ★ 云端同步：登录拉取、防抖推送、409 重拉、离线重试、版本号持久化 |
| `src/api/integrations.js` | 附近门店请求（后端代理，失败回退演示数据） |
| `src/data/nearby.mjs` | 门店分类、服务映射、演示数据（前后端共用） |
| `src/pages/nearby/index.vue` | 附近门店页：定位、分类、导航、拨号、平台预约 |
| `src/config/invite.js` | 邀请落地地址、邀请码、设备标识、本地绑定登记 |
| `src/api/invite.js` | 邀请参数捕获、登录后绑定、/me /bind /claim |
| `src/utils/qrcode.js` | 零依赖 QR 编码器（离线生成邀请二维码） |
| `src/components/InviteQr.vue` | 邀请二维码组件（下载/保存/预览） |
| `src/config/version.js` | 读取根目录 `version.json` |
| `src/utils/pricing.js` | 会员折扣、优惠券、积分计算（**目前仍在前端**） |
| `src/utils/location.js` | 系统定位 + 最近城市匹配（不依赖地图 Key） |
| `src/utils/permissions.js` | 首次启动权限标记 |
| `src/App.vue` | 登录门禁、高版本数据锁定、首次权限引导、安卓返回键、启动时云端恢复 |
| `server/index.mjs` | 后端入口与路由、CORS；挂载运营后台与 POI 集成 |
| `server/db.mjs` | 建表、种子账号、状态读写（15 张表） |
| `server/auth.mjs` | 短信验证码、会话令牌、管理密钥 |
| `server/integrations/amap.mjs` | 高德 POI 周边搜索、归一化、缓存、演示降级 |
| `server/admin/index.mjs` | ★ 后台挂载：CSP 页面、接口分发、错误兜底 |
| `server/admin/auth.mjs` | 管理员 scrypt 密码、会话、RBAC、登录限流、旧密钥兼容 |
| `server/admin/routes.mjs` | ★ 后台接口：概览/订单/入驻/发票/反馈/用户/审计/隐私申请 |
| `server/admin/db.mjs` | 后台表懒创建、审计脱敏、分页、revision 递增 |
| `server/admin/README.md` | 后台启动、环境变量、角色、接口清单 |
| `server/admin/COMPLIANCE.md` | 合规：数据最小化、PII、访问控制、审计留存、删除流程、上线清单 |
| `server/admin.html` | 运营后台单页（登录 + 6 个业务模块） |
| `server/test.mjs` | 后端端到端自测 |
| `server/admin/test.mjs` | 运营后台端到端自测 |
| `server/invite/` | 邀请码/绑定/领奖/反作弊/审计（独立表，懒创建） |
| `tools/flow-invite-qr.mjs` | 邀请二维码端到端验证（绑定一次、重复不计数） |
| `tools/flow-nearby.mjs` | 附近门店端到端验证（宫格、演示数据、定位、分类、详情入口） |
| `tools/cloud-e2e.mjs` | 云端跨设备验证（全新浏览器恢复订单/评价/入驻/令牌） |
| `tools/build-apk.sh` | 打 APK，自动同步 version.json 到 build.gradle |

## 已完成功能

- **登录**：手机号验证码（模拟）、微信一键登录（模拟）、登录门禁、退出
- **预约下单**：车辆、门店、日期时段、到店/上门、联系人、优惠券、积分抵扣
- **订单**：待支付→待接单→服务中→待评价→已完成，取消/退款（模拟）
- **收银台**：微信/到店支付（模拟）
- **评价**：星级+标签+文字，商家详情展示
- **优惠券**：领券中心、卡包、下单抵扣、支付核销、过期
- **会员权益**：按档位真实计价、每月免费代驾/跑腿、积分返利
- **积分商城**：6 种券兑换、积分明细、兑换记录
- **邀请拉新**：阶梯奖励、进度、记录、领取；「我的」页独立入口
- **商家端**：独立商家登录、工作台/订单/店铺/我的、接单/完成、账号升级、动态商家
- **定位/城市**：全国 370 城、系统定位、按城市筛商家、未开通城市空态
- **洗车美容**：新增为一级服务（首页宫格），可预约平台商家；「附近门店」用高德 POI 查周边
- **附近门店**：洗车 / 维修 / 救援 / 充电 / 加油 / 停车，定位、距离、电话、导航、平台预约；
  未配置高德 Key 时自动使用演示数据
- **商家自动标点**：入驻时可「搜索门店」（高德选店自动填地址/电话/坐标）、
  「自动定位 + 反查地址」、「小程序地图选点」，只填地址时提交自动转坐标；
  坐标随申请→审核→商家记录流转，顾客端附近门店优先展示平台认证商家
- **新增车辆车牌**：省份弹层选择 + 号段输入，自动大写/格式化/粘贴识别，编辑回显
- **邀请二维码**：本地生成可分享二维码（只含邀请码）；被邀请人只能绑定一次，
  重复扫码不重复计数；防自邀、领奖幂等、设备/IP 限流、审计脱敏；单层级合规规则
- **预约页地图选店**：小程序原生 `<map>` 显示已定位门店、点标记选店；
  H5/App 显示门店定位卡 + 「高德地图查看」「附近门店列表」；选择器下方显示距离
- **出行**：高德 + 腾讯统一「聚合叫车」入口（弹层选择）
- **其他**：消息中心、发票、客服/反馈、企业认证、车辆证件、搜索增强、活动 Banner
- **版本管理**：语义化版本 + 数据迁移 + 旧版本数据保护
- **v1.7.0 后端**：真实账号/会话、SQLite 15 表、整包同步 + revision 乐观锁、
  商家/券模板查询、演示数据重置；前端可选云端模式，离线自动回退
- **v1.8.0 运营后台**：管理员登录（scrypt/8 小时会话/登录限流）、super/ops/finance/support
  四角色、全量审计（只读+脱敏）、订单取消退款、入驻审核、发票、反馈、用户脱敏、
  隐私导出/删除申请、CSP 与安全头、合规章程（`server/admin/COMPLIANCE.md`）

## 关键参数（不要随意改）

- **会员价格**：普通 29 元/年、尊享 99 元/年、企业 VIP 299 元/年
- **商家价格**：免费 / 银牌 299 / 金牌 999（每年）
- **会员折扣**：普通 95 折（保养 9 折）、尊享 9 折（保养 7 折）、企业 88 折（保养 7 折）
- **积分**：100 分抵 1 元，最多抵实付 20%；支付按实付 1:1 返积分
- **邀请奖励**：1 人 = 20 元券 + 200 分；3 人 = 50 元保养券 + 500 分；5 人 = 99 元尊享会员年卡
- **数据版本**：6（`MIGRATIONS` 已有 2→3、3→4、4→5、5→6）
- **云同步**：防抖 800ms、`revision` 乐观锁、令牌 30 天、后端默认端口 8787
- **运营后台**：开发默认 `admin / cheguanjia-admin`；生产必须设 `CGJ_ADMIN_USER`/`CGJ_ADMIN_PASSWORD`；
  会话 8 小时、登录失败 15 分钟 5 次限流、审计建议留存 180 天
- **高德 POI**：个人非商业 5000 次/月、缓存 10 分钟、每 IP 30 次/分钟；Key 只放后端

## 第三方接入状态（2026-11-02）

| 服务 | 可接第三方 | 门槛 | 状态 |
|---|---|---|---|
| 洗车 / 维修 / 救援 / 充电 / 加油 / 停车 | 高德 Web 服务 POI | 免费 Key，个人 5000 次/月 | ✅ 已实现（`CGJ_AMAP_KEY`） |
| 打车 | 高德 H5 + 腾讯小程序 | 渠道号 | ✅ 已有，补 channelId |
| 违章查询 | 聚合数据 / 极速数据 / 快递100 | 付费，约 9 元/100 次起 | ⏳ 未接（查询可接，代缴需持牌） |
| 代驾 | 滴滴代驾商户开放平台 / e代驾 | 企业商户 | ⏳ 需资质 |
| 同城跑腿 | 顺丰同城 / 闪送 / 达达 | 企业认证 + 预充值 | ⏳ 需资质 |
| 车险比价 | 上海保交所 / 优保联 | 保险中介牌照 | ⛔ 无牌照 |
| 二手车估值 / 回收 | 车300 / 精真估 / 天天拍车 | B 端签约 | ⏳ 需签约 |
| 新车比价 | 汽车之家 / 易车 | 无公开 API | ⛔ 只能留资 |
| 过户 / 年审 | 交管 / 政务 | 无公开 API | ⛔ 人工代办 |

详细方案与价格见交付对话记录；接入原则：**Key 只放后端环境变量，前端不直连第三方**。

## 演示边界（用户已知并接受）

- 支付、短信、微信授权、真实开票、图片上传**仍为模拟**；商家审核/发票/反馈已有后台运营流程
- 没有真实商家接单：订单停在「待接单」，订单详情、商家端或运营后台可操作
- 定位是**城市级**（系统坐标 + 本地最近城市），没有街道级反查，详细地址手填
- 高德 POI 为可选接入：未配置 `CGJ_AMAP_KEY` 时附近门店使用演示数据；
  H5 定位用 `navigator.geolocation`（`uni.getLocation` 在 H5 构建中不可用）
- **后端默认不启用**：APK 与默认 H5 仍把数据存在本机 Storage（键 `car_manager_state`）
- 启用后端后，业务规则（折扣/券/积分/邀请）仍在前端计算，后端只做账号、持久化与同步；
  多端并发时整包覆盖、以云端为准（`revision` 冲突会重拉）

## 重要踩坑

- **中文路径**：Android 构建必须用英文路径，`build-apk.sh` 会同步到 `%ANDROID_BUILD%\carapp`
- **版本锁**：数据 `schemaVersion` 高于 App 时会锁定存储并弹窗，禁止覆盖；可清除数据恢复
- **H5 定位**：必须用浏览器 `navigator.geolocation`；`uni.getLocation` 在 H5 不是函数
- **测试点击**：`clickText` 必须限定在 `uni-page-body` 内，否则会匹配 `<title>登录</title>`
- **登录页验证码**：不要用 toast 提示，会挡住登录按钮，已改为页内提示
- **同文件并行**：多 agent 并行只能拆不同文件；store/pages.json 这类共享文件必须串行
- **Node 导入前端数据**：项目根 `package.json` 没有 `"type": "module"`，`src/data/*.js`
  在 Node 里会被当 CommonJS；因此共用种子数据放在 `src/data/seed.mjs`
- **云端测试顺序**：必须先用 `VITE_API_BASE` 构建 H5，再跑 `flow-booking`，最后 `cloud-e2e`；
  默认构建不会发任何网络请求
- **uni Storage 格式**：H5 下 localStorage 存的是 `{type,data}` 包装，直接 `JSON.parse` 拿不到状态
- **后端数据不入库**：`server/data/` 与 `*.db` 已 gitignore，含手机号等隐私
- **后台账号**：开发默认 `admin / cheguanjia-admin`；`NODE_ENV=production` 未设置
  `CGJ_ADMIN_USER`/`CGJ_ADMIN_PASSWORD` 会拒绝默认账号登录；旧 `x-admin-key` 兼容但等价 super
- **后台入口**：`/` 与 `/admin.html` 统一 302 到 `/admin`，由 `server/admin/index.mjs`
  返回带 CSP nonce 与安全头的页面；不要再在 `server/index.mjs` 里直接读 `admin.html`
- **后台改订单**：必须同步 `user_prefs.revision+1`，否则客户端下次整包推送会覆盖；模块已处理
- **审计**：只读、无删除接口；写入前脱敏，不要把密码/身份证/完整手机号写进 detail
- **高德 Key 类型**：必须创建「Web 服务」平台的 Key（不是 JS API/Android Key），否则 POI 接口报 10001
- **高德配额**：个人非商业 5000 次/月（认证起 1 年）；服务端已做 10 分钟缓存 + 每 IP 30 次/分钟限流
- **高德坐标**：POI 返回 GCJ-02；H5 导航跳 `uri.amap.com`，App 用 `uni.openLocation`，不要再转坐标系
- **邀请二维码**：小程序/App 的 `INVITE_LANDING_URL` 仍是占位地址，上线前必须替换正式短链/小程序码
- **邀请防重复**：服务端 `invite_bindings.invitee_user_id UNIQUE`；不要只靠前端 localStorage 判断
- **邀请测试**：`flow-invite-qr` 需要先 `VITE_API_BASE=http://127.0.0.1:18787 npm run build:h5`，跑完再 `npm run build:h5` 恢复纯本地产物
- **演示降级**：未配置 `CGJ_AMAP_KEY` 或上游失败时返回 `src/data/nearby.mjs` 演示数据，页面显示提示
- **商家坐标**：存 `lng`/`lat`（高德 GCJ-02），随入驻申请 → 审核 → `dynamicMerchants`；
  历史申请可能为空，商家可在「店铺管理 → 自动定位」补点
- **坐标 null 坑**：`Number(null) === 0`，转换坐标必须显式判空（store 用 `coordOrNull`）
- **附近门店排序**：平台商家按 `distanceKm` 排序并置顶；静态样例商家没有坐标，不会出现在附近列表
- **无 Key 也能入驻**：定位可拿 GPS 坐标，地址反查/店名搜索需高德 Key；提交不会因无 Key 被阻断
- **预约页地图**：小程序原生 `<map>` 免费、不需要 Key；H5/App **不要内嵌**高德/腾讯地图
  （商业授权），H5 用 `window.open` 高德 URI、App 用 `uni.openLocation`
- **地图 marker id**：用 `cityMerchants` 的下标，picker 和 marker 靠同一索引同步；
  调整门店列表顺序时要一起改
- **演示商家坐标**：`src/data/seed.mjs` 的 m1-m6 是北京示例坐标，其他城市不会展示；
  入驻商家坐标由商户自己定位生成

## 下一步建议

1. **业务规则下沉**：把下单计价、会员折扣、券核销、积分、邀请奖励、支付/退款改成
   服务端接口，前端只读展示（当前整包同步 + 前端计算只适合演示）
2. **真实短信 + 微信登录**：验证码服务商；小程序 `code2session` 换 openid；关闭演示验证码
3. **真实微信支付/退款/对账**（需要营业执照与商户号）
4. **地图可视化（已做免费版）**：小程序原生 `<map>`、H5/App 高德 URI/附近门店；
   若要在 H5/App 内嵌可拖动地图，需评估高德商业授权
5. **图片对象存储**（证件、门店照片）；当前图片只存本地路径
6. **商家结算 + 客服工单**（后台已有订单/入驻/发票/反馈/审计，结算与工单仍未做）；
   后台多实例部署时把登录限流换成共享存储
7. **上线资质**：营业执照、小程序类目、ICP/APP 备案、软著、隐私合规
8. **邀请活动上线**：配置正式短链/小程序码；接入实名认证与设备指纹风控；
   活动规则做法务审核；奖励发放对账与异常告警

## 记忆文件

长期记忆：`（项目内部记忆文件）`
新对话如未自动加载记忆，直接读本文件即可完全接手。
