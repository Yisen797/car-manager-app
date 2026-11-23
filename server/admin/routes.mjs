// 运营后台 API 路由：登录、订单、用户、商家审核、发票、反馈、审计
import crypto from 'node:crypto'
import {
  parseJson, maskPhone, withTx, auditLog, listAudit,
  findAdminByUsername, findAdminById, listAdmins, insertAdmin,
  updateAdminPassword, updateAdminStatus, touchAdminLogin,
  createAdminSession, deleteAdminSession, deleteAdminSessions, cleanupAdminSessions,
  addOrderNote, listOrderNotes, addPrivacyRequest, listPrivacyRequests,
  bumpUserRevision, newAdminId
} from './db.mjs'
import {
  can, permissionsOf, isValidRole, hashPassword, verifyPassword, validatePassword,
  newAdminToken, sha256, bootstrapCreds, createBootstrapAdmin,
  checkLoginRate, noteLoginFailure, clearLoginFailures, SESSION_HOURS, clientIp,
  equalizeVerifyTiming
} from './auth.mjs'
import { adminOverview, adminList, adminClearDemo, readState } from '../db.mjs'

/* ---------------- 小工具 ---------------- */
function decodeId(value) {
  try { return decodeURIComponent(value) } catch (e) { return value }
}

function str(value, max = 200) {
  return String(value == null ? '' : value).trim().slice(0, max)
}

function pagination(url, defSize = 20, maxSize = 100) {
  const page = Math.max(1, Math.trunc(Number(url.searchParams.get('page')) || 1))
  const pageSize = Math.min(maxSize, Math.max(1, Math.trunc(Number(url.searchParams.get('pageSize')) || defSize)))
  return { page, pageSize, offset: (page - 1) * pageSize }
}

function timeBound(value, end) {
  const s = str(value, 32)
  if (!s) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s + (end ? ' 23:59:59' : ' 00:00:00')
  return s
}

function publicAdmin(row) {
  return {
    id: row.id,
    username: row.username,
    role: row.role,
    displayName: row.display_name || row.username,
    status: row.status || 'active',
    createdAt: row.created_at || '',
    lastLoginAt: row.last_login_at || ''
  }
}

function requirePerm(ctx, auth, permission) {
  if (can(auth.role, permission)) return true
  ctx.fail(ctx.req, ctx.res, 403, 'forbidden', '当前角色无权执行该操作')
  return false
}

function methodNotAllowed(ctx) {
  ctx.fail(ctx.req, ctx.res, 405, 'method', '请求方法不支持')
  return true
}

function notFound(ctx) {
  ctx.fail(ctx.req, ctx.res, 404, 'not-found', '接口不存在')
  return true
}

/** 给车主写一条站内信（后台操作后让客户端感知） */
function insertUserMessage(db, { userId, type, title, desc, target, now }) {
  const id = 'msg_admin_' + Date.now().toString(36) + crypto.randomBytes(3).toString('hex')
  const msg = { id, type, title, desc, target, read: false, time: now }
  db.prepare(
    'INSERT INTO messages (user_id, id, type, title, read, time, data_json) VALUES (?, ?, ?, ?, 0, ?, ?)'
  ).run(userId, id, type, title, now, JSON.stringify(msg))
}

/* ---------------- 登录会话 ---------------- */
async function handleLogin(ctx, ip, now) {
  const { req, res, db, readBody, sendJson, fail } = ctx
  const body = await readBody(req)
  const username = str(body.username, 64)
  const password = String(body.password || '')
  if (!username || !password) return fail(req, res, 400, 'credentials', '请输入用户名和密码')
  if (password.length > 128) return fail(req, res, 400, 'credentials', '用户名或密码格式不正确')

  const rate = checkLoginRate(ip, username)
  if (!rate.ok) {
    auditLog(db, {
      actor: username, role: '', action: 'admin.login_blocked',
      targetType: 'admin', targetId: '', detail: { reason: 'rate-limit' }, ip, createdAt: now
    })
    return fail(req, res, 429, 'too-many', `登录失败次数过多，请 ${rate.retryAfter} 秒后再试`)
  }

  let admin = findAdminByUsername(db, username)
  if (admin) {
    if (admin.status !== 'active') {
      auditLog(db, {
        actor: username, role: admin.role, action: 'admin.login_failed',
        targetType: 'admin', targetId: admin.id, detail: { reason: 'disabled' }, ip, createdAt: now
      })
      return fail(req, res, 403, 'disabled', '账号已停用，请联系超级管理员')
    }
    if (!verifyPassword(password, admin.password_hash)) {
      noteLoginFailure(ip, username)
      auditLog(db, {
        actor: username, role: admin.role, action: 'admin.login_failed',
        targetType: 'admin', targetId: admin.id, detail: { reason: 'bad-password' }, ip, createdAt: now
      })
      return fail(req, res, 401, 'credentials', '用户名或密码不正确')
    }
  } else {
    // 账号不存在时也做一次同等成本的密码校验，避免响应时间枚举
    equalizeVerifyTiming(password)
    const creds = bootstrapCreds()
    if (!creds) {
      noteLoginFailure(ip, username)
      return fail(req, res, 503, 'not-configured',
        '管理员账号未配置，请设置 CGJ_ADMIN_USER 与 CGJ_ADMIN_PASSWORD')
    }
    if (username !== creds.username || password !== creds.password) {
      noteLoginFailure(ip, username)
      auditLog(db, {
        actor: username, role: '', action: 'admin.login_failed',
        targetType: 'admin', targetId: '', detail: { reason: 'no-account' }, ip, createdAt: now
      })
      return fail(req, res, 401, 'credentials', '用户名或密码不正确')
    }
    admin = createBootstrapAdmin(db, { username, password, now })
  }

  clearLoginFailures(ip, username)
  const token = newAdminToken()
  const tokenHash = sha256(token)
  const expiresAt = new Date(Date.now() + SESSION_HOURS * 3600000).toISOString()
  createAdminSession(db, { tokenHash, adminId: admin.id, createdAt: now, expiresAt, ip })
  touchAdminLogin(db, admin.id, now)
  auditLog(db, {
    actor: admin.username, role: admin.role, action: 'admin.login',
    targetType: 'admin', targetId: admin.id, detail: { ip }, ip, createdAt: now
  })

  return sendJson(req, res, 200, {
    ok: true,
    token,
    expiresAt,
    user: publicAdmin(admin),
    permissions: permissionsOf(admin.role)
  })
}

function handleLogout(ctx, auth, ip, now) {
  const { req, res, db, sendJson } = ctx
  if (auth.kind === 'admin') {
    deleteAdminSession(db, auth.tokenHash)
    auditLog(db, {
      actor: auth.username, role: auth.role, action: 'admin.logout',
      targetType: 'admin', targetId: auth.id, detail: {}, ip, createdAt: now
    })
  }
  return sendJson(req, res, 200, { ok: true })
}

