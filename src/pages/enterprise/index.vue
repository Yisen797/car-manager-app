<template>
  <view class="page" style="padding-bottom: 200rpx">
    <view class="hero" :style="{ paddingTop: topPad + 'px' }">
      <view class="hero-glow"></view>
      <view class="hero-top">
        <view class="back" @click="back"><text class="back-arrow">‹</text></view>
        <text class="hero-title">企业会员</text>
        <view class="back" style="opacity: 0"></view>
      </view>

      <view class="hero-body">
        <text class="hero-badge">企业 / 车队 VIP</text>
        <view class="price-row">
          <text class="price-yen">¥</text>
          <text class="price-num">299</text>
          <text class="price-unit">/年</text>
        </view>
        <text class="hero-desc">绑定 5 台以内车辆 · 全年统一托管</text>
        <view class="hero-chips">
          <text v-for="c in adapt" :key="c" class="hero-chip">{{ c }}</text>
        </view>
      </view>
    </view>

    <!-- 认证状态 -->
    <view v-if="application" class="app-banner" @click="openApply">
      <text class="app-ico">🏢</text>
      <view class="app-main">
        <text class="app-name ellipsis">{{ application.company }}</text>
        <text class="app-status">{{ application.status === 'approved' ? '企业认证已通过' : '企业认证审核中' }}</text>
      </view>
      <text class="app-arrow">›</text>
    </view>

    <!-- 权益 -->
    <view class="card">
      <view class="sec-title">
        <view class="sec-bar"></view>
        <text>企业专属权益</text>
        <text class="sec-count">共 {{ benefits.length }} 项</text>
      </view>
      <view v-for="(b, i) in benefits" :key="i" class="benefit-row">
        <view class="bf-num"><text>{{ i + 1 }}</text></view>
        <text class="bf-text">{{ b }}</text>
      </view>
    </view>

    <!-- 车队托管 -->
    <view class="manage-card">
      <view class="manage-head">
        <text class="manage-title">车队统一托管</text>
        <text class="manage-sub">一个客户经理 · 一个台账 · 一站式办结</text>
      </view>
      <view class="manage-grid">
        <view v-for="m in manageItems" :key="m.label" class="manage-item">
          <text class="manage-ico">{{ m.icon }}</text>
          <text class="manage-name">{{ m.label }}</text>
          <text class="manage-desc">{{ m.desc }}</text>
        </view>
      </view>
    </view>

    <!-- 对比 -->
    <view class="card">
      <view class="sec-title">
        <view class="sec-bar"></view>
        <text>个人会员 vs 企业会员</text>
      </view>
      <view class="cmp-head">
        <text class="cmp-cell label"></text>
        <text class="cmp-cell head">个人尊享</text>
        <text class="cmp-cell head gold">企业VIP</text>
      </view>
      <view v-for="row in compare" :key="row.k" class="cmp-row">
        <text class="cmp-cell label">{{ row.k }}</text>
        <text class="cmp-cell">{{ row.a }}</text>
        <text class="cmp-cell gold">{{ row.b }}</text>
      </view>
    </view>

    <!-- 客服经理 -->
    <view class="manager-card">
      <view class="manager-avatar"><text>🧑‍💼</text></view>
      <view class="manager-main">
        <text class="manager-title">专属客户经理一对一</text>
        <text class="manager-desc">下单后 1 个工作日内配专属经理，全年 7×24 响应</text>
      </view>
    </view>

    <view class="tips">
      <text>📌 企业会员支持开具增值税发票，支持对公转账，可签订年度服务协议。</text>
    </view>

    <view class="fixed-bar">
      <view class="bar-left">
        <view class="bar-price-row">
          <text class="bar-yen">¥</text>
          <text class="bar-price">299</text>
          <text class="bar-unit">/年</text>
        </view>
        <text class="bar-note">5 台车统一托管</text>
      </view>
      <view class="bar-ghost" @click="openApply"><text>企业认证</text></view>
      <view class="bar-btn" @click="openNow"><text>立即开通</text></view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { MEMBER_TIERS } from '@/data/mock'
