<template>
  <view class="page page-with-tabbar">
    <!-- ================= HERO ================= -->
    <view class="hero" :style="{ paddingTop: topPad + 'px' }">
      <view class="glow"></view>
      <view class="glow2"></view>

      <view class="hero-top">
        <view class="loc" @click="go('/pages/city/index')">
          <text class="loc-dot">●</text>
          <text class="loc-text">{{ cityLabel }}</text>
          <text class="caret">▾</text>
        </view>
        <view class="bell" @click="go('/pages/messages/index')">
          <text class="bell-ico">🔔</text>
          <view v-if="unread" class="bell-dot"></view>
        </view>
      </view>

      <view class="hero-hi">
        <text class="hi-line">你好，{{ state.user.name }}</text>
        <text class="hi-sub">{{ BRAND.slogan }}</text>
      </view>

      <view class="search" @click="go('/pages/service/index')">
        <text class="search-ico">🔍</text>
        <text class="search-ph">保养 · 违章 · 拖车 · 代驾 · 过户</text>
        <view class="search-btn"><text>搜索</text></view>
      </view>
    </view>

    <!-- ================= 救援入口 ================= -->
    <view class="rescue-bar" @click="go('/pages/rescue/index')">
      <view class="rescue-left">
        <view class="rescue-pulse">
          <view class="pulse-ring"></view>
          <text class="rescue-ico">🆘</text>
        </view>
        <view class="rescue-txt">
          <view class="row gap12">
            <text class="rescue-title">24H 道路救援</text>
            <text class="rescue-live">在线</text>
          </view>
          <text class="rescue-sub">拖车 · 搭电 · 换胎 · 困境 · 抢修 · 高速协助</text>
        </view>
      </view>
      <view class="rescue-btn"><text>一键呼叫</text></view>
    </view>

    <!-- ================= 出行服务入口 ================= -->
    <view class="travel-bar" @click="go('/pages/travel/index')">
      <view class="travel-left">
        <view class="travel-logo"><text>🚕</text></view>
        <view class="travel-txt">
          <view class="row gap12">
            <text class="travel-title">出行服务</text>
            <text class="travel-badge">高德 · 腾讯</text>
          </view>
          <text class="travel-sub">打车 · 代驾 · 租车 · 接送机</text>
        </view>
      </view>
      <view class="travel-btn"><text>立即叫车</text></view>
    </view>

    <!-- ================= 12 大业务 ================= -->
    <view class="card services-card">
      <view class="card-head">
        <text class="card-title">全品类车务</text>
        <text class="card-sub">12 大业务链条 · 一站式托管</text>
      </view>
      <view class="services-grid">
        <view v-for="s in gridServices" :key="s.id" class="s-item" @click="openService(s)">
          <view class="s-icon-wrap">
            <ServiceIcon :icon="s.icon" :gradient="s.gradient" :size="88" :radius="28" />
            <text v-if="s.badge" class="s-badge">{{ s.badge }}</text>
          </view>
          <text class="s-name">{{ s.name }}</text>
        </view>
      </view>
    </view>

    <!-- ================= 我的爱车 ================= -->
    <view class="section-head-inline">
      <text class="card-title">我的爱车</text>
      <text class="section-more" @click="go('/pages/car/list')">车辆管理 ›</text>
    </view>

    <view v-if="car" class="car-card" @click="go('/pages/car/list')">
      <view class="car-top">
        <view class="car-emoji-wrap"><text class="car-emoji">{{ car.emoji }}</text></view>
        <view class="car-info">
          <text class="car-plate">{{ car.plate }}</text>
          <text class="car-brand">{{ car.brand }}</text>
        </view>
        <view class="car-mileage">
          <text class="mileage-num">{{ formatKm(car.mileage) }}</text>
          <text class="mileage-unit">km</text>
        </view>
      </view>
      <view class="car-chips">
        <view class="car-chip">
          <text class="chip-label">保险到期</text>
          <text class="chip-value">{{ car.insuranceEnd }}</text>
          <text class="chip-days" :class="{ warn: insDays !== null && insDays < 60 }">{{ dayText(insDays) }}</text>
        </view>
        <view class="car-chip">
          <text class="chip-label">年检到期</text>
          <text class="chip-value">{{ car.annualEnd }}</text>
          <text class="chip-days" :class="{ warn: annDays !== null && annDays < 60 }">{{ dayText(annDays) }}</text>
        </view>
      </view>
    </view>

    <!-- ================= 热门服务 ================= -->
    <view class="section-head-inline">
      <text class="card-title">热门服务</text>
      <text class="section-more" @click="go('/pages/service/index')">全部服务 ›</text>
    </view>

    <scroll-view class="hscroll" scroll-x :show-scrollbar="false">
      <view class="hscroll-inner">
        <view v-for="s in hotServices" :key="s.id" class="hot-card" @click="openService(s)">
          <view class="hot-top" :style="{ background: s.gradient }">
            <text class="hot-emoji">{{ s.icon }}</text>
            <text v-if="s.badge" class="hot-tag">{{ s.badge }}</text>
          </view>
          <view class="hot-body">
            <text class="hot-name">{{ s.name }}</text>
            <text class="hot-short ellipsis">{{ s.short }}</text>
            <view class="hot-foot">
              <text class="hot-price">{{ s.priceLabel }}</text>
              <text class="hot-go">›</text>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- ================= 附近商家 ================= -->
    <view class="section-head-inline">
      <text class="card-title">附近商家</text>
      <text class="section-more" @click="go('/pages/merchant/list')">查看全部 ›</text>
    </view>

    <view class="card merchant-card">
      <view v-if="nearbyMerchants.length === 0" class="merchant-empty">
        <text class="merchant-empty-ico">🏪</text>
        <text class="merchant-empty-title">{{ state.city }}暂无合作商家</text>
        <text class="merchant-empty-sub">我们正在招募本地服务商，敬请期待</text>
      </view>
      <view
        v-for="(m, i) in nearbyMerchants"
        :key="m.id"
        class="merchant-row"
        :class="{ 'no-border': i === nearbyMerchants.length - 1 }"
        @click="openMerchant(m)"
      >
        <view class="merchant-logo" :style="{ background: m.gradient }">
          <text class="merchant-emoji">{{ m.emoji }}</text>
        </view>
        <view class="merchant-info">
          <view class="row gap12">
            <text class="merchant-name ellipsis">{{ m.name }}</text>
            <text class="merchant-tier">{{ m.tier }}</text>
          </view>
          <view class="merchant-meta">
            <text class="rating">★ {{ m.rating }}</text>
            <text class="merchant-dot">·</text>
            <text>{{ m.distance }}</text>
            <text class="merchant-dot">·</text>
            <text>{{ m.orders }}单</text>
          </view>
          <view class="merchant-tags">
            <text v-for="t in m.tags.slice(0, 3)" :key="t" class="mini-tag">{{ t }}</text>
          </view>
        </view>
        <view class="merchant-arrow">›</view>
      </view>
    </view>

    <view class="footer-note">
      <text>合规经营 · 不代办扣分 · 不伪造材料 · 全程可追溯</text>
    </view>

  </view>

  <AppTabBar :current="0" />
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import AppTabBar from '@/components/AppTabBar.vue'
import ServiceIcon from '@/components/ServiceIcon.vue'
import { BRAND, SERVICES } from '@/data/mock'
import {
  state, unreadCount, currentCar, daysUntil, merchantsInCity, go, toast
} from '@/store/index'

