<template>
  <view class="page">
    <PageHeader title="附近商家" />

    <view class="top-info">
      <text class="top-loc">📍 {{ state.city }} · {{ state.location.source === 'gps' ? '已定位' : '手动选择' }}</text>
      <text class="top-count">共 {{ filtered.length }} 家合作商家</text>
    </view>

    <ScrollTabs v-model="cat" :tabs="tabs" />

    <view class="list">
      <view
        v-for="m in filtered"
        :key="m.id"
        class="m-card"
        @click="go('/pages/merchant/detail?id=' + m.id)"
      >
        <view class="m-head">
          <view class="m-logo" :style="{ background: m.gradient }">
            <text class="m-emoji">{{ m.emoji }}</text>
          </view>
          <view class="m-main">
            <view class="m-name-row">
              <text class="m-name ellipsis">{{ m.name }}</text>
              <text class="m-tier" :style="{ color: m.tierColor, background: m.tier === '金牌' ? '#FBF3E3' : '#F2F4F7' }">
                {{ m.tier }}
              </text>
            </view>
            <view class="m-meta">
              <text class="rating">★ {{ m.rating }}</text>
              <text class="dot">·</text>
              <text>{{ m.distance }}</text>
              <text class="dot">·</text>
              <text>{{ m.orders }} 单</text>
              <text class="dot">·</text>
              <text>{{ m.hours }}</text>
            </view>
            <view class="m-tags">
              <text v-for="t in m.tags" :key="t" class="m-tag">{{ t }}</text>
            </view>
          </view>
        </view>

        <view class="m-promo">
          <text class="promo-ico">🎁</text>
          <text class="promo-text">{{ m.promo }}</text>
          <text class="promo-btn">去预约 ›</text>
        </view>
      </view>

      <view v-if="filtered.length === 0" class="empty">
        <text class="empty-icon">🏪</text>
        <text class="empty-text">{{ state.city }}暂无{{ cat === 'all' ? '' : cat }}合作商家</text>
        <text class="empty-sub">我们正在招募本地服务商，敬请期待</text>
        <view class="empty-btn" @click="go('/pages/city/index')"><text>切换城市</text></view>
      </view>
    </view>

    <view class="join-bar" @click="go('/pages/merchant/join')">
      <view class="join-left">
        <text class="join-title">我是商家，想入驻平台</text>
        <text class="join-desc">免费入驻 · 客源导流 · 金牌享区域独家</text>
      </view>
      <view class="join-btn"><text>立即入驻</text></view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import ScrollTabs from '@/components/ScrollTabs.vue'
import { state, merchantsInCity, go } from '@/store/index'

const cat = ref('all')

const tabs = [
  { key: 'all', label: '全部' },
  { key: '维修保养', label: '维修保养' },
  { key: '洗车美容', label: '洗车美容' },
  { key: '二手车', label: '二手车' },
  { key: '保险', label: '保险' },
  { key: '道路救援', label: '道路救援' }
]

const filtered = computed(() => {
  const list = merchantsInCity(state.city)
  if (cat.value === 'all') return list
  return list.filter(m => m.tags.some(t => t.includes(cat.value)) || m.name.includes(cat.value))
})
</script>

<style scoped>
.top-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8rpx 28rpx 16rpx;
  background: #FFFFFF;
}
.top-loc { font-size: 24rpx; color: #3A4250; font-weight: 600; }
.top-count { font-size: 21rpx; color: #9AA3B0; }

.list { padding: 20rpx 24rpx 0; }
.m-card {
  background: #FFFFFF;
  border-radius: 24rpx;
  padding: 26rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 4rpx 20rpx rgba(20, 30, 50, 0.04);
}
.m-head { display: flex; align-items: flex-start; }
.m-logo {
  width: 100rpx;
  height: 100rpx;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.m-emoji { font-size: 48rpx; }
.m-main { flex: 1; min-width: 0; margin-left: 20rpx; }
.m-name-row { display: flex; align-items: center; gap: 10rpx; }
.m-name { font-size: 28rpx; font-weight: 700; color: #1A1D23; max-width: 360rpx; }
.m-tier {
  font-size: 17rpx;
  padding: 2rpx 8rpx;
  border-radius: 6rpx;
  flex-shrink: 0;
  font-weight: 600;
}
.m-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8rpx;
  margin-top: 10rpx;
  font-size: 20rpx;
  color: #9AA3B0;
}
.rating { color: #FF8A00; font-weight: 600; }
.dot { color: #D8DCE3; }
.m-tags { display: flex; gap: 10rpx; margin-top: 12rpx; flex-wrap: wrap; }
.m-tag {
  font-size: 18rpx;
  color: #6B7484;
  background: #F4F6F9;
  padding: 3rpx 10rpx;
  border-radius: 6rpx;
}
.m-promo {
  margin-top: 22rpx;
  padding: 16rpx 20rpx;
  border-radius: 16rpx;
  background: #FFF9F5;
  display: flex;
  align-items: center;
  gap: 10rpx;
}
.promo-ico { font-size: 22rpx; }
.promo-text { flex: 1; font-size: 21rpx; color: #C2410C; }
.promo-btn { font-size: 21rpx; color: #FF5A1F; font-weight: 600; }

.join-bar {
  margin: 10rpx 24rpx 30rpx;
  padding: 26rpx 26rpx;
  border-radius: 24rpx;
  background: linear-gradient(120deg, #1F2937, #10161F);
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.join-left { display: flex; flex-direction: column; gap: 8rpx; }
.join-title { font-size: 26rpx; font-weight: 700; color: #FFFFFF; }
.join-desc { font-size: 20rpx; color: rgba(255, 255, 255, 0.42); }
.join-btn {
  height: 60rpx;
  padding: 0 24rpx;
  border-radius: 30rpx;
  background: linear-gradient(135deg, #D8B06A, #A97C2F);
  display: flex;
  align-items: center;
}
.join-btn text { font-size: 22rpx; color: #2A1F0C; font-weight: 700; }

.empty { padding: 100rpx 0; display: flex; flex-direction: column; align-items: center; gap: 10rpx; }
.empty-sub { font-size: 20rpx; color: #B4BBC7; }
.empty-btn { margin-top: 22rpx; height: 64rpx; padding: 0 30rpx; border-radius: 32rpx; background: #FFF1EB; display: flex; align-items: center; }
.empty-btn text { font-size: 22rpx; color: #FF5A1F; font-weight: 600; }
</style>
