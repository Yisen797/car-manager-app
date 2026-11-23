<template>
  <view class="wv-page">
    <view class="wv-head" :style="{ paddingTop: statusBar + 'px' }">
      <view class="wv-back" @click="back"><text class="wv-arrow">‹</text></view>
      <text class="wv-title">高德打车</text>
      <view class="wv-open" @click="openExternal"><text>浏览器打开</text></view>
    </view>

    <web-view
      class="wv-body"
      :src="src"
      :fullscreen="false"
      :style="{ width: '100%', height: bodyH + 'px' }"
    />

    <view v-if="!src" class="wv-empty">
      <text class="wv-empty-ico">🔗</text>
      <text class="wv-empty-text">渠道链接未配置</text>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'

const src = ref('')
const statusBar = ref(0)
const bodyH = ref(600)

onLoad(options => {
  if (options && options.src) src.value = decodeURIComponent(options.src)

  try {
    const info = uni.getSystemInfoSync()
    const w = info.windowWidth || 390
    const h = info.windowHeight || 844
    const bar = info.statusBarHeight || 0
    const headerPx = (88 * w) / 750
    statusBar.value = bar
    bodyH.value = h - bar - headerPx
  } catch (e) {
    bodyH.value = 600
  }
})

function back() {
  const pages = getCurrentPages()
  if (pages.length > 1) uni.navigateBack()
  else uni.reLaunch({ url: '/pages/travel/index' })
}

function openExternal() {
  const url = src.value
  if (!url) return
  // #ifdef H5
  window.open(url, '_blank')
  // #endif
  // #ifdef APP-PLUS
  plus.runtime.openURL(url)
  // #endif
}
</script>

<style scoped>
.wv-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #FFFFFF;
  overflow: hidden;
}
.wv-head {
  display: flex;
  align-items: center;
  height: 88rpx;
  padding: 0 16rpx;
  flex-shrink: 0;
  background: #FFFFFF;
  border-bottom: 1rpx solid #EFF1F5;
}
.wv-back {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.wv-arrow {
  font-size: 54rpx;
  line-height: 1;
  font-weight: 300;
  margin-top: -6rpx;
  color: #1A1D23;
}
.wv-title {
  flex: 1;
  text-align: center;
  font-size: 32rpx;
  font-weight: 600;
  color: #1A1D23;
}
.wv-open {
  min-width: 130rpx;
  display: flex;
  justify-content: flex-end;
  padding-right: 8rpx;
}
.wv-open text {
  font-size: 23rpx;
  color: #FF5A1F;
}
.wv-body {
  display: block;
  flex: 1;
}
.wv-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20rpx;
}
.wv-empty-ico { font-size: 80rpx; opacity: 0.4; }
.wv-empty-text { font-size: 26rpx; color: #9AA3B0; }
</style>
