// 邀请有礼模块：路由分发
//
// 挂载方式（server/index.mjs 只增加 import + 一段挂载调用）：
//   if (pathname.startsWith('/api/invite/')) {
//     const handled = await handleInvite(req, res, { db, pathname, url, sendJson, fail, readBody })
//     if (handled) return
//   }
//
// 接口：
//   GET  /api/invite/check?code=  公开，邀请码是否有效（不返回任何用户信息）
//   GET  /api/invite/me           登录，邀请码/人数/记录/已领取/已绑定邀请人/上限用量
//   POST /api/invite/bind         登录，绑定邀请人（幂等）
//   POST /api/invite/claim        登录，领取阶梯奖励（幂等）
import { currentUser } from '../auth.mjs'
import { ensureInviteSchema } from './db.mjs'
import {
  buildInviteMe, bindInvite, claimInvite, checkInviteCode
} from './service.mjs'

/** 客户端 IP：取 socket 地址，不信任可伪造的 X-Forwarded-For */
function clientIp(req) {
  const raw = (req.socket && req.socket.remoteAddress) || ''
  return String(raw).replace(/^::ffff:/, '')
}

export async function handleInvite(req, res, ctx) {
  const { db, pathname, url, sendJson, fail, readBody } = ctx
  if (!pathname.startsWith('/api/invite/')) return false
  ensureInviteSchema(db)

  // 公开：邀请码校验（落地页可在注册前提示"邀请码无效"）
  if (req.method === 'GET' && pathname === '/api/invite/check') {
    const result = checkInviteCode(db, url.searchParams.get('code'))
    sendJson(req, res, 200, { ok: true, ...result })
    return true
  }

  const user = currentUser(db, req)
  if (!user) {
    fail(req, res, 401, 'unauthorized', '登录已失效，请重新登录')
    return true
  }

  if (req.method === 'GET' && pathname === '/api/invite/me') {
    sendJson(req, res, 200, { ok: true, invite: buildInviteMe(db, user.id) })
    return true
  }

  if (req.method === 'POST' && pathname === '/api/invite/bind') {
    const body = await readBody(req)
    const r = bindInvite(db, user, {
      code: body.code,
      device: body.device,
      ip: clientIp(req),
      userAgent: req.headers['user-agent'] || ''
    })
    sendJson(req, res, r.status, r.body)
    return true
  }

  if (req.method === 'POST' && pathname === '/api/invite/claim') {
    const body = await readBody(req)
    const r = claimInvite(db, user, {
      rewardId: body.rewardId,
      device: body.device,
      ip: clientIp(req)
    })
    sendJson(req, res, r.status, r.body)
    return true
  }

  // 未知的 /api/invite/* 交给统一 404
  return false
}
