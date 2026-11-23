// 车管家后端入口：Node 内置 http + sqlite，零第三方依赖
//
// 启动：
//   node server/index.mjs            # 默认 0.0.0.0:8787，数据在 server/data/car-manager.db
//   PORT=9000 node server/index.mjs
// 环境变量：
//   CGJ_DATA_DIR     数据目录（默认 server/data）
//   CGJ_DB           SQLite 文件完整路径（优先级更高）
//   CGJ_DEV_SMS      0 = 关闭演示验证码（默认 1，任意手机号可用 123456）
//   CGJ_ADMIN_KEY    管理端密钥（默认 cheguanjia-admin，正式环境必须修改）
//   CGJ_ALLOW_RESET  0 = 关闭演示数据重置接口
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  openDb, formatNow, findUserByPhone, createUser, touchUser,
  readState, writeState
} from './db.mjs'
import {
  DEV_SMS, sendSms, verifySms, issueToken, currentUser, revokeToken,
  bearerToken, isValidPhone
} from './auth.mjs'
import { COUPONS } from '../src/data/seed.mjs'
import {
  searchNearby, searchPlaces, reverseGeocode, geocodeAddress,
  isPoiCategory, amapConfigured
} from './integrations/amap.mjs'
import { demoPois } from '../src/data/nearby.mjs'
import { handleAdmin } from './admin/index.mjs'
import { handleInvite } from './invite/index.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = Number(process.env.PORT || process.env.CGJ_PORT || 8787)
const HOST = process.env.CGJ_HOST || '0.0.0.0'
const BODY_LIMIT = 2 * 1024 * 1024

const db = openDb(process.env.CGJ_DB || undefined)

/* ---------------- HTTP 工具 ---------------- */
function cors(req, res) {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*')
  res.setHeader('Vary', 'Origin')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Admin-Key')
  res.setHeader('Access-Control-Max-Age', '86400')
}

function sendJson(req, res, status, data) {
  cors(req, res)
  const body = JSON.stringify(data)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store'
  })
  res.end(body)
}

function fail(req, res, status, code, message) {
  sendJson(req, res, status, { ok: false, error: { code, message } })
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    req.on('data', chunk => {
      size += chunk.length
      if (size > BODY_LIMIT) {
        reject(Object.assign(new Error('payload too large'), { status: 413 }))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      if (!chunks.length) return resolve({})
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')))
      } catch (e) {
        reject(Object.assign(new Error('invalid json'), { status: 400 }))
      }
    })
    req.on('error', reject)
  })
}

function requireUser(req, res) {
  const user = currentUser(db, req)
  if (!user) {
    fail(req, res, 401, 'unauthorized', '登录已失效，请重新登录')
    return null
  }
  return user
}

/* ---------------- 路由 ---------------- */
const routes = []
const route = (method, pattern, handler) => routes.push({ method, pattern, handler })

route('GET', /^\/api\/health$/, (req, res) => {
  sendJson(req, res, 200, {
    ok: true,
    service: 'cheguanjia',
    time: formatNow(),
    devSms: DEV_SMS,
    node: process.version
  })
})

/* 认证 */
route('POST', /^\/api\/auth\/sms$/, async (req, res) => {
  const body = await readBody(req)
  const r = sendSms(body.phone)
  if (!r.ok) {
    if (r.reason === 'phone') return fail(req, res, 400, 'phone', '手机号格式不正确')
    return fail(req, res, 429, 'too-often', `请 ${r.retryAfter} 秒后再试`)
  }
  sendJson(req, res, 200, {
    ok: true,
    expiresIn: r.expiresIn,
    // 演示模式直接回传验证码；正式短信通道接入后只发短信不回传
    ...(r.code ? { code: r.code } : {})
  })
})

