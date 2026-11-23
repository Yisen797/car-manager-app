// P0 新流程端到端验证：预约 → 收银台 → 订单 → 模拟接单/完成 → 评价；优惠券；商家入驻
import puppeteer from 'puppeteer-core'
import fs from 'fs'

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const BASE = 'http://localhost:5173/#/'
const OUT = '<用户目录>/AppData/Local/Temp/shots-v2'
const sleep = ms => new Promise(r => setTimeout(r, ms))

fs.mkdirSync(OUT, { recursive: true })

const browser = await puppeteer.launch({
  executablePath: EDGE,
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu']
})
const page = await browser.newPage()
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true })

const errors = []
page.on('pageerror', e => errors.push('[pageerror] ' + e.message))
page.on('console', m => { if (m.type() === 'error') errors.push('[console] ' + m.text()) })

const log = (ok, msg) => console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`)

async function goto(path) {
  await page.goto(BASE + path, { waitUntil: 'networkidle2', timeout: 60000 })
  await sleep(800)
}

async function clickText(text) {
  const ok = await page.evaluate(t => {
    const root = document.querySelector('uni-page-body') || document.body
    const els = [...root.querySelectorAll('*')].filter(
      e => e.children.length === 0 && e.textContent.trim() === t
    )
    if (!els.length) return false
    let el = els[0]
    const target = el.closest('uni-view, uni-button, view, button') || el
    target.click()
    return true
  }, text)
  await sleep(700)
  return ok
}

async function clickSelector(sel) {
  const ok = await page.evaluate(s => {
    const el = document.querySelector(s)
    if (!el) return false
    el.click()
    return true
  }, sel)
  await sleep(500)
  return ok
}

async function setInput(index, value) {
  return page.evaluate(({ index, value }) => {
    const inputs = [...document.querySelectorAll('input')]
    const el = inputs[index]
    if (!el) return false
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
    setter.call(el, value)
    el.dispatchEvent(new Event('input', { bubbles: true }))
    return true
  }, { index, value })
}

async function shot(name) {
  await page.screenshot({ path: `${OUT}/${name}.png` })
  console.log(`shot -> ${OUT}/${name}.png`)
}

/* ---------- 0. 登录 ---------- */
await goto('pages/index/index')
// 跳过首次启动的定位权限引导
await page.evaluate(() => localStorage.setItem('car_manager_permission_asked_v1', JSON.stringify({ type: 'boolean', data: true })))
await page.reload({ waitUntil: 'networkidle2', timeout: 60000 })
await sleep(800)
const needLogin = await page.evaluate(() => !!document.querySelector('.login-page'))
if (needLogin) {
  await shot('00-login')
  await setInput(0, '13800008899')
  await clickText('获取验证码')
  await sleep(1000)
  await clickSelector('.agree')
  await clickText('登录')
  await sleep(1600)
}
log(!(await page.evaluate(() => !!document.querySelector('.login-page'))), '登录 → 进入应用')

/* ---------- 1. 预约下单 ---------- */
await goto('pages/booking/index?serviceId=maintain')
await setInput(0, '张先生')
await setInput(1, '13800008899')
await shot('01-booking')

const submitted = await clickText('提交订单')
await sleep(900)
log(submitted && (await page.evaluate(() => location.hash.includes('/pages/pay/index'))), '预约提交 → 收银台')
await shot('02-pay')

/* ---------- 2. 支付 ---------- */
await clickSelector('.agreement')
await clickText('确认支付')
await sleep(1800)
const onOrder = await page.evaluate(() => location.hash.includes('/pages/order/detail'))
log(onOrder, '支付完成 → 订单详情')
await shot('03-order-waiting')

/* ---------- 3. 模拟接单 / 完成 / 评价 ---------- */
const accepted = await clickText('模拟商家接单')
await sleep(700)
const serving = await page.evaluate(() => document.body.innerText.includes('服务进行中'))
log(accepted && serving, '模拟商家接单 → 服务中')

await clickText('模拟服务完成')
await sleep(700)
const reviewable = await page.evaluate(() => document.body.innerText.includes('去评价'))
log(reviewable, '模拟服务完成 → 待评价')
await shot('04-order-review')

await clickText('去评价')
await sleep(800)
const onReview = await page.evaluate(() => location.hash.includes('/pages/review/index'))
log(onReview, '进入评价页')
await clickText('专业')
await page.evaluate(() => {
  const ta = document.querySelector('textarea')
  if (ta) {
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set
    setter.call(ta, '师傅很专业，流程透明，体验很好。')
    ta.dispatchEvent(new Event('input', { bubbles: true }))
  }
})
await sleep(300)
await shot('05-review')
await clickText('提交评价')
await sleep(2000)
const done = await page.evaluate(() => document.body.innerText.includes('我的评价'))
log(done, '评价提交 → 订单已完成并展示评价')
await shot('06-order-done')

/* ---------- 4. 优惠券 ---------- */
await goto('pages/coupon/index')
const couponPage = await page.evaluate(() => document.body.innerText.includes('领券中心'))
log(couponPage, '优惠券页 + 领券中心')
await shot('07-coupons')

/* ---------- 5. 商家入驻 ---------- */
await goto('pages/merchant/join')
await setInput(0, '星辰汽车服务中心')
await setInput(1, '李经理')
await setInput(2, '13900009999')
await setInput(3, '北京市朝阳区建国路 99 号')
await sleep(300)
// 选择商家类型
await page.evaluate(() => {
  const pickers = [...document.querySelectorAll('uni-picker')]
  if (pickers[0]) pickers[0].click()
})
await sleep(600)
await page.evaluate(() => {
  const items = [...document.querySelectorAll('.uni-picker-item')]
  const item = items.find(e => e.textContent.trim() === '汽车维修')
  if (item) item.click()
})
await sleep(300)
await page.evaluate(() => {
  const ok = document.querySelector('.uni-picker-action-confirm')
  if (ok) ok.click()
})
await sleep(500)
await setInput(4, '专注德系车维修保养')
await clickText('提交入驻申请')
await sleep(900)
const onApply = await page.evaluate(() => location.hash.includes('/pages/merchant/apply'))
log(onApply, '入驻提交 → 申请进度页')
await shot('08-merchant-apply')

await clickText('模拟审核通过')
await sleep(800)
const approved = await page.evaluate(() => document.body.innerText.includes('审核已通过'))
log(approved, '模拟审核 → 已通过')
await shot('09-merchant-approved')

await clickText('进入商家中心')
await sleep(900)
const onCenter = await page.evaluate(() => location.hash.includes('/pages/merchant/center'))
log(onCenter, '进入商家中心')
await shot('10-merchant-center')

/* ---------- 结果 ---------- */
console.log('\n--- 运行时错误 ---')
if (errors.length) [...new Set(errors)].forEach(e => console.log(e))
else console.log('无')

await browser.close()
