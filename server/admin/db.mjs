// 运营后台数据层：管理员、会话、审计、内部备注、隐私申请
//
// 这些表属于后台模块自己的数据，按约定在本模块内懒创建，
// 不修改 server/db.mjs（车主业务表）。
import crypto from 'node:crypto'

/* ---------------- 建表 ---------------- */
const SCHEMA = `
CREATE TABLE IF NOT EXISTS admin_users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'ops',
  display_name TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_login_at TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS admin_sessions (
  token_hash TEXT PRIMARY KEY,
  admin_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  ip TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS admin_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor TEXT NOT NULL,
  role TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL DEFAULT '',
  target_id TEXT NOT NULL DEFAULT '',
  detail TEXT NOT NULL DEFAULT '',
  ip TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_order_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  order_id TEXT NOT NULL,
  note TEXT NOT NULL,
  actor TEXT NOT NULL,
  role TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_privacy_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  reason TEXT NOT NULL DEFAULT '',
  actor TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_created ON admin_audit(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_action ON admin_audit(action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_admin ON admin_sessions(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_notes_order ON admin_order_notes(user_id, order_id);
CREATE INDEX IF NOT EXISTS idx_admin_privacy_user ON admin_privacy_requests(user_id, created_at DESC);
`

const READY = new WeakSet()

export function ensureAdminSchema(db) {
  if (READY.has(db)) return
  db.exec(SCHEMA)
  READY.add(db)
}

/* ---------------- 通用工具 ---------------- */
export function parseJson(raw, fallback = {}) {
  try {
    const v = JSON.parse(raw)
    return v == null ? fallback : v
  } catch (e) {
    return fallback
  }
}

/** 手机号脱敏：13800138000 -> 138****8000 */
export function maskPhone(phone) {
  const s = String(phone || '')
  if (!s) return ''
  if (s.length === 11) return s.slice(0, 3) + '****' + s.slice(7)
  if (s.length > 7) return s.slice(0, 3) + '****' + s.slice(-4)
  return '***'
}

/** 只保留必要信息：去掉密码、身份证、银行卡等敏感字段，并脱敏文本里的手机号 */
const SENSITIVE_KEY = /password|passwd|secret|token|idcard|id_card|身份证|bankcard|bank_card|银行卡/i

export function sanitizeDetail(value, depth = 0) {
  if (depth > 6) return '[deep]'
  if (value == null) return value
  if (typeof value === 'string') return sanitizeText(value)
  if (typeof value === 'number' || typeof value === 'boolean') return value
  if (Array.isArray(value)) return value.map(v => sanitizeDetail(v, depth + 1))
  if (typeof value === 'object') {
    const out = {}
    for (const [k, v] of Object.entries(value)) {
      if (SENSITIVE_KEY.test(k)) continue
      out[k] = sanitizeDetail(v, depth + 1)
    }
    return out
  }
  return String(value)
}

export function sanitizeText(text) {
  return String(text).replace(/\b1\d{10}\b/g, m => maskPhone(m))
}

export function detailText(detail) {
  if (detail == null) return ''
  if (typeof detail === 'string') return sanitizeText(detail)
  try {
    return JSON.stringify(sanitizeDetail(detail))
  } catch (e) {
    return ''
  }
}

/* ---------------- 事务 ---------------- */
export function withTx(db, fn) {
  db.exec('BEGIN IMMEDIATE')
  try {
    const result = fn()
    db.exec('COMMIT')
    return result
  } catch (e) {
    try { db.exec('ROLLBACK') } catch (ignore) { /* ignore */ }
    throw e
  }
}

/* ---------------- 管理员账号 ---------------- */
export function findAdminByUsername(db, username) {
  return db.prepare('SELECT * FROM admin_users WHERE username = ?').get(String(username || ''))
}

export function findAdminById(db, id) {
  return db.prepare('SELECT * FROM admin_users WHERE id = ?').get(String(id || ''))
}

export function listAdmins(db) {
  return db.prepare(
    `SELECT id, username, role, display_name, status, created_at, updated_at, last_login_at
     FROM admin_users ORDER BY created_at`
  ).all()
}

export function insertAdmin(db, { id, username, passwordHash, role, displayName, now }) {
  db.prepare(
    `INSERT INTO admin_users (id, username, password_hash, role, display_name, status,
       created_at, updated_at, last_login_at)
     VALUES (?, ?, ?, ?, ?, 'active', ?, ?, '')`
  ).run(id, username, passwordHash, role, displayName || '', now, now)
  return findAdminById(db, id)
}

export function updateAdminPassword(db, id, passwordHash, now) {
  db.prepare('UPDATE admin_users SET password_hash = ?, updated_at = ? WHERE id = ?')
    .run(passwordHash, now, id)
}

export function updateAdminStatus(db, id, status, now) {
  db.prepare('UPDATE admin_users SET status = ?, updated_at = ? WHERE id = ?').run(status, now, id)
}

