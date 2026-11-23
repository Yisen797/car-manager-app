import { state, memberInfo, monthKey } from '@/store/index'

// 会员折扣：与会员权益页保持一致
// 普通会员：服务费 95 折（保养 9 折）
// 尊享会员：服务费 9 折（保养工时 7 折）
// 企业 VIP：服务费 88 折（保养工时 7 折）
export const TIER_RATES = {
  normal: { base: 0.95, maintain: 0.9 },
  premium: { base: 0.9, maintain: 0.7 },
  enterprise: { base: 0.88, maintain: 0.7 }
}

export function servicePrice(service) {
  return Number(service && service.price) || 0
}

export function memberRate(service) {
  if (!memberInfo().active) return 1
  const tier = TIER_RATES[state.user.memberTier]
  if (!tier) return 1
  if (service && service.id === 'maintain') return tier.maintain
  return tier.base
}

export function isCouponExpired(coupon) {
  if (!coupon || !coupon.expire) return false
  const t = new Date(String(coupon.expire).replace(/-/g, '/') + ' 23:59:59').getTime()
  return t < Date.now()
}

// 券是否可用于该服务
export function couponApplicable(coupon, service) {
  if (!coupon || coupon.status !== 'unused') return false
  if (isCouponExpired(coupon)) return false
  if (!coupon.scope || coupon.scope === '全场通用') return true
  return !!service && coupon.scope === service.name
}

export function usableCoupons(service) {
  return state.coupons
    .filter(c => couponApplicable(c, service))
    .sort((a, b) => b.amount - a.amount)
}

// 尊享会员每月 1 次免费代驾/跑腿（二选一）
export function hasFreeQuota(serviceId) {
  if (state.user.memberTier !== 'premium') return false
  if (!['driver', 'errand'].includes(serviceId)) return false
  return state.freeUsage.month === monthKey() && !state.freeUsage.type
}

/**
 * 计算订单价格
 * @param {object} service 服务
 * @param {object|null} coupon 选中的券
 * @param {boolean} usePoints 是否使用积分
 */
export function calcPrice(service, coupon, usePoints = false) {
  const base = servicePrice(service)
  const rate = memberRate(service)
  const memberCut = rate < 1 ? Math.round(base * (1 - rate)) : 0

  const free = hasFreeQuota(service && service.id) && base > 0
  const freeCut = free ? base - memberCut : 0

  let payable = Math.max(0, base - memberCut - freeCut)

  let couponCut = 0
  if (coupon && couponApplicable(coupon, service)) {
    if (payable >= (coupon.threshold || 0)) {
      couponCut = Math.min(coupon.amount, payable)
      payable -= couponCut
    }
  }

  // 100 积分 = 1 元，最多抵扣实付金额的 20%
  const maxPointsValue = Math.floor(payable * 0.2)
  const maxPoints = Math.min(state.user.points, maxPointsValue * 100)
  const pointsCut = usePoints ? Math.floor(maxPoints / 100) : 0
  payable = Math.max(0, payable - pointsCut)

  return {
    base,
    rate,
    memberCut,
    freeCut,
    free,
    couponCut,
    pointsCut,
    pointsUsed: pointsCut * 100,
    maxPoints,
    payable
  }
}

export function discountText(service) {
  const rate = memberRate(service)
  if (rate >= 1) return ''
  return `${Number((rate * 10).toFixed(1))}折`
}
