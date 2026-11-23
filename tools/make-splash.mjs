// 生成启动页 logo：node tools/make-splash.mjs
import puppeteer from 'puppeteer-core'
import fs from 'fs'
import { buildSplashLogoSvg } from './icon-design.mjs'

const OUT = '<项目根目录>/app-shell/android/app/src/main/res/drawable-xxhdpi'
fs.mkdirSync(OUT, { recursive: true })

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: 'new',
  args: ['--no-sandbox', '--force-color-profile=srgb']
})
const page = await browser.newPage()

await page.setViewport({ width: 480, height: 480, deviceScaleFactor: 1 })
await page.setContent(
  `<html><body style="margin:0;background:transparent;overflow:hidden">${buildSplashLogoSvg(480)}</body></html>`,
  { waitUntil: 'domcontentloaded' }
)
await new Promise(r => setTimeout(r, 200))
await page.screenshot({ path: `${OUT}/splash_logo.png`, omitBackground: true })

await browser.close()
console.log('splash logo ->', `${OUT}/splash_logo.png`)
