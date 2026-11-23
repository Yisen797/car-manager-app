import { TRAVEL_CONFIG, isConfigured } from '@/config/travel'

export function amapReady() {
  return isConfigured(TRAVEL_CONFIG.amap.h5Url)
}

export function tencentReady() {
  return isConfigured(TRAVEL_CONFIG.tencent.appId)
}

// 高德打车：H5 / App 内嵌打开；小程序端不支持内嵌第三方页面，改为复制渠道链接
export function openAmapTaxi() {
  const url = TRAVEL_CONFIG.amap.h5Url
  if (!amapReady()) {
    uni.showModal({
      title: '高德打车',
      content: '渠道链接尚未配置，请联系管理员。',
      showCancel: false
    })
    return
  }

  // #ifdef MP-WEIXIN
  uni.showModal({
    title: '高德打车',
    content: '小程序内暂不支持内嵌第三方打车页面，可复制链接在浏览器中打开。',
    confirmText: '复制链接',
    success: res => {
      if (!res.confirm) return
      uni.setClipboardData({
        data: url,
        success: () => uni.showToast({ title: '链接已复制', icon: 'none' })
      })
    }
  })
  return
  // #endif

  // #ifndef MP-WEIXIN
  uni.navigateTo({ url: '/pages/travel/webview?src=' + encodeURIComponent(url) })
  // #endif
}

// 腾讯出行：小程序端一键跳转；其他端给出使用指引
export function openTencentTaxi() {
  if (!tencentReady()) {
    uni.showModal({
      title: '腾讯出行',
      content: '腾讯出行渠道正在接入中，可先使用高德打车。',
      showCancel: false
    })
    return
  }

  // #ifdef MP-WEIXIN
  uni.navigateToMiniProgram({
    appId: TRAVEL_CONFIG.tencent.appId,
    path: TRAVEL_CONFIG.tencent.path,
    extraData: { channelId: TRAVEL_CONFIG.tencent.channelId },
    fail: () =>
      uni.showModal({
        title: '跳转失败',
        content: '请稍后重试，或确认微信版本支持跳转小程序。',
        showCancel: false
      })
  })
  // #endif

  // #ifndef MP-WEIXIN
  uni.showModal({
    title: '腾讯出行',
    content: '腾讯出行需在微信小程序内使用：请在微信中搜索「腾讯出行」，或直接使用高德打车。',
    showCancel: false
  })
  // #endif
}
