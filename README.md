# 车管家 · 全品类汽车综合服务平台

一套代码，同时产出 **手机 H5 App（现在就能在手机上测试）** 和 **微信小程序**。

- 技术栈：uni-app (Vue 3 + Vite)
- 当前形态：手机 H5（浏览器打开即用，可加到桌面当 App）
- 小程序：`npm run build:mp-weixin` 已可产出，导入微信开发者工具即可预览

---

## 一、快速开始

### 1. 手机测试（推荐先看这个）

```bash
npm install          # 首次
npm run dev:h5       # 启动开发服务器
```

启动后终端会打印 `Network: http://x.x.x.x:5173/`。

**手机和电脑连同一个 WiFi**，手机浏览器打开该地址即可。
把 `x.x.x.x` 换成电脑的局域网 IP 即可。

### 2. 微信小程序

```bash
npm run build:mp-weixin
```

产物在 `dist/build/mp-weixin/`，用**微信开发者工具**「导入项目」选择该目录。
正式发布前需要在 `src/manifest.json` 的 `mp-weixin.appid` 填入自己的小程序 AppID。

### 3. 打包 H5 上线

```bash
npm run build:h5     # 产物在 dist/build/h5/
```

### 4. 接入后端（可选，v1.7.0 新增）

仓库自带零依赖后端（Node 内置 HTTP + SQLite），默认不启用，App 仍可纯本地运行。

```bash
node server/index.mjs                       # 后端 http://localhost:8787，运营后台 /admin
VITE_API_BASE=http://localhost:8787 npm run dev:h5    # 前端走云端
node server/test.mjs                        # 后端 49 项自测
node server/admin/test.mjs                  # 运营后台 69 项自测
CGJ_AMAP_KEY=你的高德Web服务Key node server/index.mjs  # 启用真实附近门店
```

运营后台地址 `http://localhost:8787/admin`：开发默认 `admin / cheguanjia-admin`，
生产环境必须设置 `CGJ_ADMIN_USER` / `CGJ_ADMIN_PASSWORD`（否则拒绝默认账号登录）。

配置 `VITE_API_BASE` 后：登录会创建真实账号，数据存 SQLite，并支持多端同步；
不配置时行为与旧版本完全一致。详见 [server/README.md](server/README.md)。

---

## 二、页面清单（41 个页面，全部可点通）

