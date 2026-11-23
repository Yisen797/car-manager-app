<template>
  <view class="page" style="padding-bottom: 180rpx" v-if="order">
    <PageHeader title="收银台" />

    <!-- 金额 -->
    <view class="amount-card">
      <text class="amount-label">{{ order.amount > 0 ? '待支付金额' : '本单无需支付' }}</text>
      <view class="amount-row">
        <text class="amount-symbol">¥</text>
        <text class="amount-num">{{ order.amount.toFixed(2) }}</text>
      </view>
      <text class="amount-sub">订单号 {{ order.id }}</text>
    </view>

    <!-- 订单摘要 -->
    <view class="card">
      <view class="svc-top">
        <view class="svc-icon" :style="{ background: order.gradient }"><text>{{ order.icon }}</text></view>
        <view class="svc-main">
          <text class="svc-title">{{ order.title }}</text>
          <text class="svc-merchant">{{ order.merchant }}</text>
        </view>
      </view>
      <view v-if="order.booking" class="divider"></view>
      <view v-if="order.booking" class="kv">
        <text class="k">预约时间</text>
        <text class="v">{{ order.booking.date }} {{ order.booking.time }}</text>
      </view>
      <view v-if="order.booking" class="kv">
        <text class="k">服务方式</text>
        <text class="v">{{ order.booking.mode }}</text>
      </view>
      <view v-if="order.booking" class="kv">
        <text class="k">{{ order.booking.mode === '上门' ? '上门地址' : '门店地址' }}</text>
        <text class="v ellipsis">{{ order.booking.address }}</text>
      </view>
    </view>

    <!-- 费用明细 -->
    <view class="card">
      <view class="sec-title"><view class="sec-bar"></view><text>费用明细</text></view>
      <view class="fee-row"><text class="fee-k">服务原价</text><text class="fee-v">¥{{ detail.base }}</text></view>
      <view v-if="detail.memberCut > 0" class="fee-row"><text class="fee-k">会员优惠</text><text class="fee-v green">-¥{{ detail.memberCut }}</text></view>
      <view v-if="detail.freeCut > 0" class="fee-row"><text class="fee-k">会员每月 1 次免费</text><text class="fee-v green">-¥{{ detail.freeCut }}</text></view>
      <view v-if="detail.couponCut > 0" class="fee-row"><text class="fee-k">{{ order.couponName || '优惠券' }}</text><text class="fee-v green">-¥{{ detail.couponCut }}</text></view>
      <view v-if="detail.pointsCut > 0" class="fee-row"><text class="fee-k">积分抵扣（{{ order.pointsUsed }} 积分）</text><text class="fee-v green">-¥{{ detail.pointsCut }}</text></view>
      <view class="divider"></view>
      <view class="fee-row total"><text class="fee-k strong">应付</text><text class="fee-total">¥{{ order.amount }}</text></view>
    </view>

    <!-- 支付方式 -->
    <view class="card" v-if="order.amount > 0">
      <view class="sec-title"><view class="sec-bar"></view><text>支付方式</text></view>

      <view class="pay-item" :class="{ active: method === 'wechat' }" @click="method = 'wechat'">
        <text class="pay-ico">💚</text>
        <view class="pay-main">
          <text class="pay-name">微信支付</text>
          <text class="pay-desc">模拟支付，不会产生真实扣款</text>
        </view>
        <view class="radio" :class="{ on: method === 'wechat' }"></view>
      </view>

      <view class="pay-item" :class="{ active: method === 'store' }" @click="method = 'store'">
        <text class="pay-ico">🏪</text>
        <view class="pay-main">
          <text class="pay-name">到店支付</text>
          <text class="pay-desc">服务完成后在门店结算</text>
        </view>
        <view class="radio" :class="{ on: method === 'store' }"></view>
      </view>

      <view class="pay-item disabled">
        <text class="pay-ico">💰</text>
        <view class="pay-main">
          <text class="pay-name">余额支付</text>
          <text class="pay-desc">余额 ¥{{ state.user.balance.toFixed(2) }}，余额不足</text>
        </view>
        <view class="radio"></view>
      </view>
    </view>

    <view class="agreement" @click="agreed = !agreed">
      <view class="check" :class="{ on: agreed }"><text v-if="agreed">✓</text></view>
      <text class="agreement-text">我已阅读并同意《车管家服务协议》与《退款规则》</text>
    </view>

    <view class="tip-note">
      <text>演示环境：支付为模拟，不会真实扣款；下单后暂无商家接单。</text>
    </view>

    <view class="fixed-bar">
      <view class="bar-sum">
        <text class="bar-label">应付</text>
        <text class="bar-value">¥{{ order.amount }}</text>
      </view>
      <view class="bar-btn btn btn-primary" :class="{ disabled: !agreed || paying }" @click="pay">
        <text>{{ paying ? '处理中…' : order.amount > 0 ? '确认支付' : '确认下单' }}</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import PageHeader from '@/components/PageHeader.vue'
import { state, payOrder, toast } from '@/store/index'

const orderId = ref('')
const method = ref('wechat')
const agreed = ref(false)
const paying = ref(false)

const order = computed(() => state.orders.find(o => o.id === orderId.value) || null)
const detail = computed(() => {
  const o = order.value
  if (!o) return { base: 0, memberCut: 0, freeCut: 0, couponCut: 0, pointsCut: 0 }
  if (o.priceDetail) return o.priceDetail
  return {
    base: o.originalAmount || o.amount,
    memberCut: 0,
    freeCut: 0,
    couponCut: 0,
    pointsCut: (o.pointsUsed || 0) / 100
  }
})

