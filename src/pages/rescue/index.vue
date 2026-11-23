<template>
  <view class="page page-with-tabbar rescue-page">
    <!-- HERO -->
    <view class="hero" :style="{ paddingTop: topPad + 'px' }">
      <view class="hero-glow"></view>
      <view class="hero-glow2"></view>

      <view class="hero-top">
        <view class="hero-top-left">
          <text class="hero-title">应急救援</text>
          <text class="hero-live">● 实时在线</text>
        </view>
        <view class="call-btn" @click="callPhone">
          <text class="call-ico">📞</text>
        </view>
      </view>

      <text class="hero-big">24 小时道路救援</text>
      <text class="hero-sub">拖车 · 搭电 · 换胎 · 困境 · 抢修 · 高速协助</text>

      <!-- SOS -->
      <view class="sos-area">
        <view class="ring ring1"></view>
        <view class="ring ring2"></view>
        <view class="ring ring3"></view>
        <view class="sos-btn" @click="callRescue('tow')">
          <text class="sos-text">SOS</text>
          <text class="sos-label">一键呼叫</text>
        </view>
      </view>

      <view class="eta-bar">
        <view class="eta-item">
          <text class="eta-num">8</text>
          <text class="eta-unit">分钟</text>
          <text class="eta-label">平均到场</text>
        </view>
        <view class="eta-line"></view>
        <view class="eta-item">
          <text class="eta-num">32</text>
          <text class="eta-unit">辆</text>
          <text class="eta-label">在线救援车</text>
        </view>
        <view class="eta-line"></view>
        <view class="eta-item">
          <text class="eta-num">24</text>
          <text class="eta-unit">H</text>
          <text class="eta-label">全年无休</text>
        </view>
      </view>
    </view>

    <!-- 当前定位 -->
    <view class="loc-card">
      <view class="loc-icon">📍</view>
      <view class="loc-main">
        <text class="loc-label">当前位置</text>
        <text class="loc-addr ellipsis">{{ locText }}</text>
        <text class="loc-city">{{ state.city }} · {{ locationSourceText }}</text>
      </view>
      <text class="loc-refresh" :class="{ disabled: locating }" @click="relocate">{{ locating ? '定位中…' : '重新定位' }}</text>
    </view>

    <!-- 救援类型 -->
    <view class="section-head-inline">
      <text class="card-title">选择救援类型</text>
      <text class="section-more">明码标价</text>
    </view>

    <view class="types-card">
      <view
        v-for="t in RESCUE_TYPES"
        :key="t.id"
        class="type-item"
        @click="callRescue(t.id)"
      >
        <view class="type-icon">
          <text class="type-emoji">{{ t.icon }}</text>
        </view>
        <view class="type-main">
          <text class="type-name">{{ t.name }}</text>
          <text class="type-desc">{{ t.desc }}</text>
        </view>
        <view class="type-right">
          <text class="type-price">{{ t.price }}</text>
          <text class="type-arrow">›</text>
        </view>
      </view>
    </view>

    <!-- 附近救援资源 -->
    <view class="section-head-inline">
      <text class="card-title">附近救援车</text>
      <text class="section-more">就近调度</text>
    </view>

    <view class="card nearby-card">
      <view v-for="(r, i) in rescuers" :key="i" class="rescuer-row" :class="{ 'no-border': i === rescuers.length - 1 }">
        <view class="rescuer-avatar" :style="{ background: r.gradient }">
          <text>{{ r.icon }}</text>
        </view>
        <view class="rescuer-main">
          <view class="row gap12">
            <text class="rescuer-name">{{ r.plate }}</text>
            <text class="rescuer-tag">{{ r.type }}</text>
          </view>
          <text class="rescuer-meta">距您 {{ r.distance }} · 预计 {{ r.eta }} 分钟到达</text>
        </view>
        <view class="rescuer-status"><text>在线</text></view>
      </view>
    </view>

    <!-- 会员权益 -->
    <view class="benefit-card" @click="go('/pages/member/index')">
      <view class="benefit-left">
        <text class="benefit-title">👑 尊享会员专属</text>
        <text class="benefit-desc">全年不限次救援咨询 · 紧急调度优先 · 派单提速</text>
      </view>
      <view class="benefit-btn"><text>查看权益</text></view>
    </view>

    <view class="notice">
      <text class="notice-title">费用说明</text>
      <text class="notice-text">救援服务按实际项目明码标价，下单前即可看到预估费用。高速公路救援需按交管规定由指定单位实施，平台提供报警与调度协助。</text>
    </view>
  </view>

  <AppTabBar :current="2" />
</template>

<script setup>
import { ref, computed } from 'vue'
import AppTabBar from '@/components/AppTabBar.vue'
import { RESCUE_TYPES } from '@/data/mock'
import { state, go, toast } from '@/store/index'
import { locateAndSetCity } from '@/utils/location'

const locating = ref(false)

const locationSourceText = computed(() =>
  state.location && state.location.source === 'gps' ? '系统定位' : '手动选择城市'
)

