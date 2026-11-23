import { reactive } from 'vue'
import {
  ORDERS, CARS, COUPONS, MEMBER_TIERS, MERCHANTS, MERCHANT_TIERS
} from '@/data/mock'
import { APP_VERSION, SCHEMA_VERSION } from '@/config/version'
import { INVITE_LIMITS, INVITEE_WELCOME } from '@/data/invite'
import {
  generateInviteCode, normalizeInviteCode, getDeviceId,
  readLocalBindings, writeLocalBindings
} from '@/config/invite'

// 稳定键名：从本版本起固定使用，不再随版本变化
const STORAGE_KEY = 'car_manager_state'
// 历史键：升级时自动迁移，保留旧键供旧版本 App 继续使用
const LEGACY_KEYS = ['car_manager_state_v2', 'car_manager_state_v1']
// 旧数据没有 meta 字段，按 v2 结构处理
const LEGACY_SCHEMA_VERSION = 2

// 数据版本保护：本地数据比当前 App 新时，锁定存储，避免旧 App 覆盖新数据
let storageLocked = false
let storageInfo = {
  locked: false,
  storedSchema: SCHEMA_VERSION,
  currentSchema: SCHEMA_VERSION
}

function clone(o) {
  return JSON.parse(JSON.stringify(o))
}

export function monthKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/* 订单状态：pending 待支付 → waiting 待接单 → serving 服务中 → review 待评价 → done 已完成 */
export const ORDER_STATUS = {
  pending: '待支付',
  waiting: '待接单',
  serving: '服务中',
  review: '待评价',
  done: '已完成',
  canceled: '已取消'
}

export const ORDER_TABS = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待支付' },
  { key: 'waiting', label: '待接单' },
  { key: 'serving', label: '服务中' },
  { key: 'review', label: '待评价' },
  { key: 'done', label: '已完成' },
  { key: 'canceled', label: '已取消' }
]

function defaultState() {
  return {
    meta: {
      schemaVersion: SCHEMA_VERSION,
      appVersion: APP_VERSION,
      savedAt: ''
    },
    user: {
      name: '车主 8899',
      phone: '138****8899',
      phoneRaw: '13800008899',
      avatar: '🙂',
      memberTier: 'premium', // none | normal | premium | enterprise
      memberExpire: '2027-06-30',
      points: 1280,
      balance: 0,
      loggedIn: false,
      loginType: '',
      loginTime: '',
      // user | merchant
      role: 'user',
      merchantAppId: '',
      merchantId: ''
    },
    orders: clone(ORDERS),
    cars: clone(CARS),
    currentCarId: 'c1',
    // 用户已领取的券；COUPONS 是券模板/领券中心
    coupons: clone(COUPONS)
      .slice(0, 3)
      .map(c => ({ ...c, status: 'unused', claimedAt: '' })),
    merchantApplications: [],
    enterpriseApplications: [],
    invoices: [],
    feedbacks: [],
    searchHistory: ['保养', '代驾'],
    settings: { notify: true, personalized: true },
    city: '北京',
    location: { lng: null, lat: null, source: 'manual', updatedAt: '' },
    // 审核通过后自动生成的可接单商家（与 MERCHANTS 静态样例合并使用）
    dynamicMerchants: [],
    // 积分明细与兑换记录
    pointsLog: [
      { id: 'pl_init', title: '历史积分', amount: 1280, time: '2026-11-01 09:00' }
    ],
    redemptions: [],
    // 邀请有礼（code 为本地生成的随机邀请码；bound 记录已绑定的邀请人）
    invite: { count: 0, records: [], claimed: [], code: '', bound: null },
    // 尊享会员每月 1 次免费代驾或跑腿（二选一）
    freeUsage: { month: monthKey(), type: null },
    messages: [
      {
        id: 'msg_welcome', type: 'system', title: '欢迎使用车管家',
        desc: '会员权益已生效，全年用车养车一站托管', time: '2026-11-01 09:00',
        read: false, target: '/pages/member/index'
      },
      {
        id: 'msg_car', type: 'car', title: '保养到期提醒',
        desc: '京A·8K2M9 距离下次保养还有约 1200km', time: '2026-10-30 10:20',
        read: false, target: '/pages/car/list'
      },
      {
        id: 'msg_coupon', type: 'coupon', title: '优惠券已到账',
        desc: '3 张优惠券已放入卡包，下单时可直接抵扣', time: '2026-10-29 16:00',
        read: true, target: '/pages/coupon/index'
      }
    ],
    lastOrderId: ''
  }
}

export const state = reactive(defaultState())

/* ---------- 云同步钩子 ----------
 * 由 src/api/sync.js 在启用后端时注册；纯本地模式下不注册，行为与旧版本一致。
 */
let persistHook = null
let cloudHooks = { login: null, logout: null }
let suppressPersist = false

export function setPersistHook(fn) {
  persistHook = fn
}

export function setCloudHooks(hooks) {
  cloudHooks = { ...cloudHooks, ...hooks }
}

function migrateState(target, fromVersion) {
  for (let v = fromVersion; v < SCHEMA_VERSION; v++) {
    const fn = MIGRATIONS[v]
    if (fn) fn(target)
  }
  target.meta = {
    schemaVersion: SCHEMA_VERSION,
    appVersion: APP_VERSION,
    savedAt: formatNow()
  }
}

/**
 * 数据迁移表：key 为「旧版本号」，执行后数据升到 key + 1。
 * 新增字段必须在这里补齐默认值，保证老用户升级后数据不丢、页面不报错。
 */
