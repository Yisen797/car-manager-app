<template>
  <view class="page" style="padding-bottom: 180rpx">
    <PageHeader title="预约服务" />

    <!-- 服务摘要 -->
    <view class="card service-card">
      <ServiceIcon :icon="service.icon" :gradient="service.gradient" :size="88" :radius="26" />
      <view class="svc-main">
        <text class="svc-name">{{ service.name }}</text>
        <text class="svc-short">{{ service.short }}</text>
      </view>
      <view class="svc-price">
        <text class="svc-num">{{ price.base > 0 ? '¥' + price.base : '免费' }}</text>
        <text class="svc-label">{{ price.base > 0 ? '起' : '预约' }}</text>
      </view>
    </view>

    <!-- 车辆 -->
    <view class="card">
      <view class="sec-title"><view class="sec-bar"></view><text>服务车辆</text></view>
      <view class="car-chips">
        <view
          v-for="c in state.cars"
          :key="c.id"
          class="car-chip"
          :class="{ active: carId === c.id }"
          @click="carId = c.id"
        >
          <text class="car-emoji">{{ c.emoji }}</text>
          <text class="car-plate">{{ c.plate }}</text>
        </view>
        <view class="car-chip add" @click="go('/pages/car/add')"><text>＋ 添加车辆</text></view>
      </view>
    </view>

    <!-- 门店与方式 -->
    <view class="card">
      <view class="sec-title"><view class="sec-bar"></view><text>服务门店</text></view>

      <picker v-if="!fixed" :range="merchantNames" :value="merchantIndex" @change="onMerchant">
        <view class="pick-row">
          <text class="pick-label">门店</text>
          <text class="pick-value ellipsis">{{ merchant.name }}</text>
          <text class="pick-arrow">›</text>
        </view>
      </picker>
      <view v-else class="pick-row">
        <text class="pick-label">服务方</text>
        <text class="pick-value">{{ fixed.name }}</text>
      </view>

      <text v-if="merchantDistance" class="merchant-dist">{{ merchantDistance }}</text>

      <view v-if="!fixed && cityMerchants.length === 0" class="city-tip">
        <text>{{ state.city }}暂未开通合作门店，提交后由平台客服为您安排</text>
      </view>

      <!-- 地图选店：小程序用原生 map（免费），H5/App 打开高德查看 -->
      <view v-if="mapable" class="map-box">
        <view class="map-head">
          <text class="map-title">地图选店</text>
          <text class="map-sub">{{ mapSub }}</text>
        </view>

        <!-- #ifdef MP-WEIXIN -->
        <map
          class="shop-map"
          :latitude="mapCenter.latitude"
          :longitude="mapCenter.longitude"
          :scale="13"
          :markers="markers"
          show-location
          @markertap="onMarkerTap"
        />
        <!-- #endif -->

        <!-- #ifndef MP-WEIXIN -->
        <view class="map-fallback">
          <view class="mf-top">
            <text class="mf-pin">📍</text>
            <view class="mf-main">
              <text class="mf-name ellipsis">{{ merchant.name }}</text>
              <text class="mf-addr">{{ merchantAddress }}</text>
            </view>
          </view>
          <text class="mf-tip">H5 / 安卓预览不内嵌第三方地图，可打开高德查看门店位置</text>
          <view class="mf-actions">
            <view class="mf-btn" @click="openMap"><text>高德地图查看</text></view>
            <view class="mf-btn ghost" @click="openNearby"><text>附近门店列表</text></view>
          </view>
        </view>
        <!-- #endif -->
      </view>

      <view class="mode-row">
        <view
          v-for="m in modes"
          :key="m"
          class="mode-chip"
          :class="{ active: mode === m }"
          @click="mode = m"
        >
          <text>{{ m }}</text>
        </view>
      </view>

      <view v-if="mode === '上门'" class="addr-box">
        <input v-model="address" class="addr-input" placeholder="请填写上门地址（小区/写字楼/门牌号）" />
        <text class="addr-tip" @click="useLocation">📍 使用当前位置</text>
      </view>
    </view>

    <!-- 时间 -->
    <view class="card">
      <view class="sec-title"><view class="sec-bar"></view><text>预约时间</text></view>
      <picker mode="date" :start="today" :end="maxDate" :value="date" @change="onDate">
        <view class="pick-row">
          <text class="pick-label">日期</text>
          <text class="pick-value">{{ date }}</text>
          <text class="pick-arrow">›</text>
        </view>
      </picker>
      <view class="slots">
        <view
          v-for="s in slots"
          :key="s"
          class="slot"
          :class="{ active: time === s }"
          @click="time = s"
        >
          <text>{{ s }}</text>
        </view>
      </view>
    </view>

    <!-- 联系人 -->
    <view class="card">
      <view class="sec-title"><view class="sec-bar"></view><text>联系人</text></view>
      <view class="field">
        <text class="field-label">姓名</text>
        <input v-model="contactName" class="field-input" placeholder="联系人姓名" />
      </view>
      <view class="field">
        <text class="field-label">手机</text>
        <input v-model="contactPhone" class="field-input" type="number" maxlength="11" placeholder="11 位手机号" />
      </view>
      <view class="field">
        <text class="field-label">备注</text>
        <input v-model="remark" class="field-input" placeholder="选填，如故障描述、特殊要求" />
      </view>
    </view>

    <!-- 优惠 -->
    <view class="card">
      <view class="sec-title"><view class="sec-bar"></view><text>优惠</text></view>
      <view class="opt-row" @click="showCoupons = true">
        <text class="opt-label">优惠券</text>
        <view class="opt-right">
          <text v-if="selectedCoupon" class="opt-value">-¥{{ price.couponCut }}</text>
          <text v-else class="opt-muted">{{ usable.length ? usable.length + ' 张可用' : '暂无可用' }}</text>
          <text class="opt-arrow">›</text>
        </view>
      </view>
      <view v-if="price.maxPoints >= 100" class="opt-row" @click="usePoints = !usePoints">
        <text class="opt-label">积分抵扣</text>
        <view class="opt-right">
          <text class="opt-muted">{{ state.user.points }} 积分可用（最多抵 ¥{{ Math.floor(price.maxPoints / 100) }}）</text>
          <view class="switch" :class="{ on: usePoints }"><view class="switch-dot"></view></view>
        </view>
      </view>
    </view>

    <!-- 价格明细 -->
    <view class="card">
      <view class="sec-title"><view class="sec-bar"></view><text>费用明细</text></view>
      <view class="fee-row"><text class="fee-k">服务原价</text><text class="fee-v">¥{{ price.base }}</text></view>
      <view v-if="price.memberCut > 0" class="fee-row">
        <text class="fee-k">会员{{ rateLabel }}</text><text class="fee-v green">-¥{{ price.memberCut }}</text>
      </view>
      <view v-if="price.freeCut > 0" class="fee-row">
        <text class="fee-k">会员每月 1 次免费</text><text class="fee-v green">-¥{{ price.freeCut }}</text>
      </view>
      <view v-if="price.couponCut > 0" class="fee-row">
        <text class="fee-k">{{ selectedCoupon ? selectedCoupon.name : '优惠券' }}</text><text class="fee-v green">-¥{{ price.couponCut }}</text>
      </view>
      <view v-if="price.pointsCut > 0" class="fee-row">
        <text class="fee-k">积分抵扣</text><text class="fee-v green">-¥{{ price.pointsCut }}</text>
      </view>
      <view class="divider"></view>
      <view class="fee-row total">
        <text class="fee-k strong">合计</text>
        <text class="fee-total">¥{{ price.payable }}</text>
      </view>
      <view v-if="!member.active" class="member-link" @click="go('/pages/member/index')">
        <text>开通会员可享 9 折起 · 每月免费代驾/跑腿 ›</text>
      </view>
    </view>

    <view class="note">
      <text>提交后订单进入待支付，支付完成由商家接单；当前为演示环境，暂无人接单。</text>
    </view>

    <!-- 底栏 -->
    <view class="fixed-bar">
      <view class="bar-sum">
        <text class="bar-label">合计</text>
        <text class="bar-value">¥{{ price.payable }}</text>
      </view>
      <view class="bar-btn btn btn-primary" @click="submit"><text>提交订单</text></view>
    </view>

    <!-- 优惠券弹层 -->
    <view v-if="showCoupons" class="mask" @click="showCoupons = false">
      <view class="sheet" @click.stop>
        <view class="sheet-head">
          <text class="sheet-title">选择优惠券</text>
          <text class="sheet-close" @click="showCoupons = false">×</text>
        </view>
        <scroll-view scroll-y class="sheet-body">
          <view class="coupon-none" :class="{ active: !selectedCoupon }" @click="selectCoupon(null)">
            <text>不使用优惠券</text>
          </view>
          <view
            v-for="c in usable"
            :key="c.id"
            class="coupon-item"
            :class="{ active: selectedCoupon && selectedCoupon.id === c.id }"
            @click="selectCoupon(c)"
          >
            <view class="coupon-amt"><text class="coupon-num">{{ c.amount }}</text><text class="coupon-unit">元</text></view>
            <view class="coupon-main">
              <text class="coupon-name">{{ c.name }}</text>
              <text class="coupon-cond">满 {{ c.threshold }} 可用 · {{ c.expire }} 到期</text>
            </view>
            <view class="coupon-check" :class="{ on: selectedCoupon && selectedCoupon.id === c.id }"></view>
          </view>
          <view v-if="!usable.length" class="coupon-empty"><text>没有可用于该服务的优惠券</text></view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import PageHeader from '@/components/PageHeader.vue'
