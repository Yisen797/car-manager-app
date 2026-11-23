// 验证 APK 内实际运行的生产构建
import puppeteer from 'puppeteer-core'
const sleep = ms => new Promise(r => setTimeout(r, ms))
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: 'new', args: ['--no-sandbox']
})
const page = await browser.newPage()
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
const errors = []
page.on('pageerror', e => errors.push('[pageerror] ' + e.message))
page.on('console', m => { if (m.type() === 'error') errors.push('[console] ' + m.text()) })

await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle2' })
await sleep(1800)
await page.screenshot({ path: '<用户目录>/AppData/Local/Temp/shots/prod-home.png' })
console.log('home url:', page.url())

// 点服务 -> 详情
const items = await page.$$('.services-grid .s-item')
if (items.length) {
  await items[4].click()
  await sleep(1200)
  console.log('after click:', page.url())
  await page.screenshot({ path: '<用户目录>/AppData/Local/Temp/shots/prod-detail.png' })
}
console.log('errors:', errors.length ? [...new Set(errors)].join(' | ') : 'none')
await browser.close()
