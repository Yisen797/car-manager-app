// 商家入驻自动定位 → 审核 → 顾客端附近门店可见 的端到端验证
// 本地模式即可跑：定位用浏览器坐标，地址反查在无后端时自动跳过
import puppeteer from 'puppeteer-core'

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const BASE = process.env.BASE_URL || 'http://localhost:5173/#/'
const SHOP = '智能洗车体验店'
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
  const context = browser.defaultBrowserContext()
  await context.overridePermissions('http://localhost:5173', ['geolocation'])

  const page = await browser.newPage()
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true })
  await page.setGeolocation({ latitude: 39.9042, longitude: 116.4074 })

  const errors = []
  page.on('pageerror', e => errors.push('[pageerror] ' + e.message))
  page.on('console', m => { if (m.type() === 'error') errors.push('[console] ' + m.text()) })

  async function goto(path) {
    await page.goto(BASE + path, { waitUntil: 'networkidle2', timeout: 60000 })
    await sleep(1000)
  }

  async function setInput(index, value) {
    return page.evaluate(({ index, value }) => {
      const el = [...document.querySelectorAll('input')][index]
      if (!el) return false
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
      setter.call(el, value)
      el.dispatchEvent(new Event('input', { bubbles: true }))
      return true
    }, { index, value })
  }

  async function clickText(text) {
    const ok = await page.evaluate(t => {
      const root = document.querySelector('uni-page-body') || document.body
      const els = [...root.querySelectorAll('*')].filter(
        e => e.children.length === 0 && e.textContent.trim() === t
      )
      if (!els.length) return false
      const target = els[0].closest('uni-view, uni-button, view, button, uni-picker') || els[0]
      target.click()
      return true
    }, text)
    await sleep(700)
    return ok
  }

  // 登录
  await page.goto(BASE + 'pages/index/index', { waitUntil: 'networkidle2', timeout: 60000 })
  await page.evaluate(() => localStorage.setItem(
    'car_manager_permission_asked_v1', JSON.stringify({ type: 'boolean', data: true })
  ))
  await page.reload({ waitUntil: 'networkidle2', timeout: 60000 })
  await sleep(900)
  if (await page.evaluate(() => !!document.querySelector('.login-page'))) {
    await page.evaluate(() => {
      const input = document.querySelectorAll('input')[0]
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
      setter.call(input, '13900007777')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await page.evaluate(() => document.querySelector('.send-btn')?.click())
    await sleep(900)
    await page.evaluate(() => document.querySelector('.agree')?.click())
    await page.evaluate(() => document.querySelector('.login-btn')?.click())
    await sleep(1500)
  }
  log(!(await page.evaluate(() => !!document.querySelector('.login-page'))), '登录成功')

  // 填报入驻
  await goto('pages/merchant/join')
  await setInput(0, SHOP)
  await setInput(1, '王先生')
  await setInput(2, '13900007777')
  await setInput(3, '北京市朝阳区建国路 100 号')
  await setInput(4, '精洗、内饰、打蜡镀晶')

  // 选择商家类型：洗车美容
  await page.evaluate(() => {
    const picker = document.querySelector('uni-picker')
    if (picker) picker.click()
  })
  await sleep(600)
  await page.evaluate(() => {
    const items = [...document.querySelectorAll('.uni-picker-item')]
    const item = items.find(e => e.textContent.trim() === '洗车美容')
    if (item) item.click()
  })
  await sleep(300)
  await page.evaluate(() => {
    const ok = document.querySelector('.uni-picker-action-confirm')
    if (ok) ok.click()
  })
  await sleep(400)

  // 自动定位
  const located = await clickText('自动定位')
  await sleep(1500)
  const locText = await page.evaluate(
    () => document.querySelector('uni-page-body')?.innerText || ''
  )
  log(located, '点击「自动定位」')
  log(locText.includes('已标记'), '定位后显示「已标记」')
  log(/已获取坐标|已定位/.test(locText), '定位结果已回填')

  // 搜索门店弹层（无后端时应给出友好提示，不报错）
  await clickText('搜索门店')
  await sleep(500)
  const sheetOpen = await page.evaluate(
    () => document.querySelector('uni-page-body')?.innerText.includes('从高德地图选择')
  )
  log(sheetOpen, '「搜索门店」弹层可打开')
  await page.evaluate(() => {
    const el = document.querySelector('.sheet-close')
    if (el) el.click()
  })
  await sleep(300)

  // 提交并模拟审核
  await clickText('提交入驻申请')
  await sleep(1200)
  const onApply = page.url().includes('merchant/apply')
  log(onApply, '提交入驻 → 申请进度页')
  await clickText('模拟审核通过')
  await sleep(900)
  log(
    await page.evaluate(() => document.body.innerText.includes('审核已通过')),
    '模拟审核通过'
  )

  // 顾客端附近门店：平台商家应排在前面
  await goto('pages/nearby/index?category=wash')
  await page.waitForFunction(
    () => document.querySelectorAll('.shop').length > 0, { timeout: 10000 }
  ).catch(() => {})
  const nearby = await page.evaluate(() => {
    const first = document.querySelector('.shop')
    return {
      count: document.querySelectorAll('.shop').length,
      firstName: first ? (first.querySelector('.shop-name')?.textContent || '') : '',
      text: document.querySelector('uni-page-body')?.innerText || ''
    }
  })
  log(nearby.text.includes(SHOP), '顾客端附近门店能看到入驻商家')
  log(nearby.text.includes('平台认证'), '平台商家带「平台认证」标识')
  log(nearby.firstName.includes(SHOP), '平台商家排在第三方门店前面')

  // 平台预约带上 merchantId
  const booked = await page.evaluate(() => {
    const first = document.querySelector('.shop')
    const btn = first && first.querySelector('.act.primary')
    if (!btn) return false
    btn.click()
    return true
  })
  await sleep(1200)
  log(
    booked && page.url().includes('merchantId=') && page.url().includes('pages/booking'),
    '平台商家「平台预约」带入 merchantId'
  )

  log(errors.length === 0, '无运行时错误' + (errors.length ? '：' + errors.join(' | ') : ''))
} catch (e) {
  failed++
  console.log('FAIL  测试中断：' + e.message)
} finally {
  await browser.close()
}

console.log(`\n${failed ? '失败' : '全部通过'}：${passed} 项通过，${failed} 项失败`)
process.exit(failed ? 1 : 0)