import ServiceIcon from '@/components/ServiceIcon.vue'
import { SERVICES } from '@/data/mock'
import { SERVICE_POI_CATEGORY } from '@/data/nearby.mjs'
import { state, memberInfo, merchantsInCity, createOrder, go, toast } from '@/store/index'
import { calcPrice, usableCoupons, discountText } from '@/utils/pricing'
import { requestLocation, findCity, distanceKm } from '@/utils/location'

const serviceId = ref('maintain')
const service = computed(() => SERVICES.find(s => s.id === serviceId.value) || SERVICES[0])
const member = computed(() => memberInfo())

const FALLBACK_MERCHANT = { id: '', name: '车管家服务中心', address: '平台将为您就近安排门店' }
const cityMerchants = computed(() => merchantsInCity(state.city))
const merchantIndex = ref(0)
const merchant = computed(
  () => cityMerchants.value[merchantIndex.value] || cityMerchants.value[0] || FALLBACK_MERCHANT
)
const merchantNames = computed(() =>
  cityMerchants.value.length ? cityMerchants.value.map(m => m.name) : [FALLBACK_MERCHANT.name]
)

// 代驾、跑腿、租车没有具体门店，使用平台自有服务方
const FIXED_MERCHANT = {
  driver: { name: '安心代驾团队', address: '上门服务' },
  errand: { name: '车管家跑腿中心', address: '上门服务' },
  rent: { name: '车管家租车中心', address: '门店取车' }
}
const fixed = computed(() => FIXED_MERCHANT[service.value.id] || null)
const merchantName = computed(() => (fixed.value ? fixed.value.name : merchant.value.name))
const merchantAddress = computed(() => (fixed.value ? fixed.value.address : merchant.value.address))