const locText = computed(() => {
  if (state.location && state.location.source === 'gps') {
    return state.city + '（已获取坐标，详细地址请在呼叫页补充）'
  }
  return state.city + ' · 请选择城市或在呼叫页填写详细地址'
})

const topPad = ref(44)
// #ifndef H5
try {
  topPad.value = uni.getSystemInfoSync().statusBarHeight || 20
} catch (e) {
  topPad.value = 20
}
// #endif

const rescuers = [
  { plate: '救援车 07', type: '拖车 + 搭电', distance: '1.2km', eta: '6', icon: '🚛', gradient: 'linear-gradient(135deg,#FF5B4A,#C8071C)' },
  { plate: '救援车 12', type: '搭电 + 换胎', distance: '2.1km', eta: '9', icon: '🔋', gradient: 'linear-gradient(135deg,#4A8CF7,#1F5FD0)' },
  { plate: '救援车 23', type: '困境救援', distance: '3.4km', eta: '13', icon: '⛰️', gradient: 'linear-gradient(135deg,#9B7BFF,#6A3DF5)' }
]

function callRescue(type) {
  go('/pages/rescue/create?type=' + type)
}

function callPhone() {
  uni.makePhoneCall({
    phoneNumber: '4000001234',
    fail: () => toast('客服热线：400-000-1234')
  })
}

async function relocate() {
  if (locating.value) return
  locating.value = true
  const res = await locateAndSetCity()
  locating.value = false
  if (res.ok) {
    toast('已定位到 ' + res.city)
    return
  }
  uni.showModal({
    title: '定位失败',
    content: '请检查系统定位权限和网络后重试，也可以先手动选择城市，再在呼叫页填写详细地址。',
    showCancel: false,
    confirmText: '我知道了'
  })
}
</script>

<style scoped>
.rescue-page { background: #F4F5F7; }

/* HERO */
.hero {
  position: relative;
  padding: 0 32rpx 40rpx;
  background: linear-gradient(170deg, #2A0F0D 0%, #170A0A 60%, #0F0707 100%);
  overflow: hidden;
}
.hero-glow {
  position: absolute;
  top: -160rpx;
  left: 50%;
  margin-left: -300rpx;
  width: 600rpx;
  height: 600rpx;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(224, 43, 32, 0.45) 0%, rgba(224, 43, 32, 0) 68%);
}
.hero-glow2 {
  position: absolute;
  bottom: -200rpx;
  right: -120rpx;
  width: 400rpx;
  height: 400rpx;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 90, 31, 0.18) 0%, rgba(255, 90, 31, 0) 70%);
}
.hero-top {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 16rpx;
}
.hero-top-left { display: flex; align-items: center; gap: 14rpx; }
.hero-title { font-size: 34rpx; font-weight: 700; color: #FFFFFF; letter-spacing: 1rpx; }
.hero-live {
  font-size: 18rpx;
  color: #FF6B5A;
  border: 1rpx solid rgba(255, 107, 90, 0.4);
  border-radius: 6rpx;
  padding: 2rpx 8rpx;
}
.call-btn {
  width: 64rpx;
  height: 64rpx;
  border-radius: 32rpx;
  background: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}
.call-ico { font-size: 30rpx; }
.hero-big {
  position: relative;
  display: block;
  margin-top: 34rpx;
  font-size: 52rpx;
  font-weight: 800;
  color: #FFFFFF;
  letter-spacing: 1rpx;
}
.hero-sub {
  position: relative;
  display: block;
  margin-top: 12rpx;
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.42);
  letter-spacing: 1rpx;
}

.sos-area {
  position: relative;
  height: 380rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 10rpx;
}
.ring {
  position: absolute;
  border-radius: 50%;
  border: 2rpx solid rgba(224, 43, 32, 0.35);
}
.ring1 { width: 300rpx; height: 300rpx; animation: breathe 2.6s ease-in-out infinite; }
.ring2 { width: 360rpx; height: 360rpx; border-color: rgba(224, 43, 32, 0.22); animation: breathe 2.6s ease-in-out 0.4s infinite; }
.ring3 { width: 420rpx; height: 420rpx; border-color: rgba(224, 43, 32, 0.12); animation: breathe 2.6s ease-in-out 0.8s infinite; }
@keyframes breathe {
  0%, 100% { transform: scale(0.94); opacity: 0.55; }
  50% { transform: scale(1.04); opacity: 1; }
}
.sos-btn {
  position: relative;
  width: 240rpx;
  height: 240rpx;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #FF6B4A, #D0021B 70%);
  border: 10rpx solid rgba(255, 255, 255, 0.12);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 60rpx rgba(224, 43, 32, 0.55);
}
.sos-text {
  font-size: 62rpx;
  font-weight: 900;
  color: #FFFFFF;
  letter-spacing: 3rpx;
  font-style: italic;
  line-height: 1;
}
.sos-label {
  margin-top: 12rpx;
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.82);
  letter-spacing: 2rpx;
}

