<template>
  <view class="page">
    <PageHeader title="附近门店" />

    <!-- 分类 -->
    <scroll-view class="cats" scroll-x :show-scrollbar="false">
      <view class="cats-inner">
        <view
          v-for="c in categories"
          :key="c.id"
          class="cat"
          :class="{ on: category === c.id }"
          @click="switchCategory(c.id)"
        >
          <text class="cat-ico">{{ c.icon }}</text>
          <text class="cat-name">{{ c.name }}</text>
        </view>
      </view>
    </scroll-view>

    <!-- 定位状态 -->
    <view class="loc-bar">
      <view class="loc-main">
        <text class="loc-ico">📍</text>
        <view class="loc-text">
          <text class="loc-city">{{ locCity }}</text>
          <text class="loc-tip">{{ locTip }}</text>
        </view>
      </view>
      <view class="loc-btn" @click="relocate">
        <text>{{ locating ? '定位中…' : '重新定位' }}</text>
      </view>
    </view>

    <!-- 数据来源提示 -->
    <view v-if="source === 'demo'" class="demo-tip">
      <text class="demo-ico">ℹ️</text>
      <text class="demo-text">当前为演示数据：在后端配置高德 Key 后自动显示真实门店。</text>
    </view>

    <!-- 列表 -->
    <view v-if="loading && !items.length" class="loading">
      <text>正在查询附近门店…</text>
    </view>

    <view v-else-if="!items.length" class="empty">
      <text class="empty-ico">🗺️</text>
      <text class="empty-title">附近暂未找到门店</text>
      <text class="empty-desc">换个分类或稍后重试</text>
    </view>

    <view v-else class="list">
      <view v-for="p in items" :key="p.id" class="shop card">
        <view class="shop-head">
          <view class="shop-name-wrap">
            <text class="shop-name ellipsis">{{ p.name }}</text>
            <view class="shop-tags">
              <text v-if="p.platform" class="tag platform">平台认证</text>
              <text v-if="p.rating" class="tag rating">★ {{ p.rating }}</text>
              <text v-for="t in (p.tags || []).slice(0, 3)" :key="t" class="tag">{{ t }}</text>
            </view>
          </view>
          <text v-if="p.distance" class="shop-distance">{{ fmtDistance(p.distance) }}</text>
        </view>

        <text class="shop-address">{{ p.address || '地址暂未提供' }}</text>

        <view class="shop-actions">
          <view class="act ghost" @click="callShop(p)">
            <text>电话</text>
          </view>
          <view class="act ghost" @click="openMap(p)">
            <text>导航</text>
          </view>
          <view v-if="bookable" class="act primary" @click="p.platform ? bookShop(p) : goBook()">
            <text>平台预约</text>
          </view>
        </view>
      </view>
    </view>

    <view class="footer-tip">
      <text>门店数据由高德地图提供，仅用于信息查询与导航；价格、预约与交易以门店实际为准。</text>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import PageHeader from '@/components/PageHeader.vue'
import { state, merchantsInCity, go, toast } from '@/store/index'
import { requestLocation, findCity, distanceKm } from '@/utils/location'
import { NEARBY_CATEGORIES, SERVICE_POI_CATEGORY } from '@/data/nearby.mjs'
import { fetchNearby } from '@/api/integrations'

const categories = NEARBY_CATEGORIES
const category = ref('wash')
const coords = ref(null)
const locCity = ref(state.city)
const locating = ref(false)
const locTip = ref('正在定位…')
const poiItems = ref([])
const source = ref('')
const loading = ref(false)

const bookable = computed(() => ['wash', 'maintain'].includes(category.value))

// 平台入驻商家（入驻时已在地图上标好坐标）排在第三方 POI 前面
const CATEGORY_KEYWORDS = {
  wash: ['洗车', '美容'],
  maintain: ['维修', '保养', '轮胎', '汽修', '机修'],
  rescue: ['救援', '拖车', '搭电'],
  charge: ['充电'],
  fuel: ['加油'],
  parking: ['停车']
}

