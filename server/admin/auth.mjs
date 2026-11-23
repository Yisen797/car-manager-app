// 运营后台认证：密码哈希（scrypt）、会话令牌、角色权限、登录限流、兼容密钥
import crypto from 'node:crypto'
import { findAdminByUsername, insertAdmin, newAdminId } from './db.mjs'

/* ---------------- 角色与权限 ---------------- */
export const ROLES = ['super', 'ops', 'finance', 'support']

const ROLE_PERMS = {
  // 超级管理员：全部权限
  super: ['*'],
  // 运营：订单（含取消）、商家入驻审核、用户只读
  ops: [
    'overview', 'orders:read', 'orders:cancel', 'orders:notes',
    'merchants:read', 'applications:read', 'applications:review', 'users:read'
  ],
  // 财务：订单查询/退款（取消）、发票开具
  finance: [
    'overview', 'orders:read', 'orders:cancel',
    'invoices:read', 'invoices:issue', 'users:read', 'merchants:read'
  ],
  // 客服：反馈处理、用户只读、订单只读
  support: [
    'overview', 'orders:read', 'feedbacks:read', 'feedbacks:handle', 'users:read'
  ]
}

export function permissionsOf(role) {
  return (ROLE_PERMS[role] || []).slice()
}

export function can(role, permission) {
  const perms = ROLE_PERMS[role] || []
  return perms.includes('*') || perms.includes(permission)
}

export function isValidRole(role) {
  return ROLES.includes(role)
}

/* ---------------- 密码 ---------------- */
const SCRYPT = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }
const KEY_LEN = 64