import { currentEnterpriseApplication, go, toast } from '@/store/index'

const application = computed(() => currentEnterpriseApplication())

function openApply() {
  go('/pages/enterprise/apply')
}

const topPad = ref(44)
// #ifndef H5
try {
  topPad.value = uni.getSystemInfoSync().statusBarHeight || 20
} catch (e) {
  topPad.value = 20
}
// #endif

const enterpriseTier = MEMBER_TIERS.find(t => t.id === 'enterprise')
const benefits = enterpriseTier ? enterpriseTier.benefits : []

const adapt = ['工厂', '公司', '个体户', '工程车队', '运营车队', '多车家庭']

const manageItems = [
  { icon: '📅', label: '批量年审', desc: '一次提交全部办理' },
  { icon: '📋', label: '批量违章', desc: '台账统一处理' },
  { icon: '📄', label: '批量过户', desc: '资料统一整理' },
  { icon: '🛡️', label: '团险定制', desc: '统一对接理赔' }
]

const compare = [
  { k: '可绑定车辆', a: '1 台', b: '5 台以内' },
  { k: '年审代办', a: '免跑腿费', b: '批量统一办理' },
  { k: '车险方案', a: '渠道底价', b: '团报定制方案' },
  { k: '救援调度', a: '优先', b: '绿色通道' },
  { k: '对接方式', a: '在线客服', b: '专属客户经理' }
]

function back() {
  const pages = getCurrentPages()
  if (pages.length > 1) uni.navigateBack()
  else uni.reLaunch({ url: '/pages/index/index' })
}

function openNow() {
  go('/pages/member/pay?tier=enterprise')
}
</script>

