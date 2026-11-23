<template>
  <view class="page">
    <PageHeader title="我的优惠券" />

    <!-- 领券中心 -->
    <view class="claim-section" v-if="claimable.length">
      <view class="claim-head">
        <text class="claim-title">领券中心</text>
        <text class="claim-sub">先领券，下单更划算</text>
      </view>
      <scroll-view scroll-x class="claim-scroll" :show-scrollbar="false">
        <view class="claim-inner">
          <view v-for="c in claimable" :key="c.id" class="claim-card">
            <view class="claim-amt">
              <text class="claim-num">{{ c.amount }}</text>
              <text class="claim-unit">元</text>
            </view>
            <view class="claim-main">
              <text class="claim-name">{{ c.name }}</text>
              <text class="claim-cond">{{ c.threshold > 0 ? '满 ' + c.threshold + ' 可用' : '无门槛' }} · {{ c.scope }}</text>
            </view>
            <view class="claim-btn" @click="claim(c)"><text>领取</text></view>
          </view>
        </view>
      </scroll-view>
    </view>

    <ScrollTabs v-model="tab" :tabs="tabs" />

    <view class="list">
      <view
        v-for="c in filtered"
        :key="c.id"
        class="coupon"
        :class="{ disabled: c.status !== 'unused' }"
      >
        <view class="coupon-left">
          <view class="coupon-amt">
            <text class="coupon-symbol">¥</text>
            <text class="coupon-num">{{ c.amount }}</text>
          </view>
          <text class="coupon-cond">{{ c.threshold > 0 ? '满 ' + c.threshold + ' 可用' : '无门槛' }}</text>
        </view>
        <view class="coupon-line"><view class="hole top"></view><view class="hole bottom"></view></view>
        <view class="coupon-main">
          <view class="coupon-top">
            <text class="coupon-name">{{ c.name }}</text>
            <text class="coupon-scope">{{ c.scope }}</text>
          </view>
          <text class="coupon-expire">有效期至 {{ c.expire }}</text>
          <view class="coupon-bottom">
            <text class="coupon-status">{{ statusLabel(c) }}</text>
            <view v-if="c.status === 'unused'" class="coupon-use" @click="use"><text>去使用</text></view>
          </view>
        </view>
      </view>

      <view v-if="filtered.length === 0" class="empty">
        <text class="empty-icon">🎫</text>
        <text class="empty-text">{{ tab === 'unused' ? '暂无可用优惠券' : '这里还没有优惠券' }}</text>
        <view v-if="tab === 'unused' && claimable.length" class="empty-btn" @click="scrollTop">
          <text>去领券中心看看</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import ScrollTabs from '@/components/ScrollTabs.vue'
import { COUPONS } from '@/data/mock'
import { state, claimCoupon, canClaimCoupon, refreshCouponStatus, go, toast } from '@/store/index'
import { isCouponExpired } from '@/utils/pricing'

const tab = ref('unused')

onMounted(() => {
  refreshCouponStatus()
})

const claimable = computed(() => COUPONS.filter(c => canClaimCoupon(c)))

const tabs = computed(() => {
  const count = key =>
    state.coupons.filter(c => {
      const expired = c.status === 'unused' && isCouponExpired(c)
      if (key === 'unused') return c.status === 'unused' && !expired
      if (key === 'used') return c.status === 'used'
      return c.status === 'expired' || expired
    }).length

  return [
    { key: 'unused', label: '未使用', count: count('unused') },
    { key: 'used', label: '已使用', count: count('used') },
    { key: 'expired', label: '已过期', count: count('expired') }
  ]
})

const filtered = computed(() =>
  state.coupons.filter(c => {
    const expired = c.status === 'unused' && isCouponExpired(c)
    if (tab.value === 'unused') return c.status === 'unused' && !expired
    if (tab.value === 'used') return c.status === 'used'
    return c.status === 'expired' || expired
  })
)

function statusLabel(c) {
  if (c.status === 'used') return '已使用'
  if (c.status === 'expired' || isCouponExpired(c)) return '已过期'
  return '可使用'
}

function claim(c) {
  if (claimCoupon(c)) toast('领取成功')
  else toast('已领取过啦')
}

function use() {
  go('/pages/service/index')
}

