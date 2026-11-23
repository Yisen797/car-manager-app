// 运营后台端到端自测：临时实例 + 临时 SQLite，覆盖兼容接口、登录、RBAC、审计与业务操作
// 运行：node server/admin/test.mjs
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const INDEX = path.join(__dirname, '..', 'index.mjs')
const PORT = 19000 + Math.floor(Math.random() * 2000)
const BASE = `http://127.0.0.1:${PORT}`
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'cgj-admin-'))
const ADMIN_KEY = 'test-admin-key'
const ADMIN_USER = 'test-ops'
const ADMIN_PASS = 'TestAdmin2026'

const sleep = ms => new Promise(r => setTimeout(r, ms))
let passed = 0
let failed = 0

function ok(cond, name, extra) {
  if (cond) { passed++; console.log(`PASS  ${name}`) }
  else {
    failed++
    console.log(`FAIL  ${name}${extra ? '\n      ' + extra : ''}`)
  }
}

function eq(actual, expected, name) {
  try {
    assert.deepEqual(actual, expected)
    passed++
    console.log(`PASS  ${name}`)
  } catch (e) {
    failed++
    console.log(`FAIL  ${name}\n      期望 ${JSON.stringify(expected)}\n      实际 ${JSON.stringify(actual)}`)
  }
}

const child = spawn(process.execPath, [INDEX], {
  env: {
    ...process.env,
    PORT: String(PORT),
    CGJ_HOST: '127.0.0.1',
    CGJ_DATA_DIR: TMP,
    CGJ_DB: path.join(TMP, 'admin-test.db'),
    CGJ_ADMIN_KEY: ADMIN_KEY,
    CGJ_ADMIN_USER: ADMIN_USER,
    CGJ_ADMIN_PASSWORD: ADMIN_PASS,
    CGJ_QUIET: '1'
  },
  stdio: ['ignore', 'pipe', 'pipe']
})
let serverLog = ''
child.stdout.on('data', d => { serverLog += d })
child.stderr.on('data', d => { serverLog += d })

async function req(pathname, { method = 'GET', body, token, admin } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = 'Bearer ' + token
  if (admin) headers['x-admin-key'] = admin
  const res = await fetch(BASE + pathname, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  })
  let data = null
  try { data = await res.json() } catch (e) { data = null }
  return { status: res.status, data, headers: res.headers }
}

function cleanup() {
  try { child.kill() } catch (e) { /* ignore */ }
  try { fs.rmSync(TMP, { recursive: true, force: true }) } catch (e) { /* ignore */ }
}

const nowText = '2026-11-02 10:00'

