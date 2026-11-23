<template>
  <view class="mtabbar">
    <view class="mtabbar-bg"></view>
    <view class="mtabbar-inner safe-bottom">
      <view
        v-for="(t, i) in tabs"
        :key="t.url"
        class="mtab-item"
        @click="switchTo(i)"
      >
        <text class="mtab-ico" :class="{ active: current === i }">{{ t.icon }}</text>
        <text class="mtab-label" :class="{ active: current === i }">{{ t.label }}</text>
      </view>
    </view>
  </view>
</template>

<script setup>
const props = defineProps({
  current: { type: Number, default: 0 }
})

const tabs = [
  { label: '工作台', icon: '📊', url: '/pages/merchant/center' },
  { label: '订单', icon: '🧾', url: '/pages/merchant/orders' },
  { label: '店铺', icon: '🏪', url: '/pages/merchant/shop' },
  { label: '我的', icon: '👤', url: '/pages/merchant/mine' }
]

function switchTo(i) {
  if (i === props.current) return
  uni.reLaunch({ url: tabs[i].url })
}
</script>

<style scoped>
.mtabbar {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 480px;
  bottom: 0;
  z-index: 999;
}
.mtabbar-bg {
  position: absolute;
  inset: 0;
  background: #FFFFFF;
  box-shadow: 0 -4rpx 24rpx rgba(20, 30, 50, 0.06);
  border-top: 1rpx solid #EEF0F4;
}
.mtabbar-inner {
  position: relative;
  display: flex;
  align-items: flex-end;
  height: 108rpx;
  padding: 0 8rpx;
}
.mtab-item {
  flex: 1;
  height: 108rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.mtab-ico {
  font-size: 40rpx;
  line-height: 1;
  filter: grayscale(1);
  opacity: 0.4;
  transition: all 0.18s ease;
}
.mtab-ico.active {
  filter: none;
  opacity: 1;
  transform: translateY(-2rpx);
}
.mtab-label {
  margin-top: 8rpx;
  font-size: 20rpx;
  color: #98A1AE;
  line-height: 1;
}
.mtab-label.active {
  color: #A97C2F;
  font-weight: 600;
}
</style>