const MIGRATIONS = {
  // v2 → v3：补齐登录、消息、发票、反馈、企业申请、设置、城市、车辆证件等
  2(s) {
    const d = defaultState()
    if (!s.user || typeof s.user !== 'object') s.user = d.user
    if (s.user.loggedIn === undefined) s.user.loggedIn = false
    if (s.user.loginType === undefined) s.user.loginType = ''
    if (s.user.loginTime === undefined) s.user.loginTime = ''
    if (s.user.points === undefined) s.user.points = d.user.points
    if (s.user.balance === undefined) s.user.balance = d.user.balance
    if (!Array.isArray(s.orders)) s.orders = d.orders
    if (!Array.isArray(s.cars)) s.cars = d.cars
    if (!Array.isArray(s.coupons)) s.coupons = d.coupons
    if (!Array.isArray(s.merchantApplications)) s.merchantApplications = []
    if (!Array.isArray(s.enterpriseApplications)) s.enterpriseApplications = []
    if (!Array.isArray(s.invoices)) s.invoices = []
    if (!Array.isArray(s.feedbacks)) s.feedbacks = []
    if (!Array.isArray(s.messages)) s.messages = d.messages
    if (!Array.isArray(s.searchHistory)) s.searchHistory = d.searchHistory
    if (!s.settings || typeof s.settings !== 'object') s.settings = d.settings
    if (!s.city) s.city = d.city
    if (!s.freeUsage || !s.freeUsage.month) s.freeUsage = d.freeUsage
    if (!s.currentCarId) s.currentCarId = (s.cars[0] && s.cars[0].id) || ''

    s.orders.forEach(o => {
      if (o.priceDetail === undefined) o.priceDetail = null
      if (o.review === undefined) o.review = null
      if (o.pointsUsed === undefined) o.pointsUsed = 0
      if (o.freeApplied === undefined) o.freeApplied = false
    })
    s.cars.forEach(c => {
      if (c.licenseImage === undefined) c.licenseImage = ''
      if (c.insuranceImage === undefined) c.insuranceImage = ''
    })
  },

  // v3 → v4：补齐定位、动态商家、商家账号角色
  3(s) {
    const d = defaultState()
    if (!s.location) s.location = d.location
    if (!Array.isArray(s.dynamicMerchants)) s.dynamicMerchants = []
    if (!s.user || typeof s.user !== 'object') s.user = d.user
    if (!s.user.role) s.user.role = 'user'
    if (s.user.merchantAppId === undefined) s.user.merchantAppId = ''
    if (s.user.merchantId === undefined) s.user.merchantId = ''
    if (!Array.isArray(s.merchantApplications)) s.merchantApplications = []

    s.merchantApplications.forEach(a => {
      if (a.ownerPhone === undefined) a.ownerPhone = a.phone || ''
      if (a.city === undefined) a.city = s.city || '北京'
      if (a.open === undefined) a.open = true
      if (a.status === 'approved' && !a.merchantId) {
        a.merchantId = 'dm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5)
        s.dynamicMerchants.push(buildMerchantFromApp(a, a.city))
      }
    })
  },

  // v4 → v5：补齐积分明细与兑换记录
  4(s) {
    if (!Array.isArray(s.pointsLog)) {
      s.pointsLog = [{
        id: 'pl_init',
        title: '历史积分',
        amount: (s.user && s.user.points) || 0,
        time: formatNow()
      }]
    }
    if (!Array.isArray(s.redemptions)) s.redemptions = []
  },

  // v5 → v6：补齐邀请有礼数据
  5(s) {
    if (!s.invite || typeof s.invite !== 'object') {
      s.invite = { count: 0, records: [], claimed: [], code: '', bound: null }
    } else {
      if (typeof s.invite.count !== 'number') s.invite.count = 0
      if (!Array.isArray(s.invite.records)) s.invite.records = []
      if (!Array.isArray(s.invite.claimed)) s.invite.claimed = []
      if (typeof s.invite.code !== 'string') s.invite.code = ''
      if (!s.invite.bound || typeof s.invite.bound !== 'object') s.invite.bound = null
    }
  }
}

/**
 * 读取本地数据
 * @returns {boolean} true 正常；false 数据版本高于当前 App（已锁定，不能读写）
 */
export function loadState() {
  try {
    let saved = uni.getStorageSync(STORAGE_KEY)

    // 首次升级：从历史键迁移
    if (!saved || typeof saved !== 'object') {
      for (const key of LEGACY_KEYS) {
        const legacy = uni.getStorageSync(key)
        if (legacy && typeof legacy === 'object') {
          saved = legacy
          break
        }
      }
    }

    if (!saved || typeof saved !== 'object') {
      storageInfo = { locked: false, storedSchema: SCHEMA_VERSION, currentSchema: SCHEMA_VERSION }
      return true
    }

    const storedSchema = Number(saved.meta && saved.meta.schemaVersion) || LEGACY_SCHEMA_VERSION

    // 向上不兼容：数据由更高版本 App 写入，禁止读取，也禁止覆盖
    if (storedSchema > SCHEMA_VERSION) {
      storageLocked = true
      storageInfo = { locked: true, storedSchema, currentSchema: SCHEMA_VERSION }
      return false
    }

    Object.assign(state, saved)
    migrateState(state, storedSchema)
    saveState()
    storageInfo = { locked: false, storedSchema, currentSchema: SCHEMA_VERSION }
    return true
  } catch (e) {
    // 读取失败则使用默认数据
    return true
  }
}

export function saveState() {
  if (storageLocked) return
  try {
    state.meta = {
      schemaVersion: SCHEMA_VERSION,
      appVersion: APP_VERSION,
      savedAt: formatNow()
    }
    uni.setStorageSync(STORAGE_KEY, clone(state))
  } catch (e) {
    // 忽略存储异常
  }
  // 本地变更后通知云同步（防抖推送）；应用云端数据时由 suppressPersist 屏蔽，避免回环
  if (persistHook && !suppressPersist) persistHook()
}

/**
 * 用云端状态覆盖本地（云端为权威数据源）。
 * 保留本机会话字段（loggedIn/loginType/loginTime），并按入驻申请重新推导商家角色。
 */
