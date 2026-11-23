// 邀请有礼 H5 端到端验证：二维码 / 邀请链接 / 新用户绑定 / 重复扫码不重复计数
//
// 前置：
//   1. 构建启用云端的 H5：VITE_API_BASE=http://127.0.0.1:18787 npm run build:h5
//   2. 本脚本会自动拉起后端（临时 SQLite）与静态服务器（dist/build/h5）
//   3. 如 18787 / 5173 被占用，可分别用 INVITE_API_PORT / BASE_URL 覆盖
//
// 运行：node tools/flow-invite-qr.mjs
import puppeteer from 'puppeteer-core'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const EDGE = process.env.EDGE_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'

const API_PORT = Number(process.env.INVITE_API_PORT || 18787)
const API = `http://127.0.0.1:${API_PORT}`
const ORIGIN = process.env.BASE_ORIGIN || 'http://127.0.0.1:5173'
const BASE = (process.env.BASE_URL || ORIGIN + '/#/').replace(/\/?$/, '/')
const STATIC_PORT = Number(new URL(ORIGIN).port) || 5173

const INVITER_PHONE = process.env.INVITER_PHONE || '13900008801'
const INVITEE_PHONE = process.env.INVITEE_PHONE || '13900008802'

const sleep = ms => new Promise(r => setTimeout(r, ms))
let passed = 0
let failed = 0
const log = (ok, msg) => {
  if (ok) passed++
  else failed++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`)
}

const children = []
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'cgj-invite-flow-'))

function spawnChild(args, env = {}) {
  const child = spawn(process.execPath, args, {
    cwd: ROOT,
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'pipe']
  })
  let output = ''
  child.stdout.on('data', d => { output += d })
  child.stderr.on('data', d => { output += d })
  child.getOutput = () => output
  children.push(child)
  return child
}

function cleanup() {
  for (const c of children) {
    try { c.kill() } catch (e) { /* ignore */ }
  }
  try { fs.rmSync(TMP, { recursive: true, force: true }) } catch (e) { /* ignore */ }
}

async function reachable(url, timeout = 800) {
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), timeout)
    const res = await fetch(url, { signal: ctrl.signal })
    clearTimeout(t)
    return res.ok
  } catch (e) {
    return false
  }
}

async function waitUntil(fn, timeout = 10000, interval = 250) {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    const v = await fn()
    if (v) return v
    await sleep(interval)
  }
  return null
}

async function api(pathname, token) {
  const res = await fetch(API + pathname, {
    headers: token ? { Authorization: 'Bearer ' + token } : {}
  })
  let data = null
  try { data = await res.json() } catch (e) { data = null }
  return { status: res.status, data }
}

async function readToken(page) {
  return page.evaluate(() => {
    const raw = localStorage.getItem('car_manager_token')
    if (raw == null) return ''
    let parsed
    try { parsed = JSON.parse(raw) } catch (e) { return String(raw) }
    if (parsed && typeof parsed === 'object' && 'data' in parsed && 'type' in parsed) {
      try { return JSON.parse(parsed.data) } catch (e) { return '' }
    }
    return typeof parsed === 'string' ? parsed : ''
  })
}

async function preparePage(page, url) {
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 })
  // 跳过首次启动定位权限弹窗（会遮挡自动化点击）
  await page.evaluate(() => localStorage.setItem(
    'car_manager_permission_asked_v1', JSON.stringify({ type: 'boolean', data: true })
  ))
  await page.reload({ waitUntil: 'networkidle2', timeout: 60000 })
  await sleep(900)
}

async function loginWithPhone(page, phone) {
  const hasLogin = await page.evaluate(() => !!document.querySelector('.login-page'))
  if (!hasLogin) return false
  await page.evaluate(p => {
    const input = document.querySelectorAll('input')[0]
    if (!input) return
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
    setter.call(input, p)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  }, phone)
  await page.evaluate(() => document.querySelector('.send-btn')?.click())
  await sleep(900)
  await page.evaluate(() => document.querySelector('.agree')?.click())
  await page.evaluate(() => document.querySelector('.login-btn')?.click())
  await sleep(1800)
  return true
}

const backend = spawnChild([path.join(ROOT, 'server', 'index.mjs')], {
  PORT: String(API_PORT),
  CGJ_HOST: '127.0.0.1',
  CGJ_DATA_DIR: TMP,
  CGJ_QUIET: '1',
  CGJ_INVITE_IP_HOURLY: '100',
  CGJ_INVITE_DEVICE_HOURLY: '10'
})

let staticServer = null
let browser = null

try {
  // 后端就绪
  const apiUp = await waitUntil(() => reachable(API + '/api/health'), 15000, 200)
  if (!apiUp) throw new Error('后端启动失败：\n' + backend.getOutput())

  // 静态服务器：已有服务则复用，否则拉起
  if (!(await reachable(ORIGIN + '/'))) {
    staticServer = spawnChild([
      path.join(ROOT, 'tools', 'static-server.mjs'),
      path.join(ROOT, 'dist', 'build', 'h5'),
      String(STATIC_PORT)
    ])
    const up = await waitUntil(() => reachable(ORIGIN + '/'), 15000, 200)
    if (!up) throw new Error('静态服务器启动失败：\n' + staticServer.getOutput())
  }

  if (!fs.existsSync(path.join(ROOT, 'dist', 'build', 'h5', 'index.html'))) {
    throw new Error('缺少 dist/build/h5，请先执行 npm run build:h5')
  }

  browser = await puppeteer.launch({
    executablePath: EDGE,
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu']
  })

  const errors = []
  const failedRequests = []
  const watch = (page, label) => {
    page.on('pageerror', e => errors.push(`[${label}][pageerror] ` + e.message))
    page.on('console', m => { if (m.type() === 'error') errors.push(`[${label}][console] ` + m.text()) })
    page.on('requestfailed', r => failedRequests.push(`[${label}] ` + r.url() + ' ' + (r.failure() && r.failure().errorText)))
  }

  /* ---------------- 邀请人：登录 → 邀请页 ---------------- */
  const inviterContext = await browser.createBrowserContext()
  const page1 = await inviterContext.newPage()
  await page1.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true })
  watch(page1, '邀请人')

  await preparePage(page1, BASE + 'pages/login/index')
  log(await page1.evaluate(() => !!document.querySelector('.login-page')), '全新浏览器进入登录页')
  await loginWithPhone(page1, INVITER_PHONE)
  log(!(await page1.evaluate(() => !!document.querySelector('.login-page'))), '邀请人登录成功')

  const inviterToken = await waitUntil(() => readToken(page1), 10000, 200)
  log(!!inviterToken, '已取得云端令牌（构建需带 VITE_API_BASE）')
  if (!inviterToken) {
    throw new Error('登录后没有云端令牌：请用 VITE_API_BASE=' + API + ' npm run build:h5 重新构建')
  }

  await preparePage(page1, BASE + 'pages/invite/index')
  await sleep(1200)

  const pageInfo = await page1.evaluate(() => {
    const qrWrap = document.querySelector('.qr-img')
    const inner = qrWrap && (qrWrap.tagName.toLowerCase() === 'img' ? qrWrap : qrWrap.querySelector('img'))
    const side = document.querySelector('.qr-side')
    const rules = document.querySelectorAll('.rule-text')
    const buttons = [...document.querySelectorAll('.share-btn, .ghost-btn')].map(e => e.textContent.trim())
    return {
      qrSrc: inner ? (inner.getAttribute('src') || '') : '',
      code: document.querySelector('.qr-code')?.textContent.trim() || '',
      link: document.querySelector('.qr-link')?.textContent.trim() || '',
      sideText: side ? side.innerText : '',
      buttons,
      rulesText: [...rules].map(e => e.textContent.trim()).join('\n'),
      count: document.querySelector('.progress-num')?.textContent.trim() || ''
    }
  })

  log(/^data:image\/png;base64,/.test(pageInfo.qrSrc), '邀请页展示本地生成的二维码（PNG Data URL）')
  log(/^CG[A-Z0-9]{8}$/.test(pageInfo.code), `邀请码为不透明随机码（${pageInfo.code}）`)
  log(pageInfo.link.includes('/#/pages/login/index?invite=' + pageInfo.code), '邀请链接包含邀请参数')
  log(!/1\d{10}/.test(pageInfo.link), '邀请链接不含手机号')
  log(pageInfo.buttons.some(t => t.includes('复制邀请链接')), '存在「复制邀请链接」按钮')
  log(pageInfo.buttons.some(t => t.includes('复制邀请码')), '存在「复制邀请码」按钮')
  log(pageInfo.buttons.some(t => t.includes('保存二维码')), '存在「保存二维码」按钮')
  log(pageInfo.rulesText.includes('活动对象') && pageInfo.rulesText.includes('反作弊'), '活动规则覆盖对象与反作弊')
  log(pageInfo.rulesText.includes('不可提现'), '活动规则说明奖励不可提现')
  log(pageInfo.count === '0', '邀请人初始邀请人数为 0')

  const inviteLink = pageInfo.link
  const inviteCode = pageInfo.code

  /* ---------------- 被邀请人：全新上下文打开邀请链接 ---------------- */
  const inviteeContext = await browser.createBrowserContext()
  const page2 = await inviteeContext.newPage()
  await page2.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true })
  watch(page2, '被邀请人')

  await preparePage(page2, inviteLink)
  const tipShown = await page2.evaluate(
    () => (document.querySelector('.invite-tip')?.textContent || '').includes('好友邀请你加入')
  )
  log(tipShown, '被邀请人打开链接后登录页展示邀请提示')

  await loginWithPhone(page2, INVITEE_PHONE)
  log(!(await page2.evaluate(() => !!document.querySelector('.login-page'))), '被邀请人注册登录成功')

  const inviteeToken = await waitUntil(() => readToken(page2), 10000, 200)
  log(!!inviteeToken, '被邀请人已取得云端令牌')

  // 等待绑定完成（登录后异步绑定）
  const bound = await waitUntil(async () => {
    if (!inviteeToken) return null
    const r = await api('/api/invite/me', inviteeToken)
    const invite = r.data && r.data.invite
    return invite && invite.bound && invite.bound.code === inviteCode ? invite : null
  }, 12000, 300)
  log(!!bound, '被邀请人成功绑定邀请人（服务端记录）')

  /* ---------------- 邀请人侧：人数 +1 ---------------- */
  let inviterCount = 0
  const increased = await waitUntil(async () => {
    const r = await api('/api/invite/me', inviterToken)
    const invite = r.data && r.data.invite
    if (!invite) return null
    inviterCount = invite.count
    return invite.count === 1 ? invite : null
  }, 10000, 300)
  log(!!increased, `邀请人邀请人数 +1（当前 ${inviterCount}）`)

  await page1.reload({ waitUntil: 'networkidle2', timeout: 60000 })
  await sleep(1800)
  const domCount = await page1.evaluate(
    () => document.querySelector('.progress-num')?.textContent.trim() || ''
  )
  log(domCount === '1', '邀请页刷新后显示已邀请 1 人')
  const recordText = await page1.evaluate(
    () => document.querySelector('.record')?.innerText || ''
  )
  log(recordText.includes('好友'), '邀请记录出现好友注册记录')
  log(!/1\d{10}/.test(recordText), '邀请记录不展示完整手机号')

  /* ---------------- 同一被邀请人重复扫码/登录：不再增加 ---------------- */
  await page2.goto(inviteLink, { waitUntil: 'networkidle2', timeout: 60000 })
  await sleep(2500)
  const stillBound = await api('/api/invite/me', inviteeToken)
  log(
    stillBound.data && stillBound.data.invite && stillBound.data.invite.bound &&
      stillBound.data.invite.bound.code === inviteCode,
    '重复打开邀请链接仍绑定同一邀请人'
  )
  const afterRepeat = await api('/api/invite/me', inviterToken)
  log(
    afterRepeat.data && afterRepeat.data.invite && afterRepeat.data.invite.count === 1,
    '同一被邀请人重复登录后邀请人数仍为 1'
  )

  await page1.reload({ waitUntil: 'networkidle2', timeout: 60000 })
  await sleep(1500)
  const domCount2 = await page1.evaluate(
    () => document.querySelector('.progress-num')?.textContent.trim() || ''
  )
  log(domCount2 === '1', '邀请页刷新后人数仍未增加')

  /* ---------------- 无运行时错误 ---------------- */
  const apiErrors = failedRequests.filter(u => u.includes('/api/'))
  log(apiErrors.length === 0, '无失败的 /api 请求' + (apiErrors.length ? '：' + apiErrors.join('; ') : ''))
  log(errors.length === 0, '无浏览器运行时错误' + (errors.length ? '：' + errors.join('; ') : ''))
} catch (e) {
  failed++
  console.log('FAIL  测试中断：' + e.message)
  if (backend.getOutput()) console.log(backend.getOutput())
} finally {
  if (browser) {
    try { await browser.close() } catch (e) { /* ignore */ }
  }
  cleanup()
}

console.log(`\n${failed ? '失败' : '全部通过'}：${passed} 项通过，${failed} 项失败`)
process.exit(failed ? 1 : 0)
