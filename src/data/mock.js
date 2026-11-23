// 全平台模拟数据 —— 后期接后端只需替换本文件的数据来源
// 商家 / 订单 / 车辆 / 优惠券种子数据在后端也会用到，统一放在 seed.mjs
export { MERCHANTS, ORDERS, CARS, COUPONS } from './seed.mjs'

export const BRAND = {
  name: '车管家',
  slogan: '一台车 · 一个会员 · 全年无忧',
  sub: '全品类汽车综合服务平台'
}

/* ---------------- 12 大业务链条 ---------------- */
export const SERVICES = [
  {
    id: 'newcar',
    name: '新车服务',
    icon: '🚗',
    gradient: 'linear-gradient(135deg,#FF8A4C,#FF4E1E)',
    category: '交易',
    short: '多品牌比价 · 底价渠道 · 协助砍价',
    priceLabel: '会员免费比价',
    badge: '热门',
    hot: true,
    tags: ['多品牌比价', '底价渠道', '协助砍价', '验车', '代办上牌'],
    items: [
      { name: '多品牌比价', desc: '一次提交，多家4S/汽贸同步报价' },
      { name: '底价渠道锁定', desc: '合作渠道底价，价格透明无套路' },
      { name: '到店协助砍价', desc: '专属顾问陪同，帮你把价格谈到底' },
      { name: '新车验车', desc: '专业验车师全程陪同，排除问题车' },
      { name: '代办上牌', desc: '资料预审、验车、选号、上牌全程代办' }
    ],
    steps: ['提交购车需求', '获取多家底价', '到店验车', '协助砍价成交', '代办上牌交付'],
    notice: '会员享受全年免费比价与购车指导，成交可享渠道返点补贴。'
  },
  {
    id: 'usedcar',
    name: '旧车回收',
    icon: '🔄',
    gradient: 'linear-gradient(135deg,#5B9BFF,#2B63F0)',
    category: '交易',
    short: '高价回收 · 快速结算 · 当场打款',
    priceLabel: '免费评估',
    hot: true,
    tags: ['高价回收', '快速结算', '免费评估', '上门收车'],
    items: [
      { name: '免费上门评估', desc: '评估师上门，30分钟出具专业报价' },
      { name: '高价回收', desc: '对接多家车商竞价，价高者得' },
      { name: '快速结算', desc: '成交当天打款，全程透明' },
      { name: '手续代办', desc: '过户、注销、指标更新一站式办结' }
    ],
    steps: ['提交车辆信息', '上门评估', '多家竞价', '签订协议', '当天结算'],
    notice: '评估完全免费，不满意可随时终止，无任何隐性费用。'
  },
  {
    id: 'consign',
    name: '代卖托管',
    // 低频服务，不占首页/常用服务 12 宫格，仍可在服务大全和搜索中找到
    grid: false,
    icon: '🏷️',
    gradient: 'linear-gradient(135deg,#A87BFF,#6E45E2)',
    category: '交易',
    short: '免费托管 · 推广引流 · 全程帮议价',
    priceLabel: '会员免托管费',
    tags: ['免费托管', '定价包装', '推广引流', '帮议价', '全程过户'],
    items: [
      { name: '免费托管', desc: '车辆进场免费，售出才收费' },
      { name: '定价包装', desc: '市场行情定价，专业拍摄与文案包装' },
      { name: '全域推广引流', desc: '平台流量 + 车商渠道同步分发' },
      { name: '专人帮议价', desc: '顾问代表车主谈判，价格更坚挺' },
      { name: '全程过户', desc: '成交、过户、交付全程代办' }
    ],
    steps: ['车辆寄卖登记', '定价与包装', '全域推广', '带看与议价', '成交过户'],
    notice: '尊享会员享免费托管、免费推广、免费议价、全程托管成交。'
  },
  {
    id: 'insurance',
    name: '车辆保险',
    icon: '🛡️',
    gradient: 'linear-gradient(135deg,#3FD39A,#0E9E6B)',
    category: '车务',
    short: '车险比价 · 投保续保 · 理赔代办',
    priceLabel: '免费比价',
    hot: true,
    tags: ['车险比价', '投保续保', '保单托管', '出险协助', '理赔代办'],
    items: [
      { name: '车险一键比价', desc: '人保/平安/太保等多家方案同屏对比' },
      { name: '投保续保', desc: '持牌合作渠道，官方出单' },
      { name: '保单托管', desc: '电子保单统一归档，到期智能提醒' },
      { name: '出险协助', desc: '7×24 报案指导、现场协助、定损陪同' },
      { name: '理赔代办', desc: '资料整理、进度跟进、赔款到账跟踪' }
    ],
    steps: ['提交车辆信息', '多家方案比价', '确认投保', '官方出单', '全年保单托管'],
    notice: '平台仅做合规导流与持证合作，保费由保险公司官方收取。'
  },
  {
    id: 'maintain',
    name: '维修保养',
    price: 299,
    icon: '🔧',
    gradient: 'linear-gradient(135deg,#FFB03C,#FF7200)',
    category: '养护',
    short: '常规保养 · 机修电路 · 钣金喷漆',
    priceLabel: '会员工时7折',
    hot: true,
    tags: ['常规保养', '机修', '电路', '钣金喷漆', '故障检测', '全车安检'],
    items: [
      { name: '常规保养', desc: '机油机滤、空滤空调滤、全车检查' },
      { name: '机修电路', desc: '发动机、变速箱、底盘、电子故障' },
      { name: '钣金喷漆', desc: '事故修复、凹陷修复、原厂漆配色' },
      { name: '故障检测', desc: 'OBD 电脑诊断，精准定位故障码' },
      { name: '全车安检', desc: '36 项安全检查，出具检测报告' }
    ],
    steps: ['选择服务门店', '预约到店', '检测报价', '施工维修', '验收交车'],
    notice: '尊享会员全年工时 7 折并享优先施工，维修过程可全程查看。'
  },
  {
    id: 'wash',
    name: '洗车美容',
    price: 39,
    icon: '🚿',
    gradient: 'linear-gradient(135deg,#3FD3C0,#0E9E84)',
    category: '养护',
    short: '标准洗车 · 精洗内饰 · 打蜡镀晶',
    priceLabel: '¥29 起',
    hot: true,
    tags: ['标准洗车', '精洗', '内饰清洁', '打蜡镀晶', '周边门店'],
    items: [
      { name: '标准洗车', desc: '高压冲洗、泡沫清洗、擦干，约 20 分钟' },
      { name: '精洗内饰', desc: '座舱吸尘、内饰擦拭、轮毂深度清洁' },
      { name: '打蜡镀晶', desc: '车漆去污上蜡，增亮防护' },
      { name: '贴膜改色', desc: '玻璃贴膜、隐形车衣、改色膜' },
      { name: '周边门店查询', desc: '高德实时周边门店，一键导航到店' }
    ],
    steps: ['选择附近门店', '预约到店', '确认项目', '洗车施工', '验收取车'],
    notice: '洗车价格为门店参考价，具体以到店报价为准；可先用「附近门店」查看距离和电话。'
  },
  {
    id: 'violation',
    name: '违章处理',
    price: 50,
    icon: '📋',
    gradient: 'linear-gradient(135deg,#FF6F91,#E8365F)',
    category: '车务',
    short: '违章查询 · 合规代缴 · 到期提醒',
    priceLabel: '会员免服务费',
    tags: ['违章查询', '合规代缴', '台账管理', '到期提醒'],
    items: [
      { name: '全国违章查询', desc: '支持全国车牌，实时同步交管数据' },
      { name: '合规代缴罚款', desc: '仅代缴罚款，不涉及任何记分业务' },
      { name: '违章台账', desc: '多车统一台账，时间地点一目了然' },
      { name: '到期提醒', desc: '处理期限、年检节点提前提醒' }
    ],
    steps: ['绑定车辆', '查询违章', '确认代缴', '官方渠道缴纳', '回传凭证'],
    notice: '本平台仅提供罚款代缴与提醒服务，不代办扣分、不买卖分，严格遵守交管规定。'
  },
  {
    id: 'transfer',
    name: '过户提档',
    price: 399,
    icon: '📄',
    gradient: 'linear-gradient(135deg,#45C6D6,#158EA3)',
    category: '车务',
    short: '过户 · 提档 · 转籍 · 上牌',
    priceLabel: '会员服务费全免',
    tags: ['过户', '提档', '转籍', '上牌', '变更'],
    items: [
      { name: '车辆过户', desc: '本市过户材料整理、验车、窗口办理' },
      { name: '提档转籍', desc: '外迁提档、异地落档全流程代办' },
      { name: '新车上牌', desc: '验车、选号、领牌全程代跑' },
      { name: '变更登记', desc: '车身颜色、使用性质、地址变更' }
    ],
    steps: ['提交资料', '资料预审', '预约窗口', '现场办理', '证件交付'],
    notice: '所有车务仅做代办跑腿、资料整理与流程协助，绝不伪造任何材料。'
  },
  {
    id: 'annual',
    name: '年审审车',
    price: 120,
    icon: '📅',
    gradient: 'linear-gradient(135deg,#6E8DFF,#3D5AFE)',
    category: '车务',
    short: '年审年检 · 免检申领 · 全程代办',
    priceLabel: '会员免跑腿费',
    tags: ['年审', '年检', '免检申领', '上门取车'],
    items: [
      { name: '年检代办', desc: '预约检测站、上线检测、整改复检' },
      { name: '免检标志申领', desc: '6年内免检车辆线上申领，快递到家' },
      { name: '上门取送车', desc: '专人上门取车、检完送回' },
      { name: '年审到期提醒', desc: '到期前 30 天智能提醒，绝不脱审' }
    ],
    steps: ['提交车辆', '预约检测站', '上门取车', '上线检测', '送回车辆'],
    notice: '尊享会员年审年检全程代办并免跑腿费，仅需支付检测站规费。'
  },
  {
    id: 'taxi',
    name: '打车出行',
    icon: '🚕',
    gradient: 'linear-gradient(135deg,#35C3FF,#1668FF)',
    category: '出行',
    hub: '/pages/travel/index',
    short: '高德打车 · 腾讯出行 · 实时比价',
    priceLabel: '聚合叫车',
    hot: true,
    tags: ['聚合叫车', '快车专车', '机场接送', '企业用车'],
    items: [
      { name: '聚合叫车', desc: '高德打车多平台运力比价，等待更短' },
      { name: '快车 / 专车 / 出租车', desc: '按需选择车型，价格透明' },
      { name: '机场 / 高铁接送', desc: '预约接送，行程可分享给亲友' },
      { name: '企业用车', desc: '企业会员统一开票、月度结算' }
    ],
    steps: ['选择服务方', '输入起终点', '比价叫车', '行程中', '到达支付'],
    notice: '打车服务由高德打车、腾讯出行提供实际承运，车管家仅提供信息聚合与入口跳转，价格、发票与售后以承运平台为准。'
  },
  {
    id: 'rent',
    name: '汽车租赁',
    price: 199,
    icon: '🔑',
    gradient: 'linear-gradient(135deg,#F5B940,#DE8A00)',
    category: '出行',
    short: '日租 · 月租 · 年租 · 车辆托管',
    priceLabel: '会员免中介费',
    tags: ['私家车托管出租', '日租', '月租', '年租', '企业车队'],
    items: [
      { name: '私家车托管出租', desc: '闲置车辆托管，平台运营分成' },
      { name: '日租/周租', desc: '自驾短租，多种车型可选' },
      { name: '月租/年租', desc: '长租更省，含基础保养' },
      { name: '企业车队租赁', desc: '定制用车方案，开票与月结' }
    ],
    steps: ['选择车型', '提交租期', '签署合同', '取车验车', '还车结算'],
    notice: '所有车辆均为正规资质合作车队，全程保险覆盖。'
  },
  {
    id: 'driver',
    name: '代驾服务',
    price: 68,
    icon: '🍷',
    gradient: 'linear-gradient(135deg,#9B7BFF,#6A3DF5)',
    category: '出行',
    short: '夜间代驾 · 长途代驾 · 预约代驾',
    priceLabel: '会员每月1次免费',
    tags: ['夜间代驾', '长途代驾', '预约代驾', '企业包月'],
    items: [
      { name: '夜间代驾', desc: '10分钟响应，专业持证司机' },
      { name: '长途代驾', desc: '跨城出行，按公里计价更划算' },
      { name: '预约代驾', desc: '提前预约，准时到达' },
      { name: '企业包月代驾', desc: '商务接待、公务出行包月服务' }
    ],
    steps: ['填写起点终点', '匹配司机', '上门接车', '安全送达', '线上结算'],
    notice: '尊享会员每月可免费享受 1 次代驾或跑腿（二选一）。'
  },
  {
    id: 'errand',
    name: '同城跑腿',
    price: 39,
    icon: '🏃',
    gradient: 'linear-gradient(135deg,#35CBB0,#0E9E84)',
    category: '生活',
    short: '政务代办 · 送件 · 排队 · 代买',
    priceLabel: '会员每月1次免费',
    tags: ['政务代办', '送件', '排队', '代买', '各类琐事'],
    items: [
      { name: '政务代办', desc: '车管所、政务大厅事项代跑' },
      { name: '同城送件', desc: '文件、钥匙、物品极速送达' },
      { name: '排队占位', desc: '办事排队、医院挂号排队' },
      { name: '代买代办', desc: '各类生活琐事，专人办结' }
    ],
    steps: ['描述需求', '报价确认', '跑腿员接单', '代办执行', '完成回传'],
    notice: '城市范围内 30 分钟响应，全程可追踪。'
  },
  {
    id: 'rescue',
    name: '道路救援',
    icon: '🆘',
    gradient: 'linear-gradient(135deg,#FF5B4A,#D0021B)',
    category: '救援',
    short: '拖车 · 搭电 · 换胎 · 紧急抢修',
    priceLabel: '24小时随叫随到',
    badge: '24H',
    hot: true,
    tags: ['道路拖车', '搭电启动', '换胎', '困境救援', '紧急抢修', '高速救援协助'],
    items: [
      { name: '道路拖车', desc: '城市/高速拖车，就近调度' },
      { name: '搭电启动', desc: '电瓶亏电，15分钟到场' },
      { name: '换胎补胎', desc: '爆胎换备胎、现场补胎' },
      { name: '困境救援', desc: '陷车、托底、地库脱困' },
      { name: '紧急抢修', desc: '现场小修，能修不拖' },
      { name: '高速救援协助', desc: '高速事故协助报警与拖离' }
    ],
    steps: ['一键呼叫', '定位派单', '救援车出发', '现场处置', '完工确认'],
    notice: '尊享会员全年不限次救援咨询与紧急调度优先，费用按实际服务明码标价。'
  }
]