try {
  // ---- 等待服务就绪 ----
  let up = false
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(BASE + '/api/health')
      if (r.ok) { up = true; break }
    } catch (e) { /* retry */ }
    await sleep(100)
  }
  if (!up) throw new Error('后端启动失败：\n' + serverLog)

  // ---- 准备车主数据（demo 账号自带 5 笔订单）----
  let userToken = ''
  {
    const r = await req('/api/auth/login', {
      method: 'POST', body: { phone: '13800001111', code: '123456' }
    })
    ok(r.status === 200 && r.data.state.orders.length === 5, '准备数据：车主登录并生成 5 笔订单')
    userToken = r.data.token
    const state = r.data.state

    const pending = state.orders.find(o => o.id === 'O20261029002')
    pending.status = 'waiting'
    pending.payLabel = '已支付'
    pending.payMethod = 'wechat'

    state.merchantApplications.push({
      id: 'MA_test1', name: '测试洗车店（驳回用）', type: '洗车美容', tier: 'free',
      contact: '张三', phone: '13800001111', ownerPhone: '13800001111', city: '北京',
      hours: '09:00 - 21:00', open: true, address: '测试路 1 号', licenseImage: '', intro: '',
      status: 'reviewing', submitTime: nowText, reviewTime: '', reason: '', merchantId: ''
    })
    state.merchantApplications.push({
      id: 'MA_test2', name: '测试养车中心（通过用）', type: '维修保养', tier: 'gold',
      contact: '李四', phone: '13800001111', ownerPhone: '13800001111', city: '北京',
      hours: '08:00 - 20:00', open: true, address: '测试路 2 号', licenseImage: '', intro: '测试商家',
      status: 'reviewing', submitTime: nowText, reviewTime: '', reason: '', merchantId: ''
    })
    state.invoices.push({
      id: 'INV_test1', orderIds: ['O20261029002'], orderTitle: '洗车服务', amount: 50,
      type: 'personal', title: '个人', taxNo: '', email: 'test@example.com',
      status: 'issuing', createTime: nowText
    })
    state.feedbacks.push({
      id: 'FB_test1', type: '功能建议', content: '希望增加夜间洗车门店筛选',
      contact: '', images: [], status: 'pending', createTime: nowText
    })

    const put = await req('/api/state', {
      method: 'PUT', token: userToken, body: { state, baseRevision: state.revision }
    })
    ok(put.status === 200 && put.data.revision === 2, '准备数据：客户端状态推送成功（revision=2）')
  }

  // ---- 兼容：x-admin-key ----
  {
    const bad = await req('/api/admin/overview', { admin: 'wrong' })
    ok(bad.status === 401, '兼容：错误管理密钥返回 401')

    const o = await req('/api/admin/overview', { admin: ADMIN_KEY })
    ok(o.status === 200 && o.data.users === 1 && o.data.orders === 5, '兼容：overview 统计不变')

    const u = await req('/api/admin/users', { admin: ADMIN_KEY })
    ok(u.status === 200 && Array.isArray(u.data.items) && u.data.items.length === 1, '兼容：users 列表')
    ok(u.status === 200 && u.data.items[0].phone === '13800001111', '兼容：users 列表返回完整手机号（旧行为）')

    const ord = await req('/api/admin/orders', { admin: ADMIN_KEY })
    ok(ord.status === 200 && ord.data.items.length === 5, '兼容：orders 列表')

    const m = await req('/api/admin/merchants', { admin: ADMIN_KEY })
    ok(m.status === 200 && m.data.items.length >= 6, '兼容：merchants 列表')

    const a = await req('/api/admin/applications', { admin: ADMIN_KEY })
    ok(a.status === 200 && a.data.items.length === 2, '兼容：applications 列表')
  }

  // ---- 管理员登录 ----
  let token = ''
  {
    const wrong = await req('/api/admin/login', {
      method: 'POST', body: { username: ADMIN_USER, password: 'wrong-password' }
    })
    ok(wrong.status === 401, '登录：错误密码返回 401')

    // 独立的用户名做限流，避免锁住真实账号
    for (let i = 0; i < 5; i++) {
      await req('/api/admin/login', { method: 'POST', body: { username: 'no-such-user', password: 'x' } })
    }
    const limited = await req('/api/admin/login', {
      method: 'POST', body: { username: 'no-such-user', password: 'x' }
    })
    ok(limited.status === 429, '登录：5 次失败后触发限流（429）')

    const r = await req('/api/admin/login', {
      method: 'POST', body: { username: ADMIN_USER, password: ADMIN_PASS }
    })
    ok(r.status === 200 && typeof r.data.token === 'string', '登录：引导账号登录成功')
    ok(r.data.user && r.data.user.role === 'super', '登录：引导账号为 super 角色')
    ok(Array.isArray(r.data.permissions) && r.data.permissions.includes('*'), '登录：返回权限集合')
    token = r.data.token

    const s = await req('/api/admin/session', { token })
    ok(s.status === 200 && s.data.user.username === ADMIN_USER, '会话：Bearer 令牌有效')

    const noAuth = await req('/api/admin/orders')
    ok(noAuth.status === 401, '会话：无令牌访问返回 401')
  }

  // ---- 订单运营 ----
  let waitingOrderId = ''
  let doneOrderId = ''
  {
    const list = await req('/api/admin/orders?status=waiting', { token })
    ok(list.status === 200 && list.data.items.length === 1, '订单：按状态筛选待接单')
    ok(list.data.items[0].phone.includes('****'), '订单：列表手机号脱敏')
    waitingOrderId = list.data.items[0].id

    const done = await req('/api/admin/orders?status=done', { token })
    doneOrderId = done.data.items[0].id

    const noReason = await req(`/api/admin/orders/${waitingOrderId}/cancel`, {
      method: 'POST', token, body: { userId: list.data.items[0].userId }
    })
    ok(noReason.status === 400, '订单：缺少取消原因被拒绝')

    const wrongStatus = await req(`/api/admin/orders/${doneOrderId}/cancel`, {
      method: 'POST', token, body: { reason: '测试取消' }
    })
    ok(wrongStatus.status === 409, '订单：已完成订单不可取消（409）')

    const cancel = await req(`/api/admin/orders/${waitingOrderId}/cancel`, {
      method: 'POST', token,
      body: { userId: list.data.items[0].userId, reason: '用户电话申请取消' }
    })
    ok(cancel.status === 200 && cancel.data.refunded === true, '订单：已支付订单取消并模拟退款')

    const detail = await req(
      `/api/admin/orders/${waitingOrderId}?userId=${encodeURIComponent(list.data.items[0].userId)}`,
      { token }
    )
    ok(detail.status === 200 && detail.data.order.status === 'canceled', '订单：详情显示已取消')
    ok(detail.data.order.payLabel === '已退款', '订单：已支付取消后标记已退款')
    const timelineText = (detail.data.order.timeline || []).map(t => t.text).join('|')
    ok(timelineText.includes('原路退回（模拟）'), '订单：时间线写入原路退回（模拟）')

    const note = await req(`/api/admin/orders/${waitingOrderId}/notes`, {
      method: 'POST', token,
      body: { userId: list.data.items[0].userId, note: '已电话回访用户' }
    })
    ok(note.status === 200, '订单：添加内部备注')
    const detail2 = await req(
      `/api/admin/orders/${waitingOrderId}?userId=${encodeURIComponent(list.data.items[0].userId)}`,
      { token }
    )
    ok(Array.isArray(detail2.data.adminNotes) && detail2.data.adminNotes.length === 1, '订单：详情包含内部备注')

    const audit = await req('/api/admin/audit?action=order.cancel&pageSize=50', { token })
    ok(audit.status === 200 && audit.data.items.length >= 1, '审计：订单取消已记录')
    ok(audit.data.items[0].detail.includes('用户电话申请取消'), '审计：记录取消原因')

    const mine = await req('/api/state', { token: userToken })
    ok(mine.status === 200 && mine.data.revision === 3, '订单：后台操作后 user_prefs.revision +1')
    ok(mine.data.orders.find(o => o.id === waitingOrderId).status === 'canceled', '订单：客户端拉取到最新订单状态')
  }

  // ---- 商家入驻审核 ----
  {
    const list = await req('/api/admin/applications?status=reviewing', { token })
    ok(list.status === 200 && list.data.items.length === 2, '入驻：待审核列表')
    const app1 = list.data.items.find(a => a.id === 'MA_test1')
    const app2 = list.data.items.find(a => a.id === 'MA_test2')

    const shortReason = await req(`/api/admin/applications/${app1.id}/reject`, {
      method: 'POST', token, body: { userId: app1.userId, reason: '材料' }
    })
    ok(shortReason.status === 400, '入驻：驳回原因不足 5 字被拒绝')

    const reject = await req(`/api/admin/applications/${app1.id}/reject`, {
      method: 'POST', token, body: { userId: app1.userId, reason: '营业执照材料不清晰' }
    })
    ok(reject.status === 200, '入驻：驳回成功')

    const approve = await req(`/api/admin/applications/${app2.id}/approve`, {
      method: 'POST', token, body: { userId: app2.userId }
    })
    ok(approve.status === 200 && /^dm/.test(approve.data.merchantId), '入驻：通过并生成商家 ID')

    const merchants = await req('/api/admin/merchants', { admin: ADMIN_KEY })
    ok(merchants.data.items.some(m => m.id === approve.data.merchantId), '入驻：merchants 表已生成记录')

    const approved = await req('/api/admin/applications?status=approved', { token })
    ok(approved.data.items.some(a => a.id === app2.id), '入驻：申请状态更新为 approved')

    const mine = await req('/api/state', { token: userToken })
    ok(mine.data.user.role === 'merchant', '入驻：申请人账号升级为 merchant')
    ok(mine.data.user.merchantId === approve.data.merchantId, '入驻：用户绑定 merchant_id')

    const audit = await req('/api/admin/audit?action=application.&pageSize=50', { token })
    ok(audit.data.items.length >= 2, '审计：入驻通过与驳回均已记录')
  }

  // ---- 发票 ----
  {
    const list = await req('/api/admin/invoices?status=issuing', { token })
    ok(list.status === 200 && list.data.items.length === 1, '发票：待开具列表')
    const inv = list.data.items[0]
    const issue = await req(`/api/admin/invoices/${inv.id}/issue`, {
      method: 'POST', token, body: { userId: inv.userId, invoiceNo: 'FP202611020001', remark: '电子普票' }
    })
    ok(issue.status === 200, '发票：开具成功')
    const issued = await req('/api/admin/invoices?status=issued', { token })
    ok(issued.data.items.length === 1 && issued.data.items[0].invoiceNo === 'FP202611020001', '发票：状态与发票号已保存')
    const audit = await req('/api/admin/audit?action=invoice.issue', { token })
    ok(audit.data.items.length === 1, '审计：发票开具已记录')
  }

  // ---- 反馈 ----
  {
    const list = await req('/api/admin/feedbacks?status=pending', { token })
    ok(list.status === 200 && list.data.items.length === 1, '反馈：待处理列表')
    const fb = list.data.items[0]

    const skip = await req(`/api/admin/feedbacks/${fb.id}/status`, {
      method: 'POST', token, body: { userId: fb.userId, status: 'resolved' }
    })
    ok(skip.status === 409, '反馈：不允许越过处理中')

    const processing = await req(`/api/admin/feedbacks/${fb.id}/status`, {
      method: 'POST', token, body: { userId: fb.userId, status: 'processing', reply: '已收到您的建议' }
    })
    ok(processing.status === 200, '反馈：pending → processing')

    const resolved = await req(`/api/admin/feedbacks/${fb.id}/status`, {
      method: 'POST', token, body: { userId: fb.userId, status: 'resolved', reply: '已加入需求池' }
    })
    ok(resolved.status === 200, '反馈：processing → resolved')

    const done = await req('/api/admin/feedbacks?status=resolved', { token })
    ok(done.data.items.length === 1 && done.data.items[0].reply === '已加入需求池', '反馈：回复已保存')
    const audit = await req('/api/admin/audit?action=feedback.status', { token })
    ok(audit.data.items.length === 2, '审计：反馈两次流转均已记录')
  }

  // ---- RBAC ----
  {
    const create = await req('/api/admin/operators', {
      method: 'POST', token,
      body: { username: 'support1', password: 'Support2026', role: 'support', displayName: '客服一号' }
    })
    ok(create.status === 200 && create.data.user.role === 'support', 'RBAC：超级管理员创建客服账号')

    const login = await req('/api/admin/login', {
      method: 'POST', body: { username: 'support1', password: 'Support2026' }
    })
    ok(login.status === 200, 'RBAC：客服账号登录')
    const supportToken = login.data.token

    const orders = await req('/api/admin/orders', { token: supportToken })
    ok(orders.status === 200, 'RBAC：客服可只读订单')

    const cancel = await req(`/api/admin/orders/${doneOrderId}/cancel`, {
      method: 'POST', token: supportToken, body: { reason: '越权测试' }
    })
    ok(cancel.status === 403, 'RBAC：客服不能取消订单（403）')

    const audit = await req('/api/admin/audit', { token: supportToken })
    ok(audit.status === 403, 'RBAC：客服不能查看审计日志（403）')

    const apps = await req('/api/admin/applications', { token: supportToken })
    ok(apps.status === 403, 'RBAC：客服不能查看入驻审核（403）')

    const feedbacks = await req('/api/admin/feedbacks', { token: supportToken })
    ok(feedbacks.status === 200, 'RBAC：客服可查看反馈')

    const ops = await req('/api/admin/operators', { token })
    ok(ops.data.items.some(x => x.username === 'support1'), 'RBAC：管理员列表包含新账号')

    // 停用客服后会话立即失效
    const target = ops.data.items.find(x => x.username === 'support1')
    const disable = await req(`/api/admin/operators/${target.id}/status`, {
      method: 'POST', token, body: { status: 'disabled' }
    })
    ok(disable.status === 200, 'RBAC：超级管理员停用账号')
    const invalid = await req('/api/admin/session', { token: supportToken })
    ok(invalid.status === 401, 'RBAC：停用后旧会话失效')
  }

  // ---- 退出登录 ----
  {
    const out = await req('/api/admin/logout', { method: 'POST', token })
    ok(out.status === 200, '会话：退出登录成功')
    const s = await req('/api/admin/session', { token })
    ok(s.status === 401, '会话：退出后令牌失效')
  }

  // ---- 后台页面与安全响应头 ----
  {
    const r = await fetch(BASE + '/admin')
    const html = await r.text()
    ok(r.ok && html.includes('车管家 · 运营后台'), '页面：后台页面可访问')
    ok((r.headers.get('x-frame-options') || '') === 'DENY', '页面：X-Frame-Options DENY')
    ok((r.headers.get('x-content-type-options') || '') === 'nosniff', '页面：X-Content-Type-Options nosniff')
    const csp = r.headers.get('content-security-policy') || ''
    ok(csp.includes("script-src 'nonce-") && !csp.includes('unsafe-inline'), '页面：CSP 使用 nonce 且无 unsafe-inline')
    ok(!html.includes('__ADMIN_CSP_NONCE__'), '页面：nonce 已注入')
  }

  // ---- 兼容：重置 ----
  {
    const reset = await req('/api/admin/reset', { method: 'POST', admin: ADMIN_KEY })
    ok(reset.status === 200, '兼容：重置演示数据')
    const o = await req('/api/admin/overview', { admin: ADMIN_KEY })
    ok(o.data.users === 0 && o.data.orders === 0, '兼容：重置后数据清空')
    const audit = await req('/api/admin/audit?action=data.reset', { admin: ADMIN_KEY })
    ok(audit.status === 200 && audit.data.items.length >= 1, '审计：数据重置已记录')
  }
} catch (e) {
  failed++
  console.log('FAIL  测试中断：' + e.message)
  if (serverLog) console.log('--- server log ---\n' + serverLog)
} finally {
  cleanup()
}

console.log(`\n${failed ? '失败' : '全部通过'}：${passed} 项通过，${failed} 项失败`)
process.exit(failed ? 1 : 0)
