<template>
  <view class="page" style="padding-bottom: 200rpx">
    <view class="hero" :style="{ paddingTop: topPad + 'px' }">
      <view class="hero-glow"></view>
      <view class="hero-top">
        <view class="back" @click="back"><text class="back-arrow">‹</text></view>
        <text class="hero-title">会员中心</text>
        <view class="back" style="opacity: 0"></view>
      </view>

      <view class="hero-body">
        <text class="hero-crown">👑</text>
        <view class="hero-main">
          <text class="hero-status">{{ member.active ? member.name : '尚未开通会员' }}</text>
          <text class="hero-sub">{{ member.active ? '有效期至 ' + member.expire : '一台车 · 一个会员 · 全年无忧' }}</text>
        </view>
      </view>

      <view class="hero-stats">
        <view class="stat">
          <text class="stat-num">12</text>
          <text class="stat-label">业务链条</text>
        </view>
        <view class="stat-line"></view>
        <view class="stat">
          <text class="stat-num">10+</text>
          <text class="stat-label">会员权益</text>
        </view>
        <view class="stat-line"></view>
        <view class="stat">
          <text class="stat-num">24H</text>
          <text class="stat-label">应急响应</text>
        </view>
      </view>
    </view>

    <!-- 档位选择 -->
    <view class="tier-row">
      <view
        v-for="t in tiers"
        :key="t.id"
        class="tier-card"
        :class="{ active: selected === t.id }"
        @click="selected = t.id"
      >
        <text v-if="t.recommended" class="tier-flag">推荐</text>
        <text class="tier-name">{{ t.name }}</text>
        <view class="tier-price">
          <text class="tier-yen">¥</text>
          <text class="tier-num">{{ t.price }}</text>
        </view>
        <text class="tier-tag">{{ t.tag }}</text>
      </view>
    </view>

    <!-- 权益 -->
    <view class="card benefit-card">
      <view class="benefit-head">
        <text class="benefit-title">{{ current.name }}权益</text>
        <text class="benefit-sub">共 {{ current.benefits.length }} 项</text>
      </view>
      <view v-for="(b, i) in current.benefits" :key="i" class="benefit-row">
        <view class="check"><text>✓</text></view>
        <text class="benefit-text">{{ b }}</text>
      </view>
    </view>

    <!-- 说明 -->
    <view class="card notes-card">
      <view class="note-row">
        <text class="note-ico">📌</text>
        <text class="note-text">会员权益自开通之日起生效，有效期 1 年，到期可续费。</text>
      </view>
      <view class="note-row">
        <text class="note-ico">⚖️</text>
        <text class="note-text">所有车务仅做代办跑腿、资料整理与流程协助，不代办扣分、不伪造材料。</text>
      </view>
      <view class="note-row">
        <text class="note-ico">🤝</text>
        <text class="note-text">维修、租车、代驾、跑腿、救援均对接正规资质合作团队。</text>
      </view>
    </view>

    <view class="faq" @click="go('/pages/enterprise/index')">
      <text class="faq-text">企业 / 车队用户？了解企业 VIP 会员</text>
      <text class="faq-arrow">›</text>
    </view>

    <view class="fixed-bar">
      <view class="bar-left">
        <view class="bar-price-row">
          <text class="bar-yen">¥</text>
          <text class="bar-price">{{ current.price }}</text>
          <text class="bar-unit">/年</text>
        </view>
        <text class="bar-note">{{ member.active ? '续费后有效期顺延 1 年' : '开通即享全年托管' }}</text>
      </view>
      <view class="bar-btn" @click="openNow">
        <text>{{ member.active ? '立即续费' : '立即开通' }}</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { MEMBER_TIERS } from '@/data/mock'
import { state, memberInfo, go } from '@/store/index'

const topPad = ref(44)
// #ifndef H5
try {
  topPad.value = uni.getSystemInfoSync().statusBarHeight || 20
} catch (e) {
  topPad.value = 20
}
// #endif

const tiers = MEMBER_TIERS
const selected = ref(state.user.memberTier === 'none' ? 'premium' : state.user.memberTier)
const member = computed(() => memberInfo())
const current = computed(() => tiers.find(t => t.id === selected.value) || tiers[1])

function back() {
  const pages = getCurrentPages()
  if (pages.length > 1) uni.navigateBack()
  else uni.reLaunch({ url: '/pages/index/index' })
}

function openNow() {
  if (current.value.id === 'enterprise') {
    go('/pages/enterprise/index')
    return
  }
  go('/pages/member/pay?tier=' + current.value.id)
}
</script>

