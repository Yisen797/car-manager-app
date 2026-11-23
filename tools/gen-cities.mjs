// 生成全国城市库（地级市 + 直辖市 + 港澳台），数据源：阿里 DataV 行政区划 GeoJSON
// 用法：node tools/gen-cities.mjs
// 生成结果：src/data/cities.js（含城市名、省份、经纬度，供定位与城市选择使用）
import fs from 'node:fs'
import path from 'node:path'

const BASE = 'https://geo.datav.aliyun.com/areas_v3/bound'
const OUT = path.resolve('src/data/cities.js')

const MUNICIPALITIES = new Set(['110000', '120000', '310000', '500000'])

async function fetchJson(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url} -> ${res.status}`)
  return res.json()
}

function shortName(name) {
  return name
    .replace(/特别行政区$/, '')
    .replace(/市$/, '')
    .replace(/省$/, '')
}

function round(n) {
  return Math.round(n * 1000) / 1000
}

const national = await fetchJson(`${BASE}/100000_full.json`)
const provinces = national.features
  .map(f => f.properties)
  .filter(p => p && p.adcode && p.name)
  .sort((a, b) => String(a.adcode).localeCompare(String(b.adcode)))

const cities = []
const seen = new Set()

for (const prov of provinces) {
  const code = String(prov.adcode)
  const provName = prov.name

  if (MUNICIPALITIES.has(code)) {
    const center = prov.center || prov.centroid
    if (center) {
      const name = shortName(provName)
      cities.push({
        name,
        fullName: provName,
        province: provName,
        adcode: code,
        lng: round(center[0]),
        lat: round(center[1])
      })
      seen.add(name)
    }
    continue
  }

  let geo = null
  try {
    geo = await fetchJson(`${BASE}/${code}_full.json`)
  } catch (e) {
    console.warn('province boundary not available, fallback to center:', provName, e.message)
  }

  const cityFeatures = geo
    ? geo.features.filter(f => f.properties && f.properties.level === 'city')
    : []
  let added = 0
  for (const f of cityFeatures) {
    const p = f.properties
    const center = p.center || p.centroid
    if (!center) continue
    const name = shortName(p.name)
    if (seen.has(name)) continue
    seen.add(name)
    cities.push({
      name,
      fullName: p.name,
      province: provName,
      adcode: String(p.adcode),
      lng: round(center[0]),
      lat: round(center[1])
    })
    added++
  }

  // 港澳台等没有地级市要素的地区，用省级中心兜底
  if (added === 0) {
    const center = prov.center || prov.centroid
    if (!center) continue
    const name = shortName(provName)
    if (seen.has(name)) continue
    seen.add(name)
    cities.push({
      name,
      fullName: provName,
      province: provName,
      adcode: code,
      lng: round(center[0]),
      lat: round(center[1])
    })
  }

  await new Promise(r => setTimeout(r, 80))
}

const header = `// 自动生成，请勿手改；更新数据运行：node tools/gen-cities.mjs
// 数据源：阿里 DataV 行政区划 GeoJSON（地级市 + 直辖市 + 港澳台）
`
const body = `export const CITIES = ${JSON.stringify(cities, null, 2)}\n`

fs.writeFileSync(OUT, header + body, 'utf8')
console.log(`生成完成：${cities.length} 个城市 -> ${OUT}`)
