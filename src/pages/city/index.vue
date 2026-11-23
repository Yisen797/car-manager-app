<template>
  <view class="page">
    <PageHeader title="选择城市" />

    <!-- 搜索 -->
    <view class="search-wrap">
      <view class="search">
        <text class="search-ico">🔍</text>
        <input
          v-model="keyword"
          class="search-input"
          placeholder="搜索城市或省份"
          placeholder-class="ph"
        />
        <text v-if="keyword" class="clear" @click="keyword = ''">×</text>
      </view>
    </view>

    <!-- 搜索结果 -->
    <view v-if="keyword" class="card result-card">
      <view v-for="c in searchResult" :key="c.adcode" class="result-row" @click="choose(c)">
        <view class="result-main">
          <text class="result-name">{{ c.name }}</text>
          <text class="result-prov">{{ c.province }}</text>
        </view>
        <text class="result-open" :class="{ on: isOpen(c) }">{{ isOpen(c) ? '已开通' : '即将开通' }}</text>
      </view>
      <view v-if="searchResult.length === 0" class="empty">
        <text class="empty-icon">🔍</text>
        <text class="empty-text">没有找到「{{ keyword }}」</text>
      </view>
    </view>

    <template v-else>
      <!-- 当前城市 -->
      <view class="current-card">
        <view class="cur-main">
          <text class="cur-label">当前城市</text>
          <text class="cur-city">{{ state.city }}</text>
          <text class="cur-source">{{ locationText }}</text>
        </view>
        <view class="locate-btn" :class="{ disabled: locating }" @click="locate">
          <text>{{ locating ? '定位中…' : '📍 重新定位' }}</text>
        </view>
      </view>

      <view class="legend">
        <view class="legend-dot"></view>
        <text>带绿点的城市已有合作商家，其余城市即将开通</text>
      </view>

      <!-- 热门 -->
      <view class="card">
        <view class="sec-title"><view class="sec-bar"></view><text>热门城市</text></view>
        <view class="hot-grid">
          <view
            v-for="name in HOT_CITIES"
            :key="name"
            class="hot-item"
            :class="{ on: state.city === name }"
            @click="chooseByName(name)"
          >
            <text>{{ name }}</text>
          </view>
        </view>
      </view>

      <!-- 全部城市 -->
      <view class="card all-card">
        <view class="sec-title between">
          <view class="row gap12">
            <view class="sec-bar"></view>
            <text>全部城市</text>
          </view>
          <text class="sec-count">{{ CITIES.length }} 个</text>
        </view>

        <view v-for="g in groups" :key="g.province" class="province">
          <text class="province-name">{{ g.province }}</text>
          <view class="city-grid">
            <view
              v-for="c in g.cities"
              :key="c.adcode"
              class="city-item"
              :class="{ on: state.city === c.name }"
              @click="choose(c)"
            >
              <text>{{ c.name }}</text>
              <view v-if="isOpen(c)" class="open-dot"></view>
            </view>
          </view>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import { CITIES } from '@/data/cities'
import { state, setCity, merchantsInCity, toast } from '@/store/index'
import { HOT_CITIES, locateAndSetCity } from '@/utils/location'

const keyword = ref('')
const locating = ref(false)

const groups = computed(() => {
  const map = new Map()
  for (const c of CITIES) {
    if (!map.has(c.province)) map.set(c.province, [])
    map.get(c.province).push(c)
  }
  return [...map.entries()].map(([province, cities]) => ({ province, cities }))
})

const searchResult = computed(() => {
  const kw = keyword.value.trim()
  if (!kw) return []
  return CITIES.filter(
    c => c.name.includes(kw) || c.fullName.includes(kw) || c.province.includes(kw)
  ).slice(0, 60)
})

const locationText = computed(() => {
  if (state.location && state.location.source === 'gps') {
    return '系统定位 · ' + (state.location.updatedAt || '')
  }
  return '手动选择'
})

function isOpen(c) {
  return merchantsInCity(c.name).length > 0
}

function back() {
  const pages = getCurrentPages()
  if (pages.length > 1) uni.navigateBack()
  else uni.reLaunch({ url: '/pages/index/index' })
}

function choose(c) {
  setCity(c.name)
  toast(isOpen(c) ? '已切换到 ' + c.name : c.name + ' 暂未开通商家，敬请期待')
  setTimeout(back, 600)
}

function chooseByName(name) {
  const c = CITIES.find(x => x.name === name)
  if (c) choose(c)
}