function scrollTop() {
  uni.pageScrollTo({ scrollTop: 0, duration: 200 })
}
</script>

<style scoped>
.claim-section { margin: 0 24rpx 20rpx; padding: 24rpx; border-radius: 24rpx; background: linear-gradient(120deg, #2B1D13, #1A110B); }
.claim-head { display: flex; align-items: baseline; gap: 14rpx; margin-bottom: 18rpx; }
.claim-title { font-size: 29rpx; font-weight: 700; color: #F3D9A4; }
.claim-sub { font-size: 20rpx; color: rgba(243, 217, 164, 0.55); }
.claim-scroll { white-space: nowrap; }
.claim-inner { display: inline-flex; gap: 16rpx; }
.claim-card {
  display: inline-flex;
  align-items: center;
  width: 420rpx;
  padding: 18rpx 20rpx;
  border-radius: 18rpx;
  background: rgba(255, 255, 255, 0.08);
  border: 1rpx solid rgba(243, 217, 164, 0.22);
}
.claim-amt { display: flex; align-items: baseline; gap: 2rpx; }
.claim-num { font-size: 42rpx; font-weight: 700; color: #F3D9A4; }
.claim-unit { font-size: 19rpx; color: #F3D9A4; }
.claim-main { flex: 1; min-width: 0; margin-left: 14rpx; display: flex; flex-direction: column; gap: 6rpx; }
.claim-name { font-size: 24rpx; font-weight: 600; color: #FFFFFF; }
.claim-cond { font-size: 18rpx; color: rgba(255, 255, 255, 0.5); }
.claim-btn { height: 52rpx; padding: 0 20rpx; border-radius: 26rpx; background: linear-gradient(135deg, #E0B96A, #B98A3C); display: flex; align-items: center; }
.claim-btn text { font-size: 21rpx; color: #2B1D13; font-weight: 700; }

.list { padding: 20rpx 24rpx 0; }
.coupon {
  display: flex;
  background: #FFFFFF;
  border-radius: 22rpx;
  margin-bottom: 18rpx;
  overflow: hidden;
  height: 190rpx;
}
.coupon.disabled { opacity: 0.55; }
.coupon-left {
  width: 200rpx;
  background: linear-gradient(135deg, #FF8A4C, #FF4E12);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  flex-shrink: 0;
}
.coupon.disabled .coupon-left { background: linear-gradient(135deg, #B9C0CB, #8E97A5); }
.coupon-amt { display: flex; align-items: baseline; }
.coupon-symbol { font-size: 26rpx; color: #FFFFFF; font-weight: 600; }
.coupon-num { font-size: 58rpx; color: #FFFFFF; font-weight: 700; line-height: 1; }
.coupon-cond { font-size: 19rpx; color: rgba(255, 255, 255, 0.8); }

.coupon-line { width: 2rpx; position: relative; background: #F2F4F7; }
.hole { position: absolute; left: -12rpx; width: 24rpx; height: 24rpx; border-radius: 12rpx; background: #F4F5F7; }
.hole.top { top: -12rpx; }
.hole.bottom { bottom: -12rpx; }

.coupon-main { flex: 1; min-width: 0; padding: 20rpx 22rpx; display: flex; flex-direction: column; }
.coupon-top { display: flex; align-items: center; gap: 12rpx; }
.coupon-name { font-size: 27rpx; font-weight: 700; color: #1A1D23; }
.coupon-scope { font-size: 18rpx; color: #FF5A1F; background: #FFF1EB; padding: 3rpx 10rpx; border-radius: 6rpx; }
.coupon-expire { margin-top: 10rpx; font-size: 19rpx; color: #9AA3B0; }
.coupon-bottom { margin-top: auto; display: flex; align-items: center; justify-content: space-between; }
.coupon-status { font-size: 20rpx; color: #B4BBC7; }
.coupon-use { height: 48rpx; padding: 0 20rpx; border-radius: 24rpx; background: #FFF1EB; display: flex; align-items: center; }
.coupon-use text { font-size: 20rpx; color: #FF5A1F; font-weight: 600; }

.empty-btn { margin-top: 26rpx; height: 64rpx; padding: 0 30rpx; border-radius: 32rpx; background: #FFF1EB; display: flex; align-items: center; }
.empty-btn text { font-size: 22rpx; color: #FF5A1F; }
</style>
