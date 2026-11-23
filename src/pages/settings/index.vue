<template>
  <view class="page">
    <PageHeader title="设置" />

    <view class="card">
      <view class="row">
        <view class="row-main">
          <text class="row-title">消息通知</text>
          <text class="row-desc">订单进度、优惠券到账提醒</text>
        </view>
        <view class="switch" :class="{ on: state.settings.notify }" @click="toggle('notify')">
          <view class="switch-dot"></view>
        </view>
      </view>
      <view class="row">
        <view class="row-main">
          <text class="row-title">个性化推荐</text>
          <text class="row-desc">根据用车习惯推荐服务</text>
        </view>
        <view class="switch" :class="{ on: state.settings.personalized }" @click="toggle('personalized')">
          <view class="switch-dot"></view>
        </view>
      </view>
    </view>

    <view class="card">
      <view class="row link" @click="doSync">
        <text class="row-title">数据同步</text>
        <view class="row-right">
          <text class="row-value">{{ syncLabel }}</text>
          <text class="arrow">›</text>
        </view>
      </view>
      <view class="row link" @click="checkUpdate">
        <text class="row-title">检查更新</text>
        <view class="row-right">
          <text class="row-value">{{ VERSION_LABEL }}</text>
          <text class="arrow">›</text>
        </view>
      </view>
      <view class="row link" @click="clearCache">
        <text class="row-title">清除缓存</text>
        <view class="row-right">
          <text class="row-value">{{ cacheSize }}</text>
          <text class="arrow">›</text>
        </view>
      </view>
      <view class="row link" @click="openDoc('agreement')">
        <text class="row-title">用户服务协议</text>
        <text class="arrow">›</text>
      </view>
      <view class="row link" @click="openDoc('privacy')">
        <text class="row-title">隐私政策</text>
        <text class="arrow">›</text>
      </view>
      <view class="row link" @click="openDoc('about')">
        <text class="row-title">关于车管家</text>
        <view class="row-right">
          <text class="row-value">{{ VERSION_LABEL }}</text>
          <text class="arrow">›</text>
        </view>
      </view>
    </view>

    <view class="card">
      <view class="row link" @click="doLogout">
        <text class="row-title danger">退出登录</text>
        <text class="arrow">›</text>
      </view>
    </view>

    <view class="version">
      <text>车管家 {{ VERSION_FULL }}</text>
      <text class="version-sub">演示环境 · {{ cloud.enabled ? '云端同步已开启' : '数据仅保存在本机' }}</text>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import {
  state, toggleSetting, logout, clearAllData, go, toast
} from '@/store/index'
import { VERSION_LABEL, VERSION_FULL, APP_VERSION, MIN_SUPPORTED_VERSION } from '@/config/version'
import { cloudStatus, syncNow } from '@/api/sync'

const cloud = ref(cloudStatus())
const syncLabel = computed(() => {
  if (!cloud.value.enabled) return '本地模式'
  return cloud.value.authenticated ? '云端已连接' : '本地（未连接云端）'
})

function doSync() {
  cloud.value = cloudStatus()
  if (!cloud.value.enabled) {
    uni.showModal({
      title: '数据同步',
      content: '当前为本地模式：订单、车辆等数据只保存在这台设备。构建时配置 VITE_API_BASE 可接入云端，登录后自动同步。',
      showCancel: false,
      confirmText: '我知道了'
    })
    return
  }
  if (!cloud.value.authenticated) {
    toast('未连接云端，请重新登录')
    return
  }
  uni.showLoading({ title: '同步中…', mask: true })
  syncNow()
    .then(ok => {
      uni.hideLoading()
      cloud.value = cloudStatus()
      toast(ok ? '已同步到云端' : '云端暂不可用，已保留本地数据')
    })
    .catch(() => {
      uni.hideLoading()
      toast('云端暂不可用，已保留本地数据')
    })
}

// 正式上线后改为请求版本接口：
// GET /api/app/version?platform=android&channel=xxx
// 返回 { versionName, versionCode, downloadUrl, forceUpdate, minSupportedVersion }
function checkUpdate() {
  const isLatest = true // 演示环境固定为最新版本
  uni.showModal({
    title: '检查更新',
    content: isLatest
      ? `当前已是最新版本 ${VERSION_LABEL}`
      : `发现新版本，请升级后使用（最低支持 ${MIN_SUPPORTED_VERSION}）`,
    showCancel: false,
    confirmText: '我知道了'
  })
}

const cacheSize = ref('2.6 MB')

function toggle(key) {
  toggleSetting(key)
}

function openDoc(type) {
  go('/pages/doc/index?type=' + type)
}

function clearCache() {
  uni.showModal({
    title: '清除缓存',
    content: '将清除本地缓存数据和登录状态，确定继续吗？',
    confirmColor: '#E02B20',
    success: res => {
      if (!res.confirm) return
      try { uni.clearStorageSync() } catch (e) {}
      clearAllData()
      cacheSize.value = '0 KB'
      toast('缓存已清除')
      setTimeout(() => uni.reLaunch({ url: '/pages/login/index' }), 600)
    }
  })
}

function doLogout() {
  uni.showModal({
    title: '退出登录',
    content: '确定退出当前账号吗？',
    confirmColor: '#E02B20',
    success: res => {
      if (!res.confirm) return
      logout()
      uni.reLaunch({ url: '/pages/login/index' })
    }
  })
}
</script>

<style scoped>
.card { padding: 8rpx 28rpx; }
.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 26rpx 0;
  border-bottom: 1rpx solid #F2F4F7;
}
.card .row:last-child { border-bottom: none; }
.row-main { display: flex; flex-direction: column; gap: 8rpx; }
.row-title { font-size: 26rpx; color: #1A1D23; }
.row-title.danger { color: #E02B20; }
.row-desc { font-size: 20rpx; color: #A8B0BD; }
.row-right { display: flex; align-items: center; gap: 8rpx; }
.row-value { font-size: 22rpx; color: #A8B0BD; }
.arrow { font-size: 32rpx; color: #D2D7E0; }

.switch { width: 80rpx; height: 44rpx; border-radius: 22rpx; background: #E3E8EF; padding: 4rpx; transition: background 0.2s; }
.switch.on { background: #FF5A1F; }
.switch-dot { width: 36rpx; height: 36rpx; border-radius: 18rpx; background: #FFFFFF; transition: transform 0.2s; }
.switch.on .switch-dot { transform: translateX(36rpx); }

.version { display: flex; flex-direction: column; align-items: center; gap: 10rpx; padding: 30rpx 0; }
.version text { font-size: 20rpx; color: #B4BBC7; }
.version-sub { font-size: 18rpx !important; color: #C9CFD9 !important; }
</style>
