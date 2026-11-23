<template>
  <view class="ph" :style="{ paddingTop: statusBarHeight + 'px', background: bg }">
    <view class="ph-bar">
      <view class="ph-back" @click="back">
        <text class="ph-arrow">‹</text>
      </view>
      <text class="ph-title" :style="{ color: color }">{{ title }}</text>
      <view class="ph-right">
        <slot name="right"></slot>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  title: { type: String, default: '' },
  bg: { type: String, default: '#FFFFFF' },
  color: { type: String, default: '#1A1D23' }
})

const statusBarHeight = ref(0)
// #ifndef H5
try {
  statusBarHeight.value = uni.getSystemInfoSync().statusBarHeight || 0
} catch (e) {
  statusBarHeight.value = 0
}
// #endif

function back() {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack()
  } else {
    uni.reLaunch({ url: '/pages/index/index' })
  }
}
</script>

<style scoped>
.ph {
  position: sticky;
  top: 0;
  z-index: 90;
}
.ph-bar {
  height: 88rpx;
  display: flex;
  align-items: center;
  padding: 0 16rpx;
  position: relative;
}
.ph-back {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 32rpx;
}
.ph-arrow {
  font-size: 54rpx;
  line-height: 1;
  font-weight: 300;
  margin-top: -6rpx;
  color: #1A1D23;
}
.ph-title {
  position: absolute;
  left: 120rpx;
  right: 120rpx;
  text-align: center;
  font-size: 32rpx;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ph-right {
  margin-left: auto;
  min-width: 64rpx;
  display: flex;
  align-items: center;
  justify-content: flex-end;
}
</style>
