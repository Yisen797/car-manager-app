import { CITIES } from '@/data/cities'
import { setCity } from '@/store/index'

export const HOT_CITIES = ['北京', '上海', '广州', '深圳', '杭州', '成都', '武汉', '西安', '南京', '重庆']

function toRad(d) {
  return (d * Math.PI) / 180
}

// 球面距离（km）
export function distanceKm(lng1, lat1, lng2, lat2) {
  const R = 6371
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
  return 2 * R * Math.asin(Math.sqrt(a))
}

// 坐标最近城市
export function nearestCity(lng, lat) {
  let best = null
  let min = Infinity
  for (const c of CITIES) {
    const d = distanceKm(lng, lat, c.lng, c.lat)
    if (d < min) {
      min = d
      best = c
    }
  }
  return { city: best, distance: min }
}

export function findCity(name) {
  return CITIES.find(c => c.name === name || c.fullName === name) || null
}

/**
 * 获取定位并解析到最近城市
 * 说明：使用系统定位 + 本地城市坐标匹配，不依赖地图 Key；
 * H5 需要 HTTPS/localhost 且用户授权，失败时请引导手动选城市。
 */
function getPosition() {
  return new Promise((resolve, reject) => {
    // #ifdef H5
    // H5 直接用浏览器定位（uni.getLocation 在 H5 构建中不一定可用）
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => resolve({ longitude: pos.coords.longitude, latitude: pos.coords.latitude }),
        err => reject(err),
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
      )
    } else {
      reject(new Error('geolocation unsupported'))
    }
    return
    // #endif

    // #ifndef H5
    uni.getLocation({
      type: 'gcj02',
      isHighAccuracy: true,
      highAccuracyExpireTime: 5000,
      success: res => resolve({ longitude: res.longitude, latitude: res.latitude }),
      fail: reject
    })
    // #endif
  })
}

export async function requestLocation() {
  try {
    const pos = await getPosition()
    const { city, distance } = nearestCity(pos.longitude, pos.latitude)
    return {
      ok: !!(city && distance <= 500),
      city: city ? city.name : '',
      lng: pos.longitude,
      lat: pos.latitude,
      distance
    }
  } catch (err) {
    return { ok: false, reason: 'fail', error: err }
  }
}

export async function locateAndSetCity() {
  const res = await requestLocation()
  if (res.ok) {
    setCity(res.city, { lng: res.lng, lat: res.lat })
  }
  return res
}
