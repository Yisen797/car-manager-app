// 高德 Web 服务 API · POI 周边搜索
//
// 配置 CGJ_AMAP_KEY 后走真实数据；未配置或上游失败时返回演示数据，前端不会报错。
// 高德免费额度有限（个人非商业 5000 次/月），因此这里做了 10 分钟结果缓存。
import { NEARBY_CATEGORIES, demoPois } from '../../src/data/nearby.mjs'

const KEYWORDS = Object.fromEntries(NEARBY_CATEGORIES.map(c => [c.id, c.keyword]))
export const POI_CATEGORIES = NEARBY_CATEGORIES.map(c => c.id)

const CACHE_TTL = 10 * 60 * 1000
const CACHE_MAX = 200
const cache = new Map()

export function isPoiCategory(id) {
  return !!KEYWORDS[id]
}

export function amapConfigured() {
  return !!process.env.CGJ_AMAP_KEY
}

/** 高德 POI → 前端统一结构 */
export function normalizePoi(poi) {
  if (!poi || typeof poi !== 'object') return null
  const loc = String(poi.location || '').split(',')
  const lng = Number(loc[0])
  const lat = Number(loc[1])
  const biz = poi.biz_ext && typeof poi.biz_ext === 'object' ? poi.biz_ext : {}
  const str = v => (Array.isArray(v) ? '' : v == null ? '' : String(v))
  const num = v => {
    const n = Number(v)
    return Number.isFinite(n) && n > 0 ? n : null
  }

  const id = str(poi.id)
  const name = str(poi.name)
  if (!id || !name) return null

  return {
    id,
    name,
    address: str(poi.address) || str(poi.pname) + str(poi.cityname) + str(poi.adname),
    tel: str(poi.tel),
    lng: Number.isFinite(lng) ? lng : null,
    lat: Number.isFinite(lat) ? lat : null,
    distance: num(poi.distance),
    rating: num(biz.rating),
    cost: num(biz.cost),
    type: str(poi.type),
    tags: str(poi.tag) ? str(poi.tag).split(';').filter(Boolean).slice(0, 3) : [],
    source: 'amap'
  }
}

function cacheGet(key) {
  const hit = cache.get(key)
  if (!hit) return null
  if (hit.expires < Date.now()) {
    cache.delete(key)
    return null
  }
  return hit.data
}

function cacheSet(key, data) {
  if (cache.size >= CACHE_MAX) {
    // 简单淘汰最早插入的一项
    const first = cache.keys().next()
    if (!first.done) cache.delete(first.value)
  }
  cache.set(key, { expires: Date.now() + CACHE_TTL, data })
}

/**
 * 关键字搜索（商户入驻时按店名找自己的门店）
 * @returns {Promise<{source:'amap'|'demo', reason?:string, items:object[]}>}
 */
export async function searchPlaces({ keyword, city, page = 1, size = 10 }) {
  const kw = String(keyword || '').trim()
  if (!kw) throw Object.assign(new Error('keyword required'), { status: 400 })

  if (!amapConfigured()) {
    return { source: 'demo', reason: 'no-key', items: [] }
  }

  const cacheKey = ['text', city || '', kw, page, size].join(':')
  const cached = cacheGet(cacheKey)
  if (cached) return cached

  const url = new URL('https://restapi.amap.com/v3/place/text')
  url.searchParams.set('key', process.env.CGJ_AMAP_KEY)
  url.searchParams.set('keywords', kw)
  if (city) {
    url.searchParams.set('city', String(city))
    url.searchParams.set('citylimit', 'true')
  }
  url.searchParams.set('offset', String(size))
  url.searchParams.set('page', String(page))
  url.searchParams.set('extensions', 'all')

  const res = await fetch(url, { signal: AbortSignal.timeout(6000) })
  if (!res.ok) throw new Error('高德接口 HTTP ' + res.status)
  const data = await res.json()
  if (String(data.status) !== '1') {
    throw new Error('高德接口错误 ' + (data.infocode || '') + ' ' + (data.info || ''))
  }

  const items = (data.pois || []).map(normalizePoi).filter(Boolean)
  const out = { source: 'amap', items }
  cacheSet(cacheKey, out)
  return out
}