<style scoped>
.hero {
  position: relative;
  padding: 0 32rpx 80rpx;
  background: linear-gradient(160deg, #16283D 0%, #0D1725 55%, #080D14 100%);
  overflow: hidden;
}
.hero-glow {
  position: absolute;
  top: -170rpx;
  right: -110rpx;
  width: 460rpx;
  height: 460rpx;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(201, 155, 74, 0.3), transparent 70%);
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
.hero-body { position: relative; display: flex; flex-direction: column; align-items: center; margin-top: 26rpx; }
.hero-badge {
  font-size: 20rpx;
  color: #E8C98A;
  background: rgba(201, 155, 74, 0.16);
  border: 1rpx solid rgba(201, 155, 74, 0.42);
  padding: 6rpx 20rpx;
  border-radius: 24rpx;
  letter-spacing: 2rpx;
}
.price-row { display: flex; align-items: baseline; margin-top: 22rpx; }
.price-yen { font-size: 34rpx; color: #F3D9A4; font-weight: 700; }
.price-num { font-size: 92rpx; color: #F3D9A4; font-weight: 800; line-height: 1; }
.price-unit { font-size: 24rpx; color: rgba(243, 217, 164, 0.6); margin-left: 8rpx; }
.hero-desc { margin-top: 16rpx; font-size: 23rpx; color: rgba(255, 255, 255, 0.5); }
.hero-chips { display: flex; flex-wrap: wrap; justify-content: center; gap: 12rpx; margin-top: 26rpx; }
.hero-chip {
  font-size: 19rpx;
  color: rgba(255, 255, 255, 0.62);
  background: rgba(255, 255, 255, 0.08);
  padding: 5rpx 16rpx;
  border-radius: 20rpx;
}

.sec-title {
  display: flex;
  align-items: center;
  gap: 12rpx;
  font-size: 29rpx;
  font-weight: 700;
  color: #1A1D23;
  margin-bottom: 22rpx;
}
.sec-bar { width: 8rpx; height: 26rpx; border-radius: 4rpx; background: linear-gradient(180deg, #D8B06A, #A97C2F); }
.sec-count { font-size: 20rpx; color: #A2AAB8; font-weight: 400; }

.benefit-row { display: flex; align-items: flex-start; padding: 12rpx 0; }
.bf-num {
  width: 36rpx;
  height: 36rpx;
  border-radius: 18rpx;
  background: #FBF3E3;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 2rpx;
}
.bf-num text { font-size: 18rpx; color: #A97C2F; font-weight: 700; }
.bf-text { flex: 1; margin-left: 16rpx; font-size: 23rpx; color: #3A4250; line-height: 1.55; }

.manage-card {
  margin: 0 24rpx 24rpx;
  padding: 28rpx;
  border-radius: 26rpx;
  background: linear-gradient(140deg, #1F2937, #10161F);
}
.manage-head { display: flex; flex-direction: column; gap: 8rpx; }
.manage-title { font-size: 29rpx; font-weight: 700; color: #FFFFFF; }
.manage-sub { font-size: 20rpx; color: rgba(255, 255, 255, 0.38); }
.manage-grid { display: flex; margin-top: 26rpx; }
.manage-item { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 8rpx; }
.manage-ico { font-size: 34rpx; }
.manage-name { font-size: 21rpx; font-weight: 600; color: #FFFFFF; }
.manage-desc { font-size: 17rpx; color: rgba(255, 255, 255, 0.35); text-align: center; }

.cmp-head { display: flex; padding-bottom: 14rpx; border-bottom: 1rpx solid #F2F4F7; }
.cmp-row { display: flex; padding: 16rpx 0; border-bottom: 1rpx solid #F8F9FB; }
.cmp-row:last-child { border-bottom: none; }
.cmp-cell { flex: 1; font-size: 21rpx; color: #4A5261; text-align: center; }
.cmp-cell.label { flex: 1.1; color: #9AA3B0; text-align: left; font-size: 20rpx; }
.cmp-cell.head { font-size: 21rpx; font-weight: 700; color: #1A1D23; }
.cmp-cell.gold { color: #A97C2F; font-weight: 600; }

.manager-card {
  margin: 0 24rpx 24rpx;
  padding: 24rpx 26rpx;
  border-radius: 22rpx;
  background: #FFFFFF;
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.manager-avatar {
  width: 76rpx;
  height: 76rpx;
  border-radius: 38rpx;
  background: #F4F6F9;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36rpx;
}
.manager-main { flex: 1; display: flex; flex-direction: column; gap: 8rpx; }
.manager-title { font-size: 25rpx; font-weight: 600; color: #1A1D23; }
.manager-desc { font-size: 20rpx; color: #9AA3B0; line-height: 1.5; }

.tips { padding: 0 36rpx; }
.tips text { font-size: 20rpx; color: #A8B0BD; line-height: 1.6; }

.bar-left { flex: 1; display: flex; flex-direction: column; gap: 4rpx; }
.bar-price-row { display: flex; align-items: baseline; }
.bar-yen { font-size: 22rpx; color: #A97C2F; font-weight: 700; }
.bar-price { font-size: 42rpx; color: #A97C2F; font-weight: 800; line-height: 1; }
.bar-unit { font-size: 20rpx; color: #9AA3B0; margin-left: 6rpx; }
.bar-note { font-size: 19rpx; color: #9AA3B0; }
.app-banner {
  margin: 0 24rpx 24rpx;
  padding: 22rpx 24rpx;
  border-radius: 20rpx;
  background: #FFFFFF;
  border: 1rpx solid #E9D9B8;
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.app-ico { font-size: 34rpx; }
.app-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6rpx; }
.app-name { font-size: 25rpx; font-weight: 600; color: #1A1D23; }
.app-status { font-size: 20rpx; color: #A97C2F; }
.app-arrow { font-size: 30rpx; color: #C3CAD6; }

.bar-ghost {
  width: 180rpx;
  height: 90rpx;
  border-radius: 45rpx;
  background: rgba(216, 176, 106, 0.12);
  border: 2rpx solid rgba(216, 176, 106, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 14rpx;
}
.bar-ghost text { font-size: 25rpx; color: #E0B96A; font-weight: 600; }
.bar-btn {
  width: 270rpx;
  height: 90rpx;
  border-radius: 45rpx;
  background: linear-gradient(135deg, #D8B06A, #A97C2F);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 10rpx 26rpx rgba(169, 124, 47, 0.3);
}
.bar-btn text { font-size: 30rpx; color: #2A1F0C; font-weight: 700; }
</style>