async function handlePasswordChange(ctx, auth, ip, now) {
  const { req, res, db, readBody, sendJson, fail } = ctx
  if (auth.kind !== 'admin') return fail(req, res, 403, 'forbidden', '兼容密钥不支持修改密码')
  const body = await readBody(req)
  const oldPassword = String(body.oldPassword || '')
  const newPassword = String(body.newPassword || '')
  const row = findAdminById(db, auth.id)
  if (!row) return fail(req, res, 401, 'unauthorized', '账号不存在，请重新登录')
  if (!verifyPassword(oldPassword, row.password_hash)) {
    auditLog(db, {
      actor: auth.username, role: auth.role, action: 'admin.password.change_failed',
      targetType: 'admin', targetId: auth.id, detail: { reason: 'bad-old-password' }, ip, createdAt: now
    })
    return fail(req, res, 400, 'old-password', '原密码不正确')
  }
  const policy = validatePassword(newPassword)
  if (policy) return fail(req, res, 400, 'password', policy)
  if (newPassword === oldPassword) return fail(req, res, 400, 'password', '新密码不能与原密码相同')

  updateAdminPassword(db, auth.id, hashPassword(newPassword), now)
  deleteAdminSessions(db, auth.id, null)
  auditLog(db, {
    actor: auth.username, role: auth.role, action: 'admin.password.change',
    targetType: 'admin', targetId: auth.id, detail: {}, ip, createdAt: now
  })
  return sendJson(req, res, 200, { ok: true, relogin: true })
}

/* ---------------- 概览 ---------------- */
function handleOverview(ctx, auth) {
  const { req, res, db, sendJson, formatNow } = ctx
  if (!requirePerm(ctx, auth, 'overview')) return true
  const base = adminOverview(db)
  if (auth.kind === 'legacy') return sendJson(req, res, 200, { ok: true, ...base })

  const now = formatNow()
  const day = now.slice(0, 10)
  const one = (sql, ...args) => Number(db.prepare(sql).get(...args).v) || 0
  const extras = {
    todayOrders: one('SELECT COUNT(*) AS v FROM orders WHERE create_time LIKE ?', day + '%'),
    todayGmv: one(
      `SELECT COALESCE(SUM(amount), 0) AS v FROM orders
       WHERE create_time LIKE ? AND status NOT IN ('canceled','pending')`, day + '%'
    ),
    pendingInvoices: one("SELECT COUNT(*) AS v FROM invoices WHERE status = 'issuing'"),
    pendingFeedbacks: one("SELECT COUNT(*) AS v FROM feedbacks WHERE status IN ('pending','processing')"),
    activeAdmins: one("SELECT COUNT(*) AS v FROM admin_users WHERE status = 'active'")
  }
  return sendJson(req, res, 200, { ok: true, ...base, ...extras })
}

/* ---------------- 订单 ---------------- */
function orderSelectSql() {
  return `SELECT o.user_id, o.id, o.status, o.amount, o.merchant, o.create_time, o.updated_at,
                 o.data_json, u.phone, u.name AS user_name
          FROM orders o JOIN users u ON u.id = o.user_id`
}

function handleOrderList(ctx, auth) {
  const { req, res, db, url, sendJson } = ctx
  if (!requirePerm(ctx, auth, 'orders:read')) return true
  if (auth.kind === 'legacy') {
    const limit = url.searchParams.get('limit') || 50
    return sendJson(req, res, 200, { ok: true, items: adminList(db, 'orders', limit) })
  }

  const { page, pageSize, offset } = pagination(url, 20, 100)
  const where = []
  const args = []
  const status = str(url.searchParams.get('status'), 32)
  if (status) { where.push('o.status = ?'); args.push(status) }
  const phone = str(url.searchParams.get('phone'), 20)
  if (phone) { where.push('u.phone LIKE ?'); args.push('%' + phone + '%') }
  const orderNo = str(url.searchParams.get('orderNo'), 64)
  if (orderNo) { where.push('o.id LIKE ?'); args.push('%' + orderNo + '%') }
  const keyword = str(url.searchParams.get('keyword'), 64)
  if (keyword) {
    where.push('(o.id LIKE ? OR o.merchant LIKE ? OR u.name LIKE ?)')
    args.push('%' + keyword + '%', '%' + keyword + '%', '%' + keyword + '%')
  }
  const whereSql = where.length ? ' WHERE ' + where.join(' AND ') : ''
  const agg = db.prepare(
    `SELECT COUNT(*) AS n, COALESCE(SUM(o.amount), 0) AS total_amount
     FROM orders o JOIN users u ON u.id = o.user_id${whereSql}`
  ).get(...args)
  const rows = db.prepare(
    `${orderSelectSql()}${whereSql} ORDER BY o.create_time DESC, o.rowid DESC LIMIT ? OFFSET ?`
  ).all(...args, pageSize, offset)

  const items = rows.map(r => {
    const d = parseJson(r.data_json, {})
    return {
      id: r.id,
      userId: r.user_id,
      phone: maskPhone(r.phone),
      userName: r.user_name,
      status: r.status,
      amount: Number(r.amount) || 0,
      merchant: r.merchant,
      title: d.title || '',
      car: d.car || '',
      createTime: r.create_time,
      updatedAt: r.updated_at
    }
  })
  return sendJson(req, res, 200, {
    ok: true, items, page, pageSize,
    total: Number(agg.n) || 0,
    sumAmount: Number(agg.total_amount) || 0
  })
}

function resolveOrder(db, orderId, userId) {
  const rows = userId
    ? db.prepare(orderSelectSql() + ' WHERE o.id = ? AND o.user_id = ?').all(orderId, userId)
    : db.prepare(orderSelectSql() + ' WHERE o.id = ?').all(orderId)
  if (rows.length === 0) return { row: null }
  if (rows.length > 1) return { row: null, ambiguous: true }
  return { row: rows[0] }
}

function handleOrderDetail(ctx, auth, orderId) {
  const { req, res, db, url, sendJson, fail } = ctx
  if (!requirePerm(ctx, auth, 'orders:read')) return true
  const userId = str(url.searchParams.get('userId'), 64)
  const { row, ambiguous } = resolveOrder(db, orderId, userId)
  if (ambiguous) return fail(req, res, 409, 'ambiguous-owner', '该订单号在多个账号下存在，请指定 userId')
  if (!row) return fail(req, res, 404, 'not-found', '订单不存在')

  const data = parseJson(row.data_json, {})
  const user = db.prepare(
    'SELECT id, phone, name, role, member_tier, points FROM users WHERE id = ?'
  ).get(row.user_id) || {}
  const car = findOrderCar(db, row.user_id, data.car)
  const userMasked = { ...user, phone: maskPhone(user.phone) }
  delete userMasked.phoneRaw
  return sendJson(req, res, 200, {
    ok: true,
    order: {
      ...data,
      id: row.id,
      userId: row.user_id,
      status: row.status,
      amount: Number(row.amount) || 0,
      merchant: row.merchant,
      createTime: row.create_time,
      updatedAt: row.updated_at,
      phone: maskPhone(row.phone),
      userName: row.user_name
    },
    user: userMasked,
    car,
    adminNotes: listOrderNotes(db, row.user_id, row.id)
  })
}

