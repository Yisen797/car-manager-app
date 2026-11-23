<template>
  <view class="page" style="padding-bottom: 180rpx">
    <PageHeader title="商家工作台" />

    <template v-if="app">
      <!-- 店铺卡 -->
      <view class="shop-card">
        <view class="shop-glow"></view>
        <view class="shop-top">
          <view class="shop-logo"><text>🏪</text></view>
          <view class="shop-main">
            <text class="shop-name">{{ app.name }}</text>
            <text class="shop-meta">{{ app.type }} · {{ tierName }} · {{ app.city }}</text>
          </view>
          <view class="shop-switch" :class="{ on: app.open }" @click="toggleOpen">
            <text>{{ app.open ? '营业中' : '休息中' }}</text>
          </view>
        </view>
        <view class="shop-id"><text>商家编号 {{ app.merchantId }}</text></view>
      </view>

      <!-- 数据 -->
      <view class="stats">
        <view class="stat">
          <text class="stat-num">{{ stats.today }}</text>
          <text class="stat-label">今日订单</text>
        </view>
        <view class="stat">
          <text class="stat-num accent">{{ stats.waiting }}</text>
          <text class="stat-label">待接单</text>
        </view>
        <view class="stat">
          <text class="stat-num blue">{{ stats.serving }}</text>
          <text class="stat-label">服务中</text>
        </view>
        <view class="stat">
          <text class="stat-num">¥{{ stats.revenue }}</text>
          <text class="stat-label">累计收入</text>
        </view>
      </view>

      <!-- 快捷操作 -->
      <view class="quick">
        <view class="quick-item" @click="goTab('/pages/merchant/orders')">
          <text class="quick-ico">📥</text>
          <text class="quick-name">接单</text>
          <text v-if="stats.waiting" class="quick-badge">{{ stats.waiting }}</text>
        </view>
        <view class="quick-item" @click="goTab('/pages/merchant/orders')">
          <text class="quick-ico">🔧</text>
          <text class="quick-name">服务核销</text>
        </view>
        <view class="quick-item" @click="goTab('/pages/merchant/shop')">
          <text class="quick-ico">🏪</text>
          <text class="quick-name">店铺设置</text>
        </view>
        <view class="quick-item" @click="openApply">
          <text class="quick-ico">📄</text>
          <text class="quick-name">入驻资料</text>
        </view>
      </view>

      <!-- 最近订单 -->
      <view class="section-head">
        <text class="card-title">最近订单</text>
        <text class="section-more" @click="goTab('/pages/merchant/orders')">全部订单 ›</text>
      </view>

      <view class="list">
        <view v-for="o in recent" :key="o.id" class="order-row" @click="go('/pages/order/detail?id=' + o.id)">
          <view class="order-icon" :style="{ background: o.gradient }"><text>{{ o.icon }}</text></view>
          <view class="order-main">
            <text class="order-title ellipsis">{{ o.title }}</text>
            <text class="order-sub">{{ o.booking ? o.booking.date + ' ' + o.booking.time : o.createTime }}</text>
            <text v-if="o.booking" class="order-sub">客户：{{ o.booking.contactName }} {{ o.booking.contactPhone }}</text>
          </view>
          <view class="order-right">
            <text class="order-amount">¥{{ o.amount }}</text>
            <text class="order-status" :class="'st-' + o.status">{{ orderStatusText(o.status) }}</text>
            <view v-if="o.status === 'waiting'" class="order-act" @click.stop="accept(o)"><text>接单</text></view>
            <view v-else-if="o.status === 'serving'" class="order-act" @click.stop="finish(o)"><text>完成</text></view>
          </view>
        </view>

        <view v-if="recent.length === 0" class="empty">
          <text class="empty-icon">📭</text>
          <text class="empty-text">暂无订单，等待车主下单</text>
        </view>
      </view>

      <view class="tip"><text>演示环境：订单、收入、统计数据均为本地模拟。</text></view>
    </template>

    <view v-else class="empty-page">
      <text class="empty-icon">🏪</text>
      <text class="empty-text">当前账号还没有商家权限</text>
      <text class="empty-sub">完成入驻并审核通过后，即可进入商家工作台</text>
      <view class="empty-btn" @click="apply"><text>去申请入驻</text></view>
      <view class="empty-link" @click="backCustomer"><text>返回车主端</text></view>
    </view>

    <MerchantTabBar :current="0" />
  </view>