const topPad = ref(44)
// #ifndef H5
try {
  topPad.value = uni.getSystemInfoSync().statusBarHeight || 20
} catch (e) {
  topPad.value = 20
}
// #endif

const unread = computed(() => unreadCount())

const cityLabel = computed(() => {
  const source = state.location && state.location.source === 'gps' ? '已定位' : '全城'
  return state.city + ' · ' + source
})
const car = computed(() => currentCar())
const hotServices = computed(() => SERVICES.filter(s => s.hot))
// 打车等有独立入口的服务不占首页 12 宫格
const gridServices = computed(() => SERVICES.filter(s => !s.hub && s.grid !== false))
const nearbyMerchants = computed(() => merchantsInCity(state.city).slice(0, 3))

const insDays = computed(() => (car.value ? daysUntil(car.value.insuranceEnd) : null))
const annDays = computed(() => (car.value ? daysUntil(car.value.annualEnd) : null))

function formatKm(n) {
  return Number(n).toLocaleString('en-US')
}

function dayText(d) {
  if (d === null) return '待完善'
  if (d < 0) return '已过期'
  return '剩 ' + d + ' 天'
}

function openService(s) {
  if (s.hub) {
    go(s.hub)
    return
  }
  go('/pages/service/detail?id=' + s.id)
}

