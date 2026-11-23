// 附近门店（高德 POI）端到端验证
// 本地模式：页面使用内置演示数据；云端模式且未配 Key：后端返回演示数据
import puppeteer from 'puppeteer-core'

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const BASE = process.env.BASE_URL || 'http://localhost:5173/#/'
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
  await page.setGeolocation({ latitude: 39.9042, longitude: 116.4074 }) // 北京

  const errors = []
  page.on('pageerror', e => errors.push('[pageerror] ' + e.message))
  page.on('console', m => { if (m.type() === 'error') errors.push('[console] ' + m.text()) })

  async function goto(path) {
    await page.goto(BASE + path, { waitUntil: 'networkidle2', timeout: 60000 })
    await sleep(1200)
  }

  async function clickText(text) {
    const ok = await page.evaluate(t => {
      const root = document.querySelector('uni-page-body') || document.body
      const els = [...root.querySelectorAll('*')].filter(
        e => e.children.length === 0 && e.textContent.trim() === t
      )
      if (!els.length) return false
      const target = els[0].closest('uni-view, uni-button, view, button') || els[0]
      target.click()
      return true
    }, text)
    await sleep(800)
    return ok
  }

  // 登录（本地模式，验证码自动填）
  await page.goto(BASE + 'pages/index/index', { waitUntil: 'networkidle2', timeout: 60000 })
  await page.evaluate(() => localStorage.setItem(
    'car_manager_permission_asked_v1', JSON.stringify({ type: 'boolean', data: true })
  ))
  await page.reload({ waitUntil: 'networkidle2', timeout: 60000 })
  await sleep(1000)
  if (await page.evaluate(() => !!document.querySelector('.login-page'))) {
    await page.evaluate(() => {
      const input = document.querySelectorAll('input')[0]
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
      setter.call(input, '13800008899')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await page.evaluate(() => document.querySelector('.send-btn')?.click())
    await sleep(900)
    await page.evaluate(() => document.querySelector('.agree')?.click())
    await page.evaluate(() => document.querySelector('.login-btn')?.click())
    await sleep(1600)
  }
  log(!(await page.evaluate(() => !!document.querySelector('.login-page'))), '登录成功')

  // 首页宫格包含「洗车美容」
  await goto('pages/index/index')
  const hasWash = await page.evaluate(() => {
    const body = document.querySelector('uni-page-body')
    return !!body && body.innerText.includes('洗车美容')
  })
  log(hasWash, '首页 12 宫格包含「洗车美容」')

  // 附近门店页（洗车）
  await goto('pages/nearby/index?category=wash')
  const loaded = await page.waitForFunction(
    () => document.querySelectorAll('.shop').length > 0, { timeout: 10000 }
  ).then(() => true).catch(() => false)
  log(loaded, '附近洗车门店已加载')

  const washInfo = await page.evaluate(() => ({
    count: document.querySelectorAll('.shop').length,
    text: document.querySelector('uni-page-body')?.innerText || ''
  }))
  log(washInfo.count >= 3, '洗车门店数量 ≥ 3（实际 ' + washInfo.count + '）')
  log(washInfo.text.includes('演示数据'), '未配置高德 Key 时显示演示数据提示')
  log(washInfo.text.includes('已使用当前位置'), '定位成功（浏览器坐标）')

  // 切换分类到充电桩
  const switched = await clickText('充电桩')
  await sleep(800)
  const chargeText = await page.evaluate(
    () => document.querySelector('uni-page-body')?.innerText || ''
  )
  log(switched && /充电|快充|超充/.test(chargeText), '切换到充电桩分类并刷新列表')

  // 服务详情 → 附近门店入口
  await goto('pages/service/detail?id=wash')
  const detailText = await page.evaluate(
    () => document.querySelector('uni-page-body')?.innerText || ''
  )
  log(detailText.includes('附近门店'), '洗车详情页有「附近门店」入口')
  const opened = await page.evaluate(() => {
    const el = document.querySelector('.nearby-entry')
    if (!el) return false
    el.click()
    return true
  })
  await sleep(900)
  const url = page.url()
  log(opened && url.includes('pages/nearby/index'), '点击入口进入附近门店页')

  log(errors.length === 0, '无运行时错误' + (errors.length ? '：' + errors.join(' | ') : ''))
} catch (e) {
  failed++
  console.log('FAIL  测试中断：' + e.message)
} finally {
  await browser.close()
}

console.log(`\n${failed ? '失败' : '全部通过'}：${passed} 项通过，${failed} 项失败`)
process.exit(failed ? 1 : 0)
