<template>
  <view class="page page-with-tabbar">
    <PageHeader title="服务大全" />

    <view class="search-wrap">
      <view class="search">
        <text class="search-ico">🔍</text>
        <input
          v-model="keyword"
          class="search-input"
          placeholder="搜索服务：保养 / 违章 / 拖车 / 代驾"
          placeholder-class="ph"
          confirm-type="search"
          @confirm="onSearch"
        />
        <text v-if="keyword" class="clear" @click="keyword = ''">×</text>
      </view>
    </view>

    <!-- 历史 / 热门搜索 -->
    <view v-if="!keyword" class="search-extra">
      <view v-if="state.searchHistory.length" class="extra-block">
        <view class="extra-head">
          <text class="extra-title">历史搜索</text>
          <text class="extra-clear" @click="clearHistory">清空</text>
        </view>
        <view class="chips">
          <view v-for="k in state.searchHistory" :key="k" class="chip" @click="pick(k)">
            <text>{{ k }}</text>
          </view>
        </view>
      </view>
      <view class="extra-block">
        <view class="extra-head">
          <text class="extra-title">热门搜索</text>
        </view>
        <view class="chips">
          <view v-for="k in hotKeywords" :key="k" class="chip hot" @click="pick(k)">
            <text>{{ k }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 最近使用 -->
    <view v-if="!keyword && recentServices.length" class="quick-block">
      <view class="block-head">
        <text class="block-title">最近使用</text>
      </view>
      <view class="recent-chips">
        <view v-for="s in recentServices" :key="s.id" class="recent-chip" @click="openService(s)">
          <text class="recent-ico">{{ s.icon }}</text>
          <text class="recent-name">{{ s.name }}</text>
        </view>
      </view>
    </view>

    <!-- 常用服务金刚区 -->
    <view v-if="!keyword" class="quick-block">
      <view class="block-head">
        <text class="block-title">常用服务</text>
        <text class="block-sub">{{ featureServices.length }} 项车务 · 一步直达</text>
      </view>
      <view class="quick-grid">
        <view v-for="s in featureServices" :key="s.id" class="quick-item" @click="openService(s)">
          <ServiceIcon :icon="s.icon" :gradient="s.gradient" :size="84" :radius="24" />
          <text class="quick-name">{{ s.name }}</text>
        </view>
      </view>
    </view>

    <ScrollTabs v-model="category" :tabs="categories" />

    <view class="list-head">
      <text class="list-title">{{ categoryLabel }}</text>
      <text class="list-count">{{ filtered.length }} 项</text>
    </view>

    <view class="list">
      <view
        v-for="s in filtered"
        :key="s.id"
        class="service-row"
        @click="go('/pages/service/detail?id=' + s.id)"
      >
        <ServiceIcon :icon="s.icon" :gradient="s.gradient" :size="96" :radius="28" />
        <view class="row-main">
          <view class="row-title">
            <text class="name">{{ s.name }}</text>
            <text v-if="s.badge" class="row-badge">{{ s.badge }}</text>
          </view>
          <text class="short ellipsis">{{ s.short }}</text>
          <view class="row-tags">
            <text v-for="t in s.tags.slice(0, 3)" :key="t" class="mini-tag">{{ t }}</text>
          </view>
        </view>
        <view class="row-right">
          <text class="price">{{ s.priceLabel }}</text>
          <text class="arrow">›</text>
        </view>
      </view>

      <view v-if="filtered.length === 0" class="empty">
        <text class="empty-icon">🔍</text>
        <text class="empty-text">没有找到「{{ keyword }}」相关服务</text>
        <text class="empty-sub">试试这些热门服务</text>
        <view class="empty-chips">
          <view v-for="k in hotKeywords.slice(0, 4)" :key="k" class="chip" @click="pick(k)">
            <text>{{ k }}</text>
          </view>
        </view>
      </view>
    </view>

    <view class="bottom-note">
      <text>全部服务由平台持证合作团队承接 · 明码标价 · 售后兜底</text>
    </view>
  </view>

  <AppTabBar :current="1" />
</template>

<script setup>
import { ref, computed } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import ScrollTabs from '@/components/ScrollTabs.vue'
import ServiceIcon from '@/components/ServiceIcon.vue'
import AppTabBar from '@/components/AppTabBar.vue'
import { SERVICES } from '@/data/mock'
import { state, addSearchKeyword, clearSearchHistory, go } from '@/store/index'

const hotKeywords = ['保养', '洗车', '代驾', '违章', '救援', '年审', '租车', '过户']

function onSearch() {
  addSearchKeyword(keyword.value)
}

function pick(k) {
  keyword.value = k
  addSearchKeyword(k)
}

function clearHistory() {
  clearSearchHistory()
}

const keyword = ref('')
const category = ref('all')

const categories = [
  { key: 'all', label: '全部' },
  { key: '交易', label: '买卖交易' },
  { key: '车务', label: '车务代办' },
  { key: '养护', label: '维修养护' },
  { key: '出行', label: '出行服务' },
  { key: '生活', label: '生活代办' },
  { key: '救援', label: '应急救援' }
]

const filtered = computed(() => {
  return SERVICES.filter(s => {
    const matchCat = category.value === 'all' || s.category === category.value
    const kw = keyword.value.trim()
    const matchKw =
      !kw ||
      s.name.includes(kw) ||
      s.short.includes(kw) ||
      s.tags.some(t => t.includes(kw)) ||
      s.items.some(i => i.name.includes(kw))
    return matchCat && matchKw
  })
})

// 金刚区：不包含打车等独立入口服务
const featureServices = computed(() => SERVICES.filter(s => !s.hub && s.grid !== false))

// 最近使用：按订单时间取最近 4 个不同服务
const recentServices = computed(() => {
  const seen = new Set()
  const list = []
  for (const o of state.orders) {
    if (!o.serviceId || seen.has(o.serviceId)) continue
    const s = SERVICES.find(x => x.id === o.serviceId)
    if (!s) continue
    seen.add(o.serviceId)
    list.push(s)
    if (list.length >= 4) break
  }
  return list
})

const categoryLabel = computed(() => {
  const c = categories.find(x => x.key === category.value)
  return c ? c.label : '全部服务'
})

function openService(s) {
  go('/pages/service/detail?id=' + s.id)
}
</script>

<style scoped>
.search-wrap {
  background: #FFFFFF;
  padding: 8rpx 24rpx 4rpx;
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

.search-extra { background: #FFFFFF; padding: 4rpx 24rpx 18rpx; }
.extra-block { margin-top: 14rpx; }
.extra-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12rpx; }
.extra-title { font-size: 22rpx; color: #6B7484; font-weight: 600; }
.extra-clear { font-size: 19rpx; color: #A8B0BD; }
.chips { display: flex; flex-wrap: wrap; gap: 12rpx; }
.chip { padding: 8rpx 20rpx; border-radius: 24rpx; background: #F4F6F9; }
.chip text { font-size: 21rpx; color: #5A6373; }
.chip.hot { background: #FFF1EB; }
.chip.hot text { color: #FF5A1F; }
.empty-sub { margin-top: 10rpx; font-size: 22rpx; color: #A8B0BD; }
.empty-chips { display: flex; gap: 12rpx; margin-top: 18rpx; flex-wrap: wrap; justify-content: center; }

/* 最近使用 / 常用服务 */
.quick-block {
  background: #FFFFFF;
  border-radius: 24rpx;
  margin: 16rpx 24rpx;
  padding: 24rpx 20rpx 6rpx;
  box-shadow: 0 4rpx 20rpx rgba(20, 30, 50, 0.04);
}
.block-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding: 0 6rpx;
  margin-bottom: 18rpx;
}
.block-title { font-size: 28rpx; font-weight: 700; color: #1A1D23; }
.block-sub { font-size: 19rpx; color: #A8B0BD; }
.recent-chips { display: flex; flex-wrap: wrap; gap: 12rpx; padding: 0 6rpx 16rpx; }
.recent-chip {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 10rpx 18rpx;
  border-radius: 26rpx;
  background: #F7F8FA;
}
.recent-ico { font-size: 22rpx; }
.recent-name { font-size: 22rpx; color: #3A4250; }
.quick-grid { display: flex; flex-wrap: wrap; }
.quick-item {
  width: 25%;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 22rpx;
}
.quick-name { margin-top: 10rpx; font-size: 21rpx; color: #3A4250; }

.list-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding: 14rpx 30rpx 0;
}
.list-title { font-size: 26rpx; font-weight: 700; color: #1A1D23; }
.list-count { font-size: 19rpx; color: #A8B0BD; }

.list { padding: 20rpx 24rpx 0; }
.service-row {
  display: flex;
  align-items: center;
  background: #FFFFFF;
  border-radius: 24rpx;
  padding: 24rpx;
  margin-bottom: 18rpx;
  box-shadow: 0 4rpx 20rpx rgba(20, 30, 50, 0.04);
}
.row-main { flex: 1; min-width: 0; margin-left: 22rpx; }
.row-title { display: flex; align-items: center; gap: 10rpx; }
.name { font-size: 30rpx; font-weight: 700; color: #1A1D23; }
.row-badge {
  font-size: 18rpx;
  color: #FF5A1F;
  background: #FFF1EB;
  padding: 2rpx 8rpx;
  border-radius: 6rpx;
}
.short {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
  color: #8A93A3;
}
.row-tags { display: flex; gap: 10rpx; margin-top: 12rpx; }
.mini-tag {
  font-size: 18rpx;
  color: #6B7484;
  background: #F4F6F9;
  padding: 3rpx 10rpx;
  border-radius: 6rpx;
}
.row-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  margin-left: 10rpx;
  gap: 10rpx;
}
.price { font-size: 22rpx; color: #FF5A1F; font-weight: 600; white-space: nowrap; }
.arrow { font-size: 34rpx; color: #D2D7E0; }

.bottom-note {
  padding: 24rpx 40rpx 30rpx;
  text-align: center;
  font-size: 19rpx;
  color: #B4BBC7;
}
</style>
