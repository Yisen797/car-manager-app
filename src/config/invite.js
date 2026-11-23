// 「邀请有礼」前端配置与跨端工具
//
// 二维码内容只放随机邀请码，不放手机号/身份证等个人信息；
// 小程序 / App 无 location.origin，使用 INVITE_LANDING_URL 配置正式短链或小程序码地址。

import { INVITE_LIMITS } from '@/data/invite'

// H5 默认用当前域名；如需固定短链，构建时设置 VITE_INVITE_LANDING_URL
// 支持 {code} 占位符：https://cheguanjia.example.com/i/{code}
export const INVITE_LANDING_URL = String(
  (import.meta.env && import.meta.env.VITE_INVITE_LANDING_URL) || ''
).trim()

// 小程序 / App 未配置时的占位地址（生产环境务必替换）
export const INVITE_LANDING_PLACEHOLDER = 'https://cheguanjia.example.com/i'

// 二维码尺寸（px）
export const INVITE_QR_SIZE = 200

// 与后端保持一致的活动上限（仅用于页面展示）
export const INVITE_LIMIT_INFO = INVITE_LIMITS

// 待绑定邀请码 / 设备标识 / 本地绑定登记表
export const INVITE_PENDING_KEY = 'cgj_invite_pending_code'
export const INVITE_DEVICE_KEY = 'cgj_device_id'
export const INVITE_LOCAL_BINDINGS_KEY = 'cgj_invite_local_bindings'

// 邀请码字符集：去掉 I/O/0/1，避免人工输入混淆
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

/** 规范化邀请码：去空格、转大写、只保留字母数字 */
export function normalizeInviteCode(code) {
  const raw = String(code || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
  return raw.length >= 4 && raw.length <= 16 ? raw : ''
}

/** 随机邀请码：CG + 8 位，不含手机号等个人信息 */
export function generateInviteCode() {
  let out = 'CG'
  for (let i = 0; i < 8; i++) {
    out += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
  }
  return out
}

/**
 * 拼接邀请链接
 * H5：当前域名 + 登录页 + invite 参数
 * 小程序/App：INVITE_LANDING_URL（未配置时用占位地址，生产必须替换）
 */
export function buildInviteLink(code) {
  const c = normalizeInviteCode(code)
  if (!c) return ''

  if (INVITE_LANDING_URL) {
    if (INVITE_LANDING_URL.includes('{code}')) {
      return INVITE_LANDING_URL.replace(/\{code\}/g, c)
    }
    const sep = INVITE_LANDING_URL.includes('?') ? '&' : '?'
    return INVITE_LANDING_URL + sep + 'invite=' + c
  }

  // #ifdef H5
  if (typeof window !== 'undefined' && window.location && window.location.origin) {
    return window.location.origin + '/#/pages/login/index?invite=' + c
  }
  // #endif

  return INVITE_LANDING_PLACEHOLDER + '?invite=' + c
}

/** 当前端是否使用占位落地页（页面可提示"请替换正式短链"） */
export function usingPlaceholderLanding() {
  if (INVITE_LANDING_URL) return false
  // #ifdef H5
  if (typeof window !== 'undefined' && window.location && window.location.origin) return false
  // #endif
  return true
}

/* ---------------- 本地存储工具（同时兼容 uni 与 H5） ---------------- */

function storageGet(key) {
  try {
    if (typeof uni !== 'undefined' && uni.getStorageSync) return uni.getStorageSync(key)
  } catch (e) {
    // 忽略
  }
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(key)
      if (raw == null) return ''
      const parsed = JSON.parse(raw)
      // uni H5 存储格式为 {type, data}
      if (parsed && typeof parsed === 'object' && 'data' in parsed && 'type' in parsed) {
        return typeof parsed.data === 'string' ? JSON.parse(parsed.data) : parsed.data
      }
      return parsed
    }
  } catch (e) {
    // 忽略
  }
  return ''
}

function storageSet(key, value) {
  try {
    if (typeof uni !== 'undefined' && uni.setStorageSync) {
      uni.setStorageSync(key, value)
      return
    }
  } catch (e) {
    // 忽略
  }
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, JSON.stringify({ type: typeof value, data: JSON.stringify(value) }))
    }
  } catch (e) {
    // 忽略
  }
}

function storageRemove(key) {
  try {
    if (typeof uni !== 'undefined' && typeof uni.removeStorageSync === 'function') {
      uni.removeStorageSync(key)
      return
    }
  } catch (e) {
    // 忽略
  }
  try {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(key)
  } catch (e) {
    // 忽略
  }
}

export function storageGetJson(key, fallback) {
  const v = storageGet(key)
  if (!v) return fallback
  if (typeof v === 'object') return v
  try {
    return JSON.parse(v)
  } catch (e) {
    return fallback
  }
}

export function storageSetJson(key, value) {
  storageSet(key, value)
}

export function storageRemoveKey(key) {
  storageRemove(key)
}

/** 设备标识：仅用于风控去重，随机生成、不含个人信息 */
export function getDeviceId() {
  let id = storageGet(INVITE_DEVICE_KEY)
  if (typeof id === 'object') id = ''
  if (!id) {
    id = 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
    storageSet(INVITE_DEVICE_KEY, id)
  }
  return String(id)
}

/** 待绑定邀请码 */
export function getPendingInviteCode() {
  return normalizeInviteCode(storageGet(INVITE_PENDING_KEY))
}

export function setPendingInviteCode(code) {
  const c = normalizeInviteCode(code)
  if (c) storageSet(INVITE_PENDING_KEY, c)
  return c
}

export function clearPendingInviteCode() {
  storageRemove(INVITE_PENDING_KEY)
}

/** 本地绑定登记表：{ [inviteeKey]: { code, time } } */
export function readLocalBindings() {
  const map = storageGetJson(INVITE_LOCAL_BINDINGS_KEY, {})
  return map && typeof map === 'object' && !Array.isArray(map) ? map : {}
}

export function writeLocalBindings(map) {
  storageSetJson(INVITE_LOCAL_BINDINGS_KEY, map || {})
}
