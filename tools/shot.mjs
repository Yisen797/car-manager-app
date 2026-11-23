// 手机视口截图工具：node tools/shot.mjs home=pages/index/index [more=...] [--full]
import puppeteer from 'puppeteer-core'
import fs from 'fs'

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const OUT = '<用户目录>/AppData/Local/Temp/shots'
const BASE = 'http://localhost:5173/#/'

const args = process.argv.slice(2)
const full = args.includes('--full')
const wArg = args.find(a => a.startsWith('--w='))
const hArg = args.find(a => a.startsWith('--h='))
const VW = wArg ? Number(wArg.split('=')[1]) : 390
const VH = hArg ? Number(hArg.split('=')[1]) : 844
const targets = args.filter(a => !a.startsWith('--')).map(a => {
  const i = a.indexOf('=')
  return { name: a.slice(0, i), path: a.slice(i + 1) }
})

fs.mkdirSync(OUT, { recursive: true })

const browser = await puppeteer.launch({
  executablePath: EDGE,
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu', '--font-render-hinting=none']
})

const page = await browser.newPage()
await page.setViewport({ width: VW, height: VH, deviceScaleFactor: 2, isMobile: VW < 600, hasTouch: true })

const errors = []
page.on('console', msg => {
  if (msg.type() === 'error') errors.push('[console] ' + msg.text())
})
page.on('pageerror', err => errors.push('[pageerror] ' + err.message))

// 登录门禁：先登录一次，再批量截图
await page.goto(BASE + 'pages/index/index', { waitUntil: 'networkidle2', timeout: 60000 })
// 跳过首次启动的定位权限引导
await page.evaluate(() => localStorage.setItem('car_manager_permission_asked_v1', JSON.stringify({ type: 'boolean', data: true })))
await page.reload({ waitUntil: 'networkidle2', timeout: 60000 })
await new Promise(r => setTimeout(r, 1200))
const needLogin = await page.evaluate(() => !!document.querySelector('.login-page'))
if (needLogin) {
  await page.evaluate(() => {
    const input = document.querySelector('input')
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
    setter.call(input, '13800008899')
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await page.evaluate(() => document.querySelector('.send-btn')?.click())
  await new Promise(r => setTimeout(r, 1000))
  await page.evaluate(() => document.querySelector('.agree')?.click())
  await page.evaluate(() => document.querySelector('.login-btn')?.click())
  await new Promise(r => setTimeout(r, 1600))
  console.log('logged in for screenshots')
}

for (const t of targets) {
  await page.goto(BASE + t.path, { waitUntil: 'networkidle2', timeout: 60000 })
  await new Promise(r => setTimeout(r, 1500))
  const file = `${OUT}/${t.name}.png`
  await page.screenshot({ path: file, fullPage: full })
  const h = await page.evaluate(() => document.body.scrollHeight)
  console.log(`shot ${t.name} -> ${file} (bodyHeight=${h})`)
}

if (errors.length) {
  console.log('--- PAGE ERRORS ---')
  ;[...new Set(errors)].forEach(e => console.log(e))
} else {
  console.log('no page errors')
}

await browser.close()
