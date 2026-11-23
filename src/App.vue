<script>
import {
  loadState, state, isStorageLocked, getStorageInfo, clearLocalData
} from '@/store/index'
import { requestLocation } from '@/utils/location'
import { hasAskedPermissions, markPermissionsAsked } from '@/utils/permissions'
import { bootstrapCloud } from '@/api/sync'
import {
  captureInviteCode, captureInviteFromUrl, bindPendingInvite
} from '@/api/invite'

let lockDialogShown = false
let permissionPromptShown = false

// 登录门禁：未登录统一进登录页；已登录时不停留在登录页
function guardLogin(retry = 0) {
  if (isStorageLocked()) return
  const pages = getCurrentPages()
  if (!pages || !pages.length) {
    if (retry < 10) setTimeout(() => guardLogin(retry + 1), 100)
    return
  }
  const current = pages[pages.length - 1]
  const route = (current && current.route) || ''
  const loggedIn = !!(state.user && state.user.loggedIn)

  if (!loggedIn && route !== 'pages/login/index') {
    uni.reLaunch({ url: '/pages/login/index' })
    return
  }
  if (loggedIn && route === 'pages/login/index') {
    uni.reLaunch({ url: '/pages/index/index' })
  }
}

// 首次启动：引导用户开启定位权限（调用定位会触发系统权限弹窗）
function showPermissionIntro(retry = 0) {
  if (isStorageLocked()) return
  if (hasAskedPermissions()) return
  const pages = getCurrentPages()
  if (!pages || !pages.length) {
    if (retry < 10) setTimeout(() => showPermissionIntro(retry + 1), 100)
    return
  }
  if (permissionPromptShown) return
  permissionPromptShown = true

  uni.showModal({
    title: '开启定位权限',
    content: '为了推荐附近商家和门店、自动匹配所在城市及定位救援位置，车管家需要获取您的位置信息。您可以选择暂不开启，并随时在系统设置中关闭。',
    confirmText: '去开启',
    cancelText: '暂不',
    success: res => {
      markPermissionsAsked()
      // 确认后调用一次定位，触发系统的定位权限弹窗
      if (res.confirm) requestLocation()
    }
  })
}

// 本地数据版本高于当前 App：提示升级或清除数据，防止旧 App 覆盖新数据
function handleStorageLock(retry = 0) {
  if (!isStorageLocked()) {
    lockDialogShown = false
    return
  }
  if (lockDialogShown) return
  const pages = getCurrentPages()
  if (!pages || !pages.length) {
    if (retry < 10) setTimeout(() => handleStorageLock(retry + 1), 100)
    return
  }

  lockDialogShown = true
  const info = getStorageInfo()
  uni.showModal({
    title: '需要更新 App',
    content: `本机数据版本（v${info.storedSchema}）高于当前 App（v${info.currentSchema}）。请升级 App 后继续；如暂时无法升级，可清除本地数据重新开始。`,
    confirmText: '清除本地数据',
    cancelText: '稍后',
    confirmColor: '#E02B20',
    success: res => {
      if (!res.confirm) return
      clearLocalData()
      uni.reLaunch({ url: '/pages/login/index' })
    }
  })
}

// 安卓 APK 原生壳中接管系统返回键：应用内返回，到栈底才退出
function setupNativeBack(retried) {
  // #ifdef H5
  const Cap = typeof window !== 'undefined' ? window.Capacitor : null
  if (!Cap || !Cap.Plugins || !Cap.Plugins.App) {
    if (!retried) setTimeout(() => setupNativeBack(true), 600)
    return
  }
  Cap.Plugins.App.addListener('backButton', () => {
    const pages = getCurrentPages()
    if (pages && pages.length > 1) {
      uni.navigateBack()
    } else {
      Cap.Plugins.App.exitApp()
    }
  })
  // #endif
}

export default {
  onLaunch(options) {
    // 邀请链接：先生成/保存待绑定邀请码（登录成功后再绑定）
    const invite = options && options.query && options.query.invite
    if (invite) captureInviteCode(invite)
    else captureInviteFromUrl()

    const ok = loadState()
    setupNativeBack(false)
    // 配置了后端且本地有令牌时，从云端恢复数据（异步，不阻塞启动）
    if (ok) bootstrapCloud()
    setTimeout(ok ? guardLogin : handleStorageLock, 0)
    if (ok) setTimeout(showPermissionIntro, 900)

    // #ifdef H5
    if (typeof window !== 'undefined') {
      window.addEventListener('hashchange', () => setTimeout(guardLogin, 60))
    }
    // #endif
  },
  onShow() {
    if (isStorageLocked()) {
      setTimeout(handleStorageLock, 0)
      return
    }
    // 已登录用户扫码/点链接：直接尝试绑定（服务端幂等，已绑定会返回 already）
    captureInviteFromUrl()
    if (state.user && state.user.loggedIn) {
      bindPendingInvite({ waitMs: 800 }).then(res => {
        if (res && res.already) {
          uni.showToast({ title: '当前账号已绑定过邀请人', icon: 'none' })
        }
      }).catch(() => {})
    }
    setTimeout(guardLogin, 0)
  },
  onHide() {}
}
</script>

<style>
@import './styles/common.css';

/* H5 宽屏预览：把应用约束成手机宽度并居中 */
@media screen and (min-width: 520px) {
  body {
    background: #0E1218;
  }
  uni-app {
    max-width: 480px;
    margin: 0 auto;
    min-height: 100vh;
    background: #F4F5F7;
    box-shadow: 0 0 80px rgba(0, 0, 0, 0.55);
  }
  uni-page-body {
    background: #F4F5F7;
  }
}
</style>
