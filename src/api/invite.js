// 邀请有礼：云端接口 + 邀请参数捕获
//
// 设计：
// - 邀请码/绑定/领奖以服务端为准（server/invite），前端只负责展示与传参
// - 未登录时把 invite 参数暂存到本地，登录成功后自动绑定
// - 纯本地模式（未配置 VITE_API_BASE）用 store 内同一套规则，防止重复计数
import { request, cloudEnabled, getToken } from './client'
import {
  normalizeInviteCode, getDeviceId, getPendingInviteCode,
  setPendingInviteCode, clearPendingInviteCode
} from '@/config/invite'
import { bindInviterLocally } from '@/store/index'

/** 云端邀请能力是否可用（已配置后端且已登录） */
export function inviteCloudReady() {
  return cloudEnabled() && !!getToken()
}

export function isCloudMode() {
  return cloudEnabled()
}

/** 读取服务端真实邀请数据（邀请人数/记录/已领取/绑定的邀请人） */
export async function fetchInviteMe() {
  if (!inviteCloudReady()) return null
  const res = await request('/api/invite/me', { timeout: 8000 })
  return res && res.invite ? res.invite : null
}

/** 绑定邀请人（服务端幂等：重复绑定返回 already=true，不重复计数） */
export async function bindInviteCode(code) {
  const c = normalizeInviteCode(code)
  if (!c) throw Object.assign(new Error('邀请码格式不正确'), { code: 'code', status: 400 })
  const res = await request('/api/invite/bind', {
    method: 'POST',
    data: { code: c, device: getDeviceId() }
  })
  return res
}

/** 领取阶梯奖励（服务端幂等：已领取返回 already=true，不重复发放） */
export async function claimInviteRemote(rewardId) {
  const res = await request('/api/invite/claim', {
    method: 'POST',
    data: { rewardId: String(rewardId || ''), device: getDeviceId() }
  })
  return res
}

/* ---------------- 邀请参数捕获 ---------------- */

/** 暂存邀请码（未登录时先存本地，登录后绑定） */
export function captureInviteCode(code) {
  const c = normalizeInviteCode(code)
  if (!c) return ''
  setPendingInviteCode(c)
  return c
}

/**
 * 从当前 URL 读取 invite 参数（H5）
 * 支持 #/pages/login/index?invite=CODE 与 ?invite=CODE 两种形式
 */
export function captureInviteFromUrl() {
  if (typeof window === 'undefined' || !window.location) return ''
  const sources = [window.location.hash || '', window.location.search || '']
  for (const src of sources) {
    const m = /(?:^|[?&#])invite=([A-Za-z0-9]{4,16})/.exec(src)
    if (m) return captureInviteCode(m[1])
  }
  return ''
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// 登录接口是异步的：等令牌落盘后再绑定（最多等 waitMs）
async function waitForToken(waitMs) {
  if (!cloudEnabled()) return ''
  if (getToken()) return getToken()
  const start = Date.now()
  while (Date.now() - start < waitMs) {
    await sleep(150)
    if (getToken()) return getToken()
  }
  return ''
}

/**
 * 登录后绑定暂存的邀请码
 * @param {{waitMs?:number}} options
 * @returns {Promise<object>} 绑定结果；网络异常时保留待绑定参数，下次再试
 */
export async function bindPendingInvite(options = {}) {
  const code = getPendingInviteCode()
  if (!code) return { ok: false, skipped: true }

  // 纯本地模式：使用 store 内的本地规则
  if (!cloudEnabled()) {
    const res = bindInviterLocally(code)
    if (res.ok) clearPendingInviteCode()
    return res
  }

  const token = await waitForToken(options.waitMs != null ? options.waitMs : 4000)
  if (!token) return { ok: false, pending: true, reason: 'no-token' }

  try {
    const res = await bindInviteCode(code)
    clearPendingInviteCode()
    return res
  } catch (e) {
    // 邀请码无效 / 已绑定 / 自己邀自己：不再重试
    if (e.status && e.status >= 400 && e.status < 500 && e.status !== 429) {
      clearPendingInviteCode()
      return { ok: false, reason: e.code || 'failed', message: e.message }
    }
    // 网络或限流：保留，下次启动/进入邀请页再试
    return { ok: false, pending: true, reason: e.code || 'network', message: e.message }
  }
}