/* ---------------- 应急救援类型 ---------------- */
export const RESCUE_TYPES = [
  { id: 'tow', name: '道路拖车', icon: '🚛', desc: '就近调度 · 明码标价', price: '起步 ¥200' },
  { id: 'battery', name: '搭电启动', icon: '🔋', desc: '15分钟到场', price: '会员 ¥0' },
  { id: 'tire', name: '换胎补胎', icon: '🛞', desc: '现场更换备胎', price: '¥80 起' },
  { id: 'stuck', name: '困境救援', icon: '⛰️', desc: '陷车脱困 · 地库救援', price: '¥150 起' },
  { id: 'repair', name: '紧急抢修', icon: '🔧', desc: '能修不拖 · 现场处置', price: '¥100 起' },
  { id: 'highway', name: '高速救援', icon: '🛣️', desc: '协助报警 · 拖离高速', price: '按规计费' }
]

/* ---------------- C 端会员体系 ---------------- */
export const MEMBER_TIERS = [
  {
    id: 'normal',
    name: '普通会员',
    price: 29,
    unit: '年',
    tag: '入门引流',
    gradient: 'linear-gradient(135deg,#8FA3BF,#5C7089)',
    highlights: ['免费比价评估', '违章查询免费', '代办服务费折扣', '全年到期提醒'],
    benefits: [
      '新车免费比价、底价咨询、购车指导',
      '旧车免费评估、免费报价、免费登记代卖',
      '全年违章免费查询、代办服务费折扣',
      '年审、过户、上牌资料预审、流程指导',
      '车险免费比价、保单建档、续保提醒',
      '车辆免费故障诊断、基础安全检测',
      '租车、代驾、跑腿、救援专属会员折扣',
      '全年车辆到期智能提醒（保险 / 年审 / 年检）'
    ]
  },
  {
    id: 'premium',
    name: '尊享会员',
    price: 99,
    unit: '年',
    tag: '主推 · 最划算',
    recommended: true,
    gradient: 'linear-gradient(135deg,#2B2A28,#0E0D0C)',
    highlights: ['全年免服务费', '工时7折', '每月免费代驾/跑腿', '救援优先调度'],
    benefits: [
      '包含普通会员全部权益',
      '违章代缴全程免服务费（仅付官方罚款）',
      '车辆年审、年检全程代办、免跑腿费',
      '过户、上牌、提档、转籍服务费全免',
      '旧车代卖免费托管、免费推广、免费议价、全程托管成交',
      '修车保养工时全年 7 折、优先施工',
      '车险专属渠道底价、出险全程协助理赔',
      '全年不限次道路救援咨询、紧急调度优先权限',
      '每月免费代驾 1 次 / 免费跑腿 1 次（二选一）',
      '租车免中介费、优先派车、优先用车'
    ]
  },
  {
    id: 'enterprise',
    name: '企业VIP',
    price: 299,
    unit: '年',
    tag: '车队托管',
    gradient: 'linear-gradient(135deg,#3A3227,#191510)',
    highlights: ['5台车统一托管', '专属客户经理', '救援绿色通道', '团报定制'],
    benefits: [
      '绑定 5 台以内车辆统一全年托管',
      '企业车辆批量年审、批量违章、批量过户统一处理',
      '企业车险团报定制方案、统一对接理赔',
      '企业长期包月代驾、公务出行代驾',
      '企业日常政务、送件、采购包月跑腿代办',
      '企业车队长期租车、定制用车方案',
      '企业车队专属道路救援绿色通道、优先救援',
      '车辆定期安全巡检、维保台账管理',
      '专属客户经理一对一全年对接服务'
    ],
    enterprise: true
  }
]