async function locate() {
  if (locating.value) return
  locating.value = true
  const res = await locateAndSetCity()
  locating.value = false
  if (res.ok) {
    toast('已定位到 ' + res.city)
    setTimeout(back, 700)
  } else {
    uni.showModal({
      title: '定位失败',
      content: '无法获取定位。请检查系统定位权限和网络后重试，也可以直接手动选择城市。',
      showCancel: false,
      confirmText: '我知道了'
    })
  }
}
</script>

<style scoped>
.search-wrap {
  background: #FFFFFF;
  padding: 8rpx 24rpx 16rpx;
}
.search {
  height: 76rpx;
  border-radius: 38rpx;
  background: #F4F6F9;
  display: flex;
  align-items: center;
  padding: 0 26rpx;
}
.search-ico { font-size: 26rpx; margin-right: 12rpx; }
.search-input { flex: 1; font-size: 26rpx; color: #1A1D23; }
.ph { color: #A8B0BD; font-size: 26rpx; }
.clear { font-size: 34rpx; color: #A8B0BD; padding: 0 6rpx; }

.result-card { padding: 8rpx 28rpx; }
.result-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 22rpx 0;
  border-bottom: 1rpx solid #F2F4F7;
}
.result-row:last-child { border-bottom: none; }
.result-main { display: flex; align-items: baseline; gap: 12rpx; }
.result-name { font-size: 27rpx; font-weight: 600; color: #1A1D23; }
.result-prov { font-size: 20rpx; color: #A8B0BD; }
.result-open { font-size: 19rpx; color: #B4BBC7; }
.result-open.on { color: #0E9E6B; }

.current-card {
  margin: 8rpx 24rpx 16rpx;
  padding: 28rpx;
  border-radius: 24rpx;
  background: linear-gradient(130deg, #16283D, #0D1725);
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.cur-main { display: flex; flex-direction: column; gap: 8rpx; }
.cur-label { font-size: 20rpx; color: rgba(255, 255, 255, 0.5); }
.cur-city { font-size: 40rpx; font-weight: 700; color: #FFFFFF; }
.cur-source { font-size: 19rpx; color: rgba(255, 255, 255, 0.45); }
.locate-btn {
  height: 64rpx;
  padding: 0 24rpx;
  border-radius: 32rpx;
  background: rgba(255, 255, 255, 0.14);
  border: 1rpx solid rgba(255, 255, 255, 0.22);
  display: flex;
  align-items: center;
}
.locate-btn text { font-size: 21rpx; color: #FFFFFF; font-weight: 600; }
.locate-btn.disabled { opacity: 0.6; }

.legend { display: flex; align-items: center; gap: 10rpx; padding: 0 32rpx 16rpx; }
.legend-dot { width: 12rpx; height: 12rpx; border-radius: 6rpx; background: #0E9E6B; }
.legend text { font-size: 19rpx; color: #A8B0BD; }

.sec-title {
  display: flex;
  align-items: center;
  gap: 12rpx;
  font-size: 29rpx;
  font-weight: 700;
  color: #1A1D23;
  margin-bottom: 18rpx;
}
.sec-bar { width: 8rpx; height: 26rpx; border-radius: 4rpx; background: linear-gradient(180deg, #35C3FF, #1668FF); }
.sec-count { font-size: 20rpx; color: #A8B0BD; font-weight: 400; }
.between { justify-content: space-between; }
.row { display: flex; align-items: center; }
.gap12 { gap: 12rpx; }

.hot-grid { display: flex; flex-wrap: wrap; gap: 16rpx; }
.hot-item {
  width: calc(20% - 13rpx);
  height: 68rpx;
  border-radius: 16rpx;
  background: #F5F7FA;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2rpx solid transparent;
}
.hot-item text { font-size: 23rpx; color: #3A4250; }
.hot-item.on { background: #EDF3FF; border-color: #9FC0FF; }
.hot-item.on text { color: #2B63F0; font-weight: 600; }

.all-card { padding-bottom: 20rpx; }
.province { margin-top: 20rpx; }
.province-name { display: block; font-size: 22rpx; color: #8A93A3; margin-bottom: 12rpx; }
.city-grid { display: flex; flex-wrap: wrap; gap: 12rpx; }
.city-item {
  position: relative;
  width: calc(25% - 9rpx);
  height: 64rpx;
  border-radius: 14rpx;
  background: #F7F8FA;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2rpx solid transparent;
}
.city-item text { font-size: 21rpx; color: #3A4250; }
.city-item.on { background: #EDF3FF; border-color: #9FC0FF; }
.city-item.on text { color: #2B63F0; font-weight: 600; }
.open-dot {
  position: absolute;
  top: 8rpx;
  right: 8rpx;
  width: 8rpx;
  height: 8rpx;
  border-radius: 4rpx;
  background: #0E9E6B;
}
</style>