/* ---------- 地图选店 ---------- */
const myLoc = ref(null)

// 只有带坐标的门店才能上图；索引仍是 cityMerchants 的下标，便于和 picker 同步
const mapMerchants = computed(() =>
  cityMerchants.value
    .map((m, index) => ({ ...m, _index: index }))
    .filter(m => m.lng != null && m.lat != null)
)

const mapable = computed(() => !fixed.value && mapMerchants.value.length > 0)

const markers = computed(() =>
  mapMerchants.value.map(m => ({
    id: m._index,
    latitude: Number(m.lat),
    longitude: Number(m.lng),
    width: 26,
    height: 34,
    callout: {
      content: m.name,
      display: 'BYCLICK',
      fontSize: 11,
      borderRadius: 6,
      padding: 6,
      color: '#1A1D23'
    }
  }))
)

const cityCenter = computed(() => {
  const c = findCity(state.city)
  return c ? { lng: c.lng, lat: c.lat } : { lng: 116.4074, lat: 39.9042 }
})

const mapCenter = computed(() => {
  const m = merchant.value
  if (m && m.lng != null && m.lat != null) {
    return { latitude: Number(m.lat), longitude: Number(m.lng) }
  }
  const base = myLoc.value || cityCenter.value
  return { latitude: base.lat, longitude: base.lng }
})