export function applyRemoteState(remote) {
  if (!remote || typeof remote !== 'object') return false
  const d = defaultState()
  const prev = state.user || d.user
  const user = remote.user || {}
  const phoneRaw = String(user.phoneRaw || user.phone || prev.phoneRaw || '')

  const arr = (v, fallback) => (Array.isArray(v) ? v : fallback)
  const obj = (v, fallback) => (v && typeof v === 'object' && !Array.isArray(v) ? v : fallback)

  const apps = arr(remote.merchantApplications, [])
  const merchantApp = apps.find(
    a => a && a.status === 'approved' && (a.ownerPhone === phoneRaw || a.phone === phoneRaw)
  )
  const prevInvite = obj(state.invite, {})
  const invite = obj(remote.invite, {})
  invite.count = Number(invite.count) || 0
  invite.records = arr(invite.records, [])
  invite.claimed = arr(invite.claimed, [])
  // 邀请码/绑定关系由 /api/invite/me 提供；整包状态没有这两个字段时保留本机值
  invite.code = typeof invite.code === 'string' && invite.code ? invite.code : (prevInvite.code || '')
  invite.bound = invite.bound !== undefined ? invite.bound : (prevInvite.bound || null)

  const freeUsage = obj(remote.freeUsage, null)
  const cars = arr(remote.cars, d.cars)

  suppressPersist = true
  Object.assign(state, {
    user: {
      ...d.user,
      ...prev,
      name: user.name != null ? user.name : prev.name,
      phoneRaw,
      phone: /^1\d{10}$/.test(phoneRaw) ? maskPhone(phoneRaw) : prev.phone,
      avatar: user.avatar || prev.avatar,
      memberTier: user.memberTier || 'none',
      memberExpire: user.memberExpire || '',
      points: Number(user.points) || 0,
      balance: Number(user.balance) || 0,
      role: merchantApp ? 'merchant' : (user.role || 'user'),
      merchantAppId: user.merchantAppId || (merchantApp ? merchantApp.id : ''),
      merchantId: user.merchantId || (merchantApp ? merchantApp.merchantId || '' : ''),
      loggedIn: !!prev.loggedIn,
      loginType: prev.loginType || '',
      loginTime: prev.loginTime || ''
    },
    orders: arr(remote.orders, d.orders),
    cars,
    currentCarId: remote.currentCarId || (cars[0] ? cars[0].id : ''),
    coupons: arr(remote.coupons, []),
    merchantApplications: apps,
    enterpriseApplications: arr(remote.enterpriseApplications, []),
    invoices: arr(remote.invoices, []),
    feedbacks: arr(remote.feedbacks, []),
    searchHistory: arr(remote.searchHistory, []),
    settings: obj(remote.settings, d.settings),
    city: remote.city || d.city,
    location: obj(remote.location, d.location),
    dynamicMerchants: arr(remote.dynamicMerchants, []),
    pointsLog: arr(remote.pointsLog, []),
    redemptions: arr(remote.redemptions, []),
    invite,
    freeUsage: freeUsage && freeUsage.month ? freeUsage : d.freeUsage,
    messages: arr(remote.messages, []),
    lastOrderId: remote.lastOrderId || ''
  })
  saveState()
  suppressPersist = false
  return true
}

export function resetState() {
  storageLocked = false
  storageInfo = { locked: false, storedSchema: SCHEMA_VERSION, currentSchema: SCHEMA_VERSION }
  Object.assign(state, defaultState())
  saveState()
}

export function getStorageInfo() {
  return { ...storageInfo, locked: storageLocked }
}

export function isStorageLocked() {
  return storageLocked
}

// 清除本机全部数据（用于数据版本过高时恢复可用）
export function clearLocalData() {
  try {
    uni.clearStorageSync()
  } catch (e) {
    // 忽略
  }
  storageLocked = false
  storageInfo = { locked: false, storedSchema: SCHEMA_VERSION, currentSchema: SCHEMA_VERSION }
  Object.assign(state, defaultState())
}

/* ---------- 派生数据 ---------- */
export function currentCar() {
  return state.cars.find(c => c.id === state.currentCarId) || state.cars[0] || null
}

export function memberInfo() {
  const tier = MEMBER_TIERS.find(t => t.id === state.user.memberTier)
  return {
    active: state.user.memberTier !== 'none' && !!tier,
    tier,
    name: tier ? tier.name : '未开通会员',
    expire: state.user.memberExpire
  }
}

function couponExpired(c) {
  if (!c || !c.expire) return false
  const t = new Date(String(c.expire).replace(/-/g, '/') + ' 23:59:59').getTime()
  return t < Date.now()
}

export function couponCount() {
  return state.coupons.filter(c => c.status === 'unused' && !couponExpired(c)).length
}

export function refreshCouponStatus() {
  let changed = false
  state.coupons.forEach(c => {
    if (c.status === 'unused' && couponExpired(c)) {
      c.status = 'expired'
      changed = true
    }
  })
  if (changed) saveState()
}

/* ---------- 登录 ---------- */
function maskPhone(phone) {
  return phone.replace(/^(\d{3})\d{4}(\d{4})$/, '$1****$2')
}

// 按手机号匹配已通过的入驻申请，升级/恢复商家角色
function applyMerchantRole(phone) {
  const raw = String(phone || '').trim()
  const app = state.merchantApplications.find(
    a => a.status === 'approved' && (a.ownerPhone === raw || a.phone === raw)
  )
  if (app) {
    state.user.role = 'merchant'
    state.user.merchantAppId = app.id
    state.user.merchantId = app.merchantId || ''
    return true
  }
  state.user.role = 'user'
  state.user.merchantAppId = ''
  state.user.merchantId = ''
  return false
}

export function login(phone, code = '') {
  const raw = String(phone || '').trim()
  if (!/^1\d{10}$/.test(raw)) return false
  state.user.loggedIn = true
  state.user.loginType = 'sms'
  state.user.loginTime = formatNow()
  state.user.phoneRaw = raw
  state.user.phone = maskPhone(raw)
  state.user.name = '车主 ' + raw.slice(-4)
  applyMerchantRole(raw)
  saveState()
  // 启用后端时由同步层换取令牌并拉取云端数据
  if (cloudHooks.login) cloudHooks.login({ type: 'sms', phone: raw, code })
  return true
}

