/**
 * 运营后台模块入口
 *
 * 由 server/index.mjs 在路由前调用：
 *   handleAdmin(req, res, ctx) -> Promise<boolean>
 *   返回 true 表示已处理；false 表示交回 index.mjs 的旧路由（兼容期）
 *
 * ctx: {
 *   db, pathname, url,
 *   sendJson(req,res,status,data),
 *   fail(req,res,status,code,message),
 *   readBody(req),
 *   cors(req,res),
 *   formatNow()
 * }
 *
 * 本模块负责：
 *   - /admin                后台单页（CSP + 安全响应头）
 *   - /api/admin/*          管理端接口（登录、RBAC、审计、业务操作）
 *   - x-admin-key 兼容接口  （旧脚本 / server/test.mjs）
 *
 * 后台自己的表在 server/admin/db.mjs 内懒创建，不修改 server/db.mjs。
 */
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { ensureAdminSchema } from './db.mjs'
import { authenticateAdmin, legacyKeyState, legacyAdmin } from './auth.mjs'
import { handleAdminApi } from './routes.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PAGE_FILE = path.join(__dirname, '..', 'admin.html')
const USED_SCHEMA = new WeakSet()

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Cross-Origin-Opener-Policy': 'same-origin'
}

function csp(nonce) {
  return [
    "default-src 'self'",
    `script-src 'nonce-${nonce}'`,
    `style-src 'nonce-${nonce}'`,
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'"
  ].join('; ')
}

/** 后台单页：每次请求注入随机 nonce，避免使用 unsafe-inline */
function servePage(req, res) {
  fs.readFile(PAGE_FILE, (err, buf) => {
    if (err) {
      const body = JSON.stringify({
        ok: false, error: { code: 'admin', message: '管理端页面缺失' }
      })
      res.writeHead(500, {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(body),
        ...SECURITY_HEADERS
      })
      return res.end(body)
    }
    const nonce = crypto.randomBytes(16).toString('base64')
    const html = buf.toString('utf8').replace(/__ADMIN_CSP_NONCE__/g, nonce)
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Length': Buffer.byteLength(html),
      'Cache-Control': 'no-store',
      'Content-Security-Policy': csp(nonce),
      ...SECURITY_HEADERS
    })
    res.end(html)
  })
}

export async function handleAdmin(req, res, ctx) {
  const { pathname, db } = ctx

  // /admin、/admin/* -> 后台单页（无前端路由，统一返回同一页面）
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      ctx.fail(req, res, 405, 'method', '请求方法不支持')
      return true
    }
    servePage(req, res)
    return true
  }

  if (pathname !== '/api/admin' && !pathname.startsWith('/api/admin/')) return false

  try {
    if (!USED_SCHEMA.has(db)) {
      ensureAdminSchema(db)
      USED_SCHEMA.add(db)
    }

    // 兼容旧管理密钥：视为超级管理员会话
    let auth = null
    if (legacyKeyState(req)) auth = legacyAdmin()
    else auth = authenticateAdmin(db, req)

    const routeCtx = {
      ...ctx,
      req,
      res,
      pathname,
      url: ctx.url || new URL(req.url || '/', 'http://localhost')
    }
    await handleAdminApi(req, res, routeCtx, auth)
  } catch (e) {
    const status = e && e.status ? e.status : 500
    if (status >= 500 && process.env.CGJ_QUIET !== '1') {
      console.error('[admin]', req.method, pathname, e)
    }
    if (!res.headersSent) {
      const message = status >= 500 ? '后台服务异常，请稍后重试' : String(e.message || '请求失败')
      const code = status === 500 ? 'server' : (status === 400 ? 'bad-request' : 'error')
      ctx.fail(req, res, status, code, message)
    } else {
      res.end()
    }
  }
  return true
}