/* ---------------- S 端商家入驻体系 ---------------- */
export const MERCHANT_TIERS = [
  {
    id: 'free',
    name: '免费入驻',
    price: 0,
    tag: '基础版',
    gradient: 'linear-gradient(135deg,#9AA7B8,#6B7889)',
    benefits: ['平台线上店铺展示', '基础曝光引流', '可承接维保、洗车、简单车务订单', '平台基础客源分配']
  },
  {
    id: 'silver',
    name: '银牌会员',
    price: 299,
    tag: '进阶版',
    gradient: 'linear-gradient(135deg,#B9C6D6,#7D8FA6)',
    benefits: ['店铺排名优先、优先派单', '平台活动优先报名、流量倾斜', '精准车主客源导流', '平台售后背书、标准化接单赋能']
  },
  {
    id: 'gold',
    name: '金牌合作',
    price: 999,
    tag: '核心合伙人',
    recommended: true,
    gradient: 'linear-gradient(135deg,#B98A3C,#6B4A17)',
    benefits: [
      '区域限量独家合作资格',
      '平台首页置顶、重点推荐',
      '高端会员业务定向独家分配',
      '新车、二手车、保险、救援后端高额分润',
      '平台品牌授权、标准化培训',
      '可参与平台年度合伙人分红'
    ]
  }
]

