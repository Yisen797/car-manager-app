// 前后端共用的演示种子数据
// 前端：src/data/mock.js 重新导出
// 后端：server/db.mjs 在用户首次登录时用它初始化账号数据
// 使用 .mjs 扩展名，保证 Node 端（CommonJS 项目根目录）也能直接 import

/* ---------------- 商家 ---------------- */
export const MERCHANTS = [
  {
    id: 'm1', city: '北京', name: '途虎养车工场店（朝阳门店）', emoji: '🔧', gradient: 'linear-gradient(135deg,#FFB03C,#FF7200)',
    rating: 4.9, distance: '1.2km', lng: 116.4340, lat: 39.9234, tier: '金牌', tierColor: '#B98A3C', orders: 1286,
    tags: ['维修保养', '轮胎', '洗车美容'], address: '朝阳区建国路 88 号 SOHO 现代城 B1',
    hours: '09:00 - 21:00', promo: '会员到店保养工时7折'
  },
  {
    id: 'm2', city: '北京', name: '京诚汽车维修中心', emoji: '🛠️', gradient: 'linear-gradient(135deg,#5B9BFF,#2B63F0)',
    rating: 4.8, distance: '2.4km', lng: 116.4612, lat: 39.9216, tier: '银牌', tierColor: '#8A9AAE', orders: 642,
    tags: ['机修电路', '钣金喷漆', '故障检测'], address: '朝阳区东三环中路 12 号',
    hours: '08:30 - 20:00', promo: '免费36项全车安检'
  },
  {
    id: 'm3', city: '北京', name: '车享家汽车服务中心', emoji: '✨', gradient: 'linear-gradient(135deg,#3FD39A,#0E9E6B)',
    rating: 4.7, distance: '3.1km', lng: 116.4775, lat: 39.9110, tier: '金牌', tierColor: '#B98A3C', orders: 980,
    tags: ['常规保养', '洗车美容', '轮胎'], address: '朝阳区大望路华贸中心 B2',
    hours: '09:00 - 22:00', promo: '会员洗车 19.9 元'
  },
  {
    id: 'm4', city: '北京', name: '鑫源二手车交易中心', emoji: '🔄', gradient: 'linear-gradient(135deg,#A87BFF,#6E45E2)',
    rating: 4.6, distance: '5.0km', lng: 116.4930, lat: 39.8460, tier: '银牌', tierColor: '#8A9AAE', orders: 356,
    tags: ['二手车', '高价回收', '代卖托管'], address: '朝阳区十八里店汽车城 A 区',
    hours: '09:00 - 18:00', promo: '旧车免费评估 · 当场出价'
  },
  {
    id: 'm5', city: '北京', name: '平安车险服务点（国贸店）', emoji: '🛡️', gradient: 'linear-gradient(135deg,#4A8CF7,#1F5FD0)',
    rating: 4.9, distance: '1.8km', lng: 116.4590, lat: 39.9090, tier: '金牌', tierColor: '#B98A3C', orders: 2140,
    tags: ['车险比价', '续保', '理赔代办'], address: '朝阳区国贸商城 3 号写字楼 12 层',
    hours: '09:00 - 18:00', promo: '会员专属渠道底价'
  },
  {
    id: 'm6', city: '北京', name: '24H 极速救援队', emoji: '🆘', gradient: 'linear-gradient(135deg,#FF5B4A,#D0021B)',
    rating: 5.0, distance: '800m', lng: 116.4500, lat: 39.9200, tier: '金牌', tierColor: '#B98A3C', orders: 3120,
    tags: ['道路救援', '搭电', '拖车'], address: '朝阳区全域流动服务',
    hours: '24 小时', promo: '会员优先调度 · 15分钟响应'
  }
]