| 模块 | 路由 | 说明 |
|---|---|---|
| 首页 | `pages/index/index` | 会员卡、24H救援入口、12大业务、我的爱车、三端入口、热门服务、附近商家 |
| 服务大全 | `pages/service/index` | 12 大业务链条 + 分类筛选 + 搜索 |
| 服务详情 | `pages/service/detail?id=` | 服务项目、办理流程、平台保障、推荐商家、预约下单、附近门店入口 |
| 附近门店 | `pages/nearby/index?category=` | 高德 POI 实时周边：洗车/维修/救援/充电/加油/停车，定位、导航、电话、平台预约 |
| 预约下单 | `pages/booking/index?serviceId=` | 选车辆/门店/时间/方式/联系人、地图选店（小程序）/高德查看（H5）、优惠券、积分抵扣 |
| 收银台 | `pages/pay/index?orderId=` | 订单摘要、费用明细、微信/到店支付（模拟）、协议 |
| 服务评价 | `pages/review/index?orderId=` | 星级评分、印象标签、文字评价、匿名 |
| 我的优惠券 | `pages/coupon/index` | 领券中心、未使用/已使用/已过期 |
| 积分商城 | `pages/points/index` | 积分余额、6 种优惠券兑换、积分明细、兑换记录 |
| 消息中心 | `pages/messages/index` | 订单/优惠券/入驻通知、未读红点、全部已读 |
| 登录 | `pages/login/index` | 手机号验证码（模拟发码）、微信一键登录（模拟）、协议勾选、登录门禁 |
| 编辑资料 | `pages/profile/index` | 头像、昵称、手机号 |
| 设置 | `pages/settings/index` | 通知/推荐开关、清除缓存、协议、关于、退出登录 |
| 协议与说明 | `pages/doc/index?type=` | 用户服务协议、隐私政策、关于车管家 |
| 发票中心 | `pages/invoice/index` | 可开票订单、开票记录、个人/企业抬头表单 |
| 客服中心 | `pages/support/index` | 模拟在线客服（关键词自动回复）、图文意见反馈 |
| 邀请有礼 | `pages/invite/index` | 分享二维码/链接、一次性绑定、阶梯奖励（券/积分/会员）、进度、记录、领取 |
| 企业认证 | `pages/enterprise/apply` | 企业资料表单、审核状态、模拟审核通过 |
| 城市选择 | `pages/city/index` | 系统定位、搜索、热门城市、全国 370 城按省分组、已开通标记 |
| 商家登录 | `pages/merchant/login` | 商家专属登录入口、商家账号校验 |
| 商家工作台 | `pages/merchant/center` | 今日/待接单/服务中/收入、快捷接单、最近订单、营业状态 |
| 商家订单 | `pages/merchant/orders` | 状态筛选、客户信息、接单/完成服务 |
| 店铺管理 | `pages/merchant/shop` | 电话/营业时间/地址/简介、营业开关 |
| 商家我的 | `pages/merchant/mine` | 商家账号信息、入驻资料、返回车主端、退出商家登录 |
| 入驻申请 | `pages/merchant/apply?id=` | 审核状态、进度时间轴、申请资料、模拟审核 |
| 商家中心 | `pages/merchant/center?id=` | 店铺信息、营业/休息切换、订单与统计 |
| 出行服务 | `pages/travel/index` | 「聚合叫车」统一入口（弹层选择高德/腾讯）+ 代驾/租车/跑腿快捷入口 + 承运合规说明 |
| 高德打车 | `pages/travel/webview?src=` | H5 内嵌打开高德渠道页，带「浏览器打开」兜底 |
| 应急救援 | `pages/rescue/index` | SOS 一键呼叫、6 类救援、附近救援车、定位 |
| 呼叫救援 | `pages/rescue/create` | 选类型、车辆、地址、电话、费用预估、提交 |
| 我的订单 | `pages/orders/index` | 全部/待支付/服务中/已完成/已取消 + 订单操作 |
| 订单详情 | `pages/order/detail?id=` | 状态、进度时间轴、费用明细、支付/取消/确认完成 |
| 我的 | `pages/mine/index` | 会员信息、资产、我的服务、三端入口、设置 |
| 会员中心 | `pages/member/index` | 29/99/299 三档会员 + 权益明细 |
| 确认支付 | `pages/member/pay?tier=` | 支付方式、协议、模拟支付 → 开通成功 |
| 企业会员 | `pages/enterprise/index` | B 端 299/年、9 项权益、车队托管、对比表 |
| 附近商家 | `pages/merchant/list` | 商家列表、分类筛选、金牌/银牌标识 |
| 商家详情 | `pages/merchant/detail?id=` | 服务项目、资质、评价、预约 |
| 商家入驻 | `pages/merchant/join` | 免费/299/999 三档 + 入驻流程 + 申请表单 + 门店搜索/自动定位/地图选点 |
| 我的车辆 | `pages/car/list` | 车辆卡片、保险/年检到期倒计时、设默认 |
| 添加车辆 | `pages/car/add` | 车牌（省份选择 + 自动格式化）、车型、里程、保险/年检日期 |
| 通用结果页 | `pages/result/index?type=` | 开通成功 / 预约成功 / 救援已呼叫 / 入驻已提交 |

底部导航 5 个：首页 / 服务 / **救援（中间悬浮 SOS）** / 订单 / 我的。

---

## 三、业务模式在 App 里的落地

**三端闭环**对应三个入口：