function findOrderCar(db, userId, plate) {
  if (!plate) return null
  const rows = db.prepare('SELECT id, plate, data_json FROM cars WHERE user_id = ?').all(userId)
  const hit = rows.find(r => r.plate === plate)
  return hit ? parseJson(hit.data_json, { id: hit.id, plate: hit.plate }) : null
}

async function handleOrderCancel(ctx, auth, orderId, ip, now) {
  const { req, res, db, url, readBody, sendJson, fail } = ctx
  if (!requirePerm(ctx, auth, 'orders:cancel')) return true
  const body = await readBody(req)
  const reason = str(body.reason, 200)
  if (reason.length < 2) return fail(req, res, 400, 'reason', '请填写取消原因（至少 2 个字）')

  const userId = str(body.userId || url.searchParams.get('userId'), 64)
  const { row, ambiguous } = resolveOrder(db, orderId, userId)
  if (ambiguous) return fail(req, res, 409, 'ambiguous-owner', '该订单号在多个账号下存在，请指定 userId')
  if (!row) return fail(req, res, 404, 'not-found', '订单不存在')

  const order = parseJson(row.data_json, {})
  const status = row.status || order.status
  if (!['pending', 'waiting'].includes(status)) {
    return fail(req, res, 409, 'status', '仅待支付 / 待接单的订单可以取消')
  }
  const amount = Number(order.amount != null ? order.amount : row.amount) || 0
  const wasPaid = status === 'waiting' && order.payMethod !== 'store' && amount > 0

  order.status = 'canceled'
  order.payLabel = wasPaid ? '已退款' : '已取消'
  order.cancelTime = now
  order.cancelReason = reason
  order.canceledBy = auth.username
  order.timeline = (Array.isArray(order.timeline) ? order.timeline : []).filter(t => t && t.done)
  order.timeline.push({
    text: wasPaid ? `订单已取消，¥${amount} 已原路退回（模拟）` : '订单已取消',
    time: now,
    done: true
  })

  const revision = withTx(db, () => {
    db.prepare(
      'UPDATE orders SET status = ?, data_json = ?, updated_at = ? WHERE user_id = ? AND id = ?'
    ).run('canceled', JSON.stringify(order), now, row.user_id, row.id)
    const rev = bumpUserRevision(db, row.user_id, now)
    insertUserMessage(db, {
      userId: row.user_id,
      type: 'order',
      title: '订单已取消',
      desc: wasPaid
        ? `${order.title || '订单'} 已取消，退款将原路退回（模拟）`
        : `${order.title || '订单'} 已取消`,
      target: '/pages/order/detail?id=' + order.id,
      now
    })
    auditLog(db, {
      actor: auth.username, role: auth.role, action: 'order.cancel',
      targetType: 'order', targetId: row.id,
      detail: { userId: row.user_id, amount, refunded: wasPaid, reason },
      ip, createdAt: now
    })
    return rev
  })

  return sendJson(req, res, 200, {
    ok: true, orderId: row.id, status: 'canceled', refunded: wasPaid, revision
  })
}

async function handleOrderNote(ctx, auth, orderId, ip, now) {
  const { req, res, db, url, readBody, sendJson, fail } = ctx
  if (!requirePerm(ctx, auth, 'orders:notes')) return true
  const body = await readBody(req)
  const note = str(body.note, 500)
  if (note.length < 2) return fail(req, res, 400, 'note', '备注内容至少 2 个字')

  const userId = str(body.userId || url.searchParams.get('userId'), 64)
  const { row, ambiguous } = resolveOrder(db, orderId, userId)
  if (ambiguous) return fail(req, res, 409, 'ambiguous-owner', '该订单号在多个账号下存在，请指定 userId')
  if (!row) return fail(req, res, 404, 'not-found', '订单不存在')

  const saved = withTx(db, () => {
    const item = addOrderNote(db, {
      userId: row.user_id, orderId: row.id, note, actor: auth.username, role: auth.role, now
    })
    auditLog(db, {
      actor: auth.username, role: auth.role, action: 'order.note.add',
      targetType: 'order', targetId: row.id,
      detail: { userId: row.user_id }, ip, createdAt: now
    })
    return item
  })
  return sendJson(req, res, 200, { ok: true, note: saved })
}

/* ---------------- 商家申请 ---------------- */
function applicationSelectSql() {
  return `SELECT a.user_id, a.id, a.name, a.status, a.city, a.data_json,
                 u.phone, u.name AS user_name
          FROM merchant_apps a JOIN users u ON u.id = a.user_id`
}

function handleApplicationList(ctx, auth) {
  const { req, res, db, url, sendJson } = ctx
  if (!requirePerm(ctx, auth, 'applications:read')) return true
  if (auth.kind === 'legacy') {
    const limit = url.searchParams.get('limit') || 50
    return sendJson(req, res, 200, { ok: true, items: adminList(db, 'applications', limit) })
  }

  const { page, pageSize, offset } = pagination(url, 20, 100)
  const where = []
  const args = []
  const status = str(url.searchParams.get('status'), 32)
  if (status) { where.push('a.status = ?'); args.push(status) }
  const keyword = str(url.searchParams.get('keyword'), 64)
  if (keyword) {
    where.push('(a.name LIKE ? OR u.phone LIKE ? OR a.id LIKE ?)')
    args.push('%' + keyword + '%', '%' + keyword + '%', '%' + keyword + '%')
  }
  const whereSql = where.length ? ' WHERE ' + where.join(' AND ') : ''
  const total = db.prepare(
    `SELECT COUNT(*) AS n FROM merchant_apps a JOIN users u ON u.id = a.user_id${whereSql}`
  ).get(...args).n
  const rows = db.prepare(
    `${applicationSelectSql()}${whereSql} ORDER BY a.rowid DESC LIMIT ? OFFSET ?`
  ).all(...args, pageSize, offset)
  const counts = {}
  for (const r of db.prepare('SELECT status, COUNT(*) AS n FROM merchant_apps GROUP BY status').all()) {
    counts[r.status] = Number(r.n) || 0
  }
  const items = rows.map(r => {
    const d = parseJson(r.data_json, {})
    return {
      ...d,
      id: r.id,
      userId: r.user_id,
      name: r.name || d.name || '',
      status: r.status,
      city: r.city || d.city || '',
      phone: maskPhone(r.phone),
      userName: r.user_name,
      submitTime: d.submitTime || '',
      reviewTime: d.reviewTime || '',
      reason: d.reason || '',
      merchantId: d.merchantId || ''
    }
  })
  return sendJson(req, res, 200, { ok: true, items, page, pageSize, total: Number(total) || 0, counts })
}

