<template>
  <view class="page" v-if="service" :style="{ paddingBottom: '160rpx' }">
    <!-- HERO -->
    <view class="hero" :style="{ background: service.gradient }">
      <view class="hero-mask"></view>
      <view class="hero-top">
        <view class="back" @click="back"><text class="back-arrow">‹</text></view>
        <text class="hero-title">{{ service.name }}</text>
        <view class="back" style="opacity: 0"></view>
      </view>

      <view class="hero-body">
        <view class="hero-emoji-wrap">
          <text class="hero-emoji">{{ service.icon }}</text>
        </view>
        <text class="hero-name">{{ service.name }}</text>
        <text class="hero-short">{{ service.short }}</text>
        <view class="hero-tags">
          <text v-for="t in service.tags" :key="t" class="hero-tag">{{ t }}</text>
        </view>
      </view>
    </view>

    <!-- 会员提示（第三方承运服务不适用） -->
    <view class="member-tip" v-if="!service.hub" @click="go('/pages/member/index')">
      <text class="member-tip-ico">👑</text>
      <text class="member-tip-text">{{ member.active ? '尊享会员权益已生效，本服务优先安排' : '开通会员，本服务享专属折扣与免服务费' }}</text>
      <text class="member-tip-arrow">›</text>
    </view>

    <!-- 服务项目 -->
    <view class="card">
      <view class="sec-title">
        <view class="sec-bar"></view>
        <text>服务项目</text>
      </view>
      <view v-for="(it, i) in service.items" :key="i" class="item-row">
        <view class="item-num"><text>{{ i + 1 }}</text></view>
        <view class="item-main">
          <text class="item-name">{{ it.name }}</text>
          <text class="item-desc">{{ it.desc }}</text>
        </view>
      </view>
    </view>

    <!-- 附近门店（高德 POI 实时数据） -->
    <view v-if="poiCategory" class="card nearby-entry" @click="openNearby">
      <view class="nearby-main">
        <text class="nearby-title">📍 附近门店</text>
        <text class="nearby-desc">高德实时数据 · 距离 · 电话 · 导航</text>
      </view>
      <text class="nearby-arrow">›</text>
    </view>

    <!-- 办理流程 -->
    <view class="card">
      <view class="sec-title">
        <view class="sec-bar"></view>
        <text>办理流程</text>
      </view>
      <view class="steps">
        <view v-for="(st, i) in service.steps" :key="i" class="step">
          <view class="step-rail">
            <view class="step-dot" :class="{ last: i === service.steps.length - 1 }">
              <text class="step-idx">{{ i + 1 }}</text>
            </view>
            <view v-if="i !== service.steps.length - 1" class="step-line"></view>
          </view>
          <text class="step-text">{{ st }}</text>
        </view>
      </view>
    </view>

    <!-- 平台保障 -->
    <view class="card">
      <view class="sec-title">
        <view class="sec-bar"></view>
        <text>平台保障</text>
      </view>
      <view class="guards">
        <view class="guard">
          <text class="guard-ico">✅</text>
          <text class="guard-name">正规资质</text>
          <text class="guard-desc">持证合作团队</text>
        </view>
        <view class="guard">
          <text class="guard-ico">💰</text>
          <text class="guard-name">明码标价</text>
          <text class="guard-desc">无隐形收费</text>
        </view>
        <view class="guard">
          <text class="guard-ico">🛟</text>
          <text class="guard-name">售后兜底</text>
          <text class="guard-desc">全程可追溯</text>
        </view>
      </view>
    </view>

    <!-- 推荐商家 -->
    <view class="card" v-if="recommend.length && !service.hub">
      <view class="sec-title between">
        <view class="row gap12">
          <view class="sec-bar"></view>
          <text>推荐商家</text>
        </view>
        <text class="more" @click="go('/pages/merchant/list')">更多 ›</text>
      </view>
      <view
        v-for="(m, i) in recommend"
        :key="m.id"
        class="m-row"
        :class="{ 'no-border': i === recommend.length - 1 }"
        @click="go('/pages/merchant/detail?id=' + m.id)"
      >
        <view class="m-logo" :style="{ background: m.gradient }">
          <text class="m-emoji">{{ m.emoji }}</text>
        </view>
        <view class="m-info">
          <text class="m-name ellipsis">{{ m.name }}</text>
          <text class="m-meta">★ {{ m.rating }} · {{ m.distance }} · {{ m.tier }}会员</text>
        </view>
        <text class="m-arrow">›</text>
      </view>
    </view>

    <!-- 温馨提示 -->
    <view class="notice">
      <text class="notice-title">温馨提示</text>
      <text class="notice-text">{{ service.notice }}</text>
    </view>

    <!-- 底栏 -->
    <view class="fixed-bar">
      <view class="bar-price">
        <text class="bar-label">服务价格</text>
        <text class="bar-value">{{ service.priceLabel }}</text>
      </view>
      <view class="bar-btn btn btn-primary" @click="book">
        <text>{{ service.id === 'rescue' ? '立即呼叫救援' : service.hub ? '去叫车' : '立即预约' }}</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { SERVICES } from '@/data/mock'