const mapSub = computed(() => `${mapMerchants.value.length} 家已定位门店 · 点击标记选择`)

const merchantDistance = computed(() => {
  const m = merchant.value
  if (!m || m.lng == null || m.lat == null) return ''
  const base = myLoc.value || cityCenter.value
  const km = distanceKm(base.lng, base.lat, Number(m.lng), Number(m.lat))
  return '距您约 ' + (km < 1 ? Math.round(km * 1000) + 'm' : km.toFixed(1) + 'km')
})

async function initMapLocation() {
  const r = await requestLocation()
  if (r.lng != null && r.lat != null) myLoc.value = { lng: r.lng, lat: r.lat }
}

function onMarkerTap(e) {
  const id = e && e.detail && e.detail.markerId != null ? e.detail.markerId : e && e.markerId
  const idx = Number(id)
  if (Number.isFinite(idx) && cityMerchants.value[idx]) merchantIndex.value = idx
}

function openMap() {
  const m = merchant.value
  const target = m && m.lng != null && m.lat != null ? m : mapMerchants.value[0]
  if (!target) return toast('暂无门店坐标')
  const url = 'https://uri.amap.com/marker?position=' + target.lng + ',' + target.lat +
    '&name=' + encodeURIComponent(target.name || '') +
    '&coordinate=gaode&callnative=1&src=cheguanjia'

  // #ifdef H5
  if (typeof window !== 'undefined') {
    window.open(url, '_blank')
    return
  }
  // #endif
  // #ifdef APP-PLUS
  uni.openLocation({
    latitude: Number(target.lat),
    longitude: Number(target.lng),
    name: target.name || '',
    address: target.address || ''
  })
  return
  // #endif
  toast('请在微信小程序内使用地图')
}

function openNearby() {
  const category = SERVICE_POI_CATEGORY[service.value.id] || 'maintain'
  go('/pages/nearby/index?category=' + category)
}

const modes = ['到店', '上门']
const mode = ref('到店')
const address = ref('')

const carId = ref(state.currentCarId)
const today = ref('')
const maxDate = ref('')
const date = ref('')
const slots = ['09:00-11:00', '11:00-13:00', '14:00-16:00', '16:00-18:00', '19:00-21:00']
const time = ref(slots[0])

const contactName = ref('')
const contactPhone = ref(state.user.phoneRaw || '')

const remark = ref('')

const selectedCoupon = ref(null)
const usePoints = ref(false)
const showCoupons = ref(false)

const usable = computed(() => usableCoupons(service.value))
const price = computed(() => calcPrice(service.value, selectedCoupon.value, usePoints.value))
const rateLabel = computed(() => discountText(service.value))