export function touchAdminLogin(db, id, now) {
  db.prepare('UPDATE admin_users SET last_login_at = ?, updated_at = ? WHERE id = ?')
    .run(now, now, id)
}

/* ---------------- 会话 ---------------- */
export function createAdminSession(db, { tokenHash, adminId, createdAt, expiresAt, ip }) {
  db.prepare(
    'INSERT INTO admin_sessions (token_hash, admin_id, created_at, expires_at, ip) VALUES (?, ?, ?, ?, ?)'
  ).run(tokenHash, adminId, createdAt, expiresAt, ip || '')
}

export function findAdminSession(db, tokenHash) {
  return db.prepare(
    `SELECT s.token_hash, s.admin_id, s.expires_at, s.ip,
            a.username, a.role, a.display_name, a.status
     FROM admin_sessions s JOIN admin_users a ON a.id = s.admin_id
     WHERE s.token_hash = ?`
  ).get(String(tokenHash || ''))
}

export function deleteAdminSession(db, tokenHash) {
  db.prepare('DELETE FROM admin_sessions WHERE token_hash = ?').run(String(tokenHash || ''))
}

export function deleteAdminSessions(db, adminId, keepHash) {
  if (keepHash) {
    db.prepare('DELETE FROM admin_sessions WHERE admin_id = ? AND token_hash <> ?')
      .run(adminId, keepHash)
  } else {
    db.prepare('DELETE FROM admin_sessions WHERE admin_id = ?').run(adminId)
  }
}

export function cleanupAdminSessions(db, nowIso) {
  db.prepare('DELETE FROM admin_sessions WHERE expires_at < ?').run(nowIso)
}

/* ---------------- 审计日志 ---------------- */
export function auditLog(db, entry) {
  db.prepare(
    `INSERT INTO admin_audit (actor, role, action, target_type, target_id, detail, ip, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    String(entry.actor || ''), String(entry.role || ''), String(entry.action || ''),
    String(entry.targetType || ''), String(entry.targetId || ''),
    detailText(entry.detail), String(entry.ip || ''), String(entry.createdAt || '')
  )
}

export function listAudit(db, { action, actor, targetType, from, to, limit, offset }) {
  const where = []
  const args = []
  if (action) { where.push('action LIKE ?'); args.push('%' + action + '%') }
  if (actor) { where.push('actor LIKE ?'); args.push('%' + actor + '%') }
  if (targetType) { where.push('target_type = ?'); args.push(targetType) }
  if (from) { where.push('created_at >= ?'); args.push(from) }
  if (to) { where.push('created_at <= ?'); args.push(to) }
  const whereSql = where.length ? ' WHERE ' + where.join(' AND ') : ''
  const total = db.prepare('SELECT COUNT(*) AS n FROM admin_audit' + whereSql).get(...args).n
  const items = db.prepare(
    `SELECT * FROM admin_audit${whereSql} ORDER BY id DESC LIMIT ? OFFSET ?`
  ).all(...args, limit, offset)
  return { total: Number(total) || 0, items }
}

/* ---------------- 订单内部备注 ---------------- */
export function addOrderNote(db, { userId, orderId, note, actor, role, now }) {
  db.prepare(
    'INSERT INTO admin_order_notes (user_id, order_id, note, actor, role, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(userId, orderId, note, actor, role, now)
  const id = db.prepare('SELECT last_insert_rowid() AS id').get().id
  return { id, userId, orderId, note, actor, role, createdAt: now }
}

export function listOrderNotes(db, userId, orderId) {
  return db.prepare(
    `SELECT id, note, actor, role, created_at AS createdAt
     FROM admin_order_notes WHERE user_id = ? AND order_id = ? ORDER BY id`
  ).all(userId, orderId)
}

/* ---------------- 隐私申请（导出/删除） ---------------- */
export function addPrivacyRequest(db, { userId, type, reason, actor, now }) {
  db.prepare(
    'INSERT INTO admin_privacy_requests (user_id, type, status, reason, actor, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(userId, type, 'pending', reason, actor, now)
  return db.prepare('SELECT last_insert_rowid() AS id').get().id
}

export function listPrivacyRequests(db, limit = 50, offset = 0) {
  return db.prepare(
    `SELECT id, user_id AS userId, type, status, reason, actor, created_at AS createdAt
     FROM admin_privacy_requests ORDER BY id DESC LIMIT ? OFFSET ?`
  ).all(limit, offset)
}

/* ---------------- 车主数据版本 ---------------- */
/** 后台改动了车主数据后递增 revision，令客户端下次推送得到 409 并重新拉取 */
export function bumpUserRevision(db, userId, now) {
  const row = db.prepare('SELECT revision FROM user_prefs WHERE user_id = ?').get(String(userId || ''))
  if (!row) return null
  const revision = (Number(row.revision) || 1) + 1
  db.prepare('UPDATE user_prefs SET revision = ?, updated_at = ? WHERE user_id = ?')
    .run(revision, now, userId)
  return revision
}

export function newAdminId() {
  return 'adm' + Date.now().toString(36) + crypto.randomBytes(3).toString('hex')
}
