// SQLite 数据层：建表、种子数据、用户状态读写
// 依赖 Node 内置 node:sqlite（Node >= 22.5），无需 npm install
import { DatabaseSync } from 'node:sqlite'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { CARS, ORDERS, COUPONS, MERCHANTS, INITIAL_MESSAGES } from '../src/data/seed.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export const DATA_DIR = process.env.CGJ_DATA_DIR || path.join(__dirname, 'data')

export function formatNow(d = new Date()) {
  const p = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

export function monthKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function uid(prefix) {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

/* ---------------- 建表 ---------------- */
const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  phone TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL DEFAULT '',
  avatar TEXT NOT NULL DEFAULT '',
  member_tier TEXT NOT NULL DEFAULT 'none',
  member_expire TEXT NOT NULL DEFAULT '',
  points INTEGER NOT NULL DEFAULT 0,
  balance INTEGER NOT NULL DEFAULT 0,
  role TEXT NOT NULL DEFAULT 'user',
  merchant_app_id TEXT NOT NULL DEFAULT '',
  merchant_id TEXT NOT NULL DEFAULT '',
  login_type TEXT NOT NULL DEFAULT '',
  login_time TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_prefs (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  city TEXT NOT NULL DEFAULT '北京',
  lng REAL,
  lat REAL,
  location_source TEXT NOT NULL DEFAULT 'manual',
  location_updated_at TEXT NOT NULL DEFAULT '',
  settings_json TEXT NOT NULL DEFAULT '{}',
  search_json TEXT NOT NULL DEFAULT '[]',
  free_usage_json TEXT NOT NULL DEFAULT '{}',
  current_car_id TEXT NOT NULL DEFAULT '',
  invite_count INTEGER NOT NULL DEFAULT 0,
  invite_claimed_json TEXT NOT NULL DEFAULT '[]',
  last_order_id TEXT NOT NULL DEFAULT '',
  revision INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cars (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  plate TEXT NOT NULL DEFAULT '',
  data_json TEXT NOT NULL,
  PRIMARY KEY (user_id, id)
);

CREATE TABLE IF NOT EXISTS orders (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT '',
  amount REAL NOT NULL DEFAULT 0,
  merchant TEXT NOT NULL DEFAULT '',
  create_time TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL,
  data_json TEXT NOT NULL,
  PRIMARY KEY (user_id, id)
);

CREATE TABLE IF NOT EXISTS coupons (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  amount REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT '',
  expire TEXT NOT NULL DEFAULT '',
  data_json TEXT NOT NULL,
  PRIMARY KEY (user_id, id)
);

CREATE TABLE IF NOT EXISTS merchant_apps (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  data_json TEXT NOT NULL,
  PRIMARY KEY (user_id, id)
);

CREATE TABLE IF NOT EXISTS enterprise_apps (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  company TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT '',
  data_json TEXT NOT NULL,
  PRIMARY KEY (user_id, id)
);

CREATE TABLE IF NOT EXISTS merchants (
  id TEXT PRIMARY KEY,
  city TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL DEFAULT '',
  owner_user_id TEXT,
  data_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL DEFAULT '',
  read INTEGER NOT NULL DEFAULT 0,
  time TEXT NOT NULL DEFAULT '',
  data_json TEXT NOT NULL,
  PRIMARY KEY (user_id, id)
);

CREATE TABLE IF NOT EXISTS points_log (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  amount INTEGER NOT NULL DEFAULT 0,
  time TEXT NOT NULL DEFAULT '',
  data_json TEXT NOT NULL,
  PRIMARY KEY (user_id, id)
);

CREATE TABLE IF NOT EXISTS redemptions (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  cost INTEGER NOT NULL DEFAULT 0,
  time TEXT NOT NULL DEFAULT '',
  data_json TEXT NOT NULL,
  PRIMARY KEY (user_id, id)
);

CREATE TABLE IF NOT EXISTS invoices (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT '',
  amount REAL NOT NULL DEFAULT 0,
  create_time TEXT NOT NULL DEFAULT '',
  data_json TEXT NOT NULL,
  PRIMARY KEY (user_id, id)
);

CREATE TABLE IF NOT EXISTS feedbacks (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT '',
  create_time TEXT NOT NULL DEFAULT '',
  data_json TEXT NOT NULL,
  PRIMARY KEY (user_id, id)
);

CREATE TABLE IF NOT EXISTS invite_records (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  time TEXT NOT NULL DEFAULT '',
  data_json TEXT NOT NULL,
  PRIMARY KEY (user_id, id)
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id, create_time DESC);
CREATE INDEX IF NOT EXISTS idx_messages_user ON messages(user_id, time DESC);
CREATE INDEX IF NOT EXISTS idx_merchants_city ON merchants(city);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
`

const SEED_MERCHANTS = new Set(MERCHANTS.map(m => m.id))

export function openDb(file = path.join(DATA_DIR, 'car-manager.db')) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  const db = new DatabaseSync(file)
  db.exec('PRAGMA journal_mode = WAL')
  db.exec('PRAGMA foreign_keys = ON')
  db.exec('PRAGMA busy_timeout = 5000')
  db.exec(SCHEMA)
  seedMerchants(db)
  return db
}

// 平台静态样例商家只种一次，动态入驻商家由用户状态同步写入
function seedMerchants(db) {
  const now = formatNow()
  const stmt = db.prepare(
    'INSERT OR IGNORE INTO merchants (id, city, name, owner_user_id, data_json, created_at) VALUES (?, ?, ?, NULL, ?, ?)'
  )
  db.exec('BEGIN')
  try {
    for (const m of MERCHANTS) stmt.run(m.id, m.city || '', m.name || '', JSON.stringify(m), now)
    db.exec('COMMIT')
  } catch (e) {
    db.exec('ROLLBACK')
    throw e
  }
}

/* ---------------- 用户 ---------------- */
export function findUserByPhone(db, phone) {
  return db.prepare('SELECT * FROM users WHERE phone = ?').get(String(phone))
}

export function findUserById(db, id) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(String(id))
}

export function createUser(db, phone, loginType = 'sms') {
  const now = formatNow()
  const id = 'u' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
  const last4 = String(phone).slice(-4)
  db.prepare(
    `INSERT INTO users (id, phone, name, avatar, member_tier, member_expire, points, balance,
       role, merchant_app_id, merchant_id, login_type, login_time, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'premium', '2027-06-30', 1280, 0, 'user', '', '', ?, ?, ?, ?)`
  ).run(id, String(phone), '车主 ' + last4, '🙂', loginType, now, now, now)

  const prefs = {
    city: '北京',
    settings: { notify: true, personalized: true },
    search: ['保养', '代驾'],
    freeUsage: { month: monthKey(), type: null },
    currentCarId: 'c1'
  }
  db.prepare(
    `INSERT INTO user_prefs (user_id, city, settings_json, search_json, free_usage_json,
       current_car_id, revision, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 1, ?)`
  ).run(id, prefs.city, JSON.stringify(prefs.settings), JSON.stringify(prefs.search),
    JSON.stringify(prefs.freeUsage), prefs.currentCarId, now)

  seedUserData(db, id, now)
  return findUserById(db, id)
}

// 新账号的演示数据与 App 本地默认数据保持一致
function seedUserData(db, userId, now) {
  const carStmt = db.prepare('INSERT INTO cars (user_id, id, plate, data_json) VALUES (?, ?, ?, ?)')
  const orderStmt = db.prepare(
    'INSERT INTO orders (user_id, id, status, amount, merchant, create_time, updated_at, data_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  )
  const couponStmt = db.prepare(
    'INSERT INTO coupons (user_id, id, name, amount, status, expire, data_json) VALUES (?, ?, ?, ?, ?, ?, ?)'
  )
  const msgStmt = db.prepare(
    'INSERT INTO messages (user_id, id, type, title, read, time, data_json) VALUES (?, ?, ?, ?, ?, ?, ?)'
  )
  const logStmt = db.prepare(
    'INSERT INTO points_log (user_id, id, title, amount, time, data_json) VALUES (?, ?, ?, ?, ?, ?)'
  )

  db.exec('BEGIN')
  try {
    for (const c of CARS) carStmt.run(userId, c.id, c.plate || '', JSON.stringify(c))

    for (const o of ORDERS) {
      const order = {
        originalAmount: o.amount,
        discount: 0,
        priceDetail: null,
        couponId: '',
        couponName: '',
        pointsUsed: 0,
        freeApplied: false,
        review: null,
        ...o
      }
      orderStmt.run(userId, order.id, order.status || '', Number(order.amount) || 0,
        order.merchant || '', order.createTime || '', now, JSON.stringify(order))
    }

    for (const c of COUPONS.slice(0, 3)) {
      const coupon = { ...c, status: 'unused', claimedAt: '' }
      couponStmt.run(userId, coupon.id, coupon.name || '', Number(coupon.amount) || 0,
        coupon.status, coupon.expire || '', JSON.stringify(coupon))
    }

    for (const m of INITIAL_MESSAGES) {
      msgStmt.run(userId, m.id, m.type || '', m.title || '', m.read ? 1 : 0, m.time || '', JSON.stringify(m))
    }

    const log = { id: 'pl_init', title: '历史积分', amount: 1280, time: '2026-11-01 09:00' }
    logStmt.run(userId, log.id, log.title, log.amount, log.time, JSON.stringify(log))

    db.exec('COMMIT')
  } catch (e) {
    db.exec('ROLLBACK')
    throw e
  }
}

export function touchUser(db, user) {
  const now = formatNow()
  db.prepare('UPDATE users SET login_type = ?, login_time = ?, updated_at = ? WHERE id = ?')
    .run(user.login_type || 'sms', now, now, user.id)
}

/* ---------------- 状态读写 ---------------- */
function parse(raw, fallback) {
  try {
    const v = JSON.parse(raw)
    return v == null ? fallback : v
  } catch (e) {
    return fallback
  }
}

export function readState(db, userId) {
  const user = findUserById(db, userId)
  if (!user) return null
  const prefs = db.prepare('SELECT * FROM user_prefs WHERE user_id = ?').get(userId) || {}

  const rows = (sql, ...args) => db.prepare(sql).all(userId, ...args)
  const list = (sql) => rows(sql).map(r => parse(r.data_json, {}))

  return {
    revision: Number(prefs.revision) || 1,
    user: {
      name: user.name,
      phoneRaw: user.phone,
      avatar: user.avatar,
      memberTier: user.member_tier,
      memberExpire: user.member_expire,
      points: user.points,
      balance: user.balance,
      role: user.role,
      merchantAppId: user.merchant_app_id,
      merchantId: user.merchant_id,
      loginType: user.login_type,
      loginTime: user.login_time
    },
    cars: list('SELECT data_json FROM cars WHERE user_id = ? ORDER BY rowid'),
    currentCarId: prefs.current_car_id || '',
    orders: list('SELECT data_json FROM orders WHERE user_id = ? ORDER BY rowid'),
    coupons: list('SELECT data_json FROM coupons WHERE user_id = ? ORDER BY rowid'),
    merchantApplications: list('SELECT data_json FROM merchant_apps WHERE user_id = ? ORDER BY rowid'),
    enterpriseApplications: list('SELECT data_json FROM enterprise_apps WHERE user_id = ? ORDER BY rowid'),
    invoices: list('SELECT data_json FROM invoices WHERE user_id = ? ORDER BY rowid'),
    feedbacks: list('SELECT data_json FROM feedbacks WHERE user_id = ? ORDER BY rowid'),
    messages: list('SELECT data_json FROM messages WHERE user_id = ? ORDER BY rowid'),
    pointsLog: list('SELECT data_json FROM points_log WHERE user_id = ? ORDER BY rowid'),
    redemptions: list('SELECT data_json FROM redemptions WHERE user_id = ? ORDER BY rowid'),
    invite: {
      count: Number(prefs.invite_count) || 0,
      records: list('SELECT data_json FROM invite_records WHERE user_id = ? ORDER BY rowid'),
      claimed: parse(prefs.invite_claimed_json, [])
    },
    dynamicMerchants: list(
      "SELECT data_json FROM merchants WHERE owner_user_id = ? ORDER BY created_at"
    ),
    searchHistory: parse(prefs.search_json, []),
    settings: parse(prefs.settings_json, {}),
    city: prefs.city || '北京',
    location: {
      lng: prefs.lng == null ? null : prefs.lng,
      lat: prefs.lat == null ? null : prefs.lat,
      source: prefs.location_source || 'manual',
      updatedAt: prefs.location_updated_at || ''
    },
    freeUsage: parse(prefs.free_usage_json, {}),
    lastOrderId: prefs.last_order_id || ''
  }
}

/**
 * 用客户端整包状态覆盖该用户的数据（单事务）。
 * 客户端是该用户数据的权威来源；服务端负责持久化、账号隔离与多端同步。
 * @returns {{revision:number}} 新版本号
 */
export function writeState(db, userId, s) {
  const user = findUserById(db, userId)
  if (!user) return null
  const now = formatNow()
  const prefs = db.prepare('SELECT * FROM user_prefs WHERE user_id = ?').get(userId) || {}

  const u = s.user || {}
  const revision = (Number(prefs.revision) || 1) + 1

  const del = name => db.prepare(`DELETE FROM ${name} WHERE user_id = ?`).run(userId)

  db.exec('BEGIN IMMEDIATE')
  try {
    db.prepare(
      `UPDATE users SET name = ?, avatar = ?, member_tier = ?, member_expire = ?,
         points = ?, balance = ?, role = ?, merchant_app_id = ?, merchant_id = ?, updated_at = ?
       WHERE id = ?`
    ).run(
      String(u.name ?? user.name), String(u.avatar ?? user.avatar),
      String(u.memberTier ?? user.member_tier), String(u.memberExpire ?? user.member_expire),
      Math.trunc(Number(u.points) || 0), Math.trunc(Number(u.balance) || 0),
      String(u.role ?? user.role), String(u.merchantAppId ?? user.merchant_app_id),
      String(u.merchantId ?? user.merchant_id), now, userId
    )

    const loc = s.location || {}
    db.prepare(
      `UPDATE user_prefs SET city = ?, lng = ?, lat = ?, location_source = ?, location_updated_at = ?,
         settings_json = ?, search_json = ?, free_usage_json = ?, current_car_id = ?,
         invite_count = ?, invite_claimed_json = ?, last_order_id = ?, revision = ?, updated_at = ?
       WHERE user_id = ?`
    ).run(
      String(s.city || prefs.city || '北京'),
      loc.lng == null ? null : Number(loc.lng),
      loc.lat == null ? null : Number(loc.lat),
      String(loc.source || 'manual'), String(loc.updatedAt || ''),
      JSON.stringify(s.settings || {}), JSON.stringify(s.searchHistory || []),
      JSON.stringify(s.freeUsage || {}), String(s.currentCarId || ''),
      Math.trunc(Number(s.invite && s.invite.count) || 0),
      JSON.stringify((s.invite && s.invite.claimed) || []),
      String(s.lastOrderId || ''), revision, now, userId
    )

    del('cars')
    const carStmt = db.prepare('INSERT INTO cars (user_id, id, plate, data_json) VALUES (?, ?, ?, ?)')
    for (const c of s.cars || []) {
      if (!c || !c.id) continue
      carStmt.run(userId, String(c.id), String(c.plate || ''), JSON.stringify(c))
    }

    del('orders')
    const orderStmt = db.prepare(
      'INSERT INTO orders (user_id, id, status, amount, merchant, create_time, updated_at, data_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    )
    for (const o of s.orders || []) {
      if (!o || !o.id) continue
      orderStmt.run(userId, String(o.id), String(o.status || ''), Number(o.amount) || 0,
        String(o.merchant || ''), String(o.createTime || ''), now, JSON.stringify(o))
    }

    del('coupons')
    const couponStmt = db.prepare(
      'INSERT INTO coupons (user_id, id, name, amount, status, expire, data_json) VALUES (?, ?, ?, ?, ?, ?, ?)'
    )
    for (const c of s.coupons || []) {
      if (!c || !c.id) continue
      couponStmt.run(userId, String(c.id), String(c.name || ''), Number(c.amount) || 0,
        String(c.status || ''), String(c.expire || ''), JSON.stringify(c))
    }

    del('merchant_apps')
    const maStmt = db.prepare(
      'INSERT INTO merchant_apps (user_id, id, name, status, city, data_json) VALUES (?, ?, ?, ?, ?, ?)'
    )
    for (const a of s.merchantApplications || []) {
      if (!a || !a.id) continue
      maStmt.run(userId, String(a.id), String(a.name || ''), String(a.status || ''),
        String(a.city || ''), JSON.stringify(a))
    }

    del('enterprise_apps')
    const eaStmt = db.prepare(
      'INSERT INTO enterprise_apps (user_id, id, company, status, data_json) VALUES (?, ?, ?, ?, ?)'
    )
    for (const a of s.enterpriseApplications || []) {
      if (!a || !a.id) continue
      eaStmt.run(userId, String(a.id), String(a.company || ''), String(a.status || ''), JSON.stringify(a))
    }

    del('messages')
    const msgStmt = db.prepare(
      'INSERT INTO messages (user_id, id, type, title, read, time, data_json) VALUES (?, ?, ?, ?, ?, ?, ?)'
    )
    for (const m of s.messages || []) {
      if (!m || !m.id) continue
      msgStmt.run(userId, String(m.id), String(m.type || ''), String(m.title || ''),
        m.read ? 1 : 0, String(m.time || ''), JSON.stringify(m))
    }

    del('points_log')
    const plStmt = db.prepare(
      'INSERT INTO points_log (user_id, id, title, amount, time, data_json) VALUES (?, ?, ?, ?, ?, ?)'
    )
    for (const p of s.pointsLog || []) {
      if (!p || !p.id) continue
      plStmt.run(userId, String(p.id), String(p.title || ''), Math.trunc(Number(p.amount) || 0),
        String(p.time || ''), JSON.stringify(p))
    }

    del('redemptions')
    const rdStmt = db.prepare(
      'INSERT INTO redemptions (user_id, id, name, cost, time, data_json) VALUES (?, ?, ?, ?, ?, ?)'
    )
    for (const r of s.redemptions || []) {
      if (!r || !r.id) continue
      rdStmt.run(userId, String(r.id), String(r.name || ''), Math.trunc(Number(r.cost) || 0),
        String(r.time || ''), JSON.stringify(r))
    }

    del('invoices')
    const invStmt = db.prepare(
      'INSERT INTO invoices (user_id, id, status, amount, create_time, data_json) VALUES (?, ?, ?, ?, ?, ?)'
    )
    for (const i of s.invoices || []) {
      if (!i || !i.id) continue
      invStmt.run(userId, String(i.id), String(i.status || ''), Number(i.amount) || 0,
        String(i.createTime || ''), JSON.stringify(i))
    }

    del('feedbacks')
    const fbStmt = db.prepare(
      'INSERT INTO feedbacks (user_id, id, type, status, create_time, data_json) VALUES (?, ?, ?, ?, ?, ?)'
    )
    for (const f of s.feedbacks || []) {
      if (!f || !f.id) continue
      fbStmt.run(userId, String(f.id), String(f.type || ''), String(f.status || ''),
        String(f.createTime || ''), JSON.stringify(f))
    }

    del('invite_records')
    const invRecStmt = db.prepare(
      'INSERT INTO invite_records (user_id, id, time, data_json) VALUES (?, ?, ?, ?)'
    )
    for (const r of (s.invite && s.invite.records) || []) {
      if (!r || !r.id) continue
      invRecStmt.run(userId, String(r.id), String(r.time || ''), JSON.stringify(r))
    }

    // 动态商家：只允许改自己的；平台样例商家（owner 为空）不会被覆盖
    db.prepare('DELETE FROM merchants WHERE owner_user_id = ?').run(userId)
    const mStmt = db.prepare(
      'INSERT OR REPLACE INTO merchants (id, city, name, owner_user_id, data_json, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    )
    for (const m of s.dynamicMerchants || []) {
      if (!m || !m.id) continue
      if (SEED_MERCHANTS.has(m.id)) continue
      mStmt.run(String(m.id), String(m.city || ''), String(m.name || ''), userId,
        JSON.stringify(m), now)
    }

    db.exec('COMMIT')
  } catch (e) {
    db.exec('ROLLBACK')
    throw e
  }

  return { revision }
}

/* ---------------- 会话 ---------------- */
export function createSession(db, userId, token, expiresAt) {
  db.prepare('INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)')
    .run(token, userId, formatNow(), expiresAt)
}

export function findSession(db, token) {
  return db.prepare('SELECT * FROM sessions WHERE token = ?').get(String(token || ''))
}

export function deleteSession(db, token) {
  db.prepare('DELETE FROM sessions WHERE token = ?').run(String(token || ''))
}

export function cleanupSessions(db) {
  db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(new Date().toISOString())
}

/* ---------------- 管理端查询 ---------------- */
export function adminOverview(db) {
  const one = (sql, ...args) => db.prepare(sql).get(...args)
  const total = one('SELECT COUNT(*) AS n FROM users').n
  const orders = one('SELECT COUNT(*) AS n FROM orders').n
  const gmv = Number(one("SELECT COALESCE(SUM(amount), 0) AS v FROM orders WHERE status IN ('waiting','serving','review','done')").v) || 0
  const merchants = one('SELECT COUNT(*) AS n FROM merchants').n
  const applications = one("SELECT COUNT(*) AS n FROM merchant_apps WHERE status = 'reviewing'").n
  return { users: total, orders, gmv, merchants, pendingApplications: applications }
}

export function adminList(db, type, limit = 50) {
  const n = Math.max(1, Math.min(200, Number(limit) || 50))
  if (type === 'users') {
    return db.prepare('SELECT id, phone, name, member_tier, points, role, created_at FROM users ORDER BY created_at DESC LIMIT ?').all(n)
  }
  if (type === 'orders') {
    return db.prepare(
      `SELECT o.id, u.phone, o.status, o.amount, o.merchant, o.create_time
       FROM orders o JOIN users u ON u.id = o.user_id ORDER BY o.create_time DESC LIMIT ?`
    ).all(n)
  }
  if (type === 'merchants') {
    return db.prepare(
      'SELECT id, city, name, owner_user_id, created_at FROM merchants ORDER BY created_at DESC LIMIT ?'
    ).all(n)
  }
  if (type === 'applications') {
    return db.prepare(
      `SELECT a.id, a.name, a.status, a.city, u.phone FROM merchant_apps a
       JOIN users u ON u.id = a.user_id ORDER BY a.rowid DESC LIMIT ?`
    ).all(n)
  }
  return []
}

export function adminClearDemo(db) {
  db.exec('BEGIN')
  try {
    db.exec('DELETE FROM sessions')
    db.exec('DELETE FROM cars')
    db.exec('DELETE FROM orders')
    db.exec('DELETE FROM coupons')
    db.exec('DELETE FROM merchant_apps')
    db.exec('DELETE FROM enterprise_apps')
    db.exec('DELETE FROM messages')
    db.exec('DELETE FROM points_log')
    db.exec('DELETE FROM redemptions')
    db.exec('DELETE FROM invoices')
    db.exec('DELETE FROM feedbacks')
    db.exec('DELETE FROM invite_records')
    db.exec('DELETE FROM user_prefs')
    db.exec('DELETE FROM users')
    db.exec('DELETE FROM merchants WHERE owner_user_id IS NOT NULL')
    db.exec('COMMIT')
  } catch (e) {
    db.exec('ROLLBACK')
    throw e
  }
}