- **C 端 · 个人车主**：普通会员 29 / 尊享会员 99（`pages/member`）
- **B 端 · 企业车队**：企业 VIP 299/年，5 台车统一托管（`pages/enterprise`）
- **S 端 · 入驻商家**：免费 / 银牌 299 / 金牌 999（`pages/merchant/join`）

**12 大业务链条**：新车、旧车回收、代卖托管、车辆保险、维修保养、违章处理、
过户提档、年审审车、汽车租赁、代驾、同城跑腿、道路救援。

另有 **打车出行** 作为独立出行入口：不自建运力，直接聚合高德打车 / 腾讯出行（见下）。

**合规表达**已写进文案：违章仅代缴罚款不代办扣分、车务仅代办跑腿不伪造材料、
维修租赁代驾救援均对接正规资质团队。

### 出行服务接入（高德 + 腾讯）

按《四种接入方案对比表》的落地建议接入两家运力，但对用户只暴露**一个「聚合叫车」入口**：
点击后弹出平台选择，按端自动排序与降级。

| 入口 | 接入方式 | 各端行为 |
|---|---|---|
| 高德打车（主推） | H5 内嵌 | App / H5：应用内 WebView 打开渠道页；小程序：复制渠道链接到浏览器 |
| 腾讯出行（补充） | 小程序跳转 | 微信小程序：`navigateToMiniProgram` 直达；App / H5：提示在微信内使用 |

配置只在 `src/config/travel.js` 一处：

```js
amap: {
  h5Url: 'https://m.amap.com/',  // ← 替换为高德渠道后台生成的专属 H5 链接
  channelId: ''                   // 渠道号，决定佣金结算
},
tencent: {
  appId: '',                      // ← 腾讯出行小程序 AppID，填入后自动启用
  path: 'pages/index/index',
  channelId: ''                   // 腾讯出行渠道号
}
```

- 腾讯 `appId` 未填时，入口自动显示「待接入」，点击有友好提示，不会报错
- 高德当前默认演示链接，正式上线务必换成渠道后台链接（否则无佣金、页面也会要求登录）
- 入口位置：首页「出行服务」卡片、服务大全「出行服务」分类、热门服务
- 合规：页面已标注「车管家仅提供信息聚合与入口跳转，不参与承运」

### 订单、会员与优惠券（已完成）

**订单状态机**：待支付 → 待接单 → 服务中 → 待评价 → 已完成；待支付/待接单可取消。

- 下单：选车辆、门店、日期时段、到店/上门、联系人，自动计算会员折扣、优惠券、积分
- 收银台：微信支付 / 到店支付（均为模拟，不产生真实扣款）
- 当前没有真实商家在线，订单会停在「待接单」。订单详情页底部有**演示工具**，
  可「模拟商家接单」「模拟服务完成」；SOS 订单同理
- 取消已支付订单会生成一条「原路退回（模拟）」记录，不涉及真实资金

**会员权益已真实参与计价**：

| 档位 | 服务费 | 保养工时 |
|---|---|---|
| 普通会员 | 95 折 | 9 折 |
| 尊享会员 | 9 折 | 7 折 |
| 企业 VIP | 88 折 | 7 折 |

- 尊享会员每月 1 次免费代驾/跑腿（二选一），支付后消耗
- 积分：支付后按实付金额 1:1 返积分；下单时 100 积分抵 1 元，最多抵 20%

**优惠券**：`src/data/mock.js` 的 `COUPONS` 是券模板，用户已领取的券存在 state 里；
领券中心、下单选券、支付核销、过期状态全部打通。

**商家入驻**：申请会落库（`state.merchantApplications`），提交后进入审核进度页；
审核中可模拟通过/驳回，通过后进入商家中心（营业状态、订单、统计）。

**消息中心**：订单创建/支付/接单/完成/取消、优惠券到账、入驻审核结果都会自动生成站内信，
首页铃铛显示未读红点，消息可跳转到对应页面。

### 登录与个人中心（已完成）

