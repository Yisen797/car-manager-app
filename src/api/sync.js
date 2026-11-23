// 云端同步层：本地优先，后端可选
//
// 设计：
// - 本地 state 仍是 UI 的唯一同步数据源（页面无需改成 async）
// - 每次 saveState 防抖 800ms 后整包 PUT 到后端
// - 登录时换取令牌并拉取云端数据；云端 revision 做乐观并发控制
// - 后端不可达时静默退回本地模式，稍后自动重试
import { state, setPersistHook, setCloudHooks, applyRemoteState } from '@/store/index'
import { SYNC_DELAY } from '@/config/api'
import { cloudEnabled, request, getToken, setToken, clearToken } from './client'

// 云端数据版本号持久化：重启后继续用同一个 baseRevision 做并发校验
const REV_KEY = 'car_manager_cloud_revision'

let revision = 0
let pushTimer = null

function readRevision() {
  try {
    return Number(uni.getStorageSync(REV_KEY)) || 0
  } catch (e) {
    return 0
  }
}

function setRevision(n) {
  revision = Number(n) || 0
  try {
    uni.setStorageSync(REV_KEY, revision)
  } catch (e) {
    // 忽略存储异常
  }
  return revision
}

revision = readRevision()
let pushInFlight = false
let pendingPush = false
let retryTimer = null
let retryDelay = 3000

function online() {
  return cloudEnabled() && !!getToken()
}

/* ---------------- 登录 / 退出 ---------------- */
async function onLogin({ type, phone, code }) {
  if (!cloudEnabled()) return
  try {
    const res = type === 'wechat'
      ? await request('/api/auth/wechat', { method: 'POST', data: { phone } })
      : await request('/api/auth/login', { method: 'POST', data: { phone, code } })

    if (!res || !res.token) return
    setToken(res.token)
    setRevision(res.state && res.state.revision)
    if (res.state) applyRemoteState(res.state)
  } catch (e) {
    // 后端不可用时继续使用本地数据，不打断登录
    console.warn('[cloud] 登录同步失败：' + e.message)
  }
}

async function onLogout() {
  if (!cloudEnabled()) return
  try {
    if (getToken()) await request('/api/auth/logout', { method: 'POST' })
  } catch (e) {
    // 忽略：本地退出以本地为准
  }
  clearToken()
  setRevision(0)
  pendingPush = false
}

/* ---------------- 拉取 ---------------- */
/**
 * 启动时从云端恢复数据（有令牌才执行）。
 * @returns {Promise<boolean>} 是否成功拉取
 */
export async function bootstrapCloud() {
  if (!online()) return false
  try {
    const remote = await request('/api/state', { timeout: 8000 })
    setRevision(remote.revision)
    applyRemoteState(remote)
    return true
  } catch (e) {
    if (e.status === 401) clearToken()
    else scheduleRetry()
    return false
  }
}

/* ---------------- 推送 ---------------- */
function schedulePush() {
  if (!online()) return
  clearTimeout(pushTimer)
  pushTimer = setTimeout(() => {
    pushTimer = null
    pushNow()
  }, SYNC_DELAY)
}

async function pushNow() {
  if (!online()) return false
  if (pushInFlight) {
    pendingPush = true
    return false
  }
  pushInFlight = true
  try {
    const snapshot = JSON.parse(JSON.stringify(state))
    const res = await request('/api/state', {
      method: 'PUT',
      data: { state: snapshot, baseRevision: revision }
    })
    setRevision(res && res.revision != null ? res.revision : revision)
    retryDelay = 3000
    if (pendingPush) {
      pendingPush = false
      schedulePush()
    }
    return true
  } catch (e) {
    if (e.status === 409) {
      // 其他设备已写入新版本：以云端为准，重新拉取
      try {
        const remote = await request('/api/state')
        setRevision(remote.revision)
        applyRemoteState(remote)
      } catch (err) {
        scheduleRetry()
      }
    } else if (e.status === 401) {
      clearToken()
      setRevision(0)
    } else {
      scheduleRetry()
    }
    return false
  } finally {
    pushInFlight = false
  }
}

function scheduleRetry() {
  if (!cloudEnabled()) return
  clearTimeout(retryTimer)
  retryTimer = setTimeout(() => {
    retryTimer = null
    if (getToken()) pushNow()
  }, retryDelay)
  retryDelay = Math.min(retryDelay * 2, 60000)
}

/* ---------------- 对外 ---------------- */
/** 立即同步（设置页手动触发 / 调试用） */
export function syncNow() {
  clearTimeout(pushTimer)
  pushTimer = null
  return pushNow()
}

/** 同步状态快照，仅用于界面展示 */
export function cloudStatus() {
  return {
    enabled: cloudEnabled(),
    authenticated: !!getToken(),
    revision,
    pending: pushInFlight || !!pushTimer || pendingPush
  }
}

if (cloudEnabled()) {
  setPersistHook(schedulePush)
  setCloudHooks({ login: onLogin, logout: onLogout })
}