function resolveApplication(db, appId, userId) {
  const rows = userId
    ? db.prepare(applicationSelectSql() + ' WHERE a.id = ? AND a.user_id = ?').all(appId, userId)
    : db.prepare(applicationSelectSql() + ' WHERE a.id = ?').all(appId)
  if (rows.length === 0) return { row: null }
  if (rows.length > 1) return { row: null, ambiguous: true }
  return { row: rows[0] }
}

function buildMerchant(app, merchantId) {
  const tierName = { free: '免费入驻', silver: '银牌会员', gold: '金牌合作' }[app.tier] || '免费入驻'
  return {
    id: merchantId,
    name: app.name || '',
    city: app.city || '北京',
    emoji: '🏪',
    gradient: 'linear-gradient(135deg,#D8B06A,#A97C2F)',
    rating: 5.0,
    distance: '—',
    tier: tierName,
    tierColor: '#B98A3C',
    orders: 0,
    tags: [app.type || '汽车服务'],
    address: app.address || '',
    lng: app.lng != null ? Number(app.lng) : null,
    lat: app.lat != null ? Number(app.lat) : null,
    hours: app.hours || '09:00 - 21:00',
    promo: '新店开业 · 欢迎体验',
    ownerPhone: app.ownerPhone || app.phone || '',
    open: true
  }
}

function newMerchantId() {
  return 'dm' + Date.now().toString(36) + crypto.randomBytes(2).toString('hex')
}

async function handleApplicationApprove(ctx, auth, appId, ip, now) {
  const { req, res, db, readBody, sendJson, fail } = ctx
  if (!requirePerm(ctx, auth, 'applications:review')) return true
  const body = await readBody(req)
  const userId = str(body.userId, 64)
  const { row, ambiguous } = resolveApplication(db, appId, userId)
  if (ambiguous) return fail(req, res, 409, 'ambiguous-owner', '该申请在多个账号下存在，请指定 userId')
  if (!row) return fail(req, res, 404, 'not-found', '入驻申请不存在')
  if (row.status !== 'reviewing') return fail(req, res, 409, 'status', '该申请当前状态不可审核')

  const app = parseJson(row.data_json, {})
  const merchantId = app.merchantId || newMerchantId()
  app.status = 'approved'
  app.reviewTime = now
  app.merchantId = merchantId
  app.reason = ''
  const merchant = buildMerchant(app, merchantId)

  withTx(db, () => {
    db.prepare(
      `INSERT INTO merchants (id, city, name, owner_user_id, data_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         city = excluded.city, name = excluded.name,
         owner_user_id = excluded.owner_user_id, data_json = excluded.data_json`
    ).run(merchantId, merchant.city, merchant.name, row.user_id, JSON.stringify(merchant), now)

    db.prepare(
      'UPDATE merchant_apps SET status = ?, data_json = ? WHERE user_id = ? AND id = ?'
    ).run('approved', JSON.stringify(app), row.user_id, row.id)

    db.prepare(
      `UPDATE users SET role = 'merchant', merchant_app_id = ?, merchant_id = ?, updated_at = ?
       WHERE id = ?`
    ).run(row.id, merchantId, now, row.user_id)

    bumpUserRevision(db, row.user_id, now)
    insertUserMessage(db, {
      userId: row.user_id,
      type: 'merchant',
      title: '入驻审核通过',
      desc: `${app.name || '您的商家'} 已通过审核，账号已升级为商家账号`,
      target: '/pages/merchant/center',
      now
    })
    auditLog(db, {
      actor: auth.username, role: auth.role, action: 'application.approve',
      targetType: 'merchant_app', targetId: row.id,
      detail: { userId: row.user_id, merchantId, name: app.name || '' },
      ip, createdAt: now
    })
  })

  return sendJson(req, res, 200, { ok: true, applicationId: row.id, merchantId, merchant })
}

async function handleApplicationReject(ctx, auth, appId, ip, now) {
  const { req, res, db, readBody, sendJson, fail } = ctx
  if (!requirePerm(ctx, auth, 'applications:review')) return true
  const body = await readBody(req)
  const reason = str(body.reason, 300)
  if (reason.length < 5) return fail(req, res, 400, 'reason', '驳回原因至少 5 个字，请说明具体问题')
  const userId = str(body.userId, 64)
  const { row, ambiguous } = resolveApplication(db, appId, userId)
  if (ambiguous) return fail(req, res, 409, 'ambiguous-owner', '该申请在多个账号下存在，请指定 userId')
  if (!row) return fail(req, res, 404, 'not-found', '入驻申请不存在')
  if (row.status !== 'reviewing') return fail(req, res, 409, 'status', '该申请当前状态不可审核')

  const app = parseJson(row.data_json, {})
  app.status = 'rejected'
  app.reason = reason
  app.reviewTime = now

  withTx(db, () => {
    db.prepare(
      'UPDATE merchant_apps SET status = ?, data_json = ? WHERE user_id = ? AND id = ?'
    ).run('rejected', JSON.stringify(app), row.user_id, row.id)
    bumpUserRevision(db, row.user_id, now)
    insertUserMessage(db, {
      userId: row.user_id,
      type: 'merchant',
      title: '入驻审核未通过',
      desc: reason,
      target: '/pages/merchant/apply?id=' + row.id,
      now
    })
    auditLog(db, {
      actor: auth.username, role: auth.role, action: 'application.reject',
      targetType: 'merchant_app', targetId: row.id,
      detail: { userId: row.user_id, reason },
      ip, createdAt: now
    })
  })

  return sendJson(req, res, 200, { ok: true, applicationId: row.id, status: 'rejected' })
}

/* ---------------- 发票 ---------------- */
function invoiceSelectSql() {
  return `SELECT i.user_id, i.id, i.status, i.amount, i.create_time, i.data_json,
                 u.phone, u.name AS user_name
          FROM invoices i JOIN users u ON u.id = i.user_id`
}

