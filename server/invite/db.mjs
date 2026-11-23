// 邀请有礼：独立表结构（懒创建）+ 通用小工具
//
// 与 server/db.mjs 的旧表关系：
// - 旧的 user_prefs.invite_count / user_prefs.invite_claimed_json / invite_records 继续兼容
// - 本模块新增 invite_codes / invite_bindings / invite_claims / invite_audit，
//   用于服务端权威校验（一个被邀请人只能绑定一次、奖励幂等、反作弊审计）
import { formatNow } from '../db.mjs'

const SCHEMA = `
CREATE TABLE IF NOT EXISTS invite_codes (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS invite_bindings (
  id TEXT PRIMARY KEY,
  inviter_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invitee_user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  counted INTEGER NOT NULL DEFAULT 1,
  ip TEXT NOT NULL DEFAULT '',
  device TEXT NOT NULL DEFAULT '',
  user_agent TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS invite_claims (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reward_id TEXT NOT NULL,
  need INTEGER NOT NULL DEFAULT 0,
  grant_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  UNIQUE(user_id, reward_id)
);

CREATE TABLE IF NOT EXISTS invite_audit (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL DEFAULT '',
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  peer_user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  code TEXT NOT NULL DEFAULT '',
  result TEXT NOT NULL DEFAULT '',
  ip TEXT NOT NULL DEFAULT '',
  device TEXT NOT NULL DEFAULT '',
  detail TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_invite_bindings_inviter ON invite_bindings(inviter_user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_invite_bindings_ip ON invite_bindings(ip, created_at);
CREATE INDEX IF NOT EXISTS idx_invite_bindings_device ON invite_bindings(device, created_at);
CREATE INDEX IF NOT EXISTS idx_invite_audit_time ON invite_audit(created_at);
`

// 每个数据库连接只建一次（测试里可能同时打开多个库）
const readyDbs = new WeakSet()

/** 懒建表：不修改 server/db.mjs 的建表流程，首次访问邀请接口时执行 */
export function ensureInviteSchema(db) {
  if (readyDbs.has(db)) return
  db.exec(SCHEMA)
  readyDbs.add(db)
}

export function inviteId(prefix) {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

/** 手机号脱敏：138****5678 */
export function maskPhone(phone) {
  return String(phone || '').replace(/^(\d{3})\d{4}(\d{4})$/, '$1****$2')
}

export function dayStart(d = new Date()) {
  return formatNow(d).slice(0, 10) + ' 00:00'
}

export function monthStart(d = new Date()) {
  return formatNow(d).slice(0, 7) + '-01 00:00'
}

export function hourAgo(d = new Date()) {
  return formatNow(new Date(d.getTime() - 3600 * 1000))
}

/** 解析 JSON，失败返回兜底值 */
export function parseJson(raw, fallback) {
  try {
    const v = JSON.parse(raw)
    return v == null ? fallback : v
  } catch (e) {
    return fallback
  }
}
