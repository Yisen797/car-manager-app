// 邀请有礼：业务逻辑（服务端权威）
//
// 核心约束：
// 1. 一个被邀请人只能绑定一位邀请人（invite_bindings.invitee_user_id UNIQUE）
// 2. 不能自己邀请自己（同一账号 / 同一手机号）
// 3. 重复扫码 / 重复登录不增加人数、不重复发奖
// 4. 领奖幂等（invite_claims UNIQUE(user_id, reward_id)）
// 5. 反作弊：同一设备/IP 短时间多次绑定限流；邀请人每日/每月上限
// 6. 单层级奖励：只奖励直接邀请人
import crypto from 'node:crypto'
import { findUserById, formatNow } from '../db.mjs'
import { INVITE_LIMITS, INVITEE_WELCOME, findInviteReward } from '../../src/data/invite.mjs'
import {
  ensureInviteSchema, inviteId, maskPhone, dayStart, monthStart, hourAgo, parseJson
} from './db.mjs'

function intEnv(name, fallback) {
  const n = Number(process.env[name])
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback
}

// 每日/每月邀请上限（与前端展示一致，测试可用环境变量调小）
const DAILY_LIMIT = intEnv('CGJ_INVITE_DAILY_LIMIT', INVITE_LIMITS.daily)
const MONTHLY_LIMIT = intEnv('CGJ_INVITE_MONTHLY_LIMIT', INVITE_LIMITS.monthly)
// 同一 IP / 设备 1 小时内最多绑定次数
const IP_HOURLY_LIMIT = intEnv('CGJ_INVITE_IP_HOURLY', 20)
const DEVICE_HOURLY_LIMIT = intEnv('CGJ_INVITE_DEVICE_HOURLY', 5)

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function randomCode() {
  let out = 'CG'
  for (let i = 0; i < 8; i++) out += CODE_CHARS[crypto.randomInt(0, CODE_CHARS.length)]
  return out
}

