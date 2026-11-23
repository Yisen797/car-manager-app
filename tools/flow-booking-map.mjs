// 预约页地图选店验证（H5：免费方案，显示门店定位卡 + 高德/附近门店入口）
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
  await page.setGeolocation({ latitude: 39.9042, longitude: 116.4074 })

  const errors = []
  page.on('pageerror', e => errors.push('[pageerror] ' + e.message))
  page.on('console', m => { if (m.type() === 'error') errors.push('[console] ' + m.text()) })

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
      setter.call(input, '13800008899')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await page.evaluate(() => document.querySelector('.send-btn')?.click())
    await sleep(900)
    await page.evaluate(() => document.querySelector('.agree')?.click())
    await page.evaluate(() => document.querySelector('.login-btn')?.click())
    await sleep(1500)
  }
  log(!(await page.evaluate(() => !!document.querySelector('.login-page'))), '登录成功')

  await page.goto(BASE + 'pages/booking/index?serviceId=wash', {
    waitUntil: 'networkidle2', timeout: 60000
  })
  await sleep(1500)

  const info = await page.evaluate(() => {
    const body = document.querySelector('uni-page-body')
    return {
      text: body ? body.innerText : '',
      hasMapBox: !!document.querySelector('.map-box'),
      hasFallback: !!document.querySelector('.map-fallback'),
      hasMapTag: !!document.querySelector('uni-map, .uni-map, map'),
      merchantName: document.querySelector('.pick-value')?.textContent || ''
    }
  })

  log(info.hasMapBox, '预约页显示「地图选店」区块')
  log(info.text.includes('高德地图查看') && info.text.includes('附近门店列表'),
    'H5 提供高德查看与附近门店入口（不内嵌地图）')
  log(info.hasFallback && !info.hasMapTag, 'H5 未渲染原生地图组件（避免商业授权）')
  log(/距您约/.test(info.text), '显示门店与您的距离')
  log(info.merchantName.length > 0, '门店选择器正常显示当前门店')

  const toNearby = await page.evaluate(() => {
    const root = document.querySelector('uni-page-body')
    const els = [...root.querySelectorAll('*')].filter(
      e => e.children.length === 0 && e.textContent.trim() === '附近门店列表'
    )
    if (!els.length) return false
    const btn = els[0].closest('uni-view, view') || els[0]
    btn.click()
    return true
  })
  await sleep(1000)
  log(toNearby && page.url().includes('pages/nearby/index'), '「附近门店列表」跳转正常')

  log(errors.length === 0, '无运行时错误' + (errors.length ? '：' + errors.join(' | ') : ''))
} catch (e) {
  failed++
  console.log('FAIL  测试中断：' + e.message)
} finally {
  await browser.close()
}

console.log(`\n${failed ? '失败' : '全部通过'}：${passed} 项通过，${failed} 项失败`)
process.exit(failed ? 1 : 0)