function handleInvoiceList(ctx, auth) {
  const { req, res, db, url, sendJson } = ctx
  if (!requirePerm(ctx, auth, 'invoices:read')) return true
  const { page, pageSize, offset } = pagination(url, 20, 100)
  const where = []
  const args = []
  const status = str(url.searchParams.get('status'), 32)
  if (status) { where.push('i.status = ?'); args.push(status) }
  const keyword = str(url.searchParams.get('keyword'), 64)
  if (keyword) {
    where.push('(i.id LIKE ? OR u.phone LIKE ? OR u.name LIKE ?)')
    args.push('%' + keyword + '%', '%' + keyword + '%', '%' + keyword + '%')
  }
  const whereSql = where.length ? ' WHERE ' + where.join(' AND ') : ''
  const total = db.prepare(
    `SELECT COUNT(*) AS n FROM invoices i JOIN users u ON u.id = i.user_id${whereSql}`
  ).get(...args).n
  const rows = db.prepare(
    `${invoiceSelectSql()}${whereSql} ORDER BY i.create_time DESC, i.rowid DESC LIMIT ? OFFSET ?`
  ).all(...args, pageSize, offset)
  const counts = {}
  for (const r of db.prepare('SELECT status, COUNT(*) AS n FROM invoices GROUP BY status').all()) {
    counts[r.status] = Number(r.n) || 0
  }
  const items = rows.map(r => {
    const d = parseJson(r.data_json, {})
    return {
      ...d,
      id: r.id,
      userId: r.user_id,
      status: r.status,
      amount: Number(r.amount) || 0,
      createTime: r.create_time,
      phone: maskPhone(r.phone),
      userName: r.user_name
    }
  })
  return sendJson(req, res, 200, {
    ok: true, items, page, pageSize, total: Number(total) || 0, counts
  })
}

function resolveInvoice(db, invoiceId, userId) {
  const rows = userId
    ? db.prepare(invoiceSelectSql() + ' WHERE i.id = ? AND i.user_id = ?').all(invoiceId, userId)
    : db.prepare(invoiceSelectSql() + ' WHERE i.id = ?').all(invoiceId)
  if (rows.length === 0) return { row: null }
  if (rows.length > 1) return { row: null, ambiguous: true }
  return { row: rows[0] }
}

async function handleInvoiceIssue(ctx, auth, invoiceId, ip, now) {
  const { req, res, db, readBody, sendJson, fail } = ctx
  if (!requirePerm(ctx, auth, 'invoices:issue')) return true
  const body = await readBody(req)
  const invoiceNo = str(body.invoiceNo, 64)
  const remark = str(body.remark, 200)
  const userId = str(body.userId, 64)
  const { row, ambiguous } = resolveInvoice(db, invoiceId, userId)
  if (ambiguous) return fail(req, res, 409, 'ambiguous-owner', '该发票在多个账号下存在，请指定 userId')
  if (!row) return fail(req, res, 404, 'not-found', '发票申请不存在')
  if (row.status !== 'issuing') return fail(req, res, 409, 'status', '该发票不是待开具状态')

  const inv = parseJson(row.data_json, {})
  inv.status = 'issued'
  inv.issuedTime = now
  inv.invoiceNo = invoiceNo
  inv.remark = remark
  inv.issuedBy = auth.username

  withTx(db, () => {
    db.prepare('UPDATE invoices SET status = ?, data_json = ? WHERE user_id = ? AND id = ?')
      .run('issued', JSON.stringify(inv), row.user_id, row.id)
    bumpUserRevision(db, row.user_id, now)
    insertUserMessage(db, {
      userId: row.user_id,
      type: 'system',
      title: '发票已开具',
      desc: `${inv.title || '您的发票'} · ¥${Number(row.amount) || 0} 已开具${invoiceNo ? '（发票号 ' + invoiceNo + '）' : ''}`,
      target: '/pages/invoice/index',
      now
    })
    auditLog(db, {
      actor: auth.username, role: auth.role, action: 'invoice.issue',
      targetType: 'invoice', targetId: row.id,
      detail: { userId: row.user_id, amount: Number(row.amount) || 0, invoiceNo, remark },
      ip, createdAt: now
    })
  })

  return sendJson(req, res, 200, { ok: true, invoiceId: row.id, status: 'issued' })
}

/* ---------------- 反馈 ---------------- */
function feedbackSelectSql() {
  return `SELECT f.user_id, f.id, f.type, f.status, f.create_time, f.data_json,
                 u.phone, u.name AS user_name
          FROM feedbacks f JOIN users u ON u.id = f.user_id`
}

function handleFeedbackList(ctx, auth) {
  const { req, res, db, url, sendJson } = ctx
  if (!requirePerm(ctx, auth, 'feedbacks:read')) return true
  const { page, pageSize, offset } = pagination(url, 20, 100)
  const where = []
  const args = []
  const status = str(url.searchParams.get('status'), 32)
  if (status) { where.push('f.status = ?'); args.push(status) }
  const type = str(url.searchParams.get('type'), 32)
  if (type) { where.push('f.type = ?'); args.push(type) }
  const keyword = str(url.searchParams.get('keyword'), 64)
  if (keyword) {
    where.push('(f.id LIKE ? OR u.phone LIKE ? OR u.name LIKE ?)')
    args.push('%' + keyword + '%', '%' + keyword + '%', '%' + keyword + '%')
  }
  const whereSql = where.length ? ' WHERE ' + where.join(' AND ') : ''
  const total = db.prepare(
    `SELECT COUNT(*) AS n FROM feedbacks f JOIN users u ON u.id = f.user_id${whereSql}`
  ).get(...args).n
  const rows = db.prepare(
    `${feedbackSelectSql()}${whereSql} ORDER BY f.create_time DESC, f.rowid DESC LIMIT ? OFFSET ?`
  ).all(...args, pageSize, offset)
  const counts = {}
  for (const r of db.prepare('SELECT status, COUNT(*) AS n FROM feedbacks GROUP BY status').all()) {
    counts[r.status] = Number(r.n) || 0
  }
  const items = rows.map(r => {
    const d = parseJson(r.data_json, {})
    return {
      ...d,
      id: r.id,
      userId: r.user_id,
      type: r.type || d.type || '',
      status: r.status,
      createTime: r.create_time,
      phone: maskPhone(r.phone),
      userName: r.user_name
    }
  })
  return sendJson(req, res, 200, {
    ok: true, items, page, pageSize, total: Number(total) || 0, counts
  })
}

function resolveFeedback(db, feedbackId, userId) {
  const rows = userId
    ? db.prepare(feedbackSelectSql() + ' WHERE f.id = ? AND f.user_id = ?').all(feedbackId, userId)
    : db.prepare(feedbackSelectSql() + ' WHERE f.id = ?').all(feedbackId)
  if (rows.length === 0) return { row: null }
  if (rows.length > 1) return { row: null, ambiguous: true }
  return { row: rows[0] }
}

