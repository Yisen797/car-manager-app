<template>
  <view class="tabbar">
    <view class="tabbar-bg"></view>
    <view class="tabbar-inner safe-bottom">
      <view
        v-for="(t, i) in tabs"
        :key="t.url"
        class="tab-item"
        :class="{ 'is-rescue': t.rescue }"
        @click="switchTo(i)"
      >
        <template v-if="t.rescue">
          <view class="rescue-fab" :class="{ 'fab-active': current === i }">
            <text class="fab-text">SOS</text>
          </view>
          <text class="tab-label rescue-label" :class="{ active: current === i }">{{ t.label }}</text>
        </template>
        <template v-else>
          <text class="tab-ico" :class="{ active: current === i }">{{ t.icon }}</text>
          <text class="tab-label" :class="{ active: current === i }">{{ t.label }}</text>
        </template>
      </view>
    </view>
  </view>
</template>

<script setup>
const props = defineProps({
  current: { type: Number, default: 0 }
})

const tabs = [
  { label: '首页', icon: '🏠', url: '/pages/index/index' },
  { label: '服务', icon: '🧩', url: '/pages/service/index' },
  { label: '救援', icon: 'SOS', url: '/pages/rescue/index', rescue: true },
  { label: '订单', icon: '🧾', url: '/pages/orders/index' },
  { label: '我的', icon: '👤', url: '/pages/mine/index' }
]

function switchTo(i) {
  if (i === props.current) return
  uni.reLaunch({ url: tabs[i].url })
}
</script>

<style scoped>
.tabbar {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 480px;
  bottom: 0;
  z-index: 999;
}
.tabbar-bg {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  background: #FFFFFF;
  box-shadow: 0 -4rpx 24rpx rgba(20, 30, 50, 0.06);
  border-top: 1rpx solid #EEF0F4;
}
.tabbar-inner {
  position: relative;
  display: flex;
  align-items: flex-end;
  height: 108rpx;
  padding: 0 8rpx;
}
.tab-item {
  flex: 1;
  height: 108rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
}
.tab-ico {
  font-size: 40rpx;
  line-height: 1;
  filter: grayscale(1);
  opacity: 0.42;
  transition: all 0.18s ease;
}
.tab-ico.active {
  filter: none;
  opacity: 1;
  transform: translateY(-2rpx);
}
.tab-label {
  margin-top: 8rpx;
  font-size: 20rpx;
  color: #98A1AE;
  line-height: 1;
  transition: color 0.18s ease;
}
.tab-label.active {
  color: #FF5A1F;
  font-weight: 600;
}

/* 中间救援按钮 */
.is-rescue {
  justify-content: flex-end;
  padding-bottom: 16rpx;
}
.rescue-fab {
  position: absolute;
  top: -46rpx;
  left: 50%;
  margin-left: -52rpx;
  width: 104rpx;
  height: 104rpx;
  border-radius: 52rpx;
  background: linear-gradient(140deg, #FF5B4A, #C8071C);
  border: 8rpx solid #FFFFFF;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 10rpx 26rpx rgba(200, 7, 28, 0.38);
}
.fab-active {
  background: linear-gradient(140deg, #FF7A5C, #E01B10);
}
.fab-text {
  color: #FFFFFF;
  font-size: 26rpx;
  font-weight: 800;
  letter-spacing: 1rpx;
  font-style: italic;
}
.rescue-label {
  margin-top: 14rpx;
}
</style>
