// 云端模式跨设备验证
// 前置：
//   1. 后端运行在 8787（或 CLOUD_API 指定）
//   2. H5 以 VITE_API_BASE=<后端地址> 构建，并由 static-server 提供在 5173
//   3. 已在另一台「设备」（浏览器）用同一手机号产生过数据，例如先跑 flow-booking.mjs
// 本脚本用全新浏览器配置（无本地 Storage）登录同一手机号，验证数据从云端恢复。
import puppeteer from 'puppeteer-core'

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const BASE = process.env.BASE_URL || 'http://localhost:5173/#/'
const PHONE = process.env.TEST_PHONE || '13800008899'
const MIN_ORDERS = Number(process.env.MIN_ORDERS || 6)
const sleep = ms => new Promise(r => setTimeout(r, ms))

let passed = 0
let failed = 0
const log = (ok, msg) => {
  if (ok) passed++
  else failed++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`)
}

const browser = await puppeteer.launch({
  executablePath: EDGE,
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu']
})

try {
  const page = await browser.newPage()
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true })

  const errors = []
  const failedRequests = []
  page.on('pageerror', e => errors.push('[pageerror] ' + e.message))
  page.on('console', m => { if (m.type() === 'error') errors.push('[console] ' + m.text()) })
  page.on('requestfailed', r => failedRequests.push(r.url() + ' ' + (r.failure() && r.failure().errorText)))

  await page.goto(BASE + 'pages/index/index', { waitUntil: 'networkidle2', timeout: 60000 })
  await page.evaluate(() => localStorage.setItem(
    'car_manager_permission_asked_v1', JSON.stringify({ type: 'boolean', data: true })
  ))
  await page.reload({ waitUntil: 'networkidle2', timeout: 60000 })
  await sleep(1000)

  const needLogin = await page.evaluate(() => !!document.querySelector('.login-page'))
  log(needLogin, '全新浏览器无本地登录态，进入登录页')

  if (needLogin) {
    await page.evaluate(phone => {
      const input = document.querySelectorAll('input')[0]
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
      setter.call(input, phone)
      input.dispatchEvent(new Event('input', { bubbles: true }))
    }, PHONE)
    await page.evaluate(() => document.querySelector('.send-btn')?.click())
    await sleep(1000)
    await page.evaluate(() => document.querySelector('.agree')?.click())
    await page.evaluate(() => document.querySelector('.login-btn')?.click())
    await sleep(1600)
  }

  log(!(await page.evaluate(() => !!document.querySelector('.login-page'))), '登录成功，进入应用')

  // 等待云端登录 + 状态恢复 + 首轮推送完成
  await sleep(2500)

  const snapshot = await page.evaluate(() => {
    const raw = localStorage.getItem('car_manager_state')
    const token = localStorage.getItem('car_manager_token')
    const unwrap = v => {
      if (v == null) return null
      let parsed
      try { parsed = JSON.parse(v) } catch (e) { return v }
      if (parsed && typeof parsed === 'object' && 'data' in parsed && 'type' in parsed) {
        return typeof parsed.data === 'string' ? JSON.parse(parsed.data) : parsed.data
      }
      return parsed
    }
    return {
      state: unwrap(raw),
      token: unwrap(token)
    }
  })

  const s = snapshot.state || {}
  const orders = Array.isArray(s.orders) ? s.orders : []
  const apps = Array.isArray(s.merchantApplications) ? s.merchantApplications : []
  const coupons = Array.isArray(s.coupons) ? s.coupons : []

  log(!!snapshot.token, '已保存云端令牌')
  log(orders.length >= MIN_ORDERS, `云端订单已恢复（${orders.length} 笔，期望 ≥ ${MIN_ORDERS}）`)
  log(orders.some(o => o.review && o.review.text), '另一台设备提交的评价已恢复')
  log(apps.some(a => a.status === 'approved'), '另一台设备提交并审核的商家入驻已恢复')
  log(coupons.length > 0, `优惠券已恢复（${coupons.length} 张）`)
  log(!!(s.user && s.user.phoneRaw === PHONE), '云端账号与登录手机号一致')

  // 模拟重启：刷新页面，凭本地令牌 + 云端基础数据自动恢复
  await page.reload({ waitUntil: 'networkidle2', timeout: 60000 })
  await sleep(2200)
  const afterReload = await page.evaluate(() => {
    const raw = localStorage.getItem('car_manager_state')
    let s = null
    try {
      const p = JSON.parse(raw)
      s = p && p.data ? (typeof p.data === 'string' ? JSON.parse(p.data) : p.data) : p
    } catch (e) { s = null }
    return {
      loginPage: !!document.querySelector('.login-page'),
      orders: (s && Array.isArray(s.orders)) ? s.orders.length : 0
    }
  })
  log(!afterReload.loginPage, '刷新后凭令牌自动恢复登录态')
  log(afterReload.orders >= MIN_ORDERS, `刷新后云端数据仍在（${afterReload.orders} 笔）`)

  const apiErrors = failedRequests.filter(u => u.includes('/api/'))
  log(apiErrors.length === 0, '无失败的 /api 请求' + (apiErrors.length ? '：' + apiErrors.join('; ') : ''))
  log(errors.length === 0, '无浏览器运行时错误' + (errors.length ? '：' + errors.join('; ') : ''))
} catch (e) {
  failed++
  console.log('FAIL  测试中断：' + e.message)
} finally {
  await browser.close()
}

console.log(`\n${failed ? '失败' : '全部通过'}：${passed} 项通过，${failed} 项失败`)
process.exit(failed ? 1 : 0)
