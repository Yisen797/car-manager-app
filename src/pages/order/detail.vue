<template>
  <view class="page" style="padding-bottom: 180rpx" v-if="order">
    <PageHeader title="订单详情" />

    <!-- 状态区 -->
    <view class="status-hero" :class="'hero-' + order.status">
      <view class="status-glow"></view>
      <text class="status-title">{{ statusTitle }}</text>
      <text class="status-desc">{{ statusDesc }}</text>
      <view class="status-orderno">
        <text>订单号 {{ order.id }}</text>
      </view>
    </view>

    <!-- 服务信息 -->
    <view class="card service-card">
      <view class="svc-top">
        <view class="svc-icon" :style="{ background: order.gradient }">
          <text>{{ order.icon }}</text>
        </view>
        <view class="svc-main">
          <text class="svc-title">{{ order.title }}</text>
          <text class="svc-merchant">{{ order.merchant }}</text>
        </view>
      </view>
      <view class="divider"></view>

      <template v-if="order.booking">
        <view class="kv"><text class="k">预约时间</text><text class="v">{{ order.booking.date }} {{ order.booking.time }}</text></view>
        <view class="kv"><text class="k">服务方式</text><text class="v">{{ order.booking.mode }}</text></view>
        <view class="kv">
          <text class="k">{{ order.booking.mode === '上门' ? '上门地址' : '门店地址' }}</text>
          <text class="v">{{ order.booking.address }}</text>
        </view>
        <view class="kv"><text class="k">联系人</text><text class="v">{{ order.booking.contactName }} {{ order.booking.contactPhone }}</text></view>
        <view v-if="order.booking.remark" class="kv"><text class="k">备注</text><text class="v">{{ order.booking.remark }}</text></view>
      </template>

      <view class="kv"><text class="k">服务车辆</text><text class="v">{{ order.car }}</text></view>
      <view class="kv"><text class="k">下单时间</text><text class="v">{{ order.createTime }}</text></view>
    </view>

    <!-- 进度 -->
    <view class="card">
      <view class="sec-title">
        <view class="sec-bar"></view>
        <text>服务进度</text>
      </view>
      <view class="timeline">
        <view v-for="(t, i) in order.timeline" :key="i" class="tl-item">
          <view class="tl-rail">
            <view class="tl-dot" :class="{ done: t.done }">
              <text v-if="t.done">✓</text>
            </view>
            <view v-if="i !== order.timeline.length - 1" class="tl-line" :class="{ done: t.done }"></view>
          </view>
          <view class="tl-main">
            <text class="tl-text" :class="{ done: t.done }">{{ t.text }}</text>
            <text v-if="t.time" class="tl-time">{{ t.time }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 费用 -->
    <view class="card">
      <view class="sec-title">
        <view class="sec-bar"></view>
        <text>费用明细</text>
      </view>
      <template v-if="detail">
        <view class="kv"><text class="k">服务原价</text><text class="v">¥{{ detail.base }}</text></view>
        <view v-if="detail.memberCut > 0" class="kv"><text class="k">会员优惠</text><text class="v green">-¥{{ detail.memberCut }}</text></view>
        <view v-if="detail.freeCut > 0" class="kv"><text class="k">会员每月 1 次免费</text><text class="v green">-¥{{ detail.freeCut }}</text></view>
        <view v-if="detail.couponCut > 0" class="kv"><text class="k">{{ order.couponName }}</text><text class="v green">-¥{{ detail.couponCut }}</text></view>
        <view v-if="detail.pointsCut > 0" class="kv"><text class="k">积分抵扣（{{ order.pointsUsed }} 积分）</text><text class="v green">-¥{{ detail.pointsCut }}</text></view>
      </template>
      <template v-else>
        <view class="kv"><text class="k">服务金额</text><text class="v">¥{{ order.amount.toFixed(2) }}</text></view>
      </template>
      <view class="divider"></view>
      <view class="kv total">
        <text class="k strong">实付金额</text>
        <text class="total-value">¥{{ order.amount.toFixed(2) }}</text>
      </view>
      <view class="kv"><text class="k">支付状态</text><text class="v">{{ order.payLabel }}</text></view>
    </view>

    <!-- 评价 -->
    <view v-if="order.review" class="card">
      <view class="sec-title">
        <view class="sec-bar"></view>
        <text>我的评价</text>
      </view>
      <view class="review-stars">
        <text v-for="n in 5" :key="n" class="star" :class="{ on: n <= order.review.rating }">★</text>
        <text class="review-date">{{ order.review.date }}</text>
      </view>
      <view v-if="order.review.tags && order.review.tags.length" class="review-tags">
        <text v-for="t in order.review.tags" :key="t" class="review-tag">{{ t }}</text>
      </view>
      <text v-if="order.review.text" class="review-text">{{ order.review.text }}</text>
    </view>

    <!-- 其他 -->
    <view class="card">
      <view class="kv"><text class="k">订单编号</text><text class="v">{{ order.id }}</text></view>
      <view class="kv"><text class="k">下单账号</text><text class="v">{{ state.user.phone }}</text></view>
      <view class="kv"><text class="k">客服电话</text><text class="v link" @click="callService">400-000-1234</text></view>
    </view>

    <!-- 演示工具 -->
    <view v-if="order.status === 'waiting' || order.status === 'serving'" class="demo-card">
      <text class="demo-title">演示工具</text>
      <text class="demo-desc">当前为模拟环境，没有真实商家在线。可用下面的按钮推进订单状态。</text>
      <view class="demo-actions">
        <view v-if="order.status === 'waiting'" class="demo-btn" @click="doAccept"><text>模拟商家接单</text></view>
        <view v-if="order.status === 'serving'" class="demo-btn" @click="doFinish"><text>模拟服务完成</text></view>
      </view>
    </view>

    <view class="tip-note">
      <text>如有疑问可随时联系专属客服，平台全程为您兜底。</text>
    </view>

    <!-- 底栏 -->
    <view class="fixed-bar">
      <view class="act act-ghost" @click="callService"><text>联系商家</text></view>

      <template v-if="order.status === 'pending'">
        <view class="act act-ghost" @click="doCancel"><text>取消订单</text></view>
        <view class="act act-primary" @click="doPay"><text>立即支付</text></view>
      </template>

      <template v-else-if="order.status === 'waiting'">
        <view class="act act-primary" @click="doCancel">
          <text>{{ order.payMethod === 'store' || order.amount === 0 ? '取消订单' : '取消并退款' }}</text>
        </view>
      </template>

      <template v-else-if="order.status === 'review'">
        <view class="act act-primary" @click="doReview"><text>去评价</text></view>
      </template>

      <template v-else-if="order.status === 'serving'">
        <view class="act act-primary" @click="again"><text>再次预约</text></view>
      </template>

      <template v-else>
        <view class="act act-primary" @click="again"><text>再次预约</text></view>
      </template>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import PageHeader from '@/components/PageHeader.vue'
import {
  state, cancelOrder, finishOrder, acceptOrder, orderStatusText, go, toast
} from '@/store/index'

const orderId = ref('')
const order = computed(() => state.orders.find(o => o.id === orderId.value) || state.orders[0])

const detail = computed(() => {
  if (!order.value) return null
  if (order.value.priceDetail) return order.value.priceDetail
  return null
})

const statusTitle = computed(() => {
  if (!order.value) return ''
  return {
    pending: '等待支付',
    waiting: '等待商家接单',
    serving: '服务进行中',
    review: '服务已完成',
    done: '订单已完成',
    canceled: '订单已取消'
  }[order.value.status] || orderStatusText(order.value.status)
})

const statusDesc = computed(() => {
  if (!order.value) return ''
  return {
    pending: '请尽快完成支付，支付后商家开始接单',
    waiting: '已提交订单，正在等待商家接单（演示环境暂无商家在线）',
    serving: '商家已接单，正在为您安排服务',
    review: '服务已完成，期待您的评价',
    done: '感谢使用车管家，期待再次为您服务',
    canceled: '订单已取消，如有需要可重新预约'
  }[order.value.status] || ''
})

onLoad(options => {
  if (options && options.id) orderId.value = options.id
})

function callService() {
  uni.makePhoneCall({ phoneNumber: '4000001234', fail: () => toast('客服热线：400-000-1234') })
}

function doPay() {
  go('/pages/pay/index?orderId=' + order.value.id)
}

function doCancel() {
  uni.showModal({
    title: '取消订单',
    content: order.value.status === 'waiting' && order.value.payMethod !== 'store' && order.value.amount > 0
      ? `取消后 ¥${order.value.amount} 将原路退回（模拟），确定取消吗？`
      : '确定取消这笔订单吗？',
    confirmText: '确定取消',
    confirmColor: '#E02B20',
    success: res => {
      if (!res.confirm) return
      cancelOrder(order.value.id)
      toast('订单已取消')
    }
  })
}

function doReview() {
  go('/pages/review/index?orderId=' + order.value.id)
}

function doAccept() {
  acceptOrder(order.value.id)
  toast('商家已接单（模拟）')
}

function doFinish() {
  finishOrder(order.value.id)
  toast('服务已完成（模拟）')
}

function again() {
  if (order.value.serviceId === 'taxi') {
    go('/pages/travel/index')
    return
  }
  go('/pages/service/detail?id=' + order.value.serviceId)
}
</script>

<style scoped>
.status-hero {
  position: relative;
  margin: 0 24rpx 24rpx;
  padding: 36rpx 30rpx;
  border-radius: 26rpx;
  overflow: hidden;
}
.hero-pending { background: linear-gradient(125deg, #E8890C, #B35E00); }
.hero-waiting { background: linear-gradient(125deg, #D98A12, #8F5606); }
.hero-serving { background: linear-gradient(125deg, #3B72F0, #1B49B8); }
.hero-review { background: linear-gradient(125deg, #FF7A3D, #D23F0A); }
.hero-done { background: linear-gradient(125deg, #12A06A, #08714A); }
.hero-canceled { background: linear-gradient(125deg, #7A8494, #4C5563); }
.status-glow {
  position: absolute;
  right: -60rpx;
  top: -80rpx;
  width: 300rpx;
  height: 300rpx;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.22), transparent 70%);
}
.status-title {
  position: relative;
  display: block;
  font-size: 42rpx;
  font-weight: 700;
  color: #FFFFFF;
}
.status-desc {
  position: relative;
  display: block;
  margin-top: 12rpx;
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.78);
}
.status-orderno {
  position: relative;
  margin-top: 22rpx;
  display: inline-flex;
  background: rgba(255, 255, 255, 0.16);
  border-radius: 10rpx;
  padding: 6rpx 16rpx;
}
.status-orderno text { font-size: 19rpx; color: rgba(255, 255, 255, 0.85); }

.service-card { padding: 26rpx 28rpx; }
.svc-top { display: flex; align-items: center; }
.svc-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 22rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40rpx;
}
.svc-main { margin-left: 20rpx; display: flex; flex-direction: column; gap: 8rpx; flex: 1; min-width: 0; }
.svc-title { font-size: 29rpx; font-weight: 700; color: #1A1D23; }
.svc-merchant { font-size: 22rpx; color: #8A93A3; }

.kv { display: flex; align-items: center; justify-content: space-between; padding: 12rpx 0; gap: 20rpx; }
.k { font-size: 24rpx; color: #8A93A3; flex-shrink: 0; }
.v { font-size: 24rpx; color: #2A3038; text-align: right; max-width: 440rpx; }
.v.green { color: #0E9E6B; }
.v.link { color: #2B63F0; }
.k.strong { font-size: 27rpx; color: #1A1D23; font-weight: 600; }
.total-value { font-size: 34rpx; font-weight: 700; color: #E02B20; }

.sec-title {
  display: flex;
  align-items: center;
  gap: 12rpx;
  font-size: 29rpx;
  font-weight: 700;
  color: #1A1D23;
  margin-bottom: 20rpx;
}
.sec-bar {
  width: 8rpx;
  height: 26rpx;
  border-radius: 4rpx;
  background: linear-gradient(180deg, #FF7A3D, #FF4E12);
}

.timeline { padding-left: 4rpx; }
.tl-item { display: flex; align-items: flex-start; }
.tl-rail { display: flex; flex-direction: column; align-items: center; }
.tl-dot {
  width: 34rpx;
  height: 34rpx;
  border-radius: 17rpx;
  background: #EDF0F4;
  display: flex;
  align-items: center;
  justify-content: center;
}
.tl-dot.done { background: #12A06A; }
.tl-dot text { font-size: 18rpx; color: #FFFFFF; }
.tl-line { width: 2rpx; height: 44rpx; background: #EDF0F4; }
.tl-line.done { background: #B7E7D2; }
.tl-main { margin-left: 20rpx; padding-bottom: 16rpx; display: flex; flex-direction: column; gap: 4rpx; }
.tl-text { font-size: 25rpx; color: #A8B0BD; }
.tl-text.done { color: #1A1D23; font-weight: 500; }
.tl-time { font-size: 19rpx; color: #B4BBC7; }

.review-stars { display: flex; align-items: center; gap: 4rpx; }
.star { font-size: 32rpx; color: #E3E8EF; }
.star.on { color: #FFB400; }
.review-date { margin-left: auto; font-size: 20rpx; color: #B4BBC7; }
.review-tags { display: flex; flex-wrap: wrap; gap: 10rpx; margin-top: 16rpx; }
.review-tag { font-size: 20rpx; color: #FF5A1F; background: #FFF1EB; padding: 5rpx 14rpx; border-radius: 8rpx; }
.review-text { display: block; margin-top: 14rpx; font-size: 24rpx; color: #5A6373; line-height: 1.6; }

.demo-card {
  margin: 0 24rpx 20rpx;
  padding: 22rpx 24rpx;
  border-radius: 18rpx;
  background: #F5F7FA;
  border: 2rpx dashed #D8DEE8;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
.demo-title { font-size: 22rpx; font-weight: 700; color: #6B7484; }
.demo-desc { font-size: 20rpx; color: #9AA3B0; line-height: 1.5; }
.demo-actions { margin-top: 10rpx; }
.demo-btn {
  height: 64rpx;
  border-radius: 32rpx;
  background: #FFFFFF;
  border: 2rpx solid #D8DEE8;
  display: flex;
  align-items: center;
  justify-content: center;
}
.demo-btn text { font-size: 23rpx; color: #5A6373; font-weight: 600; }

.tip-note { padding: 0 40rpx 20rpx; text-align: center; font-size: 20rpx; color: #B4BBC7; }

.fixed-bar { gap: 16rpx; }
.act {
  height: 84rpx;
  border-radius: 42rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 28rpx;
  flex: 1;
}
.act text { font-size: 26rpx; }
.act-ghost { background: #F4F6F9; }
.act-ghost text { color: #5A6373; }
.act-primary { background: linear-gradient(135deg, #FF7A3D, #FF4E12); }
.act-primary text { color: #FFFFFF; font-weight: 600; }
</style>
