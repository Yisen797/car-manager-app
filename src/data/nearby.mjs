// 附近门店（高德 POI 周边搜索）分类与演示数据
// 前后端共用：server/integrations/amap.mjs 在未配置 Key 或上游失败时返回这里的演示数据

export const NEARBY_CATEGORIES = [
  { id: 'wash', name: '洗车美容', icon: '🚿', keyword: '洗车' },
  { id: 'maintain', name: '维修保养', icon: '🔧', keyword: '汽车维修' },
  { id: 'rescue', name: '道路救援', icon: '🆘', keyword: '汽车救援' },
  { id: 'charge', name: '充电桩', icon: '⚡', keyword: '充电桩' },
  { id: 'fuel', name: '加油站', icon: '⛽', keyword: '加油站' },
  { id: 'parking', name: '停车场', icon: '🅿️', keyword: '停车场' }
]

// 服务详情页 → 附近门店分类
export const SERVICE_POI_CATEGORY = {
  wash: 'wash',
  maintain: 'maintain',
  rescue: 'rescue'
}

export const DEMO_POIS = {
  wash: [
    { id: 'demo_wash_1', name: '车管家合作洗车（演示）', address: '演示数据 · 配置高德 Key 后显示真实地址', distance: 620, rating: 4.9, tags: ['精洗', '内饰清洁'] },
    { id: 'demo_wash_2', name: '极速洗车工坊（演示）', address: '演示数据 · 配置高德 Key 后显示真实地址', distance: 1300, rating: 4.7, tags: ['快速洗车', '打蜡'] },
    { id: 'demo_wash_3', name: '车享家美容中心（演示）', address: '演示数据 · 配置高德 Key 后显示真实地址', distance: 2400, rating: 4.8, tags: ['镀晶', '贴膜'] }
  ],
  maintain: [
    { id: 'demo_repair_1', name: '途虎养车工场店（演示）', address: '演示数据 · 配置高德 Key 后显示真实地址', distance: 900, rating: 4.9, tags: ['保养', '轮胎'] },
    { id: 'demo_repair_2', name: '京诚汽车维修中心（演示）', address: '演示数据 · 配置高德 Key 后显示真实地址', distance: 1800, rating: 4.8, tags: ['机修', '钣金'] },
    { id: 'demo_repair_3', name: '车管家认证维修站（演示）', address: '演示数据 · 配置高德 Key 后显示真实地址', distance: 3100, rating: 4.6, tags: ['检测', '喷漆'] }
  ],
  rescue: [
    { id: 'demo_rescue_1', name: '24H 极速救援（演示）', address: '演示数据 · 配置高德 Key 后显示真实地址', distance: 800, rating: 5.0, tags: ['搭电', '拖车'] },
    { id: 'demo_rescue_2', name: '道路救援服务点（演示）', address: '演示数据 · 配置高德 Key 后显示真实地址', distance: 2600, rating: 4.7, tags: ['补胎', '脱困'] },
    { id: 'demo_rescue_3', name: '高速救援协作站（演示）', address: '演示数据 · 配置高德 Key 后显示真实地址', distance: 4800, rating: 4.6, tags: ['高速救援', '拖离'] }
  ],
  charge: [
    { id: 'demo_charge_1', name: '快充站 A（演示）', address: '演示数据 · 配置高德 Key 后显示真实地址', distance: 700, rating: 4.5, tags: ['快充', '24小时'] },
    { id: 'demo_charge_2', name: '商场地下充电站（演示）', address: '演示数据 · 配置高德 Key 后显示真实地址', distance: 1500, rating: 4.4, tags: ['慢充', '停车'] },
    { id: 'demo_charge_3', name: '超充中心（演示）', address: '演示数据 · 配置高德 Key 后显示真实地址', distance: 3200, rating: 4.8, tags: ['超充', '休息区'] }
  ],
  fuel: [
    { id: 'demo_fuel_1', name: '加油站 A（演示）', address: '演示数据 · 配置高德 Key 后显示真实地址', distance: 1100, rating: 4.3, tags: ['92#', '95#'] },
    { id: 'demo_fuel_2', name: '加油站 B（演示）', address: '演示数据 · 配置高德 Key 后显示真实地址', distance: 2400, rating: 4.2, tags: ['洗车', '便利店'] },
    { id: 'demo_fuel_3', name: '加油站 C（演示）', address: '演示数据 · 配置高德 Key 后显示真实地址', distance: 3900, rating: 4.0, tags: ['98#', '柴油'] }
  ],
  parking: [
    { id: 'demo_park_1', name: '地面停车场（演示）', address: '演示数据 · 配置高德 Key 后显示真实地址', distance: 500, rating: 4.1, tags: ['地上', '临停'] },
    { id: 'demo_park_2', name: '商场地下停车场（演示）', address: '演示数据 · 配置高德 Key 后显示真实地址', distance: 1400, rating: 4.3, tags: ['地下', '充电'] },
    { id: 'demo_park_3', name: '立体停车楼（演示）', address: '演示数据 · 配置高德 Key 后显示真实地址', distance: 2800, rating: 4.0, tags: ['立体', '月租'] }
  ]
}

export function demoPois(category) {
  return (DEMO_POIS[category] || []).map(p => ({ ...p, source: 'demo' }))
}