.eta-bar {
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.055);
  border-radius: 22rpx;
  padding: 22rpx 0;
  margin-top: 6rpx;
}
.eta-item { flex: 1; display: flex; flex-direction: column; align-items: center; }
.eta-num { font-size: 34rpx; font-weight: 700; color: #FFFFFF; line-height: 1; }
.eta-unit { font-size: 18rpx; color: rgba(255, 255, 255, 0.5); margin-top: 2rpx; }
.eta-label { font-size: 19rpx; color: rgba(255, 255, 255, 0.34); margin-top: 8rpx; }
.eta-line { width: 1rpx; height: 52rpx; background: rgba(255, 255, 255, 0.1); }

/* 定位 */
.loc-card {
  margin: -6rpx 24rpx 24rpx;
  background: #FFFFFF;
  border-radius: 22rpx;
  padding: 22rpx 24rpx;
  display: flex;
  align-items: center;
  box-shadow: 0 6rpx 24rpx rgba(20, 30, 50, 0.06);
}
.loc-icon { font-size: 30rpx; margin-right: 14rpx; }
.loc-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6rpx; }
.loc-label { font-size: 20rpx; color: #9AA3B0; }
.loc-addr { font-size: 24rpx; color: #1A1D23; font-weight: 500; }
.loc-city { font-size: 18rpx; color: #A8B0BD; }
.loc-refresh { font-size: 21rpx; color: #FF5A1F; padding-left: 16rpx; flex-shrink: 0; }
.loc-refresh.disabled { color: #B4BBC7; }

.section-head-inline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 8rpx 28rpx 20rpx;
}

/* 类型 */
.types-card {
  margin: 0 24rpx 24rpx;
  background: #FFFFFF;
  border-radius: 24rpx;
  padding: 6rpx 24rpx;
  box-shadow: 0 4rpx 20rpx rgba(20, 30, 50, 0.04);
}
.type-item {
  display: flex;
  align-items: center;
  padding: 24rpx 0;
  border-bottom: 1rpx solid #F2F4F7;
}
.type-item:last-child { border-bottom: none; }
.type-icon {
  width: 84rpx;
  height: 84rpx;
  border-radius: 22rpx;
  background: #FFF3F1;
  display: flex;
  align-items: center;
  justify-content: center;
}
.type-emoji { font-size: 40rpx; }
.type-main { flex: 1; min-width: 0; margin-left: 20rpx; display: flex; flex-direction: column; gap: 8rpx; }
.type-name { font-size: 28rpx; font-weight: 600; color: #1A1D23; }
.type-desc { font-size: 21rpx; color: #9AA3B0; }
.type-right { display: flex; align-items: center; gap: 8rpx; }
.type-price { font-size: 23rpx; color: #E02B20; font-weight: 600; }
.type-arrow { font-size: 32rpx; color: #D2D7E0; }

/* 救援车 */
.nearby-card { padding: 4rpx 24rpx; }
.rescuer-row {
  display: flex;
  align-items: center;
  padding: 22rpx 0;
  border-bottom: 1rpx solid #F2F4F7;
}
.rescuer-row.no-border { border-bottom: none; }
.rescuer-avatar {
  width: 76rpx;
  height: 76rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36rpx;
}
.rescuer-main { flex: 1; min-width: 0; margin-left: 18rpx; display: flex; flex-direction: column; gap: 8rpx; }
.rescuer-name { font-size: 26rpx; font-weight: 600; color: #1A1D23; }
.rescuer-tag { font-size: 18rpx; color: #6B7484; background: #F4F6F9; padding: 2rpx 10rpx; border-radius: 6rpx; }
.rescuer-meta { font-size: 21rpx; color: #9AA3B0; }
.rescuer-status { font-size: 19rpx; color: #0E9E6B; background: #E9F9F1; padding: 4rpx 12rpx; border-radius: 8rpx; }

/* 会员 */
.benefit-card {
  margin: 0 24rpx 24rpx;
  padding: 26rpx 24rpx;
  border-radius: 24rpx;
  background: linear-gradient(115deg, #2E2A22, #17140F);
  border: 2rpx solid rgba(201, 155, 74, 0.4);
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.benefit-left { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 10rpx; }
.benefit-title { font-size: 26rpx; font-weight: 700; color: #F3D9A4; }
.benefit-desc { font-size: 20rpx; color: rgba(243, 217, 164, 0.55); }
.benefit-btn {
  height: 56rpx;
  padding: 0 22rpx;
  border-radius: 28rpx;
  background: linear-gradient(135deg, #D8B06A, #A97C2F);
  display: flex;
  align-items: center;
}
.benefit-btn text { font-size: 21rpx; color: #2A1F0C; font-weight: 700; }

.notice {
  margin: 0 24rpx 24rpx;
  padding: 24rpx;
  border-radius: 20rpx;
  background: #FFFFFF;
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}
.notice-title { font-size: 23rpx; font-weight: 700; color: #3A4250; }
.notice-text { font-size: 21rpx; color: #8A93A3; line-height: 1.65; }
</style>
