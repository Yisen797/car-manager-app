// 出行服务接入配置
// 依据《四种接入方案对比表》的落地建议：高德 H5 内嵌（主）+ 腾讯出行跳转（补充）
//
// 正式上线前需要替换：
// 1. 高德打车：在「高德易行 / 高德开放平台 · 渠道推广」后台申请渠道，
//    拿到专属 H5 链接（通常带 channelId 参数）。渠道号决定佣金结算。
// 2. 腾讯出行：申请渠道号后，把小程序 AppID、跳转路径、channelId 填进来。
//
// 未配置时：高德入口使用演示链接，腾讯入口显示「待接入」，不会报错。

export const TRAVEL_CONFIG = {
  amap: {
    name: '高德打车',
    carrier: '高德打车及其合作运力',
    // 演示链接；正式环境请替换为渠道后台生成的 H5 链接
    h5Url: 'https://m.amap.com/',
    channelId: ''
  },
  tencent: {
    name: '腾讯出行',
    carrier: '腾讯出行服务',
    // 填入后小程序端开启「一键叫车」
    appId: '',
    path: 'pages/index/index',
    channelId: ''
  }
}

// 占位符视作未配置
export function isConfigured(value) {
  return !!value && !/^(YOUR_|请填写|xxx)/i.test(String(value))
}
