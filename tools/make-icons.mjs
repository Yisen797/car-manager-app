// 生成 Android 启动图标：node tools/make-icons.mjs [light|dark]
import puppeteer from 'puppeteer-core'
import fs from 'fs'
import { buildIconSvg, buildRoundIconSvg, buildAdaptiveForegroundSvg } from './icon-design.mjs'

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const RES = '<项目根目录>/app-shell/android/app/src/main/res'
const THEME = process.argv[2] === 'dark' ? 'dark' : 'light'

const LEGACY = { 'mipmap-mdpi': 48, 'mipmap-hdpi': 72, 'mipmap-xhdpi': 96, 'mipmap-xxhdpi': 144, 'mipmap-xxxhdpi': 192 }
const FOREGROUND = { 'mipmap-mdpi': 108, 'mipmap-hdpi': 162, 'mipmap-xhdpi': 216, 'mipmap-xxhdpi': 324, 'mipmap-xxxhdpi': 432 }

const browser = await puppeteer.launch({
  executablePath: EDGE,
  headless: 'new',
  args: ['--no-sandbox', '--force-color-profile=srgb']
})
const page = await browser.newPage()

async function render(svg, size, out) {
  await page.setViewport({ width: size, height: size, deviceScaleFactor: 1 })
  await page.setContent(
    `<html><body style="margin:0;padding:0;background:transparent;overflow:hidden">${svg}</body></html>`,
    { waitUntil: 'domcontentloaded' }
  )
  await new Promise(r => setTimeout(r, 70))
  await page.screenshot({ path: out, omitBackground: true })
  console.log('icon ->', out)
}

for (const [dir, size] of Object.entries(LEGACY)) {
  const target = `${RES}/${dir}`
  fs.mkdirSync(target, { recursive: true })
  await render(buildIconSvg(size, THEME), size, `${target}/ic_launcher.png`)
  await render(buildRoundIconSvg(size, THEME), size, `${target}/ic_launcher_round.png`)
}

for (const [dir, size] of Object.entries(FOREGROUND)) {
  const target = `${RES}/${dir}`
  fs.mkdirSync(target, { recursive: true })
  await render(buildAdaptiveForegroundSvg(size, THEME), size, `${target}/ic_launcher_foreground.png`)
}

// 方便肉眼检查的大图
const preview = '<用户目录>/AppData/Local/Temp/icons'
fs.mkdirSync(preview, { recursive: true })
await render(buildIconSvg(256, THEME), 256, `${preview}/final-256.png`)
await render(buildIconSvg(64, THEME), 64, `${preview}/final-64.png`)

await browser.close()
console.log(`done (theme=${THEME})`)
