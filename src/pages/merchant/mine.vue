<template>
  <view class="page page-with-tabbar">
    <PageHeader title="商家中心" />

    <template v-if="app">
      <view class="account-card">
        <view class="account-glow"></view>
        <view class="account-top">
          <view class="account-avatar"><text>🏪</text></view>
          <view class="account-main">
            <text class="account-name">{{ app.name }}</text>
            <text class="account-role">商家账号 · {{ tierName }}</text>
          </view>
        </view>
        <view class="account-meta">
          <view class="meta-item">
            <text class="meta-k">登录手机号</text>
            <text class="meta-v">{{ state.user.phone }}</text>
          </view>
          <view class="meta-item">
            <text class="meta-k">商家编号</text>
            <text class="meta-v">{{ app.merchantId }}</text>
          </view>
          <view class="meta-item">
            <text class="meta-k">所在城市</text>
            <text class="meta-v">{{ app.city }}</text>
          </view>
        </view>
      </view>

      <view class="card">
        <view class="menu-row" @click="openApply">
          <text class="menu-ico">📄</text>
          <text class="menu-label">入驻资料</text>
          <text class="menu-value">{{ app.status === 'approved' ? '已通过' : '审核中' }}</text>
          <text class="menu-arrow">›</text>
        </view>
        <view class="menu-row" @click="goTab('/pages/merchant/shop')">
          <text class="menu-ico">🏪</text>
          <text class="menu-label">店铺管理</text>
          <text class="menu-arrow">›</text>
        </view>
        <view class="menu-row" @click="goTab('/pages/merchant/orders')">
          <text class="menu-ico">🧾</text>
          <text class="menu-label">订单管理</text>
          <text class="menu-arrow">›</text>
        </view>
        <view class="menu-row no-border" @click="contact">
          <text class="menu-ico">📞</text>
          <text class="menu-label">联系平台运营</text>
          <text class="menu-arrow">›</text>
        </view>
      </view>

      <view class="card">
        <view class="menu-row" @click="backCustomer">
          <text class="menu-ico">🚗</text>
          <text class="menu-label">返回车主端</text>
          <text class="menu-arrow">›</text>
        </view>
        <view class="menu-row no-border" @click="doLogout">
          <text class="menu-ico">🚪</text>
          <text class="menu-label danger">退出商家登录</text>
          <text class="menu-arrow">›</text>
        </view>
      </view>

      <view class="version">
        <text>车管家商家端 {{ VERSION_FULL }}</text>
        <text class="version-sub">演示环境 · 数据仅保存在本机</text>
      </view>
    </template>

    <view v-else class="empty">
      <text class="empty-icon">🔒</text>
      <text class="empty-text">当前账号没有商家权限</text>
      <view class="empty-btn" @click="goApply"><text>去申请入驻</text></view>
    </view>

    <MerchantTabBar :current="3" />
  </view>
</template>

<script setup>
import { computed } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import MerchantTabBar from '@/components/MerchantTabBar.vue'
import { MERCHANT_TIERS } from '@/data/mock'
import { state, approvedMerchantApp, logout, toast } from '@/store/index'
import { VERSION_FULL } from '@/config/version'

const app = approvedMerchantApp()

const tierName = computed(() => {
  const t = MERCHANT_TIERS.find(x => x.id === (app && app.tier))
  return t ? t.name : '免费入驻'
})

function openApply() {
  uni.navigateTo({ url: '/pages/merchant/apply?id=' + app.id })
}

function goTab(url) {
  uni.reLaunch({ url })
}

function backCustomer() {
  uni.reLaunch({ url: '/pages/index/index' })
}

function contact() {
  uni.makePhoneCall({ phoneNumber: '4000001234', fail: () => toast('平台热线：400-000-1234') })
}

function doLogout() {
  uni.showModal({
    title: '退出商家登录',
    content: '确定退出当前商家账号吗？',
    confirmColor: '#E02B20',
    success: res => {
      if (!res.confirm) return
      logout()
      uni.reLaunch({ url: '/pages/merchant/login' })
    }
  })
}

function goApply() {
  uni.reLaunch({ url: '/pages/merchant/join' })
}
</script>

<style scoped>
.account-card { position: relative; margin: 8rpx 24rpx 24rpx; padding: 30rpx 28rpx; border-radius: 26rpx; background: linear-gradient(130deg, #2E2A22, #17140F); overflow: hidden; }
.account-glow { position: absolute; right: -80rpx; top: -100rpx; width: 320rpx; height: 320rpx; border-radius: 50%; background: radial-gradient(circle, rgba(201, 155, 74, 0.35), transparent 70%); }
.account-top { position: relative; display: flex; align-items: center; gap: 18rpx; }
.account-avatar { width: 92rpx; height: 92rpx; border-radius: 26rpx; background: rgba(243, 217, 164, 0.14); border: 1rpx solid rgba(243, 217, 164, 0.25); display: flex; align-items: center; justify-content: center; }
.account-avatar text { font-size: 44rpx; }
.account-main { display: flex; flex-direction: column; gap: 8rpx; }
.account-name { font-size: 31rpx; font-weight: 700; color: #FFFFFF; }
.account-role { font-size: 20rpx; color: rgba(243, 217, 164, 0.65); }
.account-meta { position: relative; margin-top: 24rpx; padding-top: 20rpx; border-top: 1rpx solid rgba(255, 255, 255, 0.1); display: flex; gap: 20rpx; }
.meta-item { flex: 1; display: flex; flex-direction: column; gap: 6rpx; }
.meta-k { font-size: 18rpx; color: rgba(255, 255, 255, 0.4); }
.meta-v { font-size: 21rpx; color: rgba(255, 255, 255, 0.85); }

.card { padding: 4rpx 28rpx; }
.menu-row { display: flex; align-items: center; padding: 26rpx 0; border-bottom: 1rpx solid #F2F4F7; gap: 14rpx; }
.menu-row.no-border { border-bottom: none; }
.menu-ico { font-size: 28rpx; }
.menu-label { flex: 1; font-size: 26rpx; color: #3A4250; }
.menu-label.danger { color: #E02B20; }
.menu-value { font-size: 21rpx; color: #A97C2F; }
.menu-arrow { font-size: 30rpx; color: #D2D7E0; }

.version { display: flex; flex-direction: column; align-items: center; gap: 8rpx; padding: 24rpx 0 30rpx; }
.version text { font-size: 20rpx; color: #B4BBC7; }
.version-sub { font-size: 18rpx !important; color: #C9CFD9 !important; }

.empty-btn { margin-top: 26rpx; height: 72rpx; padding: 0 36rpx; border-radius: 36rpx; background: linear-gradient(135deg, #D8B06A, #A97C2F); display: flex; align-items: center; }
.empty-btn text { font-size: 24rpx; color: #FFFFFF; font-weight: 700; }
</style>