onLoad(options => {
  if (options && options.orderId) orderId.value = options.orderId
  if (!order.value) {
    toast('订单不存在')
    return
  }
  if (order.value.status !== 'pending') {
    toast('订单已处理，正在跳转订单详情')
    setTimeout(() => {
      uni.redirectTo({ url: '/pages/order/detail?id=' + order.value.id })
    }, 600)
  }
})

function pay() {
  if (!agreed.value) {
    toast('请先阅读并同意服务协议')
    return
  }
  if (paying.value) return
  if (!order.value || order.value.status !== 'pending') {
    toast('订单状态已变化')
    return
  }
  paying.value = true
  setTimeout(() => {
    payOrder(order.value.id, method.value)
    paying.value = false
    uni.redirectTo({ url: '/pages/order/detail?id=' + order.value.id })
  }, 900)
}
</script>

<style scoped>
.amount-card {
  margin: 8rpx 24rpx 24rpx;
  padding: 40rpx 0 34rpx;
  border-radius: 26rpx;
  background: linear-gradient(150deg, #2E2A22, #17140F);
  display: flex;
  flex-direction: column;
  align-items: center;
  border: 2rpx solid rgba(201, 155, 74, 0.35);
}
.amount-label { font-size: 22rpx; color: rgba(243, 217, 164, 0.6); }
.amount-row { display: flex; align-items: baseline; margin-top: 14rpx; }
.amount-symbol { font-size: 32rpx; color: #F3D9A4; font-weight: 600; }
.amount-num { font-size: 68rpx; color: #F3D9A4; font-weight: 700; letter-spacing: 1rpx; }
.amount-sub { margin-top: 14rpx; font-size: 19rpx; color: rgba(243, 217, 164, 0.45); }

.svc-top { display: flex; align-items: center; }
.svc-icon { width: 76rpx; height: 76rpx; border-radius: 20rpx; display: flex; align-items: center; justify-content: center; font-size: 38rpx; }
.svc-main { margin-left: 18rpx; display: flex; flex-direction: column; gap: 8rpx; flex: 1; min-width: 0; }
.svc-title { font-size: 28rpx; font-weight: 700; color: #1A1D23; }
.svc-merchant { font-size: 21rpx; color: #8A93A3; }

.sec-title { display: flex; align-items: center; gap: 12rpx; font-size: 29rpx; font-weight: 700; color: #1A1D23; margin-bottom: 16rpx; }
.sec-bar { width: 8rpx; height: 26rpx; border-radius: 4rpx; background: linear-gradient(180deg, #FF7A3D, #FF4E12); }
.kv { display: flex; align-items: center; justify-content: space-between; padding: 10rpx 0; }
.k { font-size: 24rpx; color: #8A93A3; }
.v { font-size: 24rpx; color: #2A3038; text-align: right; max-width: 430rpx; }

.fee-row { display: flex; align-items: center; justify-content: space-between; padding: 11rpx 0; }
.fee-k { font-size: 24rpx; color: #8A93A3; }
.fee-k.strong { font-size: 27rpx; color: #1A1D23; font-weight: 600; }
.fee-v { font-size: 24rpx; color: #2A3038; }
.fee-v.green { color: #0E9E6B; }
.fee-total { font-size: 34rpx; font-weight: 700; color: #E02B20; }

.pay-item {
  display: flex;
  align-items: center;
  padding: 22rpx 20rpx;
  border-radius: 18rpx;
  border: 2rpx solid #EEF1F5;
  margin-bottom: 16rpx;
}
.pay-item.active { border-color: #FFB68F; background: #FFF7F2; }
.pay-item.disabled { opacity: 0.5; }
.pay-ico { font-size: 34rpx; }
.pay-main { flex: 1; margin-left: 16rpx; display: flex; flex-direction: column; gap: 5rpx; }
.pay-name { font-size: 26rpx; font-weight: 600; color: #1A1D23; }
.pay-desc { font-size: 20rpx; color: #9AA3B0; }
.radio { width: 34rpx; height: 34rpx; border-radius: 17rpx; border: 2rpx solid #D8DEE8; }
.radio.on { border-color: #FF5A1F; background: #FF5A1F; box-shadow: inset 0 0 0 6rpx #FFFFFF; }

.agreement { display: flex; align-items: flex-start; gap: 10rpx; padding: 0 32rpx 10rpx; }
.check {
  width: 32rpx;
  height: 32rpx;
  border-radius: 16rpx;
  border: 2rpx solid #D8DEE8;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 2rpx;
}
.check.on { background: #FF5A1F; border-color: #FF5A1F; }
.check text { font-size: 18rpx; color: #FFFFFF; }
.agreement-text { font-size: 21rpx; color: #8A93A3; line-height: 1.5; }

.tip-note { padding: 6rpx 36rpx 24rpx; text-align: center; }
.tip-note text { font-size: 20rpx; color: #B4BBC7; }

.fixed-bar { gap: 20rpx; }
.bar-sum { flex: 1; display: flex; flex-direction: column; gap: 4rpx; }
.bar-label { font-size: 20rpx; color: #9AA3B0; }
.bar-value { font-size: 32rpx; font-weight: 700; color: #FF5A1F; }
.bar-btn { width: 320rpx; }
.bar-btn text { font-size: 30rpx; color: #FFFFFF; font-weight: 600; }
.bar-btn.disabled { opacity: 0.55; }
</style>