import { SERVICE_POI_CATEGORY } from '@/data/nearby.mjs'
import { state, memberInfo, merchantsInCity, go } from '@/store/index'

const id = ref('maintain')
const member = computed(() => memberInfo())
const service = computed(() => SERVICES.find(s => s.id === id.value) || SERVICES[0])
const recommend = computed(() => merchantsInCity(state.city).slice(0, 2))
const poiCategory = computed(() => SERVICE_POI_CATEGORY[service.value.id] || '')

onLoad(options => {
  if (options && options.id) id.value = options.id
})

function back() {
  const pages = getCurrentPages()
  if (pages.length > 1) uni.navigateBack()
  else uni.reLaunch({ url: '/pages/index/index' })
}

function openNearby() {
  go('/pages/nearby/index?serviceId=' + service.value.id)
}

function book() {
  if (service.value.hub) {
    go(service.value.hub)
    return
  }
  if (service.value.id === 'rescue') {
    go('/pages/rescue/index')
    return
  }
  go('/pages/booking/index?serviceId=' + service.value.id)
}
</script>

<style scoped>
.hero {
  position: relative;
  padding: 0 32rpx 90rpx;
  overflow: hidden;
}
.hero-mask {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 80% 10%, rgba(255, 255, 255, 0.28), transparent 60%);
}
.hero-top {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 44px;
  height: calc(44px + 88rpx);
}
.back {
  width: 64rpx;
  height: 64rpx;
  border-radius: 32rpx;
  background: rgba(0, 0, 0, 0.16);
  display: flex;
  align-items: center;
  justify-content: center;
}
.back-arrow {
  font-size: 52rpx;
  color: #FFFFFF;
  margin-top: -6rpx;
  font-weight: 300;
}
.hero-title {
  font-size: 30rpx;
  color: rgba(255, 255, 255, 0.9);
  font-weight: 600;
}
.hero-body {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 10rpx;
}
.hero-emoji-wrap {
  width: 132rpx;
  height: 132rpx;
  border-radius: 40rpx;
  background: rgba(255, 255, 255, 0.92);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 10rpx 30rpx rgba(0, 0, 0, 0.14);
}
.hero-emoji { font-size: 68rpx; }
.hero-name {
  margin-top: 20rpx;
  font-size: 42rpx;
  font-weight: 700;
  color: #FFFFFF;
  letter-spacing: 2rpx;
}
.hero-short {
  margin-top: 10rpx;
  font-size: 23rpx;
  color: rgba(255, 255, 255, 0.75);
}
.hero-tags {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12rpx;
  margin-top: 22rpx;
}
.hero-tag {
  font-size: 20rpx;
  color: rgba(255, 255, 255, 0.92);
  background: rgba(255, 255, 255, 0.18);
  padding: 5rpx 14rpx;
  border-radius: 20rpx;
}