async function handleFeedbackStatus(ctx, auth, feedbackId, ip, now) {
  const { req, res, db, readBody, sendJson, fail } = ctx
  if (!requirePerm(ctx, auth, 'feedbacks:handle')) return true
  const body = await readBody(req)
  const next = str(body.status, 20)
  const reply = str(body.reply, 500)
  const userId = str(body.userId, 64)
  if (!['processing', 'resolved'].includes(next)) {
    return fail(req, res, 400, 'status', '状态只能是 processing 或 resolved')
  }
  const { row, ambiguous } = resolveFeedback(db, feedbackId, userId)
  if (ambiguous) return fail(req, res, 409, 'ambiguous-owner', '该反馈在多个账号下存在，请指定 userId')
  if (!row) return fail(req, res, 404, 'not-found', '反馈不存在')

  const allowed = { pending: 'processing', processing: 'resolved' }
  if (allowed[row.status] !== next) {
    return fail(req, res, 409, 'status', '反馈状态流转不合法（待处理 → 处理中 → 已解决）')
  }

  const fb = parseJson(row.data_json, {})
  fb.status = next
  if (reply) {
    fb.reply = reply
    fb.replyTime = now
    fb.handledBy = auth.username
  }

  withTx(db, () => {
    db.prepare('UPDATE feedbacks SET status = ?, data_json = ? WHERE user_id = ? AND id = ?')
      .run(next, JSON.stringify(fb), row.user_id, row.id)
    bumpUserRevision(db, row.user_id, now)
    insertUserMessage(db, {
      userId: row.user_id,
      type: 'system',
      title: next === 'resolved' ? '反馈已处理完成' : '反馈处理中',
      desc: reply || '客服已受理您的反馈，我们会尽快处理',
      target: '/pages/support/index',
      now
    })
    auditLog(db, {
      actor: auth.username, role: auth.role, action: 'feedback.status',
      targetType: 'feedback', targetId: row.id,
      detail: { userId: row.user_id, from: row.status, to: next, hasReply: !!reply },
      ip, createdAt: now
    })
  })

  return sendJson(req, res, 200, { ok: true, feedbackId: row.id, status: next })
}

/* ---------------- 用户 ---------------- */
function handleUserList(ctx, auth) {
  const { req, res, db, url, sendJson } = ctx
  if (!requirePerm(ctx, auth, 'users:read')) return true
  if (auth.kind === 'legacy') {
    const limit = url.searchParams.get('limit') || 50
    return sendJson(req, res, 200, { ok: true, items: adminList(db, 'users', limit) })
  }

  const { page, pageSize, offset } = pagination(url, 20, 100)
  const where = []
  const args = []
  const keyword = str(url.searchParams.get('keyword'), 64)
  if (keyword) {
    where.push('(u.phone LIKE ? OR u.name LIKE ? OR u.id LIKE ?)')
    args.push('%' + keyword + '%', '%' + keyword + '%', '%' + keyword + '%')
  }
  const whereSql = where.length ? ' WHERE ' + where.join(' AND ') : ''
  const total = db.prepare(`SELECT COUNT(*) AS n FROM users u${whereSql}`).get(...args).n
  const rows = db.prepare(
    `SELECT u.id, u.phone, u.name, u.member_tier, u.member_expire, u.points, u.balance,
            u.role, u.created_at, u.login_time,
            (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id) AS order_count,
            (SELECT revision FROM user_prefs p WHERE p.user_id = u.id) AS revision
     FROM users u${whereSql} ORDER BY u.created_at DESC LIMIT ? OFFSET ?`
  ).all(...args, pageSize, offset)
  const items = rows.map(r => ({
    id: r.id,
    phone: maskPhone(r.phone),
    name: r.name,
    memberTier: r.member_tier,
    memberExpire: r.member_expire,
    points: Number(r.points) || 0,
    balance: Number(r.balance) || 0,
    role: r.role,
    createdAt: r.created_at,
    lastActive: r.login_time,
    orderCount: Number(r.order_count) || 0,
    revision: Number(r.revision) || 0
  }))
  return sendJson(req, res, 200, { ok: true, items, page, pageSize, total: Number(total) || 0 })
}

function handleUserDetail(ctx, auth, userId) {
  const { req, res, db, sendJson, fail } = ctx
  if (!requirePerm(ctx, auth, 'users:read')) return true
  const u = db.prepare('SELECT * FROM users WHERE id = ?').get(userId)
  if (!u) return fail(req, res, 404, 'not-found', '用户不存在')
  const count = (sql) => Number(db.prepare(sql).get(userId).n) || 0
  const prefs = db.prepare('SELECT revision FROM user_prefs WHERE user_id = ?').get(userId) || {}
  return sendJson(req, res, 200, {
    ok: true,
    user: {
      id: u.id,
      phone: maskPhone(u.phone),
      name: u.name,
      avatar: u.avatar,
      memberTier: u.member_tier,
      memberExpire: u.member_expire,
      points: Number(u.points) || 0,
      balance: Number(u.balance) || 0,
      role: u.role,
      merchantAppId: u.merchant_app_id,
      merchantId: u.merchant_id,
      loginType: u.login_type,
      createdAt: u.created_at,
      lastActive: u.login_time
    },
    stats: {
      orders: count('SELECT COUNT(*) AS n FROM orders WHERE user_id = ?'),
      cars: count('SELECT COUNT(*) AS n FROM cars WHERE user_id = ?'),
      invoices: count('SELECT COUNT(*) AS n FROM invoices WHERE user_id = ?'),
      feedbacks: count('SELECT COUNT(*) AS n FROM feedbacks WHERE user_id = ?'),
      unreadMessages: count('SELECT COUNT(*) AS n FROM messages WHERE user_id = ? AND read = 0')
    },
    revision: Number(prefs.revision) || 0
  })
}

function handleRevealPhone(ctx, auth, userId, ip, now) {
  const { req, res, db, sendJson, fail } = ctx
  if (!requirePerm(ctx, auth, 'users:reveal')) return true
  const u = db.prepare('SELECT id, phone FROM users WHERE id = ?').get(userId)
  if (!u) return fail(req, res, 404, 'not-found', '用户不存在')
  auditLog(db, {
    actor: auth.username, role: auth.role, action: 'user.phone.reveal',
    targetType: 'user', targetId: u.id, detail: { phone: maskPhone(u.phone) },
    ip, createdAt: now
  })
  return sendJson(req, res, 200, { ok: true, phone: u.phone, audited: true })
}

function handleUserExport(ctx, auth, userId, ip, now) {
  const { req, res, db, sendJson, fail } = ctx
  if (!requirePerm(ctx, auth, 'users:reveal')) return true
  const state = readState(db, userId)
  if (!state) return fail(req, res, 404, 'not-found', '用户不存在')
  auditLog(db, {
    actor: auth.username, role: auth.role, action: 'user.data.export',
    targetType: 'user', targetId: userId, detail: { revision: state.revision },
    ip, createdAt: now
  })
  return sendJson(req, res, 200, { ok: true, exportedAt: now, state })
}