// 商家端登录：只允许已通过审核的商家账号
export function loginAsMerchant(phone, code = '') {
  const raw = String(phone || '').trim()
  if (!/^1\d{10}$/.test(raw)) return { ok: false, reason: 'phone' }
  const app = state.merchantApplications.find(
    a => a.status === 'approved' && (a.ownerPhone === raw || a.phone === raw)
  )
  if (!app) return { ok: false, reason: 'not-merchant' }

  login(raw, code)
  state.user.role = 'merchant'
  state.user.merchantAppId = app.id
  state.user.merchantId = app.merchantId || ''
  saveState()
  return { ok: true, app }
}

export function loginWechat() {
  state.user.loggedIn = true
  state.user.loginType = 'wechat'
  state.user.loginTime = formatNow()
  if (!/^1\d{10}$/.test(state.user.phoneRaw || '')) {
    state.user.phoneRaw = '13800008899'
    state.user.phone = '138****8899'
  }
  state.user.name = '微信车主'
  applyMerchantRole(state.user.phoneRaw)
  saveState()
  if (cloudHooks.login) {
    cloudHooks.login({ type: 'wechat', phone: state.user.phoneRaw })
  }
  pushMessage({
    title: '微信登录成功',
    desc: '已通过微信授权登录车管家',
    type: 'system',
    target: '/pages/index/index'
  })
  return true
}

export function logout() {
  state.user.loggedIn = false
  state.user.loginType = ''
  saveState()
  if (cloudHooks.logout) cloudHooks.logout()
}

/* ---------- 个人资料与设置 ---------- */
export function updateProfile(patch) {
  if (patch.name) state.user.name = patch.name
  if (patch.avatar) state.user.avatar = patch.avatar
  if (patch.phone && /^1\d{10}$/.test(patch.phone)) {
    state.user.phoneRaw = patch.phone
    state.user.phone = maskPhone(patch.phone)
  }
  saveState()
}

export function toggleSetting(key) {
  state.settings[key] = !state.settings[key]
  saveState()
}

export function setCity(city, location) {
  state.city = city
  if (location && location.lng != null && location.lat != null) {
    state.location = {
      lng: location.lng,
      lat: location.lat,
      source: 'gps',
      updatedAt: formatNow()
    }
  } else {
    state.location = {
      ...state.location,
      source: 'manual',
      updatedAt: formatNow()
    }
  }
  saveState()
}

/* ---------- 搜索历史 ---------- */
export function addSearchKeyword(kw) {
  const key = String(kw || '').trim()
  if (!key) return
  state.searchHistory = [key, ...state.searchHistory.filter(x => x !== key)].slice(0, 10)
  saveState()
}

export function clearSearchHistory() {
  state.searchHistory = []
  saveState()
}

/* ---------- 发票 ---------- */
export function applyInvoice(payload) {
  const inv = {
    id: 'INV' + Date.now(),
    orderIds: payload.orderIds || [],
    orderTitle: payload.orderTitle || '',
    amount: Number(payload.amount) || 0,
    type: payload.type || 'personal',
    title: payload.title || '',
    taxNo: payload.taxNo || '',
    email: payload.email || '',
    status: 'issuing',
    createTime: formatNow()
  }
  state.invoices.unshift(inv)
  saveState()
  pushMessage({
    title: '发票申请已提交',
    desc: `${inv.title} · ¥${inv.amount}，平台将在 1-3 个工作日内开具`,
    type: 'system',
    target: '/pages/invoice/index'
  })
  return inv
}

/* ---------- 意见反馈 ---------- */
export function submitFeedback(payload) {
  const fb = {
    id: 'FB' + Date.now(),
    type: payload.type || '功能建议',
    content: payload.content || '',
    contact: payload.contact || '',
    images: payload.images || [],
    status: 'pending',
    createTime: formatNow()
  }
  state.feedbacks.unshift(fb)
  saveState()
  pushMessage({
    title: '反馈已收到',
    desc: '感谢您的反馈，客服会尽快处理',
    type: 'system',
    target: '/pages/support/index'
  })
  return fb
}

export function clearAllData() {
  resetState()
}

/* ---------- 企业会员申请 ---------- */
export function applyEnterprise(payload) {
  const app = {
    id: 'EA' + Date.now(),
    company: payload.company || '',
    creditCode: payload.creditCode || '',
    contact: payload.contact || '',
    phone: payload.phone || '',
    carCount: payload.carCount || 1,
    invoiceTitle: payload.invoiceTitle || '',
    address: payload.address || '',
    status: 'reviewing',
    submitTime: formatNow(),
    reviewTime: ''
  }
  state.enterpriseApplications.unshift(app)
  saveState()
  pushMessage({
    title: '企业认证已提交',
    desc: `${app.company} 的企业认证申请正在审核中`,
    type: 'member',
    target: '/pages/enterprise/apply'
  })
  return app
}

export function approveEnterprise(id) {
  const app = state.enterpriseApplications.find(a => a.id === id)
  if (!app || app.status !== 'reviewing') return app
  app.status = 'approved'
  app.reviewTime = formatNow()
  const d = new Date()
  d.setFullYear(d.getFullYear() + 1)
  const expire = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  activateMember('enterprise', expire)
  saveState()
  pushMessage({
    title: '企业认证已通过',
    desc: `${app.company} 已成为企业 VIP，5 台车统一托管`,
    type: 'member',
    target: '/pages/enterprise/index'
  })
  return app
}

export function currentEnterpriseApplication() {
  return state.enterpriseApplications[0] || null
}