function openMerchant(m) {
  go('/pages/merchant/detail?id=' + m.id)
}

function tip(t) {
  toast(t)
}

onShow(() => {
  // 回到首页时确保会员状态最新
})
</script>

<style scoped>
/* ================= HERO ================= */
.hero {
  position: relative;
  padding: 0 32rpx 44rpx;
  background: linear-gradient(165deg, #1E2836 0%, #121821 55%, #0E131A 100%);
  border-radius: 0 0 44rpx 44rpx;
  overflow: hidden;
}
.glow {
  position: absolute;
  top: -180rpx;
  right: -140rpx;
  width: 460rpx;
  height: 460rpx;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 90, 31, 0.42) 0%, rgba(255, 90, 31, 0) 70%);
}
.glow2 {
  position: absolute;
  bottom: -220rpx;
  left: -160rpx;
  width: 420rpx;
  height: 420rpx;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(64, 120, 255, 0.20) 0%, rgba(64, 120, 255, 0) 70%);
}
.hero-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 16rpx;
}
.loc {
  display: flex;
  align-items: center;
  gap: 10rpx;
  height: 56rpx;
  padding: 0 22rpx;
  border-radius: 28rpx;
  background: rgba(255, 255, 255, 0.09);
}
.loc-dot {
  font-size: 16rpx;
  color: #FF7A3D;
}
.loc-text {
  font-size: 24rpx;
  color: #E6EAF2;
}
.caret {
  font-size: 20rpx;
  color: #8A93A3;
}
.bell {
  position: relative;
  width: 64rpx;
  height: 64rpx;
  border-radius: 32rpx;
  background: rgba(255, 255, 255, 0.09);
  display: flex;
  align-items: center;
  justify-content: center;
}
.bell-ico {
  font-size: 30rpx;
}
.bell-dot {
  position: absolute;
  top: 12rpx;
  right: 14rpx;
  width: 12rpx;
  height: 12rpx;
  border-radius: 6rpx;
  background: #FF4E1E;
}
.hero-hi {
  display: flex;
  flex-direction: column;
  margin-top: 44rpx;
}
.hi-line {
  font-size: 46rpx;
  font-weight: 700;
  color: #FFFFFF;
  letter-spacing: 1rpx;
}
.hi-sub {
  margin-top: 12rpx;
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.52);
  letter-spacing: 2rpx;
}
.search {
  margin-top: 36rpx;
  height: 84rpx;
  border-radius: 42rpx;
  background: rgba(255, 255, 255, 0.97);
  display: flex;
  align-items: center;
  padding: 0 14rpx 0 28rpx;
}
.search-ico {
  font-size: 28rpx;
  margin-right: 14rpx;
}
.search-ph {
  flex: 1;
  font-size: 26rpx;
  color: #A2AAB8;
}
.search-btn {
  height: 60rpx;
  padding: 0 30rpx;
  border-radius: 30rpx;
  background: linear-gradient(135deg, #FF7A3D, #FF4E12);
  display: flex;
  align-items: center;
}
.search-btn text {
  font-size: 24rpx;
  color: #FFFFFF;
  font-weight: 600;
}

/* ================= 救援条 ================= */
.rescue-bar {
  margin: 24rpx;
  padding: 26rpx 26rpx;
  border-radius: 26rpx;
  background: linear-gradient(115deg, #2B1414 0%, #1A0E0E 100%);
  border: 2rpx solid rgba(224, 43, 32, 0.42);
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.rescue-left { display: flex; align-items: center; gap: 20rpx; flex: 1; min-width: 0; }
.rescue-pulse { position: relative; width: 76rpx; height: 76rpx; display: flex; align-items: center; justify-content: center; }
.pulse-ring {
  position: absolute;
  width: 76rpx;
  height: 76rpx;
  border-radius: 50%;
  background: rgba(224, 43, 32, 0.35);
  animation: pulse 1.8s ease-out infinite;
}
@keyframes pulse {
  0% { transform: scale(0.75); opacity: 0.9; }
  70% { transform: scale(1.35); opacity: 0; }
  100% { transform: scale(1.35); opacity: 0; }
}
.rescue-ico { font-size: 40rpx; position: relative; }
.rescue-txt { display: flex; flex-direction: column; gap: 8rpx; min-width: 0; }
.rescue-title { font-size: 28rpx; font-weight: 700; color: #FFFFFF; }
.rescue-live {
  font-size: 18rpx;
  color: #FF6B5A;
  border: 1rpx solid rgba(255, 107, 90, 0.5);
  border-radius: 6rpx;
  padding: 1rpx 8rpx;
}
.rescue-sub {
  font-size: 21rpx;
  color: rgba(255, 255, 255, 0.42);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.rescue-btn {
  height: 60rpx;
  padding: 0 24rpx;
  border-radius: 30rpx;
  background: linear-gradient(135deg, #FF5240, #C8071C);
  display: flex;
  align-items: center;
  flex-shrink: 0;
  margin-left: 16rpx;
}
.rescue-btn text { font-size: 24rpx; color: #FFF; font-weight: 700; }

/* ================= 出行服务 ================= */
.travel-bar {
  margin: 0 24rpx 24rpx;
  padding: 26rpx;
  border-radius: 26rpx;
  background: linear-gradient(115deg, #0F2740 0%, #11395B 60%, #12507C 100%);
  border: 2rpx solid rgba(53, 195, 255, 0.32);
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.travel-left { display: flex; align-items: center; gap: 20rpx; flex: 1; min-width: 0; }
.travel-logo {
  width: 76rpx;
  height: 76rpx;
  border-radius: 24rpx;
  background: rgba(53, 195, 255, 0.14);
  border: 2rpx solid rgba(53, 195, 255, 0.28);
  display: flex;
  align-items: center;
  justify-content: center;
}
.travel-logo text { font-size: 38rpx; }
.travel-txt { display: flex; flex-direction: column; gap: 8rpx; min-width: 0; }
.travel-title { font-size: 28rpx; font-weight: 700; color: #FFFFFF; }
.travel-badge {
  font-size: 18rpx;
  color: #8CD2FF;
  background: rgba(53, 195, 255, 0.14);
  border: 1rpx solid rgba(53, 195, 255, 0.25);
  padding: 3rpx 10rpx;
  border-radius: 8rpx;
}
.travel-sub { font-size: 21rpx; color: rgba(255, 255, 255, 0.6); }
.travel-btn {
  height: 60rpx;
  padding: 0 24rpx;
  border-radius: 30rpx;
  background: linear-gradient(135deg, #35C3FF, #1668FF);
  display: flex;
  align-items: center;
  flex-shrink: 0;
  margin-left: 16rpx;
}
.travel-btn text { font-size: 24rpx; color: #FFF; font-weight: 700; }

/* ================= 12 业务 ================= */
.services-card { padding: 28rpx 16rpx 8rpx; }
.card-head { padding: 0 12rpx 24rpx; display: flex; align-items: baseline; gap: 14rpx; }
.card-sub { font-size: 21rpx; color: #A2AAB8; }
.services-grid { display: flex; flex-wrap: wrap; }
.s-item {
  width: 25%;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 28rpx;
}
.s-icon-wrap { position: relative; }
.s-badge {
  position: absolute;
  top: -8rpx;
  right: -18rpx;
  background: #FF4E12;
  color: #FFF;
  font-size: 17rpx;
  padding: 2rpx 10rpx;
  border-radius: 14rpx;
  font-weight: 600;
}
.s-name {
  margin-top: 14rpx;
  font-size: 23rpx;
  color: #333B48;
  font-weight: 500;
}

/* ================= 爱车 ================= */
.section-head-inline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 8rpx 28rpx 20rpx;
}
.car-card {
  margin: 0 24rpx 24rpx;
  padding: 28rpx;
  border-radius: 28rpx;
  background: linear-gradient(125deg, #2C3A4F 0%, #151D29 100%);
  box-shadow: 0 14rpx 32rpx rgba(21, 29, 41, 0.28);
}
.car-top { display: flex; align-items: center; }
.car-emoji-wrap {
  width: 90rpx;
  height: 90rpx;
  border-radius: 26rpx;
  background: rgba(255, 255, 255, 0.10);
  display: flex;
  align-items: center;
  justify-content: center;
}
.car-emoji { font-size: 46rpx; }
.car-info { flex: 1; min-width: 0; margin-left: 22rpx; display: flex; flex-direction: column; gap: 8rpx; }
.car-plate { font-size: 34rpx; font-weight: 700; color: #FFFFFF; letter-spacing: 2rpx; }
.car-brand { font-size: 22rpx; color: rgba(255, 255, 255, 0.5); }
.car-mileage { display: flex; align-items: baseline; gap: 4rpx; }
.mileage-num { font-size: 30rpx; font-weight: 700; color: #FFFFFF; }
.mileage-unit { font-size: 20rpx; color: rgba(255, 255, 255, 0.45); }
.car-chips { display: flex; gap: 16rpx; margin-top: 26rpx; }
.car-chip {
  flex: 1;
  background: rgba(255, 255, 255, 0.07);
  border-radius: 18rpx;
  padding: 18rpx 20rpx;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}
.chip-label { font-size: 20rpx; color: rgba(255, 255, 255, 0.42); }
.chip-value { font-size: 25rpx; color: #FFFFFF; font-weight: 600; }
.chip-days { font-size: 20rpx; color: #4CD7A0; }
.chip-days.warn { color: #FF7A5C; }

/* ================= 热门横滑 ================= */
.hscroll { width: 100%; white-space: nowrap; }
.hscroll-inner { display: inline-block; padding: 0 24rpx; font-size: 0; }
.hot-card {
  display: inline-block;
  vertical-align: top;
  width: 300rpx;
  margin-right: 20rpx;
  border-radius: 26rpx;
  overflow: hidden;
  background: #FFFFFF;
  box-shadow: 0 6rpx 24rpx rgba(20, 30, 50, 0.06);
  white-space: normal;
}
.hot-top {
  height: 128rpx;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}
.hot-emoji { font-size: 60rpx; }
.hot-tag {
  position: absolute;
  top: 14rpx;
  right: 14rpx;
  background: rgba(0, 0, 0, 0.22);
  color: #FFF;
  font-size: 18rpx;
  padding: 2rpx 10rpx;
  border-radius: 10rpx;
}
.hot-body { padding: 20rpx 22rpx 24rpx; }
.hot-name { display: block; font-size: 27rpx; font-weight: 700; color: #1A1D23; }
.hot-short { display: block; margin-top: 8rpx; font-size: 21rpx; color: #9AA3B0; }
.hot-foot { display: flex; align-items: center; justify-content: space-between; margin-top: 18rpx; }
.hot-price { font-size: 23rpx; color: #FF5A1F; font-weight: 600; }
.hot-go { font-size: 30rpx; color: #C9CFD9; }

/* ================= 商家 ================= */
.merchant-card { padding: 4rpx 24rpx; }
.merchant-row {
  display: flex;
  align-items: center;
  padding: 26rpx 0;
  border-bottom: 1rpx solid #F1F3F6;
}
.merchant-row.no-border { border-bottom: none; }
.merchant-logo {
  width: 92rpx;
  height: 92rpx;
  border-radius: 22rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.merchant-emoji { font-size: 44rpx; }
.merchant-info { flex: 1; min-width: 0; margin-left: 20rpx; }
.merchant-name { font-size: 27rpx; font-weight: 600; color: #1A1D23; max-width: 340rpx; }
.merchant-tier {
  font-size: 18rpx;
  color: #A97C2F;
  background: #FBF3E3;
  padding: 2rpx 8rpx;
  border-radius: 6rpx;
  flex-shrink: 0;
}
.merchant-meta { display: flex; align-items: center; gap: 10rpx; margin-top: 8rpx; font-size: 21rpx; color: #9AA3B0; }
.rating { color: #FF8A00; font-weight: 600; }
.merchant-dot { color: #D8DCE3; }
.merchant-tags { display: flex; gap: 10rpx; margin-top: 12rpx; }
.mini-tag {
  font-size: 18rpx;
  color: #6B7484;
  background: #F4F6F9;
  padding: 3rpx 10rpx;
  border-radius: 6rpx;
}
.merchant-arrow { font-size: 34rpx; color: #D2D7E0; margin-left: 8rpx; }

.merchant-empty { padding: 40rpx 0; display: flex; flex-direction: column; align-items: center; gap: 8rpx; }
.merchant-empty-ico { font-size: 56rpx; opacity: 0.5; }
.merchant-empty-title { font-size: 25rpx; font-weight: 600; color: #3A4250; }
.merchant-empty-sub { font-size: 20rpx; color: #A8B0BD; }

.footer-note {
  padding: 10rpx 0 20rpx;
  text-align: center;
  font-size: 19rpx;
  color: #B4BBC7;
}

</style>