async function handlePrivacyRequest(ctx, auth, userId, ip, now) {
  const { req, res, db, readBody, sendJson, fail } = ctx
  if (!requirePerm(ctx, auth, 'privacy:manage')) return true
  const body = await readBody(req)
  const type = str(body.type, 16)
  const reason = str(body.reason, 300)
  if (!['export', 'delete'].includes(type)) {
    return fail(req, res, 400, 'type', '申请类型只能是 export 或 delete')
  }
  const u = db.prepare('SELECT id FROM users WHERE id = ?').get(userId)
  if (!u) return fail(req, res, 404, 'not-found', '用户不存在')
  const id = withTx(db, () => {
    const rid = addPrivacyRequest(db, { userId, type, reason, actor: auth.username, now })
    auditLog(db, {
      actor: auth.username, role: auth.role, action: 'privacy.request',
      targetType: 'user', targetId: userId, detail: { type, requestId: rid },
      ip, createdAt: now
    })
    return rid
  })
  return sendJson(req, res, 200, {
    ok: true, requestId: id, status: 'pending',
    note: '申请已登记，需人工复核后处理（后台不自动删除数据）'
  })
}

function handlePrivacyList(ctx, auth) {
  const { req, res, db, url, sendJson } = ctx
  if (!requirePerm(ctx, auth, 'privacy:manage')) return true
  const { page, pageSize, offset } = pagination(url, 20, 100)
  return sendJson(req, res, 200, {
    ok: true,
    items: listPrivacyRequests(db, pageSize, offset),
    page,
    pageSize
  })
}

/* ---------------- 商家列表（兼容只读） ---------------- */
function handleMerchantList(ctx, auth) {
  const { req, res, db, url, sendJson } = ctx
  if (!requirePerm(ctx, auth, 'merchants:read')) return true
  if (auth.kind === 'legacy') {
    const limit = url.searchParams.get('limit') || 50
    return sendJson(req, res, 200, { ok: true, items: adminList(db, 'merchants', limit) })
  }
  const { page, pageSize, offset } = pagination(url, 20, 100)
  const total = db.prepare('SELECT COUNT(*) AS n FROM merchants').get().n
  const rows = db.prepare(
    `SELECT id, city, name, owner_user_id, created_at, data_json
     FROM merchants ORDER BY created_at DESC, rowid DESC LIMIT ? OFFSET ?`
  ).all(pageSize, offset)
  const items = rows.map(r => {
    const d = parseJson(r.data_json, {})
    return {
      id: r.id,
      city: r.city,
      name: r.name,
      owner_user_id: r.owner_user_id,
      created_at: r.created_at,
      ownerUserId: r.owner_user_id,
      createdAt: r.created_at,
      tier: d.tier || '',
      address: d.address || '',
      data: d
    }
  })
  return sendJson(req, res, 200, { ok: true, items, page, pageSize, total: Number(total) || 0 })
}

/* ---------------- 审计 ---------------- */
function handleAuditList(ctx, auth) {
  const { req, res, db, url, sendJson } = ctx
  if (!requirePerm(ctx, auth, 'audit:read')) return true
  const { page, pageSize, offset } = pagination(url, 30, 200)
  const result = listAudit(db, {
    action: str(url.searchParams.get('action'), 64),
    actor: str(url.searchParams.get('actor'), 64),
    targetType: str(url.searchParams.get('targetType'), 64),
    from: timeBound(url.searchParams.get('from'), false),
    to: timeBound(url.searchParams.get('to'), true),
    limit: pageSize,
    offset
  })
  const items = result.items.map(r => ({
    id: r.id,
    actor: r.actor,
    role: r.role,
    action: r.action,
    targetType: r.target_type,
    targetId: r.target_id,
    detail: r.detail,
    ip: r.ip,
    createdAt: r.created_at
  }))
  return sendJson(req, res, 200, {
    ok: true, items, page, pageSize, total: Number(result.total) || 0
  })
}

/* ---------------- 管理员账号管理（仅超级管理员） ---------------- */
function handleOperatorList(ctx, auth) {
  const { req, res, db, sendJson } = ctx
  if (!requirePerm(ctx, auth, 'operators:manage')) return true
  return sendJson(req, res, 200, { ok: true, items: listAdmins(db).map(publicAdmin) })
}

async function handleOperatorCreate(ctx, auth, ip, now) {
  const { req, res, db, readBody, sendJson, fail } = ctx
  if (!requirePerm(ctx, auth, 'operators:manage')) return true
  const body = await readBody(req)
  const username = str(body.username, 32)
  const password = String(body.password || '')
  const role = str(body.role, 16) || 'ops'
  const displayName = str(body.displayName, 40)
  if (!/^[A-Za-z0-9_.-]{3,32}$/.test(username)) {
    return fail(req, res, 400, 'username', '用户名需为 3-32 位字母、数字、下划线、点或短横线')
  }
  if (!isValidRole(role)) return fail(req, res, 400, 'role', '角色不合法')
  const policy = validatePassword(password)
  if (policy) return fail(req, res, 400, 'password', policy)
  if (findAdminByUsername(db, username)) {
    return fail(req, res, 409, 'exists', '用户名已存在')
  }
  const admin = withTx(db, () => {
    const row = insertAdmin(db, {
      id: newAdminId(), username, passwordHash: hashPassword(password),
      role, displayName: displayName || username, now
    })
    auditLog(db, {
      actor: auth.username, role: auth.role, action: 'admin.create',
      targetType: 'admin', targetId: row.id, detail: { username, role },
      ip, createdAt: now
    })
    return row
  })
  return sendJson(req, res, 200, { ok: true, user: publicAdmin(admin) })
}

async function handleOperatorStatus(ctx, auth, adminId, ip, now) {
  const { req, res, db, readBody, sendJson, fail } = ctx
  if (!requirePerm(ctx, auth, 'operators:manage')) return true
  const body = await readBody(req)
  const status = str(body.status, 16)
  if (!['active', 'disabled'].includes(status)) {
    return fail(req, res, 400, 'status', '状态只能是 active 或 disabled')
  }
  const row = findAdminById(db, adminId)
  if (!row) return fail(req, res, 404, 'not-found', '管理员不存在')
  if (row.id === auth.id) return fail(req, res, 400, 'self', '不能停用当前登录账号')

  withTx(db, () => {
    updateAdminStatus(db, adminId, status, now)
    if (status === 'disabled') deleteAdminSessions(db, adminId, null)
    auditLog(db, {
      actor: auth.username, role: auth.role, action: 'admin.status',
      targetType: 'admin', targetId: adminId, detail: { username: row.username, status },
      ip, createdAt: now
    })
  })
  return sendJson(req, res, 200, { ok: true, id: adminId, status })
}