function fmtDate(d) {
  const p = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

onLoad(options => {
  if (options && options.serviceId) serviceId.value = options.serviceId
  if (options && options.merchantId) {
    const idx = cityMerchants.value.findIndex(m => m.id === options.merchantId)
    if (idx >= 0) merchantIndex.value = idx
  }

  const now = new Date()
  today.value = fmtDate(now)
  const max = new Date(now.getTime() + 30 * 86400000)
  maxDate.value = fmtDate(max)
  date.value = today.value

  // 默认选额度最大且满足门槛的券
  const list = usableCoupons(service.value)
  selectedCoupon.value = list.find(c => service.value.price >= (c.threshold || 0)) || null

  // 地图定位（异步，不阻塞预约表单）
  initMapLocation()
})

function onMerchant(e) {
  merchantIndex.value = Number(e.detail.value)
}

function onDate(e) {
  date.value = e.detail.value
}

function useLocation() {
  address.value = '北京市朝阳区建国路 88 号 SOHO 现代城 B1'
  toast('已使用当前定位')
}

function selectCoupon(c) {
  selectedCoupon.value = c
  showCoupons.value = false
}

function submit() {
  if (!state.cars.length) {
    toast('请先添加车辆')
    return
  }
  if (!carId.value) {
    toast('请选择服务车辆')
    return
  }
  if (!date.value || !time.value) {
    toast('请选择预约时间')
    return
  }
  if (mode.value === '上门' && !address.value.trim()) {
    toast('请填写上门地址')
    return
  }
  if (!contactName.value.trim()) {
    toast('请填写联系人姓名')
    return
  }
  if (!/^1\d{10}$/.test(contactPhone.value.trim())) {
    toast('请填写正确的手机号')
    return
  }

  const car = state.cars.find(c => c.id === carId.value)
  const p = price.value

  const order = createOrder({
    serviceId: service.value.id,
    title: service.value.name + ' · ' + mode.value,
    merchant: merchantName.value,
    amount: p.payable,
    originalAmount: p.base,
    discount: p.memberCut + p.freeCut + p.couponCut + p.pointsCut,
    priceDetail: {
      base: p.base,
      memberCut: p.memberCut,
      freeCut: p.freeCut,
      couponCut: p.couponCut,
      pointsCut: p.pointsCut,
      payable: p.payable
    },
    couponId: selectedCoupon.value ? selectedCoupon.value.id : '',
    couponName: selectedCoupon.value ? selectedCoupon.value.name : '',
    pointsUsed: p.pointsUsed,
    freeApplied: p.free,
    status: 'pending',
    car: car ? car.plate : '未绑定车辆',
    icon: service.value.icon,
    gradient: service.value.gradient,
    payLabel: '待支付',
    booking: {
      date: date.value,
      time: time.value,
      mode: mode.value,
      address: mode.value === '上门' ? address.value.trim() : merchantAddress.value,
      merchantId: fixed.value ? '' : merchant.value.id,
      contactName: contactName.value.trim(),
      contactPhone: contactPhone.value.trim(),
      remark: remark.value.trim()
    }
  })

  uni.redirectTo({ url: '/pages/pay/index?orderId=' + order.id })
}
</script>

<style scoped>
.service-card { display: flex; align-items: center; padding: 24rpx 26rpx; }
.svc-main { flex: 1; min-width: 0; margin-left: 20rpx; display: flex; flex-direction: column; gap: 8rpx; }
.svc-name { font-size: 30rpx; font-weight: 700; color: #1A1D23; }
.svc-short { font-size: 21rpx; color: #9AA3B0; }
.svc-price { display: flex; align-items: baseline; gap: 4rpx; }
.svc-num { font-size: 32rpx; font-weight: 700; color: #FF5A1F; }
.svc-label { font-size: 19rpx; color: #B4BBC7; }

.sec-title { display: flex; align-items: center; gap: 12rpx; font-size: 29rpx; font-weight: 700; color: #1A1D23; margin-bottom: 20rpx; }
.sec-bar { width: 8rpx; height: 26rpx; border-radius: 4rpx; background: linear-gradient(180deg, #FF7A3D, #FF4E12); }

.car-chips { display: flex; flex-wrap: wrap; gap: 14rpx; }
.car-chip {
  display: flex;
  align-items: center;
  gap: 8rpx;
  height: 64rpx;
  padding: 0 20rpx;
  border-radius: 32rpx;
  background: #F5F7FA;
  border: 2rpx solid transparent;
}
.car-chip.active { background: #FFF1EB; border-color: #FFB68F; }
.car-emoji { font-size: 24rpx; }
.car-plate { font-size: 23rpx; color: #3A4250; font-weight: 600; }
.car-chip.add { color: #8A93A3; font-size: 22rpx; background: #FFFFFF; border: 2rpx dashed #D8DEE8; }

.pick-row { display: flex; align-items: center; padding: 22rpx 0; border-bottom: 1rpx solid #F2F4F7; }
.pick-label { font-size: 25rpx; color: #8A93A3; width: 110rpx; }
.pick-value { flex: 1; font-size: 25rpx; color: #1A1D23; text-align: right; }
.pick-arrow { font-size: 30rpx; color: #C3CAD6; margin-left: 10rpx; }

.merchant-dist { display: block; margin-top: 8rpx; font-size: 21rpx; color: #2B63F0; }

/* 地图选店 */
.map-box { margin-top: 18rpx; padding-top: 18rpx; border-top: 1rpx solid #F2F4F7; }
.map-head { display: flex; align-items: baseline; justify-content: space-between; }
.map-title { font-size: 24rpx; font-weight: 600; color: #1A1D23; }
.map-sub { font-size: 19rpx; color: #A2AAB8; }
.shop-map { width: 100%; height: 320rpx; margin-top: 14rpx; border-radius: 18rpx; overflow: hidden; }
.map-fallback { margin-top: 14rpx; padding: 20rpx; border-radius: 18rpx; background: #F7F9FC; }
.mf-top { display: flex; gap: 12rpx; align-items: flex-start; }
.mf-pin { font-size: 26rpx; }
.mf-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6rpx; }
.mf-name { font-size: 24rpx; font-weight: 600; color: #1A1D23; }
.mf-addr { font-size: 20rpx; color: #8A93A3; line-height: 1.5; }
.mf-tip { display: block; margin-top: 12rpx; font-size: 19rpx; color: #A2AAB8; line-height: 1.6; }
.mf-actions { display: flex; gap: 14rpx; margin-top: 16rpx; }
.mf-btn {
  flex: 1;
  height: 64rpx;
  border-radius: 999rpx;
  background: #1A1D23;
  display: flex;
  align-items: center;
  justify-content: center;
}
.mf-btn text { font-size: 22rpx; color: #FFFFFF; font-weight: 600; }
.mf-btn.ghost { background: #FFFFFF; border: 1rpx solid #E3E8EF; }
.mf-btn.ghost text { color: #3A4250; }

.mode-row { display: flex; gap: 16rpx; margin-top: 22rpx; }
.mode-chip {
  flex: 1;
  height: 68rpx;
  border-radius: 18rpx;
  background: #F5F7FA;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2rpx solid transparent;
}
.mode-chip text { font-size: 25rpx; color: #5A6373; }
.mode-chip.active { background: #FFF1EB; border-color: #FFB68F; }
.mode-chip.active text { color: #FF5A1F; font-weight: 600; }

.city-tip {
  margin-top: 16rpx;
  padding: 16rpx 18rpx;
  border-radius: 14rpx;
  background: #FFFBF2;
  border: 1rpx solid #F5E6C8;
}
.city-tip text { font-size: 20rpx; color: #A97C2F; line-height: 1.5; }

.addr-box { margin-top: 20rpx; }
.addr-input { height: 78rpx; background: #F7F8FA; border-radius: 16rpx; padding: 0 20rpx; font-size: 24rpx; }
.addr-tip { display: block; margin-top: 12rpx; font-size: 21rpx; color: #2B63F0; }

.slots { display: flex; flex-wrap: wrap; gap: 14rpx; margin-top: 20rpx; }
.slot {
  width: calc(33.33% - 10rpx);
  height: 64rpx;
  border-radius: 16rpx;
  background: #F5F7FA;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2rpx solid transparent;
}
.slot text { font-size: 21rpx; color: #5A6373; }
.slot.active { background: #FFF1EB; border-color: #FFB68F; }
.slot.active text { color: #FF5A1F; font-weight: 600; }

.field { display: flex; align-items: center; padding: 18rpx 0; border-bottom: 1rpx solid #F2F4F7; }
.field:last-child { border-bottom: none; }
.field-label { width: 110rpx; font-size: 25rpx; color: #8A93A3; }
.field-input { flex: 1; font-size: 25rpx; color: #1A1D23; }

.opt-row { display: flex; align-items: center; justify-content: space-between; padding: 20rpx 0; border-bottom: 1rpx solid #F2F4F7; }
.opt-row:last-child { border-bottom: none; }
.opt-label { font-size: 25rpx; color: #1A1D23; }
.opt-right { display: flex; align-items: center; gap: 10rpx; }
.opt-value { font-size: 25rpx; color: #FF5A1F; font-weight: 600; }
.opt-muted { font-size: 21rpx; color: #A8B0BD; }
.opt-arrow { font-size: 30rpx; color: #C3CAD6; }

.switch { width: 76rpx; height: 42rpx; border-radius: 21rpx; background: #E3E8EF; padding: 4rpx; transition: background 0.2s; }
.switch.on { background: #FF5A1F; }
.switch-dot { width: 34rpx; height: 34rpx; border-radius: 17rpx; background: #FFFFFF; transition: transform 0.2s; }
.switch.on .switch-dot { transform: translateX(34rpx); }

.fee-row { display: flex; align-items: center; justify-content: space-between; padding: 12rpx 0; }
.fee-k { font-size: 24rpx; color: #8A93A3; }
.fee-k.strong { font-size: 27rpx; color: #1A1D23; font-weight: 600; }
.fee-v { font-size: 24rpx; color: #2A3038; }
.fee-v.green { color: #0E9E6B; }
.fee-total { font-size: 34rpx; font-weight: 700; color: #E02B20; }
.member-link { margin-top: 16rpx; padding-top: 18rpx; border-top: 1rpx dashed #F0E2D9; }
.member-link text { font-size: 21rpx; color: #C98A2F; }

.note { padding: 0 36rpx 24rpx; text-align: center; }
.note text { font-size: 20rpx; color: #B4BBC7; line-height: 1.6; }

.bar-sum { flex: 1; display: flex; flex-direction: column; gap: 4rpx; }
.bar-label { font-size: 20rpx; color: #9AA3B0; }
.bar-value { font-size: 32rpx; font-weight: 700; color: #FF5A1F; }
.bar-btn { width: 320rpx; }
.bar-btn text { font-size: 30rpx; color: #FFFFFF; font-weight: 600; }

.mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 200;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.sheet {
  width: 100%;
  max-width: 480px;
  background: #FFFFFF;
  border-radius: 28rpx 28rpx 0 0;
  padding: 28rpx 24rpx calc(28rpx + env(safe-area-inset-bottom));
  max-height: 70vh;
  display: flex;
  flex-direction: column;
}
.sheet-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20rpx; }
.sheet-title { font-size: 30rpx; font-weight: 700; color: #1A1D23; }
.sheet-close { font-size: 40rpx; color: #A8B0BD; padding: 0 10rpx; }
.sheet-body { max-height: 55vh; }
.coupon-none {
  height: 84rpx;
  border-radius: 16rpx;
  border: 2rpx solid #EEF1F5;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16rpx;
}
.coupon-none text { font-size: 24rpx; color: #5A6373; }
.coupon-none.active { border-color: #FFB68F; background: #FFF7F2; }
.coupon-item {
  display: flex;
  align-items: center;
  padding: 20rpx;
  border-radius: 18rpx;
  border: 2rpx solid #EEF1F5;
  margin-bottom: 16rpx;
}
.coupon-item.active { border-color: #FFB68F; background: #FFF7F2; }
.coupon-amt { width: 110rpx; display: flex; align-items: baseline; justify-content: center; gap: 2rpx; }
.coupon-num { font-size: 44rpx; font-weight: 700; color: #FF5A1F; }
.coupon-unit { font-size: 20rpx; color: #FF5A1F; }
.coupon-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6rpx; }
.coupon-name { font-size: 26rpx; font-weight: 600; color: #1A1D23; }
.coupon-cond { font-size: 20rpx; color: #9AA3B0; }
.coupon-check { width: 34rpx; height: 34rpx; border-radius: 17rpx; border: 2rpx solid #D8DEE8; }
.coupon-check.on { background: #FF5A1F; border-color: #FF5A1F; }
.coupon-empty { padding: 40rpx 0; text-align: center; font-size: 23rpx; color: #A8B0BD; }
</style>