/* ---------------- 订单 ---------------- */
export const ORDERS = [
  {
    id: 'O20261030001', serviceId: 'maintain', title: '常规保养 · 机油机滤',
    merchant: '途虎养车工场店（朝阳门店）', amount: 299, status: 'serving',
    createTime: '2026-10-30 09:12', car: '京A·8K2M9', icon: '🔧',
    gradient: 'linear-gradient(135deg,#FFB03C,#FF7200)', payLabel: '到店支付',
    timeline: [
      { text: '订单已支付', time: '10-30 09:12', done: true },
      { text: '门店已接单', time: '10-30 09:15', done: true },
      { text: '技师施工中', time: '10-30 09:40', done: true },
      { text: '完工交车', time: '预计 11:00', done: false }
    ]
  },
  {
    id: 'O20261029002', serviceId: 'violation', title: '违章代缴 · 1 笔',
    merchant: '车管家车务中心', amount: 50, status: 'pending',
    createTime: '2026-10-29 18:20', car: '京A·8K2M9', icon: '📋',
    gradient: 'linear-gradient(135deg,#FF6F91,#E8365F)', payLabel: '待支付',
    timeline: [
      { text: '订单已创建', time: '10-29 18:20', done: true },
      { text: '等待支付', time: '', done: false }
    ]
  },
  {
    id: 'O20261026003', serviceId: 'annual', title: '年审代办 · 6年内免检',
    merchant: '车管家车务中心', amount: 120, status: 'done',
    createTime: '2026-10-26 10:05', car: '京N·5F1L7', icon: '📅',
    gradient: 'linear-gradient(135deg,#6E8DFF,#3D5AFE)', payLabel: '已支付',
    timeline: [
      { text: '订单已支付', time: '10-26 10:05', done: true },
      { text: '资料预审通过', time: '10-26 11:20', done: true },
      { text: '免检标志已办理', time: '10-27 14:00', done: true },
      { text: '已寄出 · 已完成', time: '10-28 09:30', done: true }
    ]
  },
  {
    id: 'O20261020004', serviceId: 'rescue', title: '搭电启动 · 会员免费',
    merchant: '24H 极速救援队', amount: 0, status: 'done',
    createTime: '2026-10-20 22:41', car: '京A·8K2M9', icon: '🆘',
    gradient: 'linear-gradient(135deg,#FF5B4A,#D0021B)', payLabel: '会员权益',
    timeline: [
      { text: '一键呼叫救援', time: '10-20 22:41', done: true },
      { text: '救援车已派单', time: '10-20 22:43', done: true },
      { text: '现场搭电完成', time: '10-20 23:01', done: true }
    ]
  },
  {
    id: 'O20261015005', serviceId: 'driver', title: '夜间代驾 · 6.8km',
    merchant: '安心代驾团队', amount: 48, status: 'done',
    createTime: '2026-10-15 23:10', car: '京A·8K2M9', icon: '🍷',
    gradient: 'linear-gradient(135deg,#9B7BFF,#6A3DF5)', payLabel: '已支付',
    timeline: [
      { text: '已呼叫代驾', time: '10-15 23:10', done: true },
      { text: '司机已接单', time: '10-15 23:13', done: true },
      { text: '安全送达', time: '10-15 23:52', done: true }
    ]
  }
]

/* ---------------- 车辆 ---------------- */
export const CARS = [
  {
    id: 'c1', plate: '京A·8K2M9', brand: '宝马 3系 2021款 325Li',
    mileage: 32560, color: '珍珠白',
    insuranceEnd: '2027-03-12', annualEnd: '2027-01-05',
    emoji: '🚗', gradient: 'linear-gradient(135deg,#3A4B63,#141D2B)'
  },
  {
    id: 'c2', plate: '京N·5F1L7', brand: '特斯拉 Model Y 2023款',
    mileage: 18240, color: '冷光银',
    insuranceEnd: '2026-12-20', annualEnd: '2027-08-11',
    emoji: '⚡', gradient: 'linear-gradient(135deg,#2E3A46,#10161C)'
  }
]

/* ---------------- 优惠券 ---------------- */
// 前 3 张默认已领取，其余在「领券中心」领取
export const COUPONS = [
  { id: 'cp1', name: '保养工时券', amount: 50, threshold: 200, expire: '2026-12-31', scope: '维修保养' },
  { id: 'cp2', name: '代驾立减券', amount: 20, threshold: 30, expire: '2026-11-30', scope: '代驾服务' },
  { id: 'cp3', name: '救援服务券', amount: 30, threshold: 0, expire: '2027-01-31', scope: '道路救援' },
  { id: 'cp4', name: '新客通用券', amount: 20, threshold: 100, expire: '2027-03-31', scope: '全场通用' },
  { id: 'cp5', name: '租车立减券', amount: 50, threshold: 199, expire: '2027-02-28', scope: '汽车租赁' },
  { id: 'cp6', name: '跑腿立减券', amount: 15, threshold: 39, expire: '2026-12-31', scope: '同城跑腿' }
]

/* ---------------- 新账号默认站内信 ---------------- */
export const INITIAL_MESSAGES = [
  {
    id: 'msg_welcome', type: 'system', title: '欢迎使用车管家',
    desc: '会员权益已生效，全年用车养车一站托管', time: '2026-11-01 09:00',
    read: false, target: '/pages/member/index'
  },
  {
    id: 'msg_car', type: 'car', title: '保养到期提醒',
    desc: '京A·8K2M9 距离下次保养还有约 1200km', time: '2026-10-30 10:20',
    read: false, target: '/pages/car/list'
  },
  {
    id: 'msg_coupon', type: 'coupon', title: '优惠券已到账',
    desc: '3 张优惠券已放入卡包，下单时可直接抵扣', time: '2026-10-29 16:00',
    read: true, target: '/pages/coupon/index'
  }
]