route('POST', /^\/api\/auth\/login$/, async (req, res) => {
  const body = await readBody(req)
  const phone = String(body.phone || '').trim()
  if (!isValidPhone(phone)) return fail(req, res, 400, 'phone', '手机号格式不正确')
  if (!verifySms(phone, body.code)) return fail(req, res, 400, 'code', '验证码错误或已过期')

  let user = findUserByPhone(db, phone)
  const isNew = !user
  if (!user) user = createUser(db, phone, 'sms')
  touchUser(db, user)

  const { token, expiresAt } = issueToken(db, user.id)
  sendJson(req, res, 200, {
    ok: true,
    token,
    expiresAt,
    isNew,
    state: readState(db, user.id)
  })
})

// 演示版微信登录：固定演示账号；接入微信后可换成 code2session
route('POST', /^\/api\/auth\/wechat$/, async (req, res) => {
  const body = await readBody(req)
  const phone = String(body.phone || '13800008899').trim()
  let user = findUserByPhone(db, phone)
  const isNew = !user
  if (!user) user = createUser(db, phone, 'wechat')
  touchUser(db, { ...user, login_type: 'wechat' })

  const { token, expiresAt } = issueToken(db, user.id)
  sendJson(req, res, 200, { ok: true, token, expiresAt, isNew, state: readState(db, user.id) })
})

route('POST', /^\/api\/auth\/logout$/, (req, res) => {
  revokeToken(db, bearerToken(req))
  sendJson(req, res, 200, { ok: true })
})

/* 当前用户与状态同步 */
route('GET', /^\/api\/me$/, (req, res) => {
  const user = requireUser(req, res)
  if (!user) return
  const s = readState(db, user.id)
  sendJson(req, res, 200, { ok: true, revision: s.revision, user: s.user })
})

route('GET', /^\/api\/state$/, (req, res) => {
  const user = requireUser(req, res)
  if (!user) return
  sendJson(req, res, 200, readState(db, user.id))
})

/**
 * 整包同步：客户端把本地 state 推上来，服务端单事务覆盖该用户数据。
 * 带 baseRevision 做乐观并发控制；版本不一致返回 409，客户端应重新拉取。
 */
route('PUT', /^\/api\/state$/, async (req, res) => {
  const user = requireUser(req, res)
  if (!user) return
  const body = await readBody(req)
  const state = body.state || body
  if (!state || typeof state !== 'object' || Array.isArray(state)) {
    return fail(req, res, 400, 'state', 'state 必须是对象')
  }
  const current = readState(db, user.id)
  const baseRevision = body.baseRevision != null ? Number(body.baseRevision) : Number(state.revision)
  if (baseRevision > 0 && current.revision !== baseRevision) {
    return sendJson(req, res, 409, {
      ok: false,
      error: { code: 'conflict', message: '云端数据已更新，请先拉取最新数据' },
      revision: current.revision
    })
  }
  const r = writeState(db, user.id, state)
  sendJson(req, res, 200, { ok: true, revision: r.revision })
})

/* 公开数据 */
route('GET', /^\/api\/merchants$/, (req, res) => {
  const url = new URL(req.url, 'http://localhost')
  const city = url.searchParams.get('city')
  const rows = city
    ? db.prepare('SELECT id, city, name, owner_user_id, data_json FROM merchants WHERE city = ? ORDER BY id').all(city)
    : db.prepare('SELECT id, city, name, owner_user_id, data_json FROM merchants ORDER BY id').all()
  sendJson(req, res, 200, {
    ok: true,
    merchants: rows.map(r => JSON.parse(r.data_json))
  })
})

route('GET', /^\/api\/coupon-templates$/, (req, res) => {
  sendJson(req, res, 200, { ok: true, templates: COUPONS })
})

/* 第三方集成：高德 POI 周边搜索（免费额度，服务端代理，避免 Key 暴露） */
const poiHits = new Map()
function poiRateLimited(ip) {
  const now = Date.now()
  const rec = poiHits.get(ip)
  if (!rec || now - rec.start > 60000) {
    poiHits.set(ip, { start: now, count: 1 })
    if (poiHits.size > 2000) poiHits.clear()
    return false
  }
  rec.count += 1
  return rec.count > 30
}

