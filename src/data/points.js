// 积分商城商品（演示环境：兑换后发放优惠券到卡包）
export const POINTS_GOODS = [
  {
    id: 'g_coupon10',
    name: '10元通用券',
    desc: '全场通用 · 满 50 可用',
    icon: '🎟️',
    gradient: 'linear-gradient(135deg,#5B9BFF,#2B63F0)',
    cost: 1000,
    tag: '入门',
    coupon: { name: '10元通用券', amount: 10, threshold: 50, expire: '2027-03-31', scope: '全场通用' }
  },
  {
    id: 'g_coupon20',
    name: '20元通用券',
    desc: '全场通用 · 满 100 可用',
    icon: '🎫',
    gradient: 'linear-gradient(135deg,#FFB03C,#FF7200)',
    cost: 2000,
    tag: '超值',
    coupon: { name: '20元通用券', amount: 20, threshold: 100, expire: '2027-03-31', scope: '全场通用' }
  },
  {
    id: 'g_wash',
    name: '30元洗车券',
    desc: '洗车美容 · 满 30 可用',
    icon: '🚿',
    gradient: 'linear-gradient(135deg,#3FD3C0,#0E9E84)',
    cost: 3000,
    tag: '热门',
    coupon: { name: '30元洗车券', amount: 30, threshold: 30, expire: '2027-03-31', scope: '洗车美容' }
  },
  {
    id: 'g_driver',
    name: '20元代驾券',
    desc: '代驾服务 · 满 30 可用',
    icon: '🍷',
    gradient: 'linear-gradient(135deg,#9B7BFF,#6A3DF5)',
    cost: 1800,
    tag: '',
    coupon: { name: '20元代驾券', amount: 20, threshold: 30, expire: '2027-03-31', scope: '代驾服务' }
  },
  {
    id: 'g_maintain',
    name: '50元保养券',
    desc: '维修保养 · 满 200 可用',
    icon: '🔧',
    gradient: 'linear-gradient(135deg,#FF8A4C,#FF4E1E)',
    cost: 4500,
    tag: '省心',
    coupon: { name: '50元保养券', amount: 50, threshold: 200, expire: '2027-03-31', scope: '维修保养' }
  },
  {
    id: 'g_rescue',
    name: '30元救援券',
    desc: '道路救援 · 无门槛',
    icon: '🆘',
    gradient: 'linear-gradient(135deg,#FF5B4A,#D0021B)',
    cost: 2500,
    tag: '',
    coupon: { name: '30元救援券', amount: 30, threshold: 0, expire: '2027-03-31', scope: '道路救援' }
  }
]

export const POINTS_RULES = [
  '支付订单后按实付金额 1:1 返积分',
  '100 积分可在下单时抵扣 1 元，最多抵实付金额的 20%',
  '积分兑换的优惠券会立即放入卡包',
  '演示环境：积分与商品均为本地模拟，不涉及真实权益'
]
