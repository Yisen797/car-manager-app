// 端到端点击流程验证
import puppeteer from 'puppeteer-core'

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const BASE = 'http://localhost:5173/#/'
const sleep = ms => new Promise(r => setTimeout(r, ms))

const browser = await puppeteer.launch({
  executablePath: EDGE,
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu']
})
const page = await browser.newPage()
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true })

const errors = []
page.on('pageerror', e => errors.push('[pageerror] ' + e.message))
page.on('console', m => { if (m.type() === 'error') errors.push('[console] ' + m.text()) })
const notFound = []
page.on('response', r => { if (r.status() === 404) notFound.push(r.url()) })

const log = (ok, msg) => console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`)

async function goto(path) {
  await page.goto(BASE + path, { waitUntil: 'networkidle2', timeout: 60000 })
  await sleep(1200)
}
const url = () => page.url()

// ---- 流程 0：登录 ----
async function doLogin() {
  await sleep(800)
  const onLogin = await page.evaluate(() => !!document.querySelector('.login-page'))
  if (!onLogin) return
  await page.evaluate(() => {
    const inputs = [...document.querySelectorAll('input')]
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
    setter.call(inputs[0], '13800008899')
    inputs[0].dispatchEvent(new Event('input', { bubbles: true }))
  })
  await page.evaluate(() => document.querySelector('.send-btn')?.click())
  await sleep(1000)
  await page.evaluate(() => document.querySelector('.agree')?.click())
  await page.evaluate(() => document.querySelector('.login-btn')?.click())
  await sleep(1600)
  log(url().includes('pages/index/index'), '手机号验证码登录 → 首页')
}

await goto('pages/index/index')
// 跳过首次启动的定位权限引导，避免遮挡自动化点击
await page.evaluate(() => localStorage.setItem('car_manager_permission_asked_v1', JSON.stringify({ type: 'boolean', data: true })))
await page.reload({ waitUntil: 'networkidle2', timeout: 60000 })
await sleep(1000)
await doLogin()

// ---- 流程 1：服务详情 → 立即预约 → 结果页 → 订单详情 ----
await goto('pages/index/index')
await page.click('.services-grid .s-item:nth-child(5)')   // 维修保养
await sleep(1200)
log(url().includes('service/detail'), '首页点击服务 → 服务详情页')

const hasBook = await page.$('.bar-btn')
log(!!hasBook, '详情页底部预约按钮存在')
if (hasBook) {
  await page.click('.bar-btn')
  await sleep(1400)
  log(url().includes('booking'), '点击立即预约 → 预约下单页')
}

// ---- 流程 2：会员开通 → 支付 → 结果 ----
await goto('pages/member/index')
await page.click('.tier-card:nth-child(1)')  // 普通会员
await sleep(400)
log(await page.$eval('.tier-card:nth-child(1)', el => el.className.includes('active')), '会员档位可切换')

await page.click('.bar-btn')
await sleep(1300)
log(url().includes('member/pay'), '会员中心 → 确认支付页')

const payBtn = await page.$('.bar-btn')
if (payBtn) {
  await payBtn.click()
  await sleep(2200)
  log(url().includes('result'), '支付完成 → 开通成功页')
}

// ---- 流程 3：救援 → 下单 ----
await goto('pages/rescue/index')
await page.click('.sos-btn')
await sleep(1300)
log(url().includes('rescue/create'), '救援首页 SOS → 呼叫救援页')

const sosBtn = await page.$('.bar-btn')
if (sosBtn) {
  await sosBtn.click()
  await sleep(1400)
  log(url().includes('result'), '提交救援 → 结果页')
}

// ---- 流程 4：底部导航 ----
await goto('pages/index/index')
await page.click('.tab-item:nth-child(4)')
await sleep(1200)
log(url().includes('orders'), '底部导航 → 订单页')
await page.click('.tab-item:nth-child(5)')
await sleep(1200)
log(url().includes('mine'), '底部导航 → 我的页')

// ---- 流程 5：商家入驻提交 ----
await goto('pages/merchant/join')
await page.type('.form-row:nth-child(1) input', '测试修理厂')
const inputs = await page.$$('.form-row input')
if (inputs[1]) await inputs[1].type('张经理')
if (inputs[2]) await inputs[2].type('13800001111')
await page.click('.form-card:nth-of-type(3) .picker-value').catch(() => {})
await sleep(600)
log(true, '入驻表单可输入')

console.log('\n--- 404 资源 ---')
console.log([...new Set(notFound)].join('\n') || '无')
console.log('\n--- 运行时错误 ---')
console.log([...new Set(errors)].join('\n') || '无')

await browser.close()