/* ---------- 会员 ---------- */
export function activateMember(tierId, expire) {
  state.user.memberTier = tierId
  state.user.memberExpire = expire
  state.coupons.unshift({
    id: 'cp' + Date.now(),
    name: '新会员专享券',
    amount: 100,
    threshold: 300,
    expire,
    scope: '全场通用',
    status: 'unused',
    claimedAt: formatNow()
  })
  saveState()
  pushMessage({
    title: '会员开通成功',
    desc: '会员权益已生效，并赠送一张新会员专享券',
    type: 'member',
    target: '/pages/member/index'
  })
}

/* ---------- 订单 ---------- */
export function createOrder(payload) {
  const id = 'O' + Date.now()
  const order = {
    id,
    serviceId: payload.serviceId || 'maintain',
    title: payload.title || '服务订单',
    merchant: payload.merchant || '车管家服务中心',
    amount: payload.amount != null ? Number(payload.amount) : 0,
    originalAmount: payload.originalAmount != null ? Number(payload.originalAmount) : Number(payload.amount) || 0,
    discount: payload.discount || 0,
    priceDetail: payload.priceDetail || null,
    couponId: payload.couponId || '',
    couponName: payload.couponName || '',
    pointsUsed: payload.pointsUsed || 0,
    freeApplied: !!payload.freeApplied,
    status: payload.status || 'pending',
    createTime: formatNow(),
    car: payload.car || (currentCar() ? currentCar().plate : '未绑定车辆'),
    icon: payload.icon || '🧾',
    gradient: payload.gradient || 'linear-gradient(135deg,#FF8A4C,#FF4E1E)',
    payLabel: payload.payLabel || '待支付',
    booking: payload.booking || null,
    review: null,
    timeline: payload.timeline || [
      { text: '订单已创建', time: formatNow(), done: true },
      { text: '等待支付', time: '', done: false }
    ]
  }
  state.orders.unshift(order)
  state.lastOrderId = id
  saveState()
  pushMessage({
    title: order.status === 'pending' ? '订单已创建' : '订单已提交',
    desc: order.status === 'pending'
      ? `${order.title}，请尽快完成支付`
      : `${order.title} 已提交，等待商家接单`,
    type: 'order',
    target: order.status === 'pending'
      ? '/pages/pay/index?orderId=' + id
      : '/pages/order/detail?id=' + id
  })
  return order
}

export function payOrder(id, method = 'wechat') {
  const order = state.orders.find(o => o.id === id)
  if (!order || order.status !== 'pending') return order

  order.status = 'waiting'
  order.payLabel = order.amount === 0 ? '无需支付' : method === 'store' ? '到店支付' : '已支付'
  order.payMethod = method
  order.payTime = formatNow()

  if (order.couponId) {
    const c = state.coupons.find(x => x.id === order.couponId)
    if (c && c.status === 'unused') {
      c.status = 'used'
      c.usedAt = formatNow()
    }
  }

  if (order.pointsUsed) {
    state.user.points = Math.max(0, state.user.points - order.pointsUsed)
  }
  if (order.amount > 0) {
    const earned = Math.floor(order.amount)
    state.user.points += earned
    addPointsLog('订单支付返积分', earned)
  }
  if (order.freeApplied) {
    state.freeUsage = { month: monthKey(), type: order.serviceId }
  }

  const payText = order.amount === 0
    ? '订单已提交，等待商家接单'
    : method === 'store'
      ? '到店支付，等待商家接单'
      : '支付成功，等待商家接单'
  order.timeline = [
    { text: '订单已提交', time: order.createTime, done: true },
    { text: payText, time: formatNow(), done: true },
    { text: '等待商家接单', time: '', done: false }
  ]
  saveState()
  pushMessage({
    title: '支付成功',
    desc: `${order.title} 已提交，正在等待商家接单`,
    type: 'order',
    target: '/pages/order/detail?id=' + id
  })
  return order
}

/* 演示用：模拟商家接单（当前没有真实商家在线） */
export function acceptOrder(id) {
  const order = state.orders.find(o => o.id === id)
  if (!order || order.status !== 'waiting') return order
  order.status = 'serving'
  order.payLabel = '服务中'
  order.acceptTime = formatNow()
  order.timeline = order.timeline.filter(t => t.done)
  order.timeline.push({ text: '商家已接单，服务进行中', time: formatNow(), done: true })
  order.timeline.push({ text: '等待服务完成', time: '', done: false })
  saveState()
  pushMessage({
    title: '商家已接单',
    desc: `${order.title} 正在服务中`,
    type: 'order',
    target: '/pages/order/detail?id=' + id
  })
  return order
}

/* 演示用：模拟服务完成 */
export function finishOrder(id) {
  const order = state.orders.find(o => o.id === id)
  if (!order) return order
  if (order.status !== 'serving') return order
  order.status = 'review'
  order.payLabel = '待评价'
  order.finishTime = formatNow()
  order.timeline = order.timeline.filter(t => t.done)
  order.timeline.push({ text: '服务已完成，等待评价', time: formatNow(), done: true })
  saveState()
  pushMessage({
    title: '服务已完成',
    desc: `${order.title} 已完成，期待您的评价`,
    type: 'order',
    target: '/pages/review/index?orderId=' + id
  })
  return order
}

export function cancelOrder(id) {
  const order = state.orders.find(o => o.id === id)
  if (!order) return order
  if (!['pending', 'waiting'].includes(order.status)) return order
  const wasPaid = order.status === 'waiting' && order.payMethod !== 'store' && order.amount > 0
  order.status = 'canceled'
  order.payLabel = wasPaid ? '已退款' : '已取消'
  order.cancelTime = formatNow()
  order.timeline = order.timeline.filter(t => t.done)
  order.timeline.push({
    text: wasPaid ? `订单已取消，¥${order.amount} 已原路退回（模拟）` : '订单已取消',
    time: formatNow(),
    done: true
  })
  saveState()
  pushMessage({
    title: '订单已取消',
    desc: wasPaid ? `${order.title} 已取消，退款将原路退回（模拟）` : `${order.title} 已取消`,
    type: 'order',
    target: '/pages/order/detail?id=' + id
  })
  return order
}