- 登录页是启动页：未登录会拦截到登录页，登录后自动进首页；已登录直接跳过
- 手机号验证码登录为模拟：点「获取验证码」后自动填入 `123456`，不发送真实短信
- 微信一键登录为模拟：不调用真实微信授权，直接创建演示账号
- 登录态保存在本机，刷新/重启保持；设置页和「我的」菜单都可退出登录
- 设置页支持清除缓存（会重置本地数据并回到登录页）
- 服务协议、隐私政策、关于页面均已内置

### 其他 P1/P2 功能（已完成，含模拟说明）

| 功能 | 实现方式 | 模拟点 |
|---|---|---|
| 车辆管理 | 新增/编辑/删除、设默认、行驶证与保单上传 | 图片仅本地预览，不上传 |
| 搜索增强 | 历史搜索、热门搜索、空结果推荐 | 本地数据 |
| 发票 | 可开票订单、抬头表单、开票记录 | 不生成真实发票 |
| 在线客服 | 关键词自动回复、常见问题快捷入口 | 无真实人工 |
| 意见反馈 | 类型、文字、最多 3 张图、联系方式 | 不提交服务器 |
| 邀请有礼 | 邀请码、复制链接、奖励规则与记录 | 不发放真实奖励 |
| 企业认证 | 企业资料、审核状态、通过后企业 VIP 生效 | 审核为模拟 |
| 城市切换 | 首页城市选择、热门城市 | 演示数据仍为北京 |
| 首页运营位 | 3 张 Banner 轮播，可跳转对应页面 | — |
| 积分商城 | 积分兑换优惠券、积分明细、兑换记录 | 不涉及真实权益 |
| 邀请有礼 | 阶梯拉新奖励、领取到账、我的页独立入口 | 邀请记录与奖励为本地模拟 |

### 界面结构（v1.3.0，功能优先）

- **首页**：定位/搜索 → 24H 救援 → 出行服务 → 12 大业务金刚区 → 我的爱车 → 热门服务 → 附近商家。
  不再放会员卡和活动 Banner
- **服务大全**：搜索（历史/热门）→ 最近使用 → 常用服务金刚区 → 分类筛选 → 服务列表
- **我的**：会员卡、资产（权益/券/积分/余额）、我的服务、活动与福利、企业/商家入口、功能菜单

### 定位与城市

- 全国城市库：`src/data/cities.js`，370 个城市（地级市 + 直辖市 + 港澳台），含省份与经纬度
- 生成脚本：`node tools/gen-cities.mjs`（数据源阿里 DataV，更新城市时重新生成）
- 定位：`src/utils/location.js`。H5 用浏览器定位，小程序/App 用 `uni.getLocation`，再用本地坐标做最近城市匹配，不依赖地图 Key
- 城市页：`pages/city/index`，支持定位、搜索、热门城市、按省份分组；绿点表示该城市已有合作商家
- 未开通城市可正常切换，首页/商家列表显示「暂无合作商家」；预约仍可提交，由平台客服安排
- 权限：安卓壳已加定位权限；微信小程序使用 `getLocation` 需在小程序后台配置隐私接口

### 商家端

- 登录页新增「我是商家」入口 → `pages/merchant/login`
- 入驻审核通过后，原车主账号自动升级为商家账号（`user.role = 'merchant'`），车主端和商家端都能登录
- 商家工作台 4 个 tab：工作台（数据/快捷接单）、订单（筛选/客户信息/接单/完成）、店铺（资料/营业状态）、我的（账号/返回车主端/退出）
- 审核通过会生成动态商家，自动进入车主端的商家列表和预约门店，可被真实下单
- 演示说明：商家端订单/收入为本地模拟；商家接单后，车主端订单状态会同步变化（同一份本地数据）

---

## 四、目录结构

