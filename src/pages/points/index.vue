<template>
  <view class="page">
    <PageHeader title="积分商城" />

    <!-- 积分卡 -->
    <view class="points-hero">
      <view class="glow"></view>
      <text class="ph-label">我的积分</text>
      <view class="ph-row">
        <text class="ph-num">{{ state.user.points }}</text>
        <text class="ph-unit">分</text>
      </view>
      <text class="ph-desc">100 积分 = 1 元 · 下单时可直接抵扣</text>
      <view class="ph-link" @click="scrollToLog"><text>查看积分明细 ›</text></view>
    </view>

    <!-- 商品 -->
    <view class="section-head">
      <text class="card-title">积分兑换</text>
      <text class="section-more">共 {{ goods.length }} 件</text>
    </view>

    <view class="goods-grid">
      <view v-for="g in goods" :key="g.id" class="goods-card">
        <view class="goods-icon" :style="{ background: g.gradient }">
          <text>{{ g.icon }}</text>
        </view>
        <text v-if="g.tag" class="goods-tag">{{ g.tag }}</text>
        <text class="goods-name">{{ g.name }}</text>
        <text class="goods-desc">{{ g.desc }}</text>
        <view class="goods-foot">
          <view class="goods-cost">
            <text class="cost-num">{{ g.cost }}</text>
            <text class="cost-unit">积分</text>
          </view>
          <view class="goods-btn" :class="{ disabled: state.user.points < g.cost }" @click="redeem(g)">
            <text>兑换</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 规则 -->
    <view class="notice">
      <text class="notice-title">积分规则</text>
      <text v-for="r in rules" :key="r" class="notice-text">· {{ r }}</text>
    </view>

    <!-- 积分明细 -->
    <view id="points-log" class="card">
      <view class="sec-title">
        <view class="sec-bar"></view>
        <text>积分明细</text>
      </view>
      <view
        v-for="(log, i) in state.pointsLog"
        :key="log.id"
        class="log-row"
        :class="{ last: i === state.pointsLog.length - 1 }"
      >
        <view class="log-main">
          <text class="log-title">{{ log.title }}</text>
          <text class="log-time">{{ log.time }}</text>
        </view>
        <text class="log-amount" :class="{ plus: log.amount > 0 }">
          {{ log.amount > 0 ? '+' : '' }}{{ log.amount }}
        </text>
      </view>
      <view v-if="!state.pointsLog.length" class="empty">
        <text class="empty-text">暂无积分记录</text>
      </view>
    </view>

    <!-- 兑换记录 -->
    <view v-if="state.redemptions.length" class="card">
      <view class="sec-title">
        <view class="sec-bar"></view>
        <text>兑换记录</text>
      </view>
      <view v-for="r in state.redemptions" :key="r.id" class="log-row">
        <view class="log-main">
          <text class="log-title">{{ r.name }}</text>
          <text class="log-time">{{ r.time }}</text>
        </view>
        <text class="log-amount">-{{ r.cost }}</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import PageHeader from '@/components/PageHeader.vue'
import { state, redeemGoods, toast } from '@/store/index'
import { POINTS_GOODS, POINTS_RULES } from '@/data/points'

const goods = POINTS_GOODS
const rules = POINTS_RULES

function redeem(g) {
  if (state.user.points < g.cost) {
    toast('积分不足，下单消费可以赚积分')
    return
  }
  uni.showModal({
    title: '确认兑换',
    content: `使用 ${g.cost} 积分兑换「${g.name}」？兑换后剩余 ${state.user.points - g.cost} 积分。`,
    confirmText: '兑换',
    success: res => {
      if (!res.confirm) return
      const r = redeemGoods(g)
      if (!r.ok) {
        toast(r.reason === 'points' ? '积分不足' : '兑换失败')
        return
      }
      uni.showModal({
        title: '兑换成功',
        content: r.coupon ? '优惠券已放入卡包，可直接下单使用' : '兑换成功',
        confirmText: '去卡包',
        cancelText: '稍后',
        success: m => {
          if (m.confirm) uni.navigateTo({ url: '/pages/coupon/index' })
        }
      })
    }
  })
}

function scrollToLog() {
  uni.pageScrollTo({ scrollTop: 99999, duration: 250 })
}
</script>