.member-tip {
  margin: -46rpx 24rpx 24rpx;
  position: relative;
  background: linear-gradient(100deg, #2E2A22, #191612);
  border: 2rpx solid rgba(201, 155, 74, 0.45);
  border-radius: 22rpx;
  padding: 20rpx 22rpx;
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.member-tip-ico { font-size: 28rpx; }
.member-tip-text {
  flex: 1;
  font-size: 21rpx;
  color: #F3D9A4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.member-tip-arrow { font-size: 28rpx; color: rgba(243, 217, 164, 0.6); }

.sec-title {
  display: flex;
  align-items: center;
  gap: 12rpx;
  font-size: 30rpx;
  font-weight: 700;
  color: #1A1D23;
  margin-bottom: 22rpx;
}
.sec-bar {
  width: 8rpx;
  height: 28rpx;
  border-radius: 4rpx;
  background: linear-gradient(180deg, #FF7A3D, #FF4E12);
}
.more { font-size: 22rpx; color: #9AA3B0; font-weight: 400; }

.item-row { display: flex; padding: 18rpx 0; align-items: flex-start; }
.item-num {
  width: 40rpx;
  height: 40rpx;
  border-radius: 20rpx;
  background: #FFF1EB;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 2rpx;
}
.item-num text { font-size: 21rpx; color: #FF5A1F; font-weight: 700; }
.item-main { margin-left: 18rpx; display: flex; flex-direction: column; gap: 6rpx; }
.item-name { font-size: 27rpx; font-weight: 600; color: #1A1D23; }
.item-desc { font-size: 22rpx; color: #8A93A3; }

.steps { padding-left: 6rpx; }
.step { display: flex; align-items: flex-start; }
.step-rail { display: flex; flex-direction: column; align-items: center; }
.step-dot {
  width: 44rpx;
  height: 44rpx;
  border-radius: 22rpx;
  background: #FFF1EB;
  border: 2rpx solid #FFC4A8;
  display: flex;
  align-items: center;
  justify-content: center;
}
.step-dot.last { background: #FF5A1F; border-color: #FF5A1F; }
.step-dot.last .step-idx { color: #FFFFFF; }
.step-idx { font-size: 21rpx; color: #FF5A1F; font-weight: 700; }
.step-line { width: 2rpx; height: 40rpx; background: #F0E2D9; }
.step-text {
  margin-left: 20rpx;
  font-size: 26rpx;
  color: #3A4250;
  padding-top: 8rpx;
}

.nearby-entry {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}
.nearby-main { flex: 1; display: flex; flex-direction: column; gap: 8rpx; }
.nearby-title { font-size: 27rpx; font-weight: 600; color: #1A1D23; }
.nearby-desc { font-size: 21rpx; color: #A2AAB8; }
.nearby-arrow { font-size: 34rpx; color: #C9CFD9; }

.guards { display: flex; }
.guard { flex: 1; display: flex; flex-direction: column; align-items: center; }
.guard-ico { font-size: 36rpx; }
.guard-name { margin-top: 10rpx; font-size: 24rpx; font-weight: 600; color: #1A1D23; }
.guard-desc { margin-top: 4rpx; font-size: 19rpx; color: #9AA3B0; }

.m-row {
  display: flex;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #F2F4F7;
}
.m-row.no-border { border-bottom: none; }
.m-logo {
  width: 80rpx;
  height: 80rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.m-emoji { font-size: 38rpx; }
.m-info { flex: 1; min-width: 0; margin-left: 18rpx; display: flex; flex-direction: column; gap: 8rpx; }
.m-name { font-size: 26rpx; font-weight: 600; color: #1A1D23; }
.m-meta { font-size: 21rpx; color: #9AA3B0; }
.m-arrow { font-size: 32rpx; color: #D2D7E0; }

.notice {
  margin: 0 24rpx 24rpx;
  padding: 24rpx;
  border-radius: 20rpx;
  background: #FFFBF2;
  border: 1rpx solid #F5E6C8;
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}
.notice-title { font-size: 23rpx; font-weight: 700; color: #A97C2F; }
.notice-text { font-size: 21rpx; color: #8A7A5E; line-height: 1.6; }

.bar-price { display: flex; flex-direction: column; gap: 4rpx; flex: 1; }
.bar-label { font-size: 20rpx; color: #9AA3B0; }
.bar-value { font-size: 30rpx; font-weight: 700; color: #FF5A1F; }
.bar-btn { width: 320rpx; }
.bar-btn text { font-size: 30rpx; color: #FFFFFF; font-weight: 600; }
</style>