```
洗车小程序/
├─ src/
│  ├─ pages/                 # 40 个页面
│  ├─ components/            # 底部导航、页头、服务图标、横向标签
│  ├─ data/mock.js           # ★ 全部模拟数据（服务/会员/商家/订单/车辆）
│  ├─ data/seed.mjs          # 前后端共用种子数据（商家/订单/车辆/券/站内信）
│  ├─ data/nearby.mjs        # 附近门店分类 + 演示数据（高德 POI 降级用）
│  ├─ store/index.js         # ★ 全局状态 + 下单/开通会员等动作 + 本地持久化
│  ├─ api/client.js          # 后端请求封装（uni.request + 令牌）
│  ├─ api/sync.js            # ★ 云端同步（登录拉取 + 变更防抖推送 + 冲突重拉）
│  ├─ config/api.js          # 后端地址（VITE_API_BASE，留空 = 纯本地模式）
│  ├─ config/travel.js       # ★ 出行服务渠道配置（高德 H5 / 腾讯出行 AppID）
│  ├─ utils/travel.js        # 出行入口启动逻辑（小程序 / App / H5 分别降级）
│  ├─ styles/common.css      # 全局设计系统（颜色、卡片、按钮、底栏）
│  ├─ pages.json             # 路由与页面配置
│  ├─ manifest.json          # 应用配置（含小程序 AppID 位置）
│  └─ App.vue                # 启动时读取本地状态 + 尝试云端恢复
├─ server/                   # ★ 后端：Node 内置 HTTP + SQLite，零第三方依赖
│  ├─ index.mjs              # 服务入口与路由
│  ├─ db.mjs                 # 建表 / 种子数据 / 状态读写
│  ├─ auth.mjs               # 验证码、会话令牌、管理密钥
│  ├─ integrations/amap.mjs  # 高德 Web 服务 POI（免费额度，服务端代理）
│  ├─ admin/                 # 运营后台模块（登录/权限/审计/业务流程）
│  ├─ admin.html             # 运营后台页面（/admin）
│  └─ test.mjs               # 后端端到端自测
├─ tools/                    # 截图/流程自测脚本（puppeteer，开发用）
└─ dist/                     # 构建产物（不入库）
```

---

## 五、后端与数据

v1.7.0 起仓库自带一个可运行的后端（`server/`），采用「本地优先 + 云端同步」：

- **不配置** `VITE_API_BASE`：完全本地模式，数据只存本机 Storage，和旧版本一致
- **配置** `VITE_API_BASE`：手机号登录会创建真实账号（SQLite），
  启动时从云端恢复数据，本地每次变更防抖 800ms 整包推送；多端冲突用 `revision` 乐观锁，
  冲突时以云端为准重新拉取
- 后端不可达时静默退回本地模式，恢复后自动重试
- 运营后台：`http://localhost:8787/admin`
  - 独立管理员账号 + super/ops/finance/support 角色权限
  - 订单筛选/取消退款、商家入驻审核、发票开具、反馈处理、用户只读
  - 全量操作审计（只读、脱敏）、PII 默认掩码、数据导出/删除申请登记
  - 后台页 CSP nonce + X-Frame-Options 等安全头

后端已实现：账号/会话、用户状态持久化、订单/车辆/优惠券/商家/消息/积分等 15 张表、
商家查询、运营后台、演示数据重置。

**免费第三方集成**：高德 Web 服务 POI 附近门店（洗车 / 维修 / 救援 / 充电 / 加油 / 停车），
注册 Key 即可用，个人非商业 5000 次/月；未配置 Key 或上游失败时自动使用演示数据。
详见 [server/README.md](server/README.md) 的「第三方集成」。

**下一阶段**：把会员折扣、优惠券核销、积分、支付/退款等业务规则从客户端下沉到服务端，
接入真实短信、微信登录与支付，替换演示验证码。详细接口见 [server/README.md](server/README.md)。

---

## 六、已做的自测

