// 后端端到端自测：启动临时实例（临时 SQLite + 随机端口），跑完整接口流程
// 运行：node server/test.mjs
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { normalizePoi } from './integrations/amap.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const INDEX = path.join(__dirname, 'index.mjs')
const PORT = 18000 + Math.floor(Math.random() * 2000)
const BASE = `http://127.0.0.1:${PORT}`
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'cgj-server-'))
const ADMIN_KEY = 'test-admin-key'

const sleep = ms => new Promise(r => setTimeout(r, ms))
let passed = 0
let failed = 0

function ok(cond, name) {
  if (cond) { passed++; console.log(`PASS  ${name}`) }
  else { failed++; console.log(`FAIL  ${name}`) }
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
    CGJ_ADMIN_KEY: ADMIN_KEY,
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
  return { status: res.status, data }
}

function cleanup() {
  try { child.kill() } catch (e) { /* ignore */ }
  try { fs.rmSync(TMP, { recursive: true, force: true }) } catch (e) { /* ignore */ }
}

try {
  // 等待服务就绪
  let up = false
  for (let i = 0; i < 50; i++) {
    try {
      const r = await fetch(BASE + '/api/health')
      if (r.ok) { up = true; break }
    } catch (e) { /* retry */ }
    await sleep(100)
  }
  if (!up) throw new Error('后端启动失败：\n' + serverLog)

  // ---- 健康检查 ----
  {
    const r = await req('/api/health')
    ok(r.status === 200 && r.data.ok && r.data.service === 'cheguanjia', '健康检查')
  }

  // ---- 短信与登录 ----
  let token = ''
  let state = null
  {
    const r = await req('/api/auth/sms', { method: 'POST', body: { phone: '13800001111' } })
    ok(r.status === 200 && r.data.code === '123456', '发送验证码（演示模式返回 123456）')
  }
  {
    const r = await req('/api/auth/login', { method: 'POST', body: { phone: '13800001111', code: '123456' } })
    ok(r.status === 200 && typeof r.data.token === 'string', '手机号 + 验证码登录')
    ok(r.data.isNew === true, '首次登录自动创建账号')
    token = r.data.token
    state = r.data.state
  }
  {
    const r = await req('/api/auth/login', { method: 'POST', body: { phone: '13800001111', code: '000000' } })
    ok(r.status === 400, '错误验证码被拒绝')
  }

  // ---- 新账号种子数据 ----
  eq(state.cars.length, 2, '新账号自带 2 台演示车辆')
  eq(state.orders.length, 5, '新账号自带 5 笔演示订单')
  eq(state.coupons.length, 3, '新账号自带 3 张已领取优惠券')
  eq(state.messages.length, 3, '新账号自带 3 条站内信')
  eq(state.user.points, 1280, '新账号初始积分 1280')
  eq(state.user.memberTier, 'premium', '新账号为尊享会员')
  eq(state.revision, 1, '初始数据版本为 1')

  // ---- 鉴权 ----
  {
    const r = await req('/api/state')
    ok(r.status === 401, '未登录访问状态接口返回 401')
  }
  {
    const r = await req('/api/state', { token })
    ok(r.status === 200 && r.data.orders.length === 5, '登录后可读取自己的状态')
  }

  // ---- 整包同步 ----
  {
    state.user.name = '测试车主'
    state.cars.push({
      id: 'c_test', plate: '京T·00001', brand: '测试车', mileage: 100,
      color: '黑色', insuranceEnd: '2027-01-01', annualEnd: '2027-01-01',
      emoji: '🚗', gradient: 'linear-gradient(135deg,#3A4B63,#141D2B)'
    })
    const target = state.orders.find(o => o.status === 'waiting') ||
      state.orders.find(o => o.status === 'serving') || state.orders[0]
    target.status = 'done'
    target.payLabel = '已完成'

    const r = await req('/api/state', { method: 'PUT', token, body: { state, baseRevision: 1 } })
    ok(r.status === 200 && r.data.revision === 2, '提交整包状态并递增版本号')
  }
  {
    const r = await req('/api/state', { token })
    ok(r.data.user.name === '测试车主', '修改后的昵称已持久化')
    ok(r.data.cars.some(c => c.id === 'c_test'), '新增车辆已持久化')
    ok(r.data.orders.some(o => o.status === 'done'), '订单状态变更已持久化')
    ok(r.data.revision === 2, '读取到最新版本号')
  }
  {
    const r = await req('/api/state', { method: 'PUT', token, body: { state, baseRevision: 1 } })
    ok(r.status === 409, '旧版本号写入被拒绝（乐观并发）')
  }

  // ---- 多端与账号隔离 ----
  {
    const r = await req('/api/auth/login', { method: 'POST', body: { phone: '13800001111', code: '123456' } })
    ok(r.data.state.user.name === '测试车主' && r.data.state.cars.length === 3, '同一账号在另一台设备登录看到相同数据')
  }
  {
    const r = await req('/api/auth/login', { method: 'POST', body: { phone: '13800002222', code: '123456' } })
    ok(r.data.state.cars.length === 2 && r.data.state.user.name !== '测试车主', '不同手机号数据相互隔离')
    const r2 = await req('/api/state', { token: r.data.token })
    ok(r2.data.orders.length === 5, '新账号订单不受其他账号影响')
  }

  // ---- 退出登录 ----
  {
    const r = await req('/api/auth/logout', { method: 'POST', token })
    ok(r.status === 200, '退出登录')
    const r2 = await req('/api/state', { token })
    ok(r2.status === 401, '退出后令牌失效')
  }

  // ---- 商家公开数据 ----
  {
    const r = await req('/api/merchants?city=' + encodeURIComponent('北京'))
    ok(r.status === 200 && r.data.merchants.length >= 6, '按城市查询商家')
    const c = await req('/api/coupon-templates')
    ok(c.status === 200 && c.data.templates.length === 6, '优惠券模板查询')
  }

  // ---- 高德 POI 附近门店（测试环境未配置 CGJ_AMAP_KEY，应回退演示数据）----
  {
    const r = await req('/api/poi/nearby?category=wash&lng=116.4074&lat=39.9042')
    ok(r.status === 200 && r.data.source === 'demo' && r.data.items.length === 3,
      '附近门店：未配置 Key 返回演示数据')
    const r2 = await req('/api/poi/nearby?category=charge&lng=116.4074&lat=39.9042&radius=3000')
    ok(r2.status === 200 && r2.data.items.every(p => p.id.startsWith('demo_charge_')),
      '附近门店：按分类返回')
    const bad = await req('/api/poi/nearby?category=nope&lng=116.4&lat=39.9')
    ok(bad.status === 400, '附近门店：不支持的分类返回 400')
    const bad2 = await req('/api/poi/nearby?category=wash')
    ok(bad2.status === 400, '附近门店：缺少坐标返回 400')
    const s = await req('/api/integrations')
    ok(s.status === 200 && s.data.amap.configured === false, '集成状态：高德未配置')
  }
  {
    const r = await req('/api/poi/search?keyword=' + encodeURIComponent('洗车') + '&city=' + encodeURIComponent('北京'))
    ok(r.status === 200 && r.data.source === 'demo' && r.data.items.length === 0,
      '门店搜索：未配置 Key 返回空演示结果')
    const bad = await req('/api/poi/search?keyword=')
    ok(bad.status === 400, '门店搜索：缺少关键词返回 400')

    const rev = await req('/api/geo/reverse?lng=116.4074&lat=39.9042')
    ok(rev.status === 200 && rev.data.source === 'demo' && rev.data.address === '',
      '逆地理：未配置 Key 返回空地址')
    const badRev = await req('/api/geo/reverse?lat=39.9')
    ok(badRev.status === 400, '逆地理：缺少坐标返回 400')

    const geoc = await req('/api/geo/code?address=' + encodeURIComponent('北京市朝阳区建国路88号') + '&city=' + encodeURIComponent('北京'))
    ok(geoc.status === 200 && geoc.data.source === 'demo' && geoc.data.lng === null,
      '地理编码：未配置 Key 返回空坐标')
    const badGeo = await req('/api/geo/code')
    ok(badGeo.status === 400, '地理编码：缺少地址返回 400')
  }
  {
    const p = normalizePoi({
      id: 'B001', name: '测试洗车', location: '116.4074,39.9042', address: '测试路 1 号',
      tel: '010-12345678', distance: '560', type: '汽车服务;洗车场',
      tag: '精洗;打蜡', biz_ext: { rating: '4.9', cost: '30' }
    })
    ok(p && p.lng === 116.4074 && p.lat === 39.9042 && p.distance === 560 &&
      p.rating === 4.9 && p.tags.length === 2, 'POI 数据归一化')
    ok(normalizePoi({}) === null, '无效 POI 被丢弃')
  }

  // ---- 管理端 ----
  {
    const r = await req('/api/admin/overview', { admin: 'wrong' })
    ok(r.status === 401, '错误管理密钥被拒绝')
  }
  let overview = null
  {
    const r = await req('/api/admin/overview', { admin: ADMIN_KEY })
    ok(r.status === 200 && r.data.users === 2, '管理端统计：用户数')
    ok(r.data.orders === 10, '管理端统计：订单数')
    overview = r.data
    const u = await req('/api/admin/users', { admin: ADMIN_KEY })
    ok(u.status === 200 && u.data.items.length === 2, '管理端用户列表')
    const o = await req('/api/admin/orders', { admin: ADMIN_KEY })
    ok(o.status === 200 && o.data.items.length === 10, '管理端订单列表')
    const m = await req('/api/admin/merchants', { admin: ADMIN_KEY })
    ok(m.status === 200 && m.data.items.length >= 6, '管理端商家列表')
  }
  {
    const r = await req('/api/admin/reset', { method: 'POST', admin: ADMIN_KEY })
    ok(r.status === 200, '管理端重置演示数据')
    const o = await req('/api/admin/overview', { admin: ADMIN_KEY })
    ok(o.data.users === 0 && o.data.orders === 0, '重置后数据清空')
  }
  {
    const r = await fetch(BASE + '/admin')
    const html = await r.text()
    ok(r.ok && html.includes('车管家 · 运营后台'), '管理端页面可访问')
  }
} catch (e) {
  failed++
  console.log('FAIL  测试中断：' + e.message)
  if (serverLog) console.log(serverLog)
} finally {
  cleanup()
}

console.log(`\n${failed ? '失败' : '全部通过'}：${passed} 项通过，${failed} 项失败`)
process.exit(failed ? 1 : 0)