/* ---------------- 重置演示数据 ---------------- */
function handleReset(ctx, auth, ip, now) {
  const { req, res, db, sendJson, fail } = ctx
  if (!can(auth.role, '*')) return fail(req, res, 403, 'forbidden', '仅超级管理员可以重置数据')
  if (process.env.CGJ_ALLOW_RESET === '0') {
    return fail(req, res, 403, 'disabled', '演示数据重置已关闭')
  }
  const before = adminOverview(db)
  adminClearDemo(db)
  auditLog(db, {
    actor: auth.username, role: auth.role, action: 'data.reset',
    targetType: 'system', targetId: '', detail: { users: before.users, orders: before.orders },
    ip, createdAt: now
  })
  return sendJson(req, res, 200, { ok: true })
}

/* ---------------- 分发 ---------------- */
/**
 * @param {object} ctx handleAdmin 的上下文
 * @param {object|null} auth 已解析的管理员；仅登录接口允许 null
 */
export async function handleAdminApi(req, res, ctx, auth) {
  const { db, pathname, url, fail, formatNow } = ctx
  const method = req.method
  const ip = clientIp(req)
  const now = formatNow()

  // 登录不需要会话
  if (pathname === '/api/admin/login') {
    if (method !== 'POST') return methodNotAllowed(ctx)
    return handleLogin(ctx, ip, now)
  }

  // 其它接口必须已认证
  if (!auth) return fail(req, res, 401, 'unauthorized', '请先登录')

  // 清理过期会话（顺手做，无副作用）
  if (auth.kind === 'admin') {
    try { cleanupAdminSessions(db, new Date().toISOString()) } catch (e) { /* ignore */ }
  }

  const parts = pathname.split('/').filter(Boolean).slice(2).map(decodeId)
  const sub = parts[0] || ''

  if (sub === 'session' && parts.length === 1) {
    if (method !== 'GET') return methodNotAllowed(ctx)
    return ctx.sendJson(req, res, 200, {
      ok: true,
      user: {
        id: auth.id,
        username: auth.username,
        role: auth.role,
        displayName: auth.displayName
      },
      permissions: permissionsOf(auth.role),
      legacy: auth.kind === 'legacy'
    })
  }

  if (sub === 'logout' && parts.length === 1) {
    if (method !== 'POST') return methodNotAllowed(ctx)
    return handleLogout(ctx, auth, ip, now)
  }

  if (sub === 'password' && parts.length === 1) {
    if (method !== 'POST') return methodNotAllowed(ctx)
    return handlePasswordChange(ctx, auth, ip, now)
  }

  if (sub === 'overview' && parts.length === 1) {
    if (method !== 'GET') return methodNotAllowed(ctx)
    return handleOverview(ctx, auth)
  }

  if (sub === 'orders' && parts.length === 1) {
    if (method !== 'GET') return methodNotAllowed(ctx)
    return handleOrderList(ctx, auth)
  }
  if (sub === 'orders' && parts.length === 2) {
    if (method !== 'GET') return methodNotAllowed(ctx)
    return handleOrderDetail(ctx, auth, parts[1])
  }
  if (sub === 'orders' && parts.length === 3) {
    if (parts[2] === 'cancel' && method === 'POST') {
      return handleOrderCancel(ctx, auth, parts[1], ip, now)
    }
    if (parts[2] === 'notes' && method === 'POST') {
      return handleOrderNote(ctx, auth, parts[1], ip, now)
    }
    return notFound(ctx)
  }

  if (sub === 'users' && parts.length === 1) {
    if (method !== 'GET') return methodNotAllowed(ctx)
    return handleUserList(ctx, auth)
  }
  if (sub === 'users' && parts.length === 2) {
    if (method !== 'GET') return methodNotAllowed(ctx)
    return handleUserDetail(ctx, auth, parts[1])
  }
  if (sub === 'users' && parts.length === 3) {
    if (parts[2] === 'reveal-phone' && method === 'POST') {
      return handleRevealPhone(ctx, auth, parts[1], ip, now)
    }
    if (parts[2] === 'export' && method === 'GET') {
      return handleUserExport(ctx, auth, parts[1], ip, now)
    }
    if (parts[2] === 'privacy-requests' && method === 'POST') {
      return handlePrivacyRequest(ctx, auth, parts[1], ip, now)
    }
    return notFound(ctx)
  }
  if (sub === 'privacy-requests' && parts.length === 1) {
    if (method !== 'GET') return methodNotAllowed(ctx)
    return handlePrivacyList(ctx, auth)
  }

  if (sub === 'merchants' && parts.length === 1) {
    if (method !== 'GET') return methodNotAllowed(ctx)
    return handleMerchantList(ctx, auth)
  }

  if (sub === 'applications' && parts.length === 1) {
    if (method !== 'GET') return methodNotAllowed(ctx)
    return handleApplicationList(ctx, auth)
  }
  if (sub === 'applications' && parts.length === 3) {
    if (parts[2] === 'approve' && method === 'POST') {
      return handleApplicationApprove(ctx, auth, parts[1], ip, now)
    }
    if (parts[2] === 'reject' && method === 'POST') {
      return handleApplicationReject(ctx, auth, parts[1], ip, now)
    }
    return notFound(ctx)
  }

  if (sub === 'invoices' && parts.length === 1) {
    if (method !== 'GET') return methodNotAllowed(ctx)
    return handleInvoiceList(ctx, auth)
  }
  if (sub === 'invoices' && parts.length === 3 && parts[2] === 'issue') {
    if (method !== 'POST') return methodNotAllowed(ctx)
    return handleInvoiceIssue(ctx, auth, parts[1], ip, now)
  }

  if (sub === 'feedbacks' && parts.length === 1) {
    if (method !== 'GET') return methodNotAllowed(ctx)
    return handleFeedbackList(ctx, auth)
  }
  if (sub === 'feedbacks' && parts.length === 3 && parts[2] === 'status') {
    if (method !== 'POST') return methodNotAllowed(ctx)
    return handleFeedbackStatus(ctx, auth, parts[1], ip, now)
  }

  if (sub === 'audit' && parts.length === 1) {
    if (method !== 'GET') return methodNotAllowed(ctx)
    return handleAuditList(ctx, auth)
  }

  if (sub === 'operators' && parts.length === 1) {
    if (method === 'GET') return handleOperatorList(ctx, auth)
    if (method === 'POST') return handleOperatorCreate(ctx, auth, ip, now)
    return methodNotAllowed(ctx)
  }
  if (sub === 'operators' && parts.length === 3 && parts[2] === 'status') {
    if (method !== 'POST') return methodNotAllowed(ctx)
    return handleOperatorStatus(ctx, auth, parts[1], ip, now)
  }

  if (sub === 'reset' && parts.length === 1) {
    if (method !== 'POST') return methodNotAllowed(ctx)
    return handleReset(ctx, auth, ip, now)
  }

  return notFound(ctx)
}
