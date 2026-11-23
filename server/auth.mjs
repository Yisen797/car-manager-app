// 认证：短信验证码（演示模式固定 123456）、会话令牌、管理员鉴权
import crypto from 'node:crypto'
import { findSession, createSession, deleteSession, findUserById } from './db.mjs'

const SESSION_DAYS = 30
const CODE_TTL_MS = 5 * 60 * 1000
const SEND_GAP_MS = 60 * 1000

// CGJ_DEV_SMS=0 时改走随机验证码（正式短信通道接入后使用）
export const DEV_SMS = process.env.CGJ_DEV_SMS !== '0'
export const FIXED_CODE = '123456'

const smsCodes = new Map() // phone -> { code, expires }
const lastSent = new Map() // phone -> timestamp

export function isValidPhone(phone) {
  return /^1\d{10}$/.test(String(phone || ''))
}

export function sendSms(phone) {
  const p = String(phone || '').trim()
  if (!isValidPhone(p)) return { ok: false, reason: 'phone' }

  const last = lastSent.get(p) || 0
  if (Date.now() - last < SEND_GAP_MS) {
    return { ok: false, reason: 'too-often', retryAfter: Math.ceil((SEND_GAP_MS - (Date.now() - last)) / 1000) }
  }

  const code = DEV_SMS ? FIXED_CODE : String(crypto.randomInt(100000, 1000000))
  smsCodes.set(p, { code, expires: Date.now() + CODE_TTL_MS })
  lastSent.set(p, Date.now())
  return { ok: true, expiresIn: Math.floor(CODE_TTL_MS / 1000), code: DEV_SMS ? code : undefined }
}

export function verifySms(phone, code) {
  const p = String(phone || '').trim()
  if (!isValidPhone(p)) return false
  if (DEV_SMS && String(code) === FIXED_CODE) return true
  const entry = smsCodes.get(p)
  if (!entry) return false
  if (entry.expires < Date.now()) {
    smsCodes.delete(p)
    return false
  }
  if (String(code) !== entry.code) return false
  smsCodes.delete(p)
  return true
}

export function issueToken(db, userId) {
  const token = crypto.randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400000).toISOString()
  createSession(db, userId, token, expiresAt)
  return { token, expiresAt }
}

export function bearerToken(req) {
  const h = req.headers.authorization || ''
  const m = /^Bearer\s+(.+)$/i.exec(h)
  return m ? m[1].trim() : ''
}

/** 从请求解析当前用户；无效返回 null */
export function currentUser(db, req) {
  const token = bearerToken(req)
  if (!token) return null
  const session = findSession(db, token)
  if (!session) return null
  if (session.expires_at < new Date().toISOString()) {
    deleteSession(db, token)
    return null
  }
  return findUserById(db, session.user_id) || null
}

export function revokeToken(db, token) {
  if (token) deleteSession(db, token)
}

/** 管理员密钥：环境变量 CGJ_ADMIN_KEY，演示默认值会在启动时告警 */
export function isAdmin(req) {
  const key = process.env.CGJ_ADMIN_KEY || 'cheguanjia-admin'
  const header = req.headers['x-admin-key']
  const url = new URL(req.url, 'http://localhost')
  const fromQuery = url.searchParams.get('key')
  return header === key || fromQuery === key
}