- `tools/shot.mjs`：按手机视口批量截图 40 个页面，检查渲染与报错
- `tools/flow.mjs`：端到端点通验证（服务入口、会员开通支付、救援呼叫、底部导航、入驻表单）
- `tools/flow-booking.mjs`：新业务全流程验证（预约 → 收银台 → 订单 → 模拟接单/完成 → 评价；优惠券；商家入驻审核 → 商家中心）
- `tools/flow-nearby.mjs`：附近门店验证（洗车宫格、演示数据、定位、分类切换、详情页入口）
- `server/test.mjs`：后端 49 项接口自测（临时数据库，不污染开发数据）
- `tools/flow-merchant-loc.mjs`：商家入驻定位闭环（自动定位 → 审核 → 顾客端可见 → 带 merchantId 预约）
- `tools/flow-booking-map.mjs`：预约页地图（H5 门店定位卡、距离、高德/附近门店入口）
- `tools/flow-car-plate.mjs`：新增车辆车牌省份选择、自动格式化、粘贴识别、编辑回显
- `server/admin/test.mjs`：运营后台 69 项（登录/限流/RBAC/审计/订单/入驻/发票/反馈/安全头）
- `server/invite/test.mjs`：邀请 57 项（绑定/重复/自邀/上限/领奖幂等/设备限流/审计脱敏）
- `tools/flow-invite-qr.mjs`：邀请二维码 26 项（二维码/链接/新用户绑定 +1/重复扫码不增加）
- `tools/cloud-e2e.mjs`：云端跨设备验证（全新浏览器登录同一手机号，检查订单/评价/入驻/令牌从云端恢复）

实测结果：**页面零运行时错误，12 + 11 + 10 + 12 + 8 + 12 条主流程、邀请 57 + 26 项、49 项后端接口、69 项后台、
12 项云端同步全部通过。**

```bash
node tools/shot.mjs home=pages/index/index --full
node tools/flow.mjs
node tools/flow-booking.mjs
node tools/flow-nearby.mjs
node tools/flow-merchant-loc.mjs
node tools/flow-booking-map.mjs
node tools/flow-car-plate.mjs
node server/test.mjs
node server/admin/test.mjs
node server/invite/test.mjs
node tools/flow-invite-qr.mjs   # 需先构建 VITE_API_BASE 版本
node tools/cloud-e2e.mjs   # 需先启动后端并构建 VITE_API_BASE 版本
```

---

## 七、版本与兼容性

版本号统一在根目录 `version.json` 维护，`src/config/version.js` 只做读取：

```json
{
  "versionName": "1.9.0",
  "versionCode": 11,
  "schemaVersion": 6,
  "minSupportedVersion": "1.0.0"
}
```

| 版本号 | 用途 | 规则 |
|---|---|---|
| `versionName` | 展示给用户的版本 | 语义化 `MAJOR.MINOR.PATCH` |
| `versionCode` | 安卓升级判断 | 每次发版 +1，打包脚本自动写入 build.gradle |
| `schemaVersion` | 本地数据结构版本 | 结构变化 +1，并补迁移函数 |

**兼容策略：**

- **向下兼容**：新版 App 自动迁移旧数据（`car_manager_state_v2` → `car_manager_state`），订单、车辆、会员不丢
- **不向上兼容**：旧版 App 读到更高版本的数据会锁定存储并弹窗提示升级，**不会覆盖新数据**
- **兜底可用**：提示弹窗里可选择「清除本地数据」恢复使用

发布新版本时：

1. 修改 `version.json`
2. 有数据结构变化时，在 `src/store/index.js` 的 `MIGRATIONS` 添加迁移
3. 更新 `CHANGELOG.md`
4. 重新构建，`tools/build-apk.sh` 会自动同步 APK 版本号
5. 用 `aapt dump badging 车管家.apk | head -1` 校验

---

## 四、Android 签名密钥

本仓库**不包含** Android 签名密钥（`*.keystore`）。构建 release APK 前请自行生成密钥，
在 `app-shell/` 目录放入自己的 keystore，或修改 `app-shell/android/app/build.gradle`
中的签名配置指向你自己的文件。