export function normalizeCode(code) {
  const raw = String(code || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
  return raw.length >= 4 && raw.length <= 16 ? raw : ''
}

/** 为邀请人生成（或读取）不透明邀请码，不包含手机号等个人信息 */
export function ensureInviteCode(db, userId) {
  const existing = db.prepare('SELECT code FROM invite_codes WHERE user_id = ?').get(userId)
  if (existing) return existing.code

  for (let i = 0; i < 8; i++) {
    const code = randomCode()
    try {
      db.prepare('INSERT INTO invite_codes (user_id, code, created_at) VALUES (?, ?, ?)')
        .run(userId, code, formatNow())
      return code
    } catch (e) {
      if (!/UNIQUE|constraint/i.test(String(e.message))) throw e
      // 并发插入：另一个请求已生成，直接读取
      const row = db.prepare('SELECT code FROM invite_codes WHERE user_id = ?').get(userId)
      if (row) return row.code
    }
  }
  throw new Error('邀请码生成失败，请稍后重试')
}

function countCountedBindings(db, inviterId) {
  const row = db.prepare(
    'SELECT COUNT(*) AS n FROM invite_bindings WHERE inviter_user_id = ? AND counted = 1'
  ).get(inviterId)
  return Number(row && row.n) || 0
}

function countInviterSince(db, inviterId, since) {
  const row = db.prepare(
    'SELECT COUNT(*) AS n FROM invite_bindings WHERE inviter_user_id = ? AND counted = 1 AND created_at >= ?'
  ).get(inviterId, since)
  return Number(row && row.n) || 0
}

function countSourceSince(db, field, value, since) {
  if (!value) return 0
  const column = field === 'ip' ? 'ip' : 'device'
  const row = db.prepare(
    `SELECT COUNT(*) AS n FROM invite_bindings WHERE ${column} = ? AND created_at >= ?`
  ).get(value, since)
  return Number(row && row.n) || 0
}

function readPrefs(db, userId) {
  return db.prepare('SELECT * FROM user_prefs WHERE user_id = ?').get(userId) || {}
}

function bumpRevision(db, userId, now) {
  const r = db.prepare(
    'UPDATE user_prefs SET revision = revision + 1, updated_at = ? WHERE user_id = ?'
  ).run(now, userId)
  if (!r || !r.changes) {
    db.prepare('INSERT INTO user_prefs (user_id, revision, updated_at) VALUES (?, 2, ?)')
      .run(userId, now)
  }
}

function audit(db, entry) {
  const now = entry.created_at || formatNow()
  try {
    db.prepare(
      `INSERT INTO invite_audit
        (id, action, user_id, peer_user_id, code, result, ip, device, detail, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      inviteId('ia'),
      String(entry.action || ''),
      entry.user_id || null,
      entry.peer_user_id || null,
      String(entry.code || ''),
      String(entry.result || ''),
      String(entry.ip || ''),
      String(entry.device || '').slice(0, 120),
      String(entry.detail || '').slice(0, 500),
      now
    )
  } catch (e) {
    // 审计写入失败不能影响主流程（例如用户已被并发删除）
    console.warn('[invite] 审计写入失败：' + e.message)
  }
}

function insertPointsLog(db, userId, title, amount, now) {
  const id = inviteId('pl_invite_')
  const row = { id, title, amount, time: now }
  db.prepare(
    'INSERT INTO points_log (user_id, id, title, amount, time, data_json) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(userId, id, title, amount, now, JSON.stringify(row))
  return id
}

function insertCoupon(db, userId, coupon, now) {
  const id = inviteId('cp_invite_')
  const data = {
    id,
    name: coupon.name,
    amount: Number(coupon.amount) || 0,
    threshold: Number(coupon.threshold) || 0,
    expire: coupon.expire || '',
    scope: coupon.scope || '全场通用',
    status: 'unused',
    claimedAt: now,
    source: 'invite'
  }
  db.prepare(
    'INSERT INTO coupons (user_id, id, name, amount, status, expire, data_json) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(userId, id, data.name, data.amount, 'unused', data.expire, JSON.stringify(data))
  return id
}

function oneYearLater() {
  const d = new Date()
  d.setFullYear(d.getFullYear() + 1)
  const p = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

// 被邀请人注册奖励：双方各得，只在"有效绑定"时发放一次
function grantInviteeWelcome(db, inviteeId, now) {
  const welcome = INVITEE_WELCOME
  if (!welcome) return
  if (welcome.points) {
    db.prepare('UPDATE users SET points = points + ?, updated_at = ? WHERE id = ?')
      .run(welcome.points, now, inviteeId)
    insertPointsLog(db, inviteeId, '受邀注册奖励', welcome.points, now)
  }
  if (welcome.coupon) insertCoupon(db, inviteeId, welcome.coupon, now)
}

/** 邀请人侧：人数 +1、写邀请记录、递增数据版本（客户端下次同步会先拉到最新数据） */
function recordInvitation(db, inviterId, invitee, now) {
  db.prepare(
    'UPDATE user_prefs SET invite_count = invite_count + 1, revision = revision + 1, updated_at = ? WHERE user_id = ?'
  ).run(now, inviterId)

  const id = inviteId('inv')
  const record = {
    id,
    name: '好友 ' + maskPhone(invitee.phone),
    time: now,
    done: true,
    // 仅用于服务端/本地去重复核，不含手机号
    inviteeKey: 'u:' + String(invitee.id).slice(-8)
  }
  db.prepare('INSERT INTO invite_records (user_id, id, time, data_json) VALUES (?, ?, ?, ?)')
    .run(inviterId, id, now, JSON.stringify(record))
}

/** 服务端权威的邀请数据（邀请页直接读这个接口，避免整包同步覆盖） */
export function buildInviteMe(db, userId) {
  ensureInviteSchema(db)
  const user = findUserById(db, userId)
  if (!user) return null

  const code = ensureInviteCode(db, userId)
  const prefs = readPrefs(db, userId)
  const counted = countCountedBindings(db, userId)
  // 旧数据可能只有 user_prefs.invite_count（演示环境累计），取较大值保持向后兼容
  const count = Math.max(Number(prefs.invite_count) || 0, counted)

  const records = db.prepare(
    'SELECT data_json FROM invite_records WHERE user_id = ? ORDER BY rowid DESC'
  ).all(userId).map(r => parseJson(r.data_json, {})).filter(r => r && r.id)

  const claimedRows = db.prepare(
    'SELECT reward_id FROM invite_claims WHERE user_id = ? ORDER BY created_at'
  ).all(userId).map(r => r.reward_id)
  const legacy = parseJson(prefs.invite_claimed_json, [])
  const claimed = [...new Set([...(Array.isArray(legacy) ? legacy : []), ...claimedRows])]

  const boundRow = db.prepare(
    'SELECT code, created_at FROM invite_bindings WHERE invitee_user_id = ?'
  ).get(userId)

  return {
    code,
    count,
    records,
    claimed,
    bound: boundRow ? { code: boundRow.code, time: boundRow.created_at } : null,
    usedToday: countInviterSince(db, userId, dayStart()),
    usedMonth: countInviterSince(db, userId, monthStart()),
    limits: { daily: DAILY_LIMIT, monthly: MONTHLY_LIMIT }
  }
}

/** 邀请码是否有效（公开接口，不返回任何用户信息） */
export function checkInviteCode(db, code) {
  const c = normalizeCode(code)
  if (!c) return { valid: false, reason: 'format' }
  const row = db.prepare('SELECT user_id FROM invite_codes WHERE code = ?').get(c)
  if (!row) return { valid: false, reason: 'not-found' }
  const inviter = findUserById(db, row.user_id)
  return { valid: !!inviter, reason: inviter ? '' : 'not-found' }
}

function result(status, code, message) {
  return { status, body: { ok: false, error: { code, message } } }
}

/**
 * 绑定邀请人
 * @param {object} db
 * @param {object} invitee 被邀请人（当前登录用户）
 * @param {{code:string, ip?:string, device?:string, userAgent?:string}} input
 */
export function bindInvite(db, invitee, input = {}) {
  ensureInviteSchema(db)
  const now = formatNow()
  const code = normalizeCode(input.code)
  const ip = String(input.ip || '')
  const device = String(input.device || '').slice(0, 120)
  const ua = String(input.userAgent || '').slice(0, 200)

  if (!code) return result(400, 'code', '邀请码格式不正确')

  const codeRow = db.prepare('SELECT user_id, code FROM invite_codes WHERE code = ?').get(code)
  if (!codeRow) {
    audit(db, { action: 'bind', user_id: invitee.id, code, result: 'not-found', ip, device })
    return result(404, 'not-found', '邀请码不存在或已失效')
  }

  const inviter = findUserById(db, codeRow.user_id)
  if (!inviter) {
    audit(db, { action: 'bind', user_id: invitee.id, code, result: 'not-found', ip, device })
    return result(404, 'not-found', '邀请码不存在或已失效')
  }

  // 自己邀请自己：同一账号或同一手机号
  if (inviter.id === invitee.id || inviter.phone === invitee.phone) {
    audit(db, {
      action: 'bind', user_id: invitee.id, peer_user_id: inviter.id, code,
      result: 'self', ip, device, detail: maskPhone(inviter.phone)
    })
    return result(400, 'self', '不能邀请自己')
  }

  // 一个被邀请人只能绑定一个邀请人：重复扫码/重复登录都返回已绑定
  const existing = db.prepare(
    'SELECT * FROM invite_bindings WHERE invitee_user_id = ?'
  ).get(invitee.id)
  if (existing) {
    audit(db, {
      action: 'bind', user_id: invitee.id, peer_user_id: existing.inviter_user_id,
      code: existing.code, result: 'already', ip, device
    })
    return {
      status: 200,
      body: {
        ok: true,
        already: true,
        counted: false,
        bound: { code: existing.code, time: existing.created_at },
        invite: buildInviteMe(db, invitee.id)
      }
    }
  }

  // 反作弊：同一设备 / IP 短时间多次绑定
  if (device && countSourceSince(db, 'device', device, hourAgo()) >= DEVICE_HOURLY_LIMIT) {
    audit(db, {
      action: 'bind', user_id: invitee.id, peer_user_id: inviter.id, code,
      result: 'device-limit', ip, device
    })
    return result(429, 'device-limit', '当前设备绑定过于频繁，请稍后再试')
  }
  if (ip && countSourceSince(db, 'ip', ip, hourAgo()) >= IP_HOURLY_LIMIT) {
    audit(db, {
      action: 'bind', user_id: invitee.id, peer_user_id: inviter.id, code,
      result: 'ip-limit', ip, device
    })
    return result(429, 'ip-limit', '操作过于频繁，请稍后再试')
  }

  // 邀请人每日/每月上限：超限仍记录绑定关系，但不计数、不发奖
  const counted = countInviterSince(db, inviter.id, dayStart()) < DAILY_LIMIT &&
    countInviterSince(db, inviter.id, monthStart()) < MONTHLY_LIMIT

  const bindingId = inviteId('ib')
  db.exec('BEGIN IMMEDIATE')
  try {
    db.prepare(
      `INSERT INTO invite_bindings
        (id, inviter_user_id, invitee_user_id, code, counted, ip, device, user_agent, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(bindingId, inviter.id, invitee.id, code, counted ? 1 : 0, ip, device, ua, now)

    if (counted) {
      recordInvitation(db, inviter.id, invitee, now)
      grantInviteeWelcome(db, invitee.id, now)
      // 被邀请人收到的欢迎奖励也需要让其它设备拉取
      bumpRevision(db, invitee.id, now)
    }

    audit(db, {
      action: 'bind', user_id: invitee.id, peer_user_id: inviter.id, code,
      result: counted ? 'counted' : 'limit', ip, device,
      detail: counted ? '' : '邀请人已达每日/每月上限', created_at: now
    })
    db.exec('COMMIT')
  } catch (e) {
    db.exec('ROLLBACK')
    // 并发重复绑定：唯一索引兜底，按"已绑定"返回
    if (/UNIQUE|constraint/i.test(String(e.message))) {
      const row = db.prepare(
        'SELECT * FROM invite_bindings WHERE invitee_user_id = ?'
      ).get(invitee.id)
      if (row) {
        return {
          status: 200,
          body: {
            ok: true,
            already: true,
            counted: false,
            bound: { code: row.code, time: row.created_at },
            invite: buildInviteMe(db, invitee.id)
          }
        }
      }
    }
    throw e
  }

  return {
    status: 200,
    body: {
      ok: true,
      already: false,
      counted,
      bound: { code, time: now },
      message: counted ? '绑定成功' : '邀请人邀请人数已达上限，本次不计入',
      invite: buildInviteMe(db, invitee.id)
    }
  }
}

function grantReward(db, user, reward, now) {
  const granted = { points: 0, coupons: [], member: false }

  if (reward.points) {
    db.prepare('UPDATE users SET points = points + ?, updated_at = ? WHERE id = ?')
      .run(reward.points, now, user.id)
    insertPointsLog(db, user.id, '邀请奖励', reward.points, now)
    granted.points = reward.points
  }

  if (reward.coupon) {
    granted.coupons.push(insertCoupon(db, user.id, reward.coupon, now))
  }

  if (reward.member) {
    const fresh = findUserById(db, user.id)
    if (fresh && fresh.member_tier === 'enterprise') {
      // 企业会员不降级，改为等值通用券
      granted.coupons.push(insertCoupon(db, user.id, {
        name: '100元通用券', amount: 100, threshold: 300, expire: '2027-06-30', scope: '全场通用'
      }, now))
      granted.member = false
      granted.replaced = true
    } else {
      db.prepare('UPDATE users SET member_tier = ?, member_expire = ?, updated_at = ? WHERE id = ?')
        .run('premium', oneYearLater(), now, user.id)
      granted.member = true
    }
  }

  return granted
}

/**
 * 领取阶梯奖励（幂等）
 * 奖励内容以服务端奖励目录为准，不信任客户端传来的积分/券参数
 */
export function claimInvite(db, user, input = {}) {
  ensureInviteSchema(db)
  const now = formatNow()
  const reward = findInviteReward(input.rewardId)
  const ip = String(input.ip || '')
  const device = String(input.device || '').slice(0, 120)

  if (!reward) {
    audit(db, { action: 'claim', user_id: user.id, result: 'bad-reward', ip, device })
    return result(400, 'reward', '奖励不存在')
  }

  const existing = db.prepare(
    'SELECT * FROM invite_claims WHERE user_id = ? AND reward_id = ?'
  ).get(user.id, reward.id)
  if (existing) {
    audit(db, {
      action: 'claim', user_id: user.id, result: 'already', ip, device,
      detail: reward.id
    })
    return {
      status: 200,
      body: {
        ok: true,
        already: true,
        claimed: true,
        message: '该奖励已领取',
        invite: buildInviteMe(db, user.id)
      }
    }
  }

  const me = buildInviteMe(db, user.id)
  if (me.count < reward.need) {
    return result(400, 'not-ready', `还差 ${reward.need - me.count} 位好友`)
  }

  const claimId = inviteId('ic')
  db.exec('BEGIN IMMEDIATE')
  try {
    const granted = grantReward(db, user, reward, now)
    db.prepare(
      'INSERT INTO invite_claims (id, user_id, reward_id, need, grant_json, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(claimId, user.id, reward.id, reward.need, JSON.stringify(granted), now)

    // 兼容旧字段 invite_claimed_json（旧客户端/旧数据读取）
    const prefs = readPrefs(db, user.id)
    const legacy = parseJson(prefs.invite_claimed_json, [])
    const merged = [...new Set([...(Array.isArray(legacy) ? legacy : []), reward.id])]
    db.prepare(
      'UPDATE user_prefs SET invite_claimed_json = ?, updated_at = ? WHERE user_id = ?'
    ).run(JSON.stringify(merged), now, user.id)
    bumpRevision(db, user.id, now)

    audit(db, {
      action: 'claim', user_id: user.id, result: 'granted', ip, device,
      detail: reward.id, created_at: now
    })
    db.exec('COMMIT')

    return {
      status: 200,
      body: {
        ok: true,
        already: false,
        claimed: true,
        granted,
        message: '领取成功',
        invite: buildInviteMe(db, user.id)
      }
    }
  } catch (e) {
    db.exec('ROLLBACK')
    // 并发重复领取：唯一约束兜底，按"已领取"返回，不重复发放
    if (/UNIQUE|constraint/i.test(String(e.message))) {
      return {
        status: 200,
        body: {
          ok: true,
          already: true,
          claimed: true,
          message: '该奖励已领取',
          invite: buildInviteMe(db, user.id)
        }
      }
    }
    throw e
  }
}