export function submitReview(id, review) {
  const order = state.orders.find(o => o.id === id)
  if (!order || order.status !== 'review') return order
  order.status = 'done'
  order.payLabel = '已完成'
  order.review = { ...review, date: formatNow() }
  order.timeline.push({ text: '已评价，订单完成', time: formatNow(), done: true })
  saveState()
  return order
}

/* ---------- 消息中心 ---------- */
export function pushMessage(msg) {
  state.messages.unshift({
    id: 'msg' + Date.now() + Math.random().toString(36).slice(2, 6),
    type: msg.type || 'system',
    title: msg.title || '',
    desc: msg.desc || '',
    target: msg.target || '',
    read: false,
    time: formatNow()
  })
  if (state.messages.length > 60) state.messages.length = 60
  saveState()
}

export function unreadCount() {
  return state.messages.filter(m => !m.read).length
}

export function markMessageRead(id) {
  const m = state.messages.find(x => x.id === id)
  if (!m || m.read) return
  m.read = true
  saveState()
}

export function markAllMessagesRead() {
  state.messages.forEach(m => { m.read = true })
  saveState()
}

/* ---------- 优惠券领取 ---------- */
export function claimCoupon(template) {
  const exists = state.coupons.some(c => c.id === template.id)
  if (exists) return false
  state.coupons.push({ ...clone(template), status: 'unused', claimedAt: formatNow() })
  saveState()
  pushMessage({
    title: '优惠券已到账',
    desc: `${template.name} 已放入卡包，满 ${template.threshold} 可用`,
    type: 'coupon',
    target: '/pages/coupon/index'
  })
  return true
}

export function canClaimCoupon(template) {
  return !state.coupons.some(c => c.id === template.id)
}

/* ---------- 积分 ---------- */
function addPointsLog(title, amount) {
  state.pointsLog.unshift({
    id: 'pl' + Date.now() + Math.random().toString(36).slice(2, 5),
    title,
    amount,
    time: formatNow()
  })
  if (state.pointsLog.length > 100) state.pointsLog.length = 100
}

/**
 * 积分商城兑换
 * @param {object} goods 商品（含 cost，可选 coupon 模板）
 */
export function redeemGoods(goods) {
  const cost = Number(goods.cost) || 0
  if (!cost) return { ok: false, reason: 'invalid' }
  if (state.user.points < cost) return { ok: false, reason: 'points' }

  state.user.points -= cost

  let coupon = null
  if (goods.coupon) {
    coupon = {
      id: 'cp_redeem_' + Date.now(),
      name: goods.coupon.name,
      amount: goods.coupon.amount,
      threshold: goods.coupon.threshold || 0,
      expire: goods.coupon.expire,
      scope: goods.coupon.scope || '全场通用',
      status: 'unused',
      claimedAt: formatNow(),
      source: 'points'
    }
    state.coupons.unshift(coupon)
  }

  const record = {
    id: 'RD' + Date.now(),
    goodsId: goods.id,
    name: goods.name,
    cost,
    status: 'done',
    time: formatNow()
  }
  state.redemptions.unshift(record)

  addPointsLog('兑换 ' + goods.name, -cost)
  saveState()
  pushMessage({
    title: '积分兑换成功',
    desc: coupon ? `${goods.name} 已到账，优惠券已放入卡包` : `${goods.name} 兑换成功`,
    type: 'coupon',
    target: coupon ? '/pages/coupon/index' : '/pages/points/index'
  })

  return { ok: true, coupon, record }
}

/* ---------- 邀请有礼 ---------- */
// 规则：服务端为准（配置 VITE_API_BASE 时由 server/invite 校验绑定与领奖）；
// 纯本地模式用同一套上限/去重规则演示，避免重复计数。
const INVITE_SIM_SEQ_KEY = 'cgj_invite_sim_seq'

/** 补齐旧数据的邀请字段，并保证本地邀请码存在（随机生成，不含手机号） */
export function ensureInviteState() {
  if (!state.invite || typeof state.invite !== 'object') {
    state.invite = { count: 0, records: [], claimed: [], code: '', bound: null }
  }
  const inv = state.invite
  if (typeof inv.count !== 'number' || !Number.isFinite(inv.count)) inv.count = 0
  if (!Array.isArray(inv.records)) inv.records = []
  if (!Array.isArray(inv.claimed)) inv.claimed = []
  if (typeof inv.code !== 'string') inv.code = ''
  if (!inv.bound || typeof inv.bound !== 'object') inv.bound = null
  if (!inv.code) {
    inv.code = generateInviteCode()
    saveState()
  }
  return inv
}

// 本地唯一标识：使用设备标识（同一设备/手机号/账号视为同一人，与活动规则一致）
function localInviteKey() {
  return 'device:' + getDeviceId()
}

function inviteDayKey(time) {
  return String(time || '').slice(0, 10)
}

function inviteMonthKey(time) {
  return String(time || '').slice(0, 7)
}

// 被邀请人欢迎奖励：与前端"双方各得"文案一致，只在首次绑定发放
function grantInviteeWelcome() {
  const w = INVITEE_WELCOME
  if (!w) return
  if (w.points) {
    state.user.points += w.points
    addPointsLog('受邀注册奖励', w.points)
  }
  if (w.coupon) {
    state.coupons.unshift({
      ...clone(w.coupon),
      id: 'cp_invite_welcome_' + Date.now(),
      status: 'unused',
      claimedAt: formatNow(),
      source: 'invite'
    })
  }
}

/**
 * 本地模式绑定邀请人（服务端模式由 src/api/invite.js 调接口）
 * 一个被邀请人只能绑定一个邀请人；重复扫码返回 already，不重复发奖
 */
