// 后端地址：构建/开发时通过 VITE_API_BASE 注入
// 留空 = 纯本地模式（数据只存本机，行为与 v1.6.0 完全一致）
// 例：VITE_API_BASE=http://192.168.1.10:8787 npm run dev:h5
const raw = (import.meta.env && import.meta.env.VITE_API_BASE) || ''

export const API_BASE = String(raw).trim().replace(/\/+$/, '')
export const CLOUD_ENABLED = !!API_BASE

// 令牌存 uni Storage；退出登录时清除
export const TOKEN_KEY = 'car_manager_token'

// 本地变更推送到云端的防抖时间（毫秒）
export const SYNC_DELAY = 800