/* ---------------- 商家评价（静态样例，用户评价会追加） ---------------- */
export const MERCHANT_REVIEWS = {
  m1: [
    { user: '王**', rating: 5, date: '2026-10-18', text: '保养很专业，全程有施工视频，价格透明。', tags: ['专业', '透明'] },
    { user: '李**', rating: 5, date: '2026-10-06', text: '换轮胎速度快，师傅很耐心。', tags: ['准时', '态度好'] }
  ],
  m2: [
    { user: '赵**', rating: 4, date: '2026-09-28', text: '钣金修复效果不错，就是排队久了点。', tags: ['效果好'] }
  ],
  m3: [
    { user: '陈**', rating: 5, date: '2026-10-11', text: '洗车很干净，会员价划算。', tags: ['性价比'] }
  ],
  m4: [
    { user: '孙**', rating: 5, date: '2026-09-15', text: '评估价合理，当天打款。', tags: ['效率高'] }
  ],
  m5: [
    { user: '周**', rating: 5, date: '2026-10-02', text: '理赔全程有人跟，省心。', tags: ['专业'] }
  ],
  m6: [
    { user: '吴**', rating: 5, date: '2026-10-20', text: '半夜搭电，15 分钟就到了。', tags: ['响应快'] }
  ]
}

/* ---------------- 首页轮播 ---------------- */
export const BANNERS = [
  { id: 'b1', title: '尊享会员 全年免服务费', desc: '99元/年 · 每月免费代驾或跑腿', action: '/pages/member/index', gradient: 'linear-gradient(135deg,#2B2A28,#4A4033)' },
  { id: 'b2', title: '道路救援 24 小时待命', desc: '搭电 · 换胎 · 拖车 · 15分钟响应', action: '/pages/rescue/index', gradient: 'linear-gradient(135deg,#E02B20,#8E0B04)' },
  { id: 'b3', title: '企业车队 一年 299', desc: '5台车统一托管 · 专属客户经理', action: '/pages/enterprise/index', gradient: 'linear-gradient(135deg,#1F3B5C,#0B1726)' }
]

/* ---------------- 平台优势 ---------------- */
export const ADVANTAGES = [
  { icon: '🧩', title: '业务最全', desc: '12 大业务链条全覆盖' },
  { icon: '🔗', title: '三端闭环', desc: '个人 · 企业 · 商家互通' },
  { icon: '🔒', title: '锁客最强', desc: '年费会员全年托管' },
  { icon: '⚡', title: '应急壁垒', desc: '24H 道路救援随叫随到' }
]