export function bindInviterLocally(code) {
  const inv = ensureInviteState()
  const c = normalizeInviteCode(code)
  if (!c) return { ok: false, reason: 'code', message: '邀请码格式不正确' }
  if (inv.code === c) return { ok: false, reason: 'self', message: '不能邀请自己' }

  const key = localInviteKey()
  const bindings = readLocalBindings()
  if (bindings[key]) {
    const bound = { code: bindings[key].code, time: bindings[key].time }
    inv.bound = bound
    saveState()
    return { ok: true, already: true, bound, message: '当前账号已绑定过邀请人' }
  }

  const now = formatNow()
  bindings[key] = { code: c, time: now }
  writeLocalBindings(bindings)
  inv.bound = { code: c, time: now }
  grantInviteeWelcome()
  saveState()
  pushMessage({
    title: '受邀奖励已到账',
    desc: '20 元通用券 + 200 积分已发放到账户',
    type: 'coupon',
    target: '/pages/invite/index'
  })
  return { ok: true, already: false, bound: inv.bound }
}

// 演示用：模拟一位新好友通过邀请码注册
// 每次生成不同的被邀请人身份；每日/每月上限与云端一致，同一天不会无限刷
export function simulateInvite() {
  const inv = ensureInviteState()
  const now = formatNow()
  const day = inviteDayKey(now)
  const month = inviteMonthKey(now)
  const dayCount = inv.records.filter(r => inviteDayKey(r.time) === day).length
  const monthCount = inv.records.filter(r => inviteMonthKey(r.time) === month).length

  if (dayCount >= INVITE_LIMITS.daily) {
    return { ok: false, reason: 'daily-limit', message: `今日最多计入 ${INVITE_LIMITS.daily} 位好友` }
  }
  if (monthCount >= INVITE_LIMITS.monthly) {
    return { ok: false, reason: 'monthly-limit', message: `本月最多计入 ${INVITE_LIMITS.monthly} 位好友` }
  }

  // 身份序号自增，且跳过已出现过的身份，保证每次都是新的被邀请人
  const used = new Set(inv.records.map(r => r.inviteeKey).filter(Boolean))
  let seq = 0
  try { seq = Number(uni.getStorageSync(INVITE_SIM_SEQ_KEY)) || 0 } catch (e) { seq = 0 }
  let identity = ''
  do {
    seq += 1
    identity = 'sim:' + seq
  } while (used.has(identity))
  try { uni.setStorageSync(INVITE_SIM_SEQ_KEY, seq) } catch (e) { /* 忽略 */ }

  inv.count += 1
  inv.records.unshift({
    id: 'inv' + Date.now() + Math.random().toString(36).slice(2, 5),
    name: '好友 ' + generateInviteCode().slice(-2) + '**',
    time: now,
    done: true,
    inviteeKey: identity,
    source: 'demo'
  })
  saveState()
  pushMessage({
    title: '邀请成功',
    desc: `好友通过你的邀请码注册，当前已邀请 ${inv.count} 人`,
    type: 'system',
    target: '/pages/invite/index'
  })
  return { ok: true, count: inv.count, identity }
}

// 领取邀请阶梯奖励（本地模式幂等：同一奖励只发一次）
export function claimInviteReward(reward) {
  const inv = ensureInviteState()
  if (!reward) return { ok: false, reason: 'invalid' }
  if (inv.claimed.includes(reward.id)) return { ok: false, reason: 'claimed' }
  if (inv.count < reward.need) return { ok: false, reason: 'not-ready' }

  if (reward.points) {
    state.user.points += reward.points
    addPointsLog('邀请奖励', reward.points)
  }

  if (reward.coupon) {
    state.coupons.unshift({
      id: 'cp_invite_' + Date.now(),
      name: reward.coupon.name,
      amount: reward.coupon.amount,
      threshold: reward.coupon.threshold || 0,
      expire: reward.coupon.expire,
      scope: reward.coupon.scope || '全场通用',
      status: 'unused',
      claimedAt: formatNow(),
      source: 'invite'
    })
  }

  if (reward.member) {
    if (state.user.memberTier === 'enterprise') {
      // 企业会员不降级，改为等值通用券
      state.coupons.unshift({
        id: 'cp_invite_' + Date.now(),
        name: '100元通用券',
        amount: 100,
        threshold: 300,
        expire: '2027-06-30',
        scope: '全场通用',
        status: 'unused',
        claimedAt: formatNow(),
        source: 'invite'
      })
    } else {
      const d = new Date()
      d.setFullYear(d.getFullYear() + 1)
      const p = n => String(n).padStart(2, '0')
      const expire = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
      activateMember('premium', expire)
    }
  }

  if (!inv.claimed.includes(reward.id)) inv.claimed.push(reward.id)
  saveState()
  pushMessage({
    title: '邀请奖励已到账',
    desc: reward.title + ' 已发放',
    type: 'coupon',
    target: '/pages/invite/index'
  })
  return { ok: true }
}

