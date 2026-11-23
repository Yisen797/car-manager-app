<template>
  <scroll-view class="tabs-scroll" scroll-x :show-scrollbar="false">
    <view class="tabs-inner">
      <view
        v-for="t in tabs"
        :key="t.key"
        class="tab-pill"
        :class="{ active: modelValue === t.key }"
        @click="$emit('update:modelValue', t.key)"
      >
        <text class="tab-pill-text">{{ t.label }}</text>
        <text v-if="t.count" class="tab-count">{{ t.count }}</text>
      </view>
    </view>
  </scroll-view>
</template>

<script setup>
defineProps({
  tabs: { type: Array, default: () => [] },
  modelValue: { type: String, default: '' }
})
defineEmits(['update:modelValue'])
</script>

<style scoped>
.tabs-scroll {
  width: 100%;
  white-space: nowrap;
  background: #FFFFFF;
}
.tabs-inner {
  display: inline-block;
  padding: 8rpx 20rpx 18rpx;
  font-size: 0;
}
.tab-pill {
  display: inline-flex;
  align-items: center;
  height: 62rpx;
  padding: 0 28rpx;
  margin-right: 14rpx;
  border-radius: 31rpx;
  background: #F4F6F9;
  vertical-align: middle;
}
.tab-pill.active {
  background: linear-gradient(135deg, #FF7A3D, #FF4E12);
  box-shadow: 0 6rpx 16rpx rgba(255, 78, 18, 0.24);
}
.tab-pill-text {
  font-size: 25rpx;
  color: #5A6373;
  font-weight: 500;
}
.tab-pill.active .tab-pill-text {
  color: #FFFFFF;
  font-weight: 600;
}
.tab-count {
  margin-left: 8rpx;
  font-size: 20rpx;
  color: #98A1AE;
}
.tab-pill.active .tab-count {
  color: rgba(255, 255, 255, 0.8);
}
</style>
