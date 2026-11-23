// 邀请有礼后端自测：临时 SQLite + 随机端口 + 独立进程
// 运行：node server/invite/test.mjs
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { DatabaseSync } from 'node:sqlite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const INDEX = path.join(__dirname, '..', 'index.mjs')
const PORT = 21000 + Math.floor(Math.random() * 2000)
const BASE = `http://127.0.0.1:${PORT}`
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'cgj-invite-'))
const DB_FILE = path.join(TMP, 'car-manager.db')

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
    CGJ_QUIET: '1',
    CGJ_ADMIN_KEY: 'test-admin-key',
    // 调小上限，便于在少量账号内验证反作弊/上限逻辑
    CGJ_INVITE_DAILY_LIMIT: '2',
    CGJ_INVITE_MONTHLY_LIMIT: '100',
    CGJ_INVITE_DEVICE_HOURLY: '2',
    CGJ_INVITE_IP_HOURLY: '50'
  },
  stdio: ['ignore', 'pipe', 'pipe']
})
let serverLog = ''
child.stdout.on('data', d => { serverLog += d })
child.stderr.on('data', d => { serverLog += d })

async function req(pathname, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = 'Bearer ' + token
  const res = await fetch(BASE + pathname, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  })
  let data = null
  try { data = await res.json() } catch (e) { data = null }
  return { status: res.status, data }
}

// 演示模式验证码固定 123456，无需先发短信
async function login(phone) {
  const r = await req('/api/auth/login', { method: 'POST', body: { phone, code: '123456' } })
  if (r.status !== 200 || !r.data.token) throw new Error('登录失败：' + phone + ' ' + JSON.stringify(r.data))
  return { token: r.data.token, state: r.data.state }
}