<style scoped>
.points-hero {
  position: relative;
  margin: 8rpx 24rpx 24rpx;
  padding: 34rpx 30rpx;
  border-radius: 26rpx;
  background: linear-gradient(130deg, #2E2417, #1A1208);
  overflow: hidden;
}
.glow {
  position: absolute;
  right: -90rpx;
  top: -110rpx;
  width: 340rpx;
  height: 340rpx;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(243, 217, 164, 0.3), transparent 68%);
}
.ph-label { position: relative; font-size: 21rpx; color: rgba(243, 217, 164, 0.55); }
.ph-row { position: relative; display: flex; align-items: baseline; gap: 8rpx; margin-top: 10rpx; }
.ph-num { font-size: 66rpx; font-weight: 700; color: #F3D9A4; letter-spacing: 1rpx; }
.ph-unit { font-size: 22rpx; color: rgba(243, 217, 164, 0.65); }
.ph-desc { position: relative; display: block; margin-top: 10rpx; font-size: 21rpx; color: rgba(255, 255, 255, 0.55); }
.ph-link { position: relative; margin-top: 18rpx; display: inline-flex; padding: 8rpx 0; }
.ph-link text { font-size: 21rpx; color: #E0B96A; }

.section-head { display: flex; align-items: center; justify-content: space-between; padding: 0 28rpx 16rpx; }
.card-title { font-size: 30rpx; font-weight: 700; color: #1A1D23; }
.section-more { font-size: 22rpx; color: #8A93A3; }

.goods-grid { display: flex; flex-wrap: wrap; gap: 16rpx; padding: 0 24rpx 8rpx; }
.goods-card {
  position: relative;
  width: calc(50% - 8rpx);
  background: #FFFFFF;
  border-radius: 22rpx;
  padding: 22rpx 20rpx 20rpx;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
.goods-icon {
  width: 76rpx;
  height: 76rpx;
  border-radius: 22rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.goods-icon text { font-size: 38rpx; }
.goods-tag {
  position: absolute;
  top: 20rpx;
  right: 18rpx;
  font-size: 17rpx;
  color: #FF5A1F;
  background: #FFF1EB;
  padding: 3rpx 10rpx;
  border-radius: 8rpx;
}
.goods-name { margin-top: 4rpx; font-size: 26rpx; font-weight: 700; color: #1A1D23; }
.goods-desc { font-size: 19rpx; color: #9AA3B0; line-height: 1.5; }
.goods-foot { margin-top: auto; padding-top: 12rpx; display: flex; align-items: center; justify-content: space-between; }
.goods-cost { display: flex; align-items: baseline; gap: 4rpx; }
.cost-num { font-size: 30rpx; font-weight: 700; color: #E8890C; }
.cost-unit { font-size: 18rpx; color: #C0A97E; }
.goods-btn { height: 54rpx; padding: 0 22rpx; border-radius: 27rpx; background: linear-gradient(135deg, #E0B96A, #B98A3C); display: flex; align-items: center; }
.goods-btn text { font-size: 21rpx; color: #2B1D13; font-weight: 700; }
.goods-btn.disabled { background: #F2F4F7; }
.goods-btn.disabled text { color: #A8B0BD; }

.notice {
  margin: 16rpx 24rpx 24rpx;
  padding: 24rpx;
  border-radius: 20rpx;
  background: #FFFBF2;
  border: 1rpx solid #F5E6C8;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
.notice-title { font-size: 22rpx; font-weight: 700; color: #A97C2F; }
.notice-text { font-size: 20rpx; color: #8A7A5E; line-height: 1.6; }

.sec-title { display: flex; align-items: center; gap: 12rpx; font-size: 29rpx; font-weight: 700; color: #1A1D23; margin-bottom: 16rpx; }
.sec-bar { width: 8rpx; height: 26rpx; border-radius: 4rpx; background: linear-gradient(180deg, #FF7A3D, #FF4E12); }

.log-row { display: flex; align-items: center; padding: 18rpx 0; border-bottom: 1rpx solid #F2F4F7; }
.log-row.last { border-bottom: none; }
.log-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6rpx; }
.log-title { font-size: 24rpx; color: #1A1D23; }
.log-time { font-size: 18rpx; color: #B4BBC7; }
.log-amount { font-size: 27rpx; font-weight: 700; color: #3A4250; }
.log-amount.plus { color: #0E9E6B; }
</style>
