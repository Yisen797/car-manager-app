// 第三方服务接入：高德 POI 附近门店
// - 配置了后端（VITE_API_BASE）且后端配置 CGJ_AMAP_KEY：返回高德实时数据
// - 其余情况：返回演示数据，页面可用、不报错
import { cloudEnabled, request } from './client'
import { demoPois } from '@/data/nearby.mjs'

/**
 * 查询附近门店
 * @param {{category:string,lng:number,lat:number,radius?:number,page?:number,size?:number}} p
 * @returns {Promise<{source:'amap'|'demo', reason?:string, items:object[]}>}
 */
export async function fetchNearby(p = {}) {
  const { category, lng, lat, radius = 5000, page = 1, size = 20 } = p
  if (cloudEnabled() && lng != null && lat != null) {
    const q = [
      'category=' + encodeURIComponent(category || 'wash'),
      'lng=' + Number(lng),
      'lat=' + Number(lat),
      'radius=' + Number(radius),
      'page=' + Number(page),
      'size=' + Number(size)
    ].join('&')
    try {
      const res = await request('/api/poi/nearby?' + q, { timeout: 8000 })
      if (res && res.ok && Array.isArray(res.items)) {
        return { source: res.source || 'amap', items: res.items }
      }
    } catch (e) {
      // 后端不可用：回退演示数据，不打断用户
    }
  }
  return {
    source: 'demo',
    reason: cloudEnabled() ? 'offline' : 'no-backend',
    items: demoPois(category || 'wash')
  }
}

/** 按店名搜索门店（商户入驻定位） */
export async function searchPlaces({ keyword, city } = {}) {
  const kw = String(keyword || '').trim()
  if (!kw) return { ok: false, reason: 'keyword', items: [] }
  if (!cloudEnabled()) return { ok: false, reason: 'no-backend', items: [] }
  const q = 'keyword=' + encodeURIComponent(kw) + '&city=' + encodeURIComponent(city || '')
  try {
    const res = await request('/api/poi/search?' + q, { timeout: 8000 })
    return { ok: true, source: res.source, items: res.items || [] }
  } catch (e) {
    return { ok: false, reason: 'network', items: [] }
  }
}

/** 坐标 → 地址（商户自动定位后回填） */
export async function reverseGeocode({ lng, lat } = {}) {
  if (!cloudEnabled() || lng == null || lat == null) {
    return { ok: false, reason: 'no-backend', address: '' }
  }
  try {
    const res = await request(
      `/api/geo/reverse?lng=${Number(lng)}&lat=${Number(lat)}`,
      { timeout: 8000 }
    )
    return {
      ok: !!res.address,
      source: res.source,
      address: res.address || '',
      city: res.city || ''
    }
  } catch (e) {
    return { ok: false, reason: 'network', address: '' }
  }
}

/** 地址 → 坐标（商户只填地址时自动补点） */
export async function geocodeAddress({ address, city } = {}) {
  const addr = String(address || '').trim()
  if (!addr) return { ok: false, reason: 'address', lng: null, lat: null }
  if (!cloudEnabled()) return { ok: false, reason: 'no-backend', lng: null, lat: null }
  const q = 'address=' + encodeURIComponent(addr) + '&city=' + encodeURIComponent(city || '')
  try {
    const res = await request('/api/geo/code?' + q, { timeout: 8000 })
    return {
      ok: res.lng != null && res.lat != null,
      source: res.source,
      address: res.address || addr,
      lng: res.lng,
      lat: res.lat
    }
  } catch (e) {
    return { ok: false, reason: 'network', lng: null, lat: null }
  }
}

/** 各第三方集成配置状态（用于设置页/调试） */
export async function integrationStatus() {
  if (!cloudEnabled()) {
    return { ok: true, backend: false, amap: { configured: false } }
  }
  try {
    const res = await request('/api/integrations', { timeout: 5000 })
    return { ...res, backend: true }
  } catch (e) {
    return { ok: false, backend: true, amap: { configured: false } }
  }
}