const me = token => req('/api/invite/me', { token })
const bind = (token, code, device) => req('/api/invite/bind', {
  method: 'POST', token, body: { code, device }
})
const claim = (token, rewardId) => req('/api/invite/claim', {
  method: 'POST', token, body: { rewardId, device: 'dev-claim' }
})

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

  // ---- 邀请人 ----
  const inviter = await login('13800009001')
  let inviterMe = null
  {
    const r = await me(inviter.token)
    ok(r.status === 200 && r.data.ok, '邀请人可读取邀请数据')
    inviterMe = r.data.invite
    ok(/^CG[A-Z0-9]{8}$/.test(inviterMe.code), '自动生成不透明邀请码（CG + 8 位）')
    ok(!inviterMe.code.includes('9001'), '邀请码不包含手机号片段')
    ok(inviterMe.count === 0 && inviterMe.records.length === 0, '初始邀请人数为 0')
    ok(inviterMe.bound === null, '邀请人自己未绑定邀请人')
    ok(inviterMe.limits.daily > 0 && inviterMe.limits.monthly > 0, '返回每日/每月上限')
  }
  const code = inviterMe.code

  // ---- 被邀请人 A：首次绑定 ----
  const userA = await login('13800009002')
  {
    const r = await bind(userA.token, code, 'dev-a')
    ok(r.status === 200 && r.data.ok && r.data.already === false, '被邀请人 A 首次绑定成功')
    ok(r.data.counted === true, 'A 的绑定计入邀请人数')
    ok(r.data.bound && r.data.bound.code === code, 'A 返回已绑定的邀请码')
    ok(r.data.invite && r.data.invite.bound && r.data.invite.bound.code === code, 'A 侧可看到已绑定的邀请人')
  }
  {
    const r = await me(inviter.token)
    inviterMe = r.data.invite
    eq(inviterMe.count, 1, 'A 绑定后邀请人数 +1')
    eq(inviterMe.records.length, 1, '邀请记录新增 1 条')
    ok(inviterMe.records[0].name.includes('****'), '邀请记录手机号脱敏')
    ok(!JSON.stringify(inviterMe.records).includes('13800009002'), '邀请记录不含完整手机号')
  }

  // ---- A 重复绑定 ----
  {
    const r = await bind(userA.token, code, 'dev-a')
    ok(r.status === 200 && r.data.ok && r.data.already === true, 'A 重复绑定返回已绑定')
    ok(r.data.counted === false, 'A 重复绑定不计数')
    const m = await me(inviter.token)
    eq(m.data.invite.count, 1, 'A 重复绑定后邀请人数不变')
    eq(m.data.invite.records.length, 1, 'A 重复绑定后记录数不变')
  }

  // ---- 被邀请人 B：不同人各算一次 ----
  const userB = await login('13800009003')
  {
    const r = await bind(userB.token, code, 'dev-b')
    ok(r.status === 200 && r.data.already === false && r.data.counted === true, '被邀请人 B 绑定成功')
    const m = await me(inviter.token)
    eq(m.data.invite.count, 2, 'B 绑定后邀请人数 +1（累计 2）')
    eq(m.data.invite.usedToday, 2, '今日计入人数为 2')
  }

  // ---- 自己邀请自己 ----
  {
    const r = await bind(inviter.token, code, 'dev-self')
    ok(r.status === 400 && r.data.error && r.data.error.code === 'self', '自己邀请自己被拒绝')
    const m = await me(inviter.token)
    eq(m.data.invite.count, 2, '自邀不增加人数')
  }

  // ---- 每日上限：超限不计数 ----
  {
    const userC = await login('13800009004')
    const r = await bind(userC.token, code, 'dev-c')
    ok(r.status === 200 && r.data.ok, '超过每日上限仍可完成绑定')
    ok(r.data.counted === false, '超过每日上限不计数')
    const m = await me(inviter.token)
    eq(m.data.invite.count, 2, '超限后邀请人数不再增加')
    eq(m.data.invite.usedToday, 2, '今日计入人数保持 2')
  }

  // ---- 领奖幂等 ----
  {
    const first = await claim(inviter.token, 'inv1')
    ok(first.status === 200 && first.data.ok && first.data.already === false, '首次领取 inv1 成功')
    eq(first.data.granted.points, 200, 'inv1 发放 200 积分')
    eq(first.data.granted.coupons.length, 1, 'inv1 发放 1 张优惠券')
    ok(first.data.invite.claimed.includes('inv1'), '领取记录包含 inv1')

    const second = await claim(inviter.token, 'inv1')
    ok(second.status === 200 && second.data.already === true, '重复领取 inv1 返回已领取')
    ok(!second.data.granted, '重复领取不再发放奖励')

    const state1 = await req('/api/state', { token: inviter.token })
    eq(state1.data.user.points, 1280 + 200, '积分只增加一次（1480）')
    eq(state1.data.coupons.length, 3 + 1, '优惠券只增加一张（4 张）')
    ok(state1.data.invite.claimed.includes('inv1'), '整包状态兼容旧 invite.claimed 字段')
    ok(state1.data.revision >= 2, '领奖后数据版本递增')

    const notReady = await claim(inviter.token, 'inv3')
    ok(notReady.status === 400 && notReady.data.error.code === 'not-ready', '人数不足时不能领 inv3')

    const bad = await claim(inviter.token, 'not-exist')
    ok(bad.status === 400 && bad.data.error.code === 'reward', '不存在的奖励被拒绝')
  }

  // ---- 被邀请人欢迎奖励（双方各得）----
  {
    const stateA = await req('/api/state', { token: userA.token })
    eq(stateA.data.user.points, 1280 + 200, '被邀请人 A 收到 200 积分欢迎奖励')
    eq(stateA.data.coupons.length, 3 + 1, '被邀请人 A 收到 1 张 20 元券')
    ok(stateA.data.invite.records.length === 0, '被邀请人自己的邀请人数不受影响')
  }

  // ---- 设备限流 ----
  {
    const inviterY = await login('13800009009')
    const yMe = await me(inviterY.token)
    const yCode = yMe.data.invite.code
    const d = await login('13800009010')
    const e = await login('13800009011')
    const f = await login('13800009012')
    const r1 = await bind(d.token, yCode, 'dev-shared')
    const r2 = await bind(e.token, yCode, 'dev-shared')
    const r3 = await bind(f.token, yCode, 'dev-shared')
    ok(r1.status === 200 && r1.data.counted === true, '同一设备前 2 次绑定通过')
    ok(r2.status === 200 && r2.data.counted === true, '同一设备第 2 次绑定通过')
    ok(r3.status === 429 && r3.data.error.code === 'device-limit', '同一设备短时间多次绑定被限流')
    const y = await me(inviterY.token)
    eq(y.data.invite.count, 2, '被限流的绑定不计入邀请人数')
  }

  // ---- 公开邀请码校验 ----
  {
    const good = await req('/api/invite/check?code=' + code)
    ok(good.status === 200 && good.data.valid === true, '公开接口：有效邀请码')
    const bad = await req('/api/invite/check?code=CGNOTEXIST')
    ok(bad.status === 200 && bad.data.valid === false, '公开接口：无效邀请码')
    const badFormat = await req('/api/invite/check?code=!@#$')
    ok(badFormat.status === 200 && badFormat.data.valid === false, '公开接口：格式错误邀请码')
  }

  // ---- 鉴权 ----
  {
    const r = await req('/api/invite/me')
    ok(r.status === 401, '未登录访问邀请数据返回 401')
    const r2 = await req('/api/invite/bind', { method: 'POST', body: { code } })
    ok(r2.status === 401, '未登录绑定返回 401')
  }

  // ---- 审计与绑定记录（直接查库）----
  {
    let db = null
    try {
      db = new DatabaseSync(DB_FILE, { readOnly: true })
      const bindings = db.prepare('SELECT COUNT(*) AS n FROM invite_bindings').get().n
      const claims = db.prepare('SELECT COUNT(*) AS n FROM invite_claims').get().n
      const audits = db.prepare('SELECT COUNT(*) AS n FROM invite_audit').get().n
      const counted = db.prepare('SELECT COUNT(*) AS n FROM invite_bindings WHERE counted = 1').get().n

      ok(bindings >= 5, `绑定记录已入库（${bindings} 条）`)
      ok(counted === 4, `计入邀请人数的绑定为 4 条（实际 ${counted}）`)
      eq(claims, 1, '领奖记录只写入 1 条（幂等）')
      ok(audits >= bindings, `审计记录覆盖每次绑定/领奖（${audits} 条）`)

      const leaked = db.prepare(
        "SELECT COUNT(*) AS n FROM invite_audit WHERE detail LIKE '%13800009001%'"
      ).get().n
      eq(leaked, 0, '审计详情不含完整手机号')

      const sensitive = db.prepare(
        'SELECT COUNT(*) AS n FROM invite_bindings WHERE ip LIKE ? OR device LIKE ?'
      ).get('%1380000%', '%1380000%').n
      eq(sensitive, 0, '绑定表不存手机号')
    } finally {
      if (db) {
        try { db.close() } catch (e) { /* ignore */ }
      }
    }
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