route('GET', /^\/api\/poi\/nearby$/, async (req, res) => {
  const url = new URL(req.url, 'http://localhost')
  const category = url.searchParams.get('category') || 'wash'
  const lngRaw = url.searchParams.get('lng')
  const latRaw = url.searchParams.get('lat')
  const lng = Number(lngRaw)
  const lat = Number(latRaw)
  const radius = Math.max(500, Math.min(50000, Number(url.searchParams.get('radius')) || 5000))
  const page = Math.max(1, Math.min(100, Number(url.searchParams.get('page')) || 1))
  const size = Math.max(1, Math.min(25, Number(url.searchParams.get('size')) || 20))

  if (!isPoiCategory(category)) return fail(req, res, 400, 'category', '不支持的门店分类')
  if (lngRaw == null || latRaw == null ||
    !Number.isFinite(lng) || !Number.isFinite(lat) ||
    Math.abs(lng) > 180 || Math.abs(lat) > 90) {
    return fail(req, res, 400, 'location', '缺少有效定位坐标')
  }
  if (poiRateLimited(req.socket.remoteAddress || '')) {
    return fail(req, res, 429, 'too-often', '请求过于频繁，请稍后再试')
  }

  let result
  try {
    result = await searchNearby({ category, lng, lat, radius, page, size })
  } catch (e) {
    // 上游失败时回退演示数据，不影响用户使用
    console.warn('[amap] 周边搜索失败：' + e.message)
    result = { source: 'demo', reason: 'upstream', items: demoPois(category) }
  }
  sendJson(req, res, 200, { ok: true, category, ...result })
})

route('GET', /^\/api\/integrations$/, (req, res) => {
  sendJson(req, res, 200, {
    ok: true,
    amap: {
      configured: amapConfigured(),
      provider: '高德 Web 服务 · POI 周边搜索 / 地理编码',
      quota: '个人非商业 5000 次/月，企业 50000 次/月（以高德控制台为准）',
      categories: ['wash', 'maintain', 'rescue', 'charge', 'fuel', 'parking'],
      geo: amapConfigured()
    }
  })
})

/* 商户入驻定位：按店名搜索 / 坐标反查地址 / 地址转坐标 */
route('GET', /^\/api\/poi\/search$/, async (req, res) => {
  const url = new URL(req.url, 'http://localhost')
  const keyword = String(url.searchParams.get('keyword') || '').trim()
  const city = String(url.searchParams.get('city') || '').trim()
  const page = Math.max(1, Math.min(20, Number(url.searchParams.get('page')) || 1))
  const size = Math.max(1, Math.min(20, Number(url.searchParams.get('size')) || 10))

  if (!keyword || keyword.length > 60) return fail(req, res, 400, 'keyword', '请输入门店名称')
  if (poiRateLimited(req.socket.remoteAddress || '')) {
    return fail(req, res, 429, 'too-often', '请求过于频繁，请稍后再试')
  }

  let result
  try {
    result = await searchPlaces({ keyword, city, page, size })
  } catch (e) {
    console.warn('[amap] 门店搜索失败：' + e.message)
    result = { source: 'demo', reason: 'upstream', items: [] }
  }
  sendJson(req, res, 200, { ok: true, keyword, ...result })
})

route('GET', /^\/api\/geo\/reverse$/, async (req, res) => {
  const url = new URL(req.url, 'http://localhost')
  const lngRaw = url.searchParams.get('lng')
  const latRaw = url.searchParams.get('lat')
  const lng = Number(lngRaw)
  const lat = Number(latRaw)

  if (lngRaw == null || latRaw == null ||
    !Number.isFinite(lng) || !Number.isFinite(lat) ||
    Math.abs(lng) > 180 || Math.abs(lat) > 90) {
    return fail(req, res, 400, 'location', '缺少有效坐标')
  }
  if (poiRateLimited(req.socket.remoteAddress || '')) {
    return fail(req, res, 429, 'too-often', '请求过于频繁，请稍后再试')
  }

  let result
  try {
    result = await reverseGeocode({ lng, lat })
  } catch (e) {
    console.warn('[amap] 逆地理失败：' + e.message)
    result = { source: 'demo', reason: 'upstream', address: '', city: '', district: '' }
  }
  sendJson(req, res, 200, { ok: true, ...result })
})

