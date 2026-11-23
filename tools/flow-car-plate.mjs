// 新增车辆：车牌省份选择 + 号段输入自动格式化 端到端验证
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
  const page = await browser.newPage()
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true })

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
      const target = els[0].closest('uni-view, uni-button, view, button') || els[0]
      target.click()
      return true
    }, text)
    await sleep(700)
    return ok
  }

  async function pickProvince(name) {
    const opened = await page.evaluate(() => {
      const el = document.querySelector('.province-picker')
      if (!el) return false
      el.click()
      return true
    })
    await sleep(400)
    const picked = await page.evaluate(n => {
      const chips = [...document.querySelectorAll('.province-chip')]
      const chip = chips.find(e => e.textContent.trim() === n)
      if (!chip) return false
      chip.click()
      return true
    }, name)
    await sleep(400)
    return opened && picked
  }

  const bodyText = () => page.evaluate(
    () => document.querySelector('uni-page-body')?.innerText || ''
  )

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

  // 新增车辆：选省份 + 输入号段
  await goto('pages/car/add')
  const picked = await pickProvince('京')
  log(picked, '省份选择器可选「京」')
  const pickerText = await page.evaluate(
    () => document.querySelector('.province-picker')?.innerText || ''
  )
  log(pickerText.includes('京'), '省份已回显')

  await setInput(0, 'a88888')
  await sleep(400)
  let text = await bodyText()
  log(text.includes('京A·88888'), '号段自动大写并格式化预览')
  log(text.includes('无需输入'), '显示自动格式化提示')

  await setInput(1, '测试车辆')
  await clickText('保存车辆')
  await sleep(1200)
  text = await bodyText()
  log(page.url().includes('car/list'), '保存后回到车辆列表')
  log(text.includes('京A·88888'), '列表中车牌格式正确（京A·88888）')

  // 粘贴完整车牌自动识别省份
  await goto('pages/car/add')
  await setInput(0, '沪B12345')
  await sleep(400)
  text = await bodyText()
  log(text.includes('沪B·12345'), '粘贴完整车牌自动识别省份并格式化')
  const pickerText2 = await page.evaluate(
    () => document.querySelector('.province-picker')?.innerText || ''
  )
  log(pickerText2.includes('沪'), '粘贴后省份自动切换为沪')

  // 编辑已有车辆：解析回显（hash 路由同页面不会重触发 onLoad，强制刷新）
  await goto('pages/car/list')
  await goto('pages/car/add?id=c1')
  await page.reload({ waitUntil: 'networkidle2', timeout: 60000 })
  await sleep(1200)
  text = await bodyText()
  log(text.includes('京A·8K2M9'), '编辑已有车辆时正确回显车牌')

  // 非法车牌不允许保存
  await goto('pages/car/list')
  await goto('pages/car/add')
  await page.reload({ waitUntil: 'networkidle2', timeout: 60000 })
  await sleep(1000)
  await pickProvince('京')
  await setInput(0, 'A1')
  await setInput(1, '测试车辆')
  await clickText('保存车辆')
  await sleep(700)
  log(page.url().includes('car/add'), '非法车牌不会保存（仍停留在添加页）')

  log(errors.length === 0, '无运行时错误' + (errors.length ? '：' + errors.join(' | ') : ''))
} catch (e) {
  failed++
  console.log('FAIL  测试中断：' + e.message)
} finally {
  await browser.close()
}

console.log(`\n${failed ? '失败' : '全部通过'}：${passed} 项通过，${failed} 项失败`)
process.exit(failed ? 1 : 0)