function matchesCategory(m) {
  const text = `${m.name || ''} ${m.type || ''} ${(m.tags || []).join(' ')}`
  const kws = CATEGORY_KEYWORDS[category.value] || []
  return kws.some(k => text.includes(k))
}

const platformShops = computed(() => {
  const c = coords.value
  if (!c) return []
  return merchantsInCity(state.city)
    .filter(m => m.lng != null && m.lat != null && matchesCategory(m))
    .map(m => ({
      id: 'pm_' + m.id,
      merchantId: m.id,
      platform: true,
      name: m.name,
      address: m.address || '',
      tel: m.phone || '',
      lng: Number(m.lng),
      lat: Number(m.lat),
      distance: distanceKm(c.lng, c.lat, Number(m.lng), Number(m.lat)) * 1000,
      rating: m.rating || null,
      tags: (m.tags || []).slice(0, 2)
    }))
    .sort((a, b) => a.distance - b.distance)
})

const items = computed(() => {
  const names = new Set(platformShops.value.map(p => p.name))
  return [...platformShops.value, ...poiItems.value.filter(p => !names.has(p.name))]
})

onLoad(options => {
  if (options && options.category && NEARBY_CATEGORIES.some(c => c.id === options.category)) {
    category.value = options.category
  } else if (options && options.serviceId && SERVICE_POI_CATEGORY[options.serviceId]) {
    category.value = SERVICE_POI_CATEGORY[options.serviceId]
  }
  initLocation()
})

async function initLocation() {
  locating.value = true
  locTip.value = '正在定位…'
  const res = await requestLocation()
  locating.value = false

  if (res.lng != null && res.lat != null) {
    coords.value = { lng: res.lng, lat: res.lat }
    locCity.value = res.city || state.city
    locTip.value = res.ok ? '已使用当前位置' : '已使用当前位置（距离较远）'
  } else {
    const c = findCity(state.city)
    if (c) {
      locCity.value = state.city
      coords.value = { lng: c.lng, lat: c.lat }
      locTip.value = '定位失败，使用' + state.city + '市中心'
    } else {
      locTip.value = '定位失败，请开启定位权限后重试'
      return
    }
  }
  load()
}

function relocate() {
  if (locating.value) return
  initLocation()
}

function fmtDistance(m) {
  const d = Number(m)
  if (!Number.isFinite(d)) return ''
  return d < 1000 ? Math.round(d) + 'm' : (d / 1000).toFixed(1) + 'km'
}

// 请求序号：切换分类/重新定位时丢弃旧请求的结果，避免列表与标签不一致
let reqSeq = 0

async function load() {
  if (!coords.value) return
  const seq = ++reqSeq
  loading.value = true
  const res = await fetchNearby({
    category: category.value,
    lng: coords.value.lng,
    lat: coords.value.lat
  })
  if (seq !== reqSeq) return
  poiItems.value = res.items || []
  source.value = res.source
  loading.value = false
}

function switchCategory(id) {
  if (category.value === id) return
  category.value = id
  load()
}

function goBook() {
  const serviceId = category.value === 'maintain' ? 'maintain' : 'wash'
  go('/pages/booking/index?serviceId=' + serviceId)
}

// 平台入驻商家：带上 merchantId，预约时直接选中该门店
function bookShop(p) {
  const serviceId = category.value === 'maintain' ? 'maintain' : 'wash'
  go('/pages/booking/index?serviceId=' + serviceId +
    '&merchantId=' + encodeURIComponent(p.merchantId))
}

function openMap(p) {
  if (p.lng == null || p.lat == null) {
    toast('演示数据不支持导航')
    return
  }
  // #ifdef H5
  if (typeof window !== 'undefined') {
    window.open(
      'https://uri.amap.com/marker?position=' + p.lng + ',' + p.lat +
      '&name=' + encodeURIComponent(p.name || '') +
      '&coordinate=gaode&callnative=1&src=cheguanjia',
      '_blank'
    )
    return
  }
  // #endif
  uni.openLocation({
    latitude: Number(p.lat),
    longitude: Number(p.lng),
    name: p.name || '',
    address: p.address || '',
    scale: 16
  })
}

