<template>
  <view
    class="sicon"
    :style="{
      width: size + 'rpx',
      height: size + 'rpx',
      borderRadius: radius + 'rpx',
      background: gradient
    }"
  >
    <text class="sicon-emoji" :style="{ fontSize: Math.round(size * 0.46) + 'rpx' }">{{ icon }}</text>
  </view>
</template>

<script setup>
const props = defineProps({
  icon: { type: String, default: '🚗' },
  gradient: { type: String, default: 'linear-gradient(135deg,#FF8A4C,#FF4E1E)' },
  size: { type: Number, default: 88 },
  radius: { type: Number, default: 26 }
})
</script>

<style scoped>
.sicon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.sicon-emoji {
  line-height: 1;
}
</style>