/* ---------- 商家入驻 ---------- */
function coordOrNull(v) {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export function applyMerchant(payload) {
  const app = {
    id: 'MA' + Date.now(),
    name: payload.name || '',
    type: payload.type || '',
    tier: payload.tier || 'free',
    contact: payload.contact || '',
    phone: payload.phone || '',
    ownerPhone: state.user.phoneRaw || payload.phone || '',
    city: payload.city || state.city || '北京',
    hours: payload.hours || '09:00 - 21:00',
    open: true,
    address: payload.address || '',
    // 入驻时由商户搜索/定位得到，审核通过后用于地图展示
    lng: coordOrNull(payload.lng),
    lat: coordOrNull(payload.lat),
    licenseImage: payload.licenseImage || '',
    intro: payload.intro || '',
    status: 'reviewing',
    submitTime: formatNow(),
    reviewTime: '',
    reason: '',
    merchantId: ''
  }
  state.merchantApplications.unshift(app)
  saveState()
  pushMessage({
    title: '入驻申请已提交',
    desc: `${app.name} 的入驻申请已提交，平台将在 1 个工作日内审核`,
    type: 'merchant',
    target: '/pages/merchant/apply?id=' + app.id
  })
  return app
}

/* 演示用：模拟平台审核 */
function buildMerchantFromApp(app, city) {
  const tier = MERCHANT_TIERS.find(t => t.id === app.tier)
  return {
    id: app.merchantId,
    name: app.name,
    city: city || app.city || '北京',
    emoji: '🏪',
    gradient: 'linear-gradient(135deg,#D8B06A,#A97C2F)',
    rating: 5.0,
    distance: '—',
    tier: tier ? tier.name : '免费入驻',
    tierColor: '#B98A3C',
    orders: 0,
    tags: [app.type || '汽车服务'],
    address: app.address,
    lng: coordOrNull(app.lng),
    lat: coordOrNull(app.lat),
    hours: app.hours || '09:00 - 21:00',
    promo: '新店开业 · 欢迎体验',
    ownerPhone: app.ownerPhone || app.phone,
    open: true
  }
}

export function approveMerchant(id) {
  const app = state.merchantApplications.find(a => a.id === id)
  if (!app || app.status !== 'reviewing') return app
  app.status = 'approved'
  app.reviewTime = formatNow()
  if (!app.merchantId) {
    app.merchantId = 'dm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5)
  }
  // 生成可接单的商家记录
  if (!state.dynamicMerchants.some(m => m.id === app.merchantId)) {
    state.dynamicMerchants.push(buildMerchantFromApp(app, app.city))
  }
  // 原账号升级为商家账号
  if (!app.ownerPhone || state.user.phoneRaw === app.ownerPhone) {
    state.user.role = 'merchant'
    state.user.merchantAppId = app.id
    state.user.merchantId = app.merchantId
  }
  saveState()
  pushMessage({
    title: '入驻审核通过',
    desc: `${app.name} 已通过审核，账号已升级为商家账号`,
    type: 'merchant',
    target: '/pages/merchant/center'
  })
  return app
}

export function rejectMerchant(id, reason = '资质材料不完整，请补充后重新提交') {
  const app = state.merchantApplications.find(a => a.id === id)
  if (!app || app.status !== 'reviewing') return app
  app.status = 'rejected'
  app.reviewTime = formatNow()
  app.reason = reason
  saveState()
  pushMessage({
    title: '入驻审核未通过',
    desc: reason,
    type: 'merchant',
    target: '/pages/merchant/apply?id=' + app.id
  })
  return app
}

export function currentMerchantApplication() {
  return state.merchantApplications[0] || null
}

// 当前登录商家对应的已通过申请
export function approvedMerchantApp() {
  const byId = state.merchantApplications.find(
    a => a.id === state.user.merchantAppId && a.status === 'approved'
  )
  if (byId) return byId
  return state.merchantApplications.find(a => a.status === 'approved') || null
}

// 全部商家（动态入驻 + 静态样例）
export function allMerchants() {
  return [...state.dynamicMerchants, ...MERCHANTS]
}

export function merchantsInCity(city) {
  return allMerchants().filter(m => (m.city || '北京') === city)
}

export function findMerchant(id) {
  return allMerchants().find(m => m.id === id) || null
}

export function ordersForMerchant(app) {
  if (!app) return []
  return state.orders.filter(o => o.merchant === app.name)
}

// 商家修改店铺资料（本地模拟）
export function updateMerchantShop(patch) {
  const app = approvedMerchantApp()
  if (!app) return null
  const fields = ['name', 'address', 'phone', 'hours', 'open', 'intro', 'lng', 'lat']
  fields.forEach(k => {
    if (patch[k] !== undefined) app[k] = patch[k]
  })
  const m = state.dynamicMerchants.find(x => x.id === app.merchantId)
  if (m) {
    if (patch.name !== undefined) m.name = patch.name
    if (patch.address !== undefined) m.address = patch.address
    if (patch.hours !== undefined) m.hours = patch.hours
    if (patch.open !== undefined) m.open = patch.open
    if (patch.lng !== undefined) m.lng = patch.lng
    if (patch.lat !== undefined) m.lat = patch.lat
  }
  saveState()
  return app
}

export function updateMerchantApplication(id, patch) {
  const app = state.merchantApplications.find(a => a.id === id)
  if (!app) return app
  Object.assign(app, patch)
  saveState()
  return app
}

/* ---------- 车辆 ---------- */
export function addCar(car) {
  const item = {
    id: 'c' + Date.now(),
    plate: car.plate,
    brand: car.brand,
    mileage: Number(car.mileage) || 0,
    color: car.color || '未填写',
    insuranceEnd: car.insuranceEnd || '未填写',
    annualEnd: car.annualEnd || '未填写',
    emoji: car.emoji || '🚗',
    gradient: 'linear-gradient(135deg,#3A4B63,#141D2B)',
    licenseImage: car.licenseImage || '',
    insuranceImage: car.insuranceImage || ''
  }
  state.cars.push(item)
  if (!state.currentCarId) state.currentCarId = item.id
  saveState()
  return item
}

export function setCurrentCar(id) {
  state.currentCarId = id
  saveState()
}

export function updateCar(id, patch) {
  const car = state.cars.find(c => c.id === id)
  if (!car) return car
  Object.assign(car, patch)
  saveState()
  return car
}

export function removeCar(id) {
  const idx = state.cars.findIndex(c => c.id === id)
  if (idx === -1) return false
  state.cars.splice(idx, 1)
  if (state.currentCarId === id) {
    state.currentCarId = state.cars[0] ? state.cars[0].id : ''
  }
  saveState()
  return true
}

/* ---------- 工具 ---------- */
export function formatNow() {
  const d = new Date()
  const p = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

export function daysUntil(dateStr) {
  const target = new Date(String(dateStr).replace(/-/g, '/'))
  if (isNaN(target.getTime())) return null
  const diff = target.getTime() - Date.now()
  return Math.ceil(diff / 86400000)
}

export function orderStatusText(status) {
  return ORDER_STATUS[status] || '未知'
}

export function go(url) {
  uni.navigateTo({
    url,
    fail: () => uni.redirectTo({ url })
  })
}

export function toast(title, icon = 'none') {
  uni.showToast({ title, icon, duration: 1800 })
}