function callShop(p) {
  const tel = String(p.tel || '').split(';')[0].trim()
  if (!tel) {
    toast('该门店暂无电话')
    return
  }
  // #ifdef H5
  if (typeof window !== 'undefined') {
    window.location.href = 'tel:' + tel
    return
  }
  // #endif
  uni.makePhoneCall({ phoneNumber: tel, fail: () => toast('拨号失败') })
}
</script>

<style scoped>
.cats { margin-top: 8rpx; white-space: nowrap; }
.cats-inner { display: flex; gap: 16rpx; padding: 16rpx 32rpx 20rpx; }
.cat {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 14rpx 24rpx;
  border-radius: 999rpx;
  background: #FFFFFF;
  border: 1rpx solid #E9EDF3;
  flex-shrink: 0;
}
.cat.on { background: #1A1D23; border-color: #1A1D23; }
.cat-ico { font-size: 26rpx; }
.cat-name { font-size: 23rpx; color: #3A4250; }
.cat.on .cat-name { color: #FFFFFF; font-weight: 600; }

.loc-bar {
  margin: 0 32rpx 16rpx;
  padding: 22rpx 24rpx;
  border-radius: 20rpx;
  background: #FFFFFF;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.loc-main { display: flex; align-items: center; gap: 12rpx; }
.loc-ico { font-size: 28rpx; }
.loc-text { display: flex; flex-direction: column; gap: 4rpx; }
.loc-city { font-size: 26rpx; font-weight: 600; color: #1A1D23; }
.loc-tip { font-size: 20rpx; color: #A2AAB8; }
.loc-btn {
  padding: 12rpx 22rpx;
  border-radius: 999rpx;
  background: #F2F5FA;
}
.loc-btn text { font-size: 21rpx; color: #2B63F0; font-weight: 600; }

.demo-tip {
  margin: 0 32rpx 16rpx;
  padding: 18rpx 22rpx;
  border-radius: 16rpx;
  background: #FFF7E8;
  display: flex;
  gap: 10rpx;
  align-items: flex-start;
}
.demo-ico { font-size: 24rpx; }
.demo-text { flex: 1; font-size: 20rpx; color: #A8792A; line-height: 1.6; }

.loading, .empty {
  padding: 80rpx 32rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10rpx;
  color: #A2AAB8;
  font-size: 23rpx;
}
.empty-ico { font-size: 64rpx; }
.empty-title { font-size: 27rpx; color: #3A4250; font-weight: 600; }
.empty-desc { font-size: 21rpx; }

.list { padding: 0 32rpx; display: flex; flex-direction: column; gap: 20rpx; }
.shop { padding: 26rpx; }
.shop-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16rpx; }
.shop-name-wrap { flex: 1; min-width: 0; }
.shop-name { display: block; font-size: 29rpx; font-weight: 600; color: #1A1D23; }
.shop-tags { display: flex; flex-wrap: wrap; gap: 8rpx; margin-top: 12rpx; }
.tag {
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
  background: #F2F5FA;
  font-size: 19rpx;
  color: #6B7686;
}
.tag.rating { background: #FFF4E6; color: #C77A12; }
.tag.platform { background: #E8F7F1; color: #0E9E6B; }
.shop-distance { font-size: 23rpx; color: #2B63F0; font-weight: 600; flex-shrink: 0; }
.shop-address { display: block; margin-top: 14rpx; font-size: 22rpx; color: #8A93A3; line-height: 1.6; }
.shop-actions { display: flex; gap: 14rpx; margin-top: 22rpx; }
.act {
  flex: 1;
  height: 64rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.act text { font-size: 23rpx; font-weight: 600; }
.act.ghost { background: #F2F5FA; }
.act.ghost text { color: #3A4250; }
.act.primary { background: linear-gradient(135deg, #FF7A3D, #FF4E12); }
.act.primary text { color: #FFFFFF; }

.footer-tip { padding: 36rpx 40rpx calc(40rpx + env(safe-area-inset-bottom)); }
.footer-tip text { font-size: 19rpx; color: #B4BBC7; line-height: 1.7; }
</style>