</template>

<script setup>
import { computed } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import MerchantTabBar from '@/components/MerchantTabBar.vue'
import { MERCHANT_TIERS } from '@/data/mock'
import {
  state, approvedMerchantApp, ordersForMerchant, updateMerchantShop,
  acceptOrder, finishOrder, orderStatusText, go, toast
} from '@/store/index'

const app = approvedMerchantApp()

const tierName = computed(() => {
  const t = MERCHANT_TIERS.find(x => x.id === (app && app.tier))
  return t ? t.name : '免费入驻'
})

const orders = computed(() => ordersForMerchant(app))
const recent = computed(() => orders.value.slice(0, 5))

const stats = computed(() => {
  const list = orders.value
  const today = new Date().toISOString().slice(0, 10)
  return {
    today: list.filter(o => String(o.createTime).startsWith(today)).length,
    waiting: list.filter(o => o.status === 'waiting').length,
    serving: list.filter(o => o.status === 'serving').length,
    revenue: list
      .filter(o => !['canceled', 'pending'].includes(o.status))
      .reduce((s, o) => s + Number(o.amount || 0), 0)
  }
})

function toggleOpen() {
  updateMerchantShop({ open: !app.open })
  toast(app.open ? '已开始营业' : '已切换为休息中')
}

function accept(o) {
  acceptOrder(o.id)
  toast('已接单')
}

function finish(o) {
  finishOrder(o.id)
  toast('服务已完成')
}

function goTab(url) {
  uni.reLaunch({ url })
}

function openApply() {
  go('/pages/merchant/apply?id=' + app.id)
}

function apply() {
  uni.reLaunch({ url: '/pages/merchant/join' })
}

function backCustomer() {
  uni.reLaunch({ url: '/pages/index/index' })
}
</script>