<style scoped>
.hero {
  position: relative;
  padding: 0 32rpx 100rpx;
  background: linear-gradient(160deg, #2E2A22 0%, #17140F 55%, #0D0C0A 100%);
  overflow: hidden;
}
.hero-glow {
  position: absolute;
  top: -180rpx;
  right: -120rpx;
  width: 480rpx;
  height: 480rpx;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(201, 155, 74, 0.36), transparent 70%);
}
.hero-top {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 16rpx;
}
.back {
  width: 64rpx;
  height: 64rpx;
  border-radius: 32rpx;
  background: rgba(255, 255, 255, 0.09);
  display: flex;
  align-items: center;
  justify-content: center;
}
.back-arrow { font-size: 50rpx; color: #FFFFFF; margin-top: -6rpx; font-weight: 300; }
.hero-title { font-size: 30rpx; font-weight: 600; color: #FFFFFF; }

.hero-body { position: relative; display: flex; align-items: center; margin-top: 36rpx; }
.hero-crown { font-size: 62rpx; }
.hero-main { margin-left: 20rpx; display: flex; flex-direction: column; gap: 10rpx; }
.hero-status { font-size: 38rpx; font-weight: 700; color: #F3D9A4; letter-spacing: 1rpx; }
.hero-sub { font-size: 21rpx; color: rgba(243, 217, 164, 0.55); }

.hero-stats {
  position: relative;
  display: flex;
  align-items: center;
  margin-top: 36rpx;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 20rpx;
  padding: 22rpx 0;
}
.stat { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6rpx; }
.stat-num { font-size: 30rpx; font-weight: 700; color: #FFFFFF; }
.stat-label { font-size: 19rpx; color: rgba(255, 255, 255, 0.38); }
.stat-line { width: 1rpx; height: 40rpx; background: rgba(255, 255, 255, 0.1); }

.tier-row {
  position: relative;
  margin: -66rpx 24rpx 24rpx;
  display: flex;
  gap: 14rpx;
}
.tier-card {
  flex: 1;
  background: #FFFFFF;
  border-radius: 22rpx;
  padding: 26rpx 10rpx 22rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  border: 2rpx solid transparent;
  position: relative;
  box-shadow: 0 6rpx 24rpx rgba(20, 30, 50, 0.06);
}
.tier-card.active {
  border-color: #C99B4A;
  background: linear-gradient(160deg, #FFFDF7, #FFFFFF);
  box-shadow: 0 10rpx 30rpx rgba(201, 155, 74, 0.22);
}
.tier-flag {
  position: absolute;
  top: -14rpx;
  right: -6rpx;
  background: linear-gradient(135deg, #FF7A3D, #FF4E12);
  color: #FFF;
  font-size: 16rpx;
  padding: 3rpx 12rpx;
  border-radius: 12rpx;
  font-weight: 600;
}
.tier-name { font-size: 24rpx; color: #3A4250; font-weight: 600; }
.tier-price { display: flex; align-items: baseline; margin-top: 12rpx; }
.tier-yen { font-size: 20rpx; color: #1A1D23; font-weight: 700; }
.tier-num { font-size: 40rpx; color: #1A1D23; font-weight: 800; line-height: 1; }
.tier-tag { margin-top: 10rpx; font-size: 17rpx; color: #9AA3B0; }
.tier-card.active .tier-name { color: #8A6320; }
.tier-card.active .tier-tag { color: #B08E52; }

.benefit-card { padding: 28rpx; }
.benefit-head { display: flex; align-items: baseline; gap: 14rpx; margin-bottom: 22rpx; }
.benefit-title { font-size: 30rpx; font-weight: 700; color: #1A1D23; }
.benefit-sub { font-size: 20rpx; color: #A2AAB8; }
.benefit-row { display: flex; align-items: flex-start; padding: 12rpx 0; }
.check {
  width: 34rpx;
  height: 34rpx;
  border-radius: 17rpx;
  background: #FFF1EB;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 2rpx;
}
.check text { font-size: 18rpx; color: #FF5A1F; font-weight: 700; }
.benefit-text { margin-left: 16rpx; font-size: 24rpx; color: #3A4250; line-height: 1.5; }

.notes-card { padding: 24rpx 28rpx; display: flex; flex-direction: column; gap: 18rpx; }
.note-row { display: flex; gap: 12rpx; }
.note-ico { font-size: 22rpx; }
.note-text { flex: 1; font-size: 20rpx; color: #8A93A3; line-height: 1.6; }

.faq {
  margin: 0 24rpx 24rpx;
  padding: 24rpx 28rpx;
  background: #FFFFFF;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.faq-text { font-size: 24rpx; color: #3A4250; }
.faq-arrow { font-size: 30rpx; color: #D2D7E0; }

.bar-left { flex: 1; display: flex; flex-direction: column; gap: 4rpx; }
.bar-price-row { display: flex; align-items: baseline; }
.bar-yen { font-size: 22rpx; color: #FF5A1F; font-weight: 700; }
.bar-price { font-size: 42rpx; color: #FF5A1F; font-weight: 800; line-height: 1; }
.bar-unit { font-size: 20rpx; color: #9AA3B0; margin-left: 6rpx; }
.bar-note { font-size: 19rpx; color: #9AA3B0; }
.bar-btn {
  width: 320rpx;
  height: 90rpx;
  border-radius: 45rpx;
  background: linear-gradient(135deg, #D8B06A, #A97C2F);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 10rpx 26rpx rgba(169, 124, 47, 0.32);
}
.bar-btn text { font-size: 30rpx; color: #2A1F0C; font-weight: 700; }
</style>
