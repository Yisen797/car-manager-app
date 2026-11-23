<template>
  <view class="page page-with-tabbar">
    <PageHeader title="我的订单" />

    <ScrollTabs v-model="status" :tabs="tabs" />

    <view class="list">
      <view
        v-for="o in filtered"
        :key="o.id"
        class="order-card"
        @click="go('/pages/order/detail?id=' + o.id)"
      >
        <view class="order-head">
          <view class="head-left">
            <view class="order-icon" :style="{ background: o.gradient }">
              <text>{{ o.icon }}</text>
            </view>
            <text class="order-title ellipsis">{{ o.title }}</text>
          </view>
          <text class="order-status" :class="'st-' + o.status">{{ orderStatusText(o.status) }}</text>
        </view>

        <view class="order-body">
          <view class="info-row">
            <text class="info-label">商家</text>
            <text class="info-value ellipsis">{{ o.merchant }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">车辆</text>
            <text class="info-value">{{ o.car }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">{{ o.booking ? '预约' : '下单' }}</text>
            <text class="info-value">{{ o.booking ? o.booking.date + ' ' + o.booking.time : o.createTime }}</text>
          </view>
        </view>

        <view class="order-foot">
          <view class="amount-box">
            <text class="amount-label">{{ o.payLabel }}</text>
            <text class="amount">¥{{ o.amount.toFixed(2) }}</text>
          </view>
          <view class="actions">
            <template v-if="o.status === 'pending'">
              <view class="act act-ghost" @click.stop="cancel(o)"><text>取消</text></view>
              <view class="act act-primary" @click.stop="pay(o)"><text>去支付</text></view>
            </template>
            <template v-else-if="o.status === 'review'">
              <view class="act act-ghost" @click.stop="detail(o)"><text>查看详情</text></view>
              <view class="act act-primary" @click.stop="review(o)"><text>去评价</text></view>
            </template>
            <template v-else-if="o.status === 'waiting' || o.status === 'serving'">
              <view class="act act-ghost" @click.stop="tip"><text>联系商家</text></view>
              <view class="act act-primary" @click.stop="detail(o)"><text>查看进度</text></view>
            </template>
            <template v-else-if="o.status === 'done'">
              <view class="act act-ghost" @click.stop="detail(o)"><text>查看详情</text></view>
              <view class="act act-primary" @click.stop="again(o)"><text>再次预约</text></view>
            </template>
            <template v-else>
              <view class="act act-ghost" @click.stop="detail(o)"><text>查看详情</text></view>
              <view class="act act-primary" @click.stop="again(o)"><text>再次预约</text></view>
            </template>
          </view>
        </view>
      </view>

      <view v-if="filtered.length === 0" class="empty">
        <text class="empty-icon">🧾</text>
        <text class="empty-text">这里还没有订单</text>
        <view class="empty-btn" @click="go('/pages/service/index')"><text>去逛逛服务</text></view>
      </view>
    </view>

    <view v-if="filtered.length" class="note">共 {{ filtered.length }} 笔订单</view>
  </view>

  <AppTabBar :current="3" />
</template>

<script setup>
import { ref, computed } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import ScrollTabs from '@/components/ScrollTabs.vue'
import AppTabBar from '@/components/AppTabBar.vue'
import { state, orderStatusText, cancelOrder, ORDER_TABS, go, toast } from '@/store/index'

const status = ref('all')

const tabs = computed(() =>
  ORDER_TABS.map(t => ({
    ...t,
    count: t.key === 'all' ? state.orders.length : state.orders.filter(o => o.status === t.key).length
  }))
)

const filtered = computed(() =>
  status.value === 'all' ? state.orders : state.orders.filter(o => o.status === status.value)
)

function pay(o) {
  go('/pages/pay/index?orderId=' + o.id)
}

function cancel(o) {
  cancelOrder(o.id)
  toast('订单已取消')
}

function review(o) {
  go('/pages/review/index?orderId=' + o.id)
}

function again(o) {
  go('/pages/service/detail?id=' + o.serviceId)
}

function detail(o) {
  go('/pages/order/detail?id=' + o.id)
}

function tip() {
  toast('商家电话：400-000-1234')
}
</script>

<style scoped>
.list { padding: 20rpx 24rpx 0; }
.order-card {
  background: #FFFFFF;
  border-radius: 24rpx;
  padding: 26rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 4rpx 20rpx rgba(20, 30, 50, 0.04);
}
.order-head { display: flex; align-items: center; justify-content: space-between; }
.head-left { display: flex; align-items: center; flex: 1; min-width: 0; }
.order-icon {
  width: 56rpx;
  height: 56rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  flex-shrink: 0;
}
.order-title { margin-left: 16rpx; font-size: 28rpx; font-weight: 700; color: #1A1D23; }
.order-status { font-size: 23rpx; font-weight: 600; margin-left: 12rpx; flex-shrink: 0; }
.st-pending { color: #E8890C; }
.st-waiting { color: #E8890C; }
.st-serving { color: #2B63F0; }
.st-review { color: #FF5A1F; }
.st-done { color: #0E9E6B; }
.st-canceled { color: #A8B0BD; }

.order-body {
  margin-top: 20rpx;
  padding: 18rpx 20rpx;
  background: #F8F9FB;
  border-radius: 16rpx;
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}
.info-row { display: flex; align-items: center; }
.info-label { width: 76rpx; font-size: 21rpx; color: #9AA3B0; flex-shrink: 0; }
.info-value { flex: 1; font-size: 22rpx; color: #4A5261; }

.order-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 22rpx;
}
.amount-box { display: flex; align-items: baseline; gap: 10rpx; }
.amount-label { font-size: 20rpx; color: #9AA3B0; }
.amount { font-size: 32rpx; font-weight: 700; color: #1A1D23; }
.actions { display: flex; gap: 14rpx; }
.act {
  height: 58rpx;
  padding: 0 26rpx;
  border-radius: 29rpx;
  display: flex;
  align-items: center;
}
.act text { font-size: 23rpx; }
.act-ghost { background: #F4F6F9; }
.act-ghost text { color: #5A6373; }
.act-primary { background: linear-gradient(135deg, #FF7A3D, #FF4E12); }
.act-primary text { color: #FFFFFF; font-weight: 600; }

.empty-btn {
  margin-top: 30rpx;
  height: 68rpx;
  padding: 0 36rpx;
  border-radius: 34rpx;
  background: linear-gradient(135deg, #FF7A3D, #FF4E12);
  display: flex;
  align-items: center;
}
.empty-btn text { font-size: 25rpx; color: #FFFFFF; font-weight: 600; }
.note { text-align: center; font-size: 20rpx; color: #B4BBC7; padding: 10rpx 0 20rpx; }
</style>