<style scoped>
.shop-card {
  position: relative;
  margin: 8rpx 24rpx 24rpx;
  padding: 30rpx 28rpx;
  border-radius: 26rpx;
  background: linear-gradient(130deg, #2E2A22, #17140F);
  overflow: hidden;
}
.shop-glow {
  position: absolute;
  right: -80rpx;
  top: -100rpx;
  width: 320rpx;
  height: 320rpx;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(201, 155, 74, 0.35), transparent 70%);
}
.shop-top { position: relative; display: flex; align-items: center; gap: 18rpx; }
.shop-logo {
  width: 84rpx;
  height: 84rpx;
  border-radius: 22rpx;
  background: rgba(243, 217, 164, 0.14);
  border: 1rpx solid rgba(243, 217, 164, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
}
.shop-logo text { font-size: 40rpx; }
.shop-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 8rpx; }
.shop-name { font-size: 30rpx; font-weight: 700; color: #FFFFFF; }
.shop-meta { font-size: 21rpx; color: rgba(243, 217, 164, 0.65); }
.shop-switch { height: 54rpx; padding: 0 22rpx; border-radius: 27rpx; background: rgba(255, 255, 255, 0.12); display: flex; align-items: center; flex-shrink: 0; }
.shop-switch text { font-size: 21rpx; color: rgba(255, 255, 255, 0.65); }
.shop-switch.on { background: rgba(18, 160, 106, 0.35); border: 1rpx solid rgba(62, 215, 160, 0.5); }
.shop-switch.on text { color: #7BE8BE; font-weight: 600; }
.shop-id { position: relative; margin-top: 20rpx; display: inline-flex; background: rgba(255, 255, 255, 0.1); border-radius: 10rpx; padding: 6rpx 14rpx; }
.shop-id text { font-size: 18rpx; color: rgba(255, 255, 255, 0.6); }

.stats { display: flex; gap: 12rpx; margin: 0 24rpx 24rpx; }
.stat { flex: 1; background: #FFFFFF; border-radius: 20rpx; padding: 22rpx 0; display: flex; flex-direction: column; align-items: center; gap: 8rpx; }
.stat-num { font-size: 32rpx; font-weight: 700; color: #1A1D23; }
.stat-num.accent { color: #E8890C; }
.stat-num.blue { color: #2B63F0; }
.stat-label { font-size: 18rpx; color: #9AA3B0; }

.quick { display: flex; gap: 12rpx; margin: 0 24rpx 26rpx; }
.quick-item {
  position: relative;
  flex: 1;
  background: #FFFFFF;
  border-radius: 20rpx;
  padding: 24rpx 0 18rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10rpx;
}
.quick-ico { font-size: 38rpx; }
.quick-name { font-size: 21rpx; color: #3A4250; }
.quick-badge {
  position: absolute;
  top: 10rpx;
  right: 18rpx;
  min-width: 32rpx;
  height: 32rpx;
  padding: 0 8rpx;
  border-radius: 16rpx;
  background: #E02B20;
  color: #FFFFFF;
  font-size: 18rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.section-head { display: flex; align-items: center; justify-content: space-between; padding: 0 28rpx 16rpx; }
.card-title { font-size: 30rpx; font-weight: 700; color: #1A1D23; }
.section-more { font-size: 22rpx; color: #8A93A3; }

.list { padding: 0 24rpx; }
.order-row { display: flex; align-items: center; background: #FFFFFF; border-radius: 20rpx; padding: 22rpx; margin-bottom: 16rpx; }
.order-icon { width: 72rpx; height: 72rpx; border-radius: 20rpx; display: flex; align-items: center; justify-content: center; font-size: 34rpx; flex-shrink: 0; }
.order-main { flex: 1; min-width: 0; margin-left: 18rpx; display: flex; flex-direction: column; gap: 6rpx; }
.order-title { font-size: 25rpx; font-weight: 600; color: #1A1D23; }
.order-sub { font-size: 19rpx; color: #9AA3B0; }
.order-right { display: flex; flex-direction: column; align-items: flex-end; gap: 8rpx; flex-shrink: 0; }
.order-amount { font-size: 26rpx; font-weight: 700; color: #1A1D23; }
.order-status { font-size: 20rpx; }
.st-pending { color: #E8890C; }
.st-waiting { color: #E8890C; }
.st-serving { color: #2B63F0; }
.st-review { color: #FF5A1F; }
.st-done { color: #0E9E6B; }
.st-canceled { color: #A8B0BD; }
.order-act { height: 48rpx; padding: 0 20rpx; border-radius: 24rpx; background: #FBF3E3; display: flex; align-items: center; }
.order-act text { font-size: 20rpx; color: #A97C2F; font-weight: 600; }

.tip { padding: 10rpx 40rpx 30rpx; text-align: center; }
.tip text { font-size: 19rpx; color: #B4BBC7; }

.empty-page { padding: 160rpx 40rpx; display: flex; flex-direction: column; align-items: center; gap: 12rpx; }
.empty-sub { font-size: 21rpx; color: #A8B0BD; text-align: center; }
.empty-btn { margin-top: 20rpx; height: 76rpx; padding: 0 40rpx; border-radius: 38rpx; background: linear-gradient(135deg, #D8B06A, #A97C2F); display: flex; align-items: center; }
.empty-btn text { font-size: 25rpx; color: #FFFFFF; font-weight: 700; }
.empty-link { margin-top: 10rpx; padding: 16rpx; }
.empty-link text { font-size: 22rpx; color: #8A93A3; }
</style>
