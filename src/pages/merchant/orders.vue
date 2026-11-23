<template>
  <view class="page page-with-tabbar">
    <PageHeader title="订单管理" />

    <template v-if="app">
      <ScrollTabs v-model="status" :tabs="tabs" />

      <view class="list">
        <view v-for="o in filtered" :key="o.id" class="order-card" @click="go('/pages/order/detail?id=' + o.id)">
          <view class="order-head">
            <view class="head-left">
              <view class="order-icon" :style="{ background: o.gradient }"><text>{{ o.icon }}</text></view>
              <view class="head-main">
                <text class="order-title ellipsis">{{ o.title }}</text>
                <text class="order-time">{{ o.createTime }}</text>
              </view>
            </view>
            <text class="order-status" :class="'st-' + o.status">{{ orderStatusText(o.status) }}</text>
          </view>

          <view class="order-body">
            <view class="info-row">
              <text class="info-label">客户</text>
              <text class="info-value">{{ o.booking ? o.booking.contactName : '车主' }}</text>
            </view>
            <view class="info-row">
              <text class="info-label">电话</text>
              <text class="info-value link" @click.stop="call(o)">{{ o.booking ? o.booking.contactPhone : '—' }}</text>
            </view>
            <view class="info-row">
              <text class="info-label">预约</text>
              <text class="info-value">{{ o.booking ? o.booking.date + ' ' + o.booking.time : '—' }}</text>
            </view>
            <view class="info-row">
              <text class="info-label">地址</text>
              <text class="info-value ellipsis">{{ o.booking ? o.booking.address : '—' }}</text>
            </view>
            <view v-if="o.booking && o.booking.remark" class="info-row">
              <text class="info-label">备注</text>
              <text class="info-value">{{ o.booking.remark }}</text>
            </view>
          </view>

          <view class="order-foot">
            <view class="amount-box">
              <text class="amount-label">{{ o.payLabel }}</text>
              <text class="amount">¥{{ o.amount }}</text>
            </view>
            <view class="actions">
              <view v-if="o.status === 'waiting'" class="act act-primary" @click.stop="accept(o)"><text>接单</text></view>
              <view v-else-if="o.status === 'serving'" class="act act-primary" @click.stop="finish(o)"><text>服务完成</text></view>
              <view v-else class="act act-ghost" @click.stop="go('/pages/order/detail?id=' + o.id)"><text>查看详情</text></view>
            </view>
          </view>
        </view>

        <view v-if="filtered.length === 0" class="empty">
          <text class="empty-icon">🧾</text>
          <text class="empty-text">该状态下暂无订单</text>
        </view>
      </view>
    </template>

    <view v-else class="empty">
      <text class="empty-icon">🔒</text>
      <text class="empty-text">当前账号没有商家权限</text>
      <view class="empty-btn" @click="goApply"><text>去申请入驻</text></view>
    </view>

    <MerchantTabBar :current="1" />
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import ScrollTabs from '@/components/ScrollTabs.vue'
import MerchantTabBar from '@/components/MerchantTabBar.vue'
import {
  approvedMerchantApp, ordersForMerchant, acceptOrder, finishOrder,
  orderStatusText, go, toast
} from '@/store/index'

const app = approvedMerchantApp()
const status = ref('waiting')

const TABS = [
  { key: 'all', label: '全部' },
  { key: 'waiting', label: '待接单' },
  { key: 'serving', label: '服务中' },
  { key: 'review', label: '待评价' },
  { key: 'done', label: '已完成' }
]

const orders = computed(() => ordersForMerchant(app))

const tabs = computed(() =>
  TABS.map(t => ({
    ...t,
    count: t.key === 'all' ? orders.value.length : orders.value.filter(o => o.status === t.key).length
  }))
)

const filtered = computed(() =>
  status.value === 'all' ? orders.value : orders.value.filter(o => o.status === status.value)
)

function accept(o) {
  acceptOrder(o.id)
  toast('已接单')
}

function finish(o) {
  finishOrder(o.id)
  toast('服务已完成')
}

function call(o) {
  const phone = o.booking && o.booking.contactPhone
  if (!phone) return toast('暂无联系电话')
  uni.makePhoneCall({ phoneNumber: phone, fail: () => toast('客户电话：' + phone) })
}

function goApply() {
  uni.reLaunch({ url: '/pages/merchant/join' })
}
</script>

<style scoped>
.list { padding: 20rpx 24rpx 0; }
.order-card { background: #FFFFFF; border-radius: 24rpx; padding: 24rpx; margin-bottom: 18rpx; }
.order-head { display: flex; align-items: center; justify-content: space-between; }
.head-left { display: flex; align-items: center; gap: 16rpx; min-width: 0; }
.order-icon { width: 72rpx; height: 72rpx; border-radius: 20rpx; display: flex; align-items: center; justify-content: center; font-size: 34rpx; flex-shrink: 0; }
.head-main { display: flex; flex-direction: column; gap: 6rpx; min-width: 0; }
.order-title { font-size: 27rpx; font-weight: 700; color: #1A1D23; }
.order-time { font-size: 19rpx; color: #B4BBC7; }
.order-status { font-size: 21rpx; flex-shrink: 0; }
.st-waiting { color: #E8890C; }
.st-serving { color: #2B63F0; }
.st-review { color: #FF5A1F; }
.st-done { color: #0E9E6B; }
.st-canceled { color: #A8B0BD; }
.st-pending { color: #E8890C; }

.order-body { margin-top: 18rpx; padding-top: 16rpx; border-top: 1rpx solid #F2F4F7; }
.info-row { display: flex; align-items: flex-start; padding: 8rpx 0; gap: 20rpx; }
.info-label { width: 90rpx; font-size: 22rpx; color: #9AA3B0; flex-shrink: 0; }
.info-value { flex: 1; font-size: 22rpx; color: #3A4250; text-align: right; }
.info-value.link { color: #2B63F0; }

.order-foot { display: flex; align-items: center; justify-content: space-between; margin-top: 16rpx; padding-top: 16rpx; border-top: 1rpx solid #F2F4F7; }
.amount-box { display: flex; flex-direction: column; gap: 4rpx; }
.amount-label { font-size: 18rpx; color: #A8B0BD; }
.amount { font-size: 30rpx; font-weight: 700; color: #1A1D23; }
.actions { display: flex; gap: 12rpx; }
.act { height: 64rpx; padding: 0 28rpx; border-radius: 32rpx; display: flex; align-items: center; }
.act text { font-size: 23rpx; font-weight: 600; }
.act-primary { background: linear-gradient(135deg, #D8B06A, #A97C2F); }
.act-primary text { color: #FFFFFF; }
.act-ghost { background: #F5F7FA; }
.act-ghost text { color: #5A6373; }

.empty-btn { margin-top: 26rpx; height: 72rpx; padding: 0 36rpx; border-radius: 36rpx; background: linear-gradient(135deg, #D8B06A, #A97C2F); display: flex; align-items: center; }
.empty-btn text { font-size: 24rpx; color: #FFFFFF; font-weight: 700; }
</style>
