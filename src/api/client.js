// 后端请求封装：uni.request 三端通用 + 令牌管理
import { API_BASE, CLOUD_ENABLED, TOKEN_KEY } from '@/config/api'

export function cloudEnabled() {
  return CLOUD_ENABLED
}

export function getToken() {
  try {
    return uni.getStorageSync(TOKEN_KEY) || ''
  } catch (e) {
    return ''
  }
}

export function setToken(token) {
  try {
    uni.setStorageSync(TOKEN_KEY, token || '')
  } catch (e) {
    // 忽略存储异常
  }
}

export function clearToken() {
  try {
    uni.removeStorageSync(TOKEN_KEY)
  } catch (e) {
    // 忽略存储异常
  }
}

/**
 * 发起后端请求
 * @param {string} path 以 /api 开头
 * @param {{method?:string,data?:object,timeout?:number}} options
 * @returns {Promise<any>}
 */
export function request(path, options = {}) {
  if (!CLOUD_ENABLED) {
    return Promise.reject(Object.assign(new Error('未配置后端地址'), { code: 'disabled' }))
  }
  const { method = 'GET', data, timeout = 10000 } = options
  const token = getToken()

  return new Promise((resolve, reject) => {
    uni.request({
      url: API_BASE + path,
      method,
      data,
      timeout,
      header: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: 'Bearer ' + token } : {})
      },
      success(res) {
        const body = res.data
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(body)
          return
        }
        const err = new Error(
          (body && body.error && body.error.message) || '请求失败（HTTP ' + res.statusCode + '）'
        )
        err.status = res.statusCode
        err.code = body && body.error && body.error.code
        err.body = body
        reject(err)
      },
      fail(err) {
        reject(Object.assign(new Error((err && err.errMsg) || '网络请求失败'), { code: 'network' }))
      }
    })
  })
}