export function hashPassword(password) {
  const salt = crypto.randomBytes(16)
  const key = crypto.scryptSync(String(password), salt, KEY_LEN, SCRYPT)
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString('hex')}$${key.toString('hex')}`
}

export function verifyPassword(password, stored) {
  try {
    const parts = String(stored || '').split('$')
    if (parts.length !== 6 || parts[0] !== 'scrypt') return false
    const [, n, r, p, saltHex, hashHex] = parts
    const salt = Buffer.from(saltHex, 'hex')
    const expected = Buffer.from(hashHex, 'hex')
    if (!salt.length || !expected.length) return false
    const actual = crypto.scryptSync(String(password), salt, expected.length, {
      N: Number(n), r: Number(r), p: Number(p), maxmem: SCRYPT.maxmem
    })
    return actual.length === expected.length && crypto.timingSafeEqual(expected, actual)
  } catch (e) {
    return false
  }
}

export function validatePassword(password) {
  const s = String(password || '')
  if (s.length < 8) return '密码至少 8 位'
  if (s.length > 128) return '密码过长'
  if (!/[A-Za-z]/.test(s) || !/\d/.test(s)) return '密码需同时包含字母和数字'
  return ''
}

// 用户不存在时也执行一次 scrypt，避免通过响应时间枚举管理员账号
let dummyHash = ''
export function equalizeVerifyTiming(password) {
  if (!dummyHash) dummyHash = hashPassword('dummy-password-123')
  verifyPassword(password, dummyHash)
}

/* ---------------- 会话令牌 ---------------- */
export const SESSION_HOURS = 8

export function newAdminToken() {
  return crypto.randomBytes(32).toString('base64url')
}

export function sha256(text) {
  return crypto.createHash('sha256').update(String(text)).digest('hex')
}

export function bearerToken(req) {
  const h = req.headers.authorization || ''
  const m = /^Bearer\s+(.+)$/i.exec(h)
  return m ? m[1].trim() : ''
}

/** 校验管理员 Bearer 令牌；无效/过期/停用返回 null */
export function authenticateAdmin(db, req) {
  const token = bearerToken(req)
  if (!token) return null
  const tokenHash = sha256(token)
  const row = db.prepare(
    `SELECT s.token_hash, s.admin_id, s.expires_at,
            a.username, a.role, a.display_name, a.status
     FROM admin_sessions s JOIN admin_users a ON a.id = s.admin_id
     WHERE s.token_hash = ?`
  ).get(tokenHash)
  if (!row) return null
  const nowIso = new Date().toISOString()
  if (row.status !== 'active' || row.expires_at < nowIso) {
    db.prepare('DELETE FROM admin_sessions WHERE token_hash = ?').run(tokenHash)
    return null
  }
  return {
    kind: 'admin',
    tokenHash,
    id: row.admin_id,
    username: row.username,
    role: row.role,
    displayName: row.display_name || row.username
  }
}

/* ---------------- 引导账号 ---------------- */
/**
 * 引导账号来源：
 *   1. CGJ_ADMIN_USER / CGJ_ADMIN_PASSWORD
 *   2. 开发环境（非 production）默认 admin / cheguanjia-admin
 *   3. production 且未配置 -> 禁止登录
 */
export function bootstrapCreds() {
  const username = String(process.env.CGJ_ADMIN_USER || '').trim()
  const password = String(process.env.CGJ_ADMIN_PASSWORD || '')
  if (username && password) return { username, password, source: 'env' }
  if (process.env.NODE_ENV === 'production') return null
  return { username: 'admin', password: 'cheguanjia-admin', source: 'default' }
}

let warnedDefault = false
export function warnDefaultCreds() {
  if (warnedDefault) return
  warnedDefault = true
  console.warn(
    '[admin] 警告：正在使用开发默认管理员账号 admin / cheguanjia-admin，' +
    '请设置 CGJ_ADMIN_USER 与 CGJ_ADMIN_PASSWORD，并在首次登录后修改密码。'
  )
}

/** 首次登录时按引导账号创建管理员记录（之后以数据库中的密码为准） */
export function createBootstrapAdmin(db, { username, password, now }) {
  const admin = insertAdmin(db, {
    id: newAdminId(),
    username,
    passwordHash: hashPassword(password),
    role: 'super',
    displayName: '超级管理员',
    now
  })
  const creds = bootstrapCreds()
  if (creds && creds.source === 'default') warnDefaultCreds()
  return admin
}

/* ---------------- 登录限流（同 IP + 账号 15 分钟 5 次） ---------------- */
const LOGIN_WINDOW_MS = 15 * 60 * 1000
const LOGIN_MAX_FAILS = 5
const loginAttempts = new Map()

function rateKey(ip, username) {
  return `${ip || '-'}|${String(username || '').toLowerCase()}`
}

/** 检查是否已被限流；返回 { ok, retryAfter } */
export function checkLoginRate(ip, username) {
  const key = rateKey(ip, username)
  const rec = loginAttempts.get(key)
  if (!rec) return { ok: true }
  const now = Date.now()
  if (now - rec.firstAt > LOGIN_WINDOW_MS) {
    loginAttempts.delete(key)
    return { ok: true }
  }
  if (rec.blockedUntil && now < rec.blockedUntil) {
    return { ok: false, retryAfter: Math.ceil((rec.blockedUntil - now) / 1000) }
  }
  return { ok: true }
}

export function noteLoginFailure(ip, username) {
  const key = rateKey(ip, username)
  const now = Date.now()
  let rec = loginAttempts.get(key)
  if (!rec || now - rec.firstAt > LOGIN_WINDOW_MS) {
    rec = { firstAt: now, count: 0, blockedUntil: 0 }
    loginAttempts.set(key, rec)
  }
  rec.count += 1
  if (rec.count >= LOGIN_MAX_FAILS) rec.blockedUntil = now + LOGIN_WINDOW_MS
  if (loginAttempts.size > 5000) {
    for (const [k, v] of loginAttempts) {
      if (now - v.firstAt > LOGIN_WINDOW_MS && (!v.blockedUntil || now > v.blockedUntil)) {
        loginAttempts.delete(k)
      }
    }
  }
}

export function clearLoginFailures(ip, username) {
  loginAttempts.delete(rateKey(ip, username))
}

/* ---------------- 兼容：x-admin-key ---------------- */
/**
 * 旧版管理端密钥。测试与旧脚本仍在使用。
 * production 且未显式设置 CGJ_ADMIN_KEY 时禁用默认密钥。
 */
export function legacyKeyState(req) {
  const header = req.headers['x-admin-key']
  let queryKey = ''
  try {
    queryKey = new URL(req.url || '/', 'http://localhost').searchParams.get('key') || ''
  } catch (e) {
    queryKey = ''
  }
  const supplied = header || queryKey
  if (!supplied) return false
  const envKey = process.env.CGJ_ADMIN_KEY
  if (!envKey && process.env.NODE_ENV === 'production') return false
  const expected = envKey || 'cheguanjia-admin'
  // 定长比较，降低时序侧信道风险
  const a = Buffer.from(String(supplied))
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

export function legacyAdmin() {
  return {
    kind: 'legacy',
    tokenHash: '',
    id: 'admin-key',
    username: 'admin-key',
    role: 'super',
    displayName: '兼容密钥'
  }
}

/* ---------------- 请求元信息 ---------------- */
export function clientIp(req) {
  const ip = (req.socket && req.socket.remoteAddress) || ''
  return String(ip).replace(/^::ffff:/, '')
}