/** 逆地理编码：坐标 → 地址（商户自动定位后回填地址） */
export async function reverseGeocode({ lng, lat }) {
  if (!amapConfigured()) {
    return { source: 'demo', reason: 'no-key', address: '', city: '', district: '' }
  }

  const cacheKey = ['regeo', Number(lng).toFixed(5), Number(lat).toFixed(5)].join(':')
  const cached = cacheGet(cacheKey)
  if (cached) return cached

  const url = new URL('https://restapi.amap.com/v3/geocode/regeo')
  url.searchParams.set('key', process.env.CGJ_AMAP_KEY)
  url.searchParams.set('location', `${Number(lng).toFixed(6)},${Number(lat).toFixed(6)}`)
  url.searchParams.set('extensions', 'base')
  url.searchParams.set('radius', '1000')

  const res = await fetch(url, { signal: AbortSignal.timeout(6000) })
  if (!res.ok) throw new Error('高德接口 HTTP ' + res.status)
  const data = await res.json()
  if (String(data.status) !== '1') {
    throw new Error('高德接口错误 ' + (data.infocode || '') + ' ' + (data.info || ''))
  }

  const rc = data.regeocode || {}
  const ac = rc.addressComponent || {}
  const str = v => (Array.isArray(v) ? '' : v == null ? '' : String(v))
  const out = {
    source: 'amap',
    address: str(rc.formatted_address),
    city: str(ac.city) || str(ac.province),
    district: str(ac.district)
  }
  cacheSet(cacheKey, out)
  return out
}

/** 地理编码：地址 → 坐标（商户只填地址时自动补坐标） */
export async function geocodeAddress({ address, city }) {
  const addr = String(address || '').trim()
  if (!addr) throw Object.assign(new Error('address required'), { status: 400 })

  if (!amapConfigured()) {
    return { source: 'demo', reason: 'no-key', address: addr, lng: null, lat: null }
  }

  const cacheKey = ['geo', city || '', addr].join(':')
  const cached = cacheGet(cacheKey)
  if (cached) return cached

  const url = new URL('https://restapi.amap.com/v3/geocode/geo')
  url.searchParams.set('key', process.env.CGJ_AMAP_KEY)
  url.searchParams.set('address', addr)
  if (city) url.searchParams.set('city', String(city))

  const res = await fetch(url, { signal: AbortSignal.timeout(6000) })
  if (!res.ok) throw new Error('高德接口 HTTP ' + res.status)
  const data = await res.json()
  if (String(data.status) !== '1') {
    throw new Error('高德接口错误 ' + (data.infocode || '') + ' ' + (data.info || ''))
  }

  const g = (data.geocodes || [])[0]
  if (!g) return { source: 'amap', address: addr, lng: null, lat: null, reason: 'not-found' }

  const loc = String(g.location || '').split(',')
  const out = {
    source: 'amap',
    address: g.formatted_address || addr,
    lng: Number(loc[0]) || null,
    lat: Number(loc[1]) || null,
    level: g.level || ''
  }
  cacheSet(cacheKey, out)
  return out
}

/**
 * 周边搜索
 * @returns {Promise<{source:'amap'|'demo', reason?:string, items:object[]}>}
 */
export async function searchNearby({ category, lng, lat, radius = 5000, page = 1, size = 20 }) {
  const keyword = KEYWORDS[category]
  if (!keyword) throw Object.assign(new Error('unknown category'), { status: 400 })

  if (!amapConfigured()) {
    return { source: 'demo', reason: 'no-key', items: demoPois(category) }
  }

  const cacheKey = [
    category, page, size,
    Number(lng).toFixed(3), Number(lat).toFixed(3), radius
  ].join(':')
  const cached = cacheGet(cacheKey)
  if (cached) return cached

  const url = new URL('https://restapi.amap.com/v3/place/around')
  url.searchParams.set('key', process.env.CGJ_AMAP_KEY)
  url.searchParams.set('location', `${Number(lng).toFixed(6)},${Number(lat).toFixed(6)}`)
  url.searchParams.set('keywords', keyword)
  url.searchParams.set('radius', String(radius))
  url.searchParams.set('offset', String(size))
  url.searchParams.set('page', String(page))
  url.searchParams.set('extensions', 'all')
  url.searchParams.set('sortrule', 'distance')

  const res = await fetch(url, { signal: AbortSignal.timeout(6000) })
  if (!res.ok) throw new Error('高德接口 HTTP ' + res.status)
  const data = await res.json()
  if (String(data.status) !== '1') {
    throw new Error('高德接口错误 ' + (data.infocode || '') + ' ' + (data.info || ''))
  }

  const items = (data.pois || []).map(normalizePoi).filter(Boolean)
  const out = { source: 'amap', items }
  cacheSet(cacheKey, out)
  return out
}