route('GET', /^\/api\/geo\/code$/, async (req, res) => {
  const url = new URL(req.url, 'http://localhost')
  const address = String(url.searchParams.get('address') || '').trim()
  const city = String(url.searchParams.get('city') || '').trim()

  if (!address || address.length > 200) return fail(req, res, 400, 'address', '请输入门店地址')
  if (poiRateLimited(req.socket.remoteAddress || '')) {
    return fail(req, res, 429, 'too-often', '请求过于频繁，请稍后再试')
  }

  let result
  try {
    result = await geocodeAddress({ address, city })
  } catch (e) {
    console.warn('[amap] 地理编码失败：' + e.message)
    result = { source: 'demo', reason: 'upstream', address, lng: null, lat: null }
  }
  sendJson(req, res, 200, { ok: true, ...result })
})

/* ---------------- 主循环 ---------------- */
const server = http.createServer(async (req, res) => {
  const started = Date.now()
  const url = new URL(req.url || '/', 'http://localhost')
  const pathname = url.pathname.replace(/\/+$/, '') || '/'

  if (req.method === 'OPTIONS') {
    cors(req, res)
    res.writeHead(204)
    return res.end()
  }

  try {
    // 根路径与旧地址统一跳到 /admin（带 CSP/安全头的运营后台）
    if ((req.method === 'GET' || req.method === 'HEAD') &&
      (pathname === '/' || pathname === '/admin.html')) {
      res.writeHead(302, { Location: '/admin', 'Cache-Control': 'no-store' })
      return res.end()
    }

    // 运营后台模块（server/admin/）：登录、权限、审计、业务流程
    if (pathname === '/admin' || pathname.startsWith('/admin/') || pathname.startsWith('/api/admin/')) {
      const handled = await handleAdmin(req, res, {
        db, pathname, url, sendJson, fail, readBody, cors, formatNow
      })
      if (handled) return
    }

    // 邀请有礼模块（server/invite/）：邀请码、绑定、幂等领奖、反作弊审计
    if (pathname.startsWith('/api/invite/')) {
      const handled = await handleInvite(req, res, { db, pathname, url, sendJson, fail, readBody })
      if (handled) return
    }

    for (const r of routes) {
      if (req.method !== r.method) continue
      const m = r.pattern.exec(pathname)
      if (!m) continue
      await r.handler(req, res, m)
      return
    }
    fail(req, res, 404, 'not-found', '接口不存在')
  } catch (e) {
    const status = e.status || 500
    if (status >= 500) console.error('[error]', req.method, pathname, e)
    if (!res.headersSent) fail(req, res, status, status === 500 ? 'server' : 'bad-request', e.message)
    else res.end()
  } finally {
    const ms = Date.now() - started
    if (process.env.CGJ_QUIET !== '1' && !pathname.startsWith('/admin')) {
      console.log(`${req.method} ${pathname} ${res.statusCode} ${ms}ms`)
    }
  }
})

server.listen(PORT, HOST, () => {
  console.log(`车管家后端已启动: http://${HOST}:${PORT}`)
  console.log(`管理端:        http://localhost:${PORT}/admin`)
  console.log(`SQLite:        ${process.env.CGJ_DB || path.join(process.env.CGJ_DATA_DIR || path.join(__dirname, 'data'), 'car-manager.db')}`)
  if (DEV_SMS) console.log('演示短信模式: 验证码固定 123456（CGJ_DEV_SMS=0 可关闭）')
  if (!process.env.CGJ_ADMIN_KEY) console.log('警告: 管理密钥使用默认值 cheguanjia-admin，正式环境请设置 CGJ_ADMIN_KEY')
})

function shutdown(sig) {
  console.log(`\n收到 ${sig}，正在关闭…`)
  server.close(() => {
    try { db.close() } catch (e) { /* ignore */ }
    process.exit(0)
  })
  setTimeout(() => process.exit(0), 3000).unref()
}
process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
