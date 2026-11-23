<template>
  <view class="page" style="padding-bottom: 180rpx" v-if="merchant">
    <!-- HERO -->
    <view class="hero" :style="{ background: merchant.gradient }">
      <view class="hero-mask"></view>
      <view class="hero-top">
        <view class="back" @click="back"><text class="back-arrow">‹</text></view>
        <text class="hero-title">商家详情</text>
        <view class="back" style="opacity: 0"></view>
      </view>

      <view class="hero-body">
        <view class="logo"><text class="logo-emoji">{{ merchant.emoji }}</text></view>
        <text class="name">{{ merchant.name }}</text>
        <view class="badges">
          <text class="badge">{{ merchant.tier }}会员</text>
          <text class="badge light">{{ merchant.hours }}</text>
        </view>
        <view class="rating-row">
          <text class="rating">★ {{ merchant.rating }}</text>
          <text class="rdot">·</text>
          <text class="rmeta">{{ merchant.orders }} 单成交</text>
          <text class="rdot">·</text>
          <text class="rmeta">{{ merchant.distance }}</text>
        </view>
      </view>
    </view>

    <!-- 服务 -->
    <view class="card svc-card">
      <view class="sec-title">
        <view class="sec-bar"></view>
        <text>服务项目</text>
      </view>
      <view v-for="(s, i) in services" :key="i" class="svc-row">
        <view class="svc-main">
          <text class="svc-name">{{ s.name }}</text>
          <text class="svc-desc">{{ s.desc }}</text>
        </view>
        <view class="svc-right">
          <view class="svc-price">
            <text class="yen">¥</text>
            <text class="num">{{ s.price }}</text>
            <text class="unit">起</text>
          </view>
          <view class="svc-btn" @click="book(s)"><text>预约</text></view>
        </view>
      </view>
    </view>

    <!-- 信息 -->
    <view class="card info-card">
      <view class="info-row">
        <text class="info-ico">📍</text>
        <view class="info-main">
          <text class="info-k">门店地址</text>
          <text class="info-v">{{ merchant.address }}</text>
        </view>
      </view>
      <view class="info-row">
        <text class="info-ico">🕐</text>
        <view class="info-main">
          <text class="info-k">营业时间</text>
          <text class="info-v">{{ merchant.hours }}</text>
        </view>
      </view>
      <view class="info-row">
        <text class="info-ico">📞</text>
        <view class="info-main">
          <text class="info-k">联系电话</text>
          <text class="info-v link" @click="call">400-000-1234</text>
        </view>
      </view>
    </view>

    <!-- 优惠 -->
    <view class="promo-card">
      <text class="promo-ico">🎁</text>
      <view class="promo-main">
        <text class="promo-title">会员专享</text>
        <text class="promo-text">{{ merchant.promo }}</text>
      </view>
      <text class="promo-arrow" @click="go('/pages/member/index')">›</text>
    </view>

    <!-- 资质 -->
    <view class="card">
      <view class="sec-title">
        <view class="sec-bar"></view>
        <text>商家资质</text>
      </view>
      <view class="certs">
        <view class="cert"><text class="cert-ico">📜</text><text class="cert-name">营业执照</text></view>
        <view class="cert"><text class="cert-ico">🛡️</text><text class="cert-name">平台认证</text></view>
        <view class="cert"><text class="cert-ico">⭐</text><text class="cert-name">服务保证金</text></view>
      </view>
    </view>

    <!-- 评价 -->
    <view class="card">
      <view class="sec-title between">
        <view class="row gap12">
          <view class="sec-bar"></view>
          <text>用户评价</text>
        </view>
        <text class="more">{{ merchant.rating }} 分 · {{ merchant.orders + myReviewCount }} 条</text>
      </view>
      <view v-for="(r, i) in reviews" :key="i" class="review" :class="{ 'no-border': i === reviews.length - 1 }">
        <view class="rv-head">
          <text class="rv-avatar">{{ r.avatar }}</text>
          <text class="rv-name">{{ r.user }}<text v-if="r.mine" class="rv-mine">我的评价</text></text>
          <view class="rv-stars">
            <text v-for="n in 5" :key="n" class="rv-star" :class="{ on: n <= r.rating }">★</text>
          </view>
          <text v-if="r.date" class="rv-date">{{ r.date }}</text>
        </view>
        <view v-if="r.tags && r.tags.length" class="rv-tags">
          <text v-for="t in r.tags" :key="t" class="rv-tag">{{ t }}</text>
        </view>
        <text class="rv-text">{{ r.text }}</text>
      </view>
      <view v-if="reviews.length === 0" class="rv-empty"><text>暂无评价，快来抢沙发～</text></view>
    </view>

    <view class="fixed-bar">
      <view class="act act-ghost" @click="call"><text>📞 电话咨询</text></view>
      <view class="act act-primary" @click="book(services[0])"><text>立即预约</text></view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { MERCHANT_REVIEWS } from '@/data/mock'
import { state, findMerchant, allMerchants, go, toast } from '@/store/index'

const id = ref('m1')
const merchant = computed(() => findMerchant(id.value) || allMerchants()[0])

const services = computed(() => {
  const names = merchant.value.tags
  const prices = [199, 299, 399, 88]
  return names.slice(0, 4).map((n, i) => ({
    name: n + '服务',
    desc: '平台认证技师 · 明码标价',
    price: prices[i % prices.length]
  }))
})

const myReviews = computed(() =>
  state.orders
    .filter(o => o.review && o.merchant === merchant.value.name)
    .map(o => ({
      avatar: state.user.avatar,
      user: o.review.anonymous ? '匿名车主' : state.user.name,
      rating: o.review.rating,
      date: o.review.date,
      text: o.review.text,
      tags: o.review.tags,
      mine: true
    }))
)
const myReviewCount = computed(() => myReviews.value.length)

const reviews = computed(() => {
  const statics = (MERCHANT_REVIEWS[merchant.value.id] || []).map(r => ({
    ...r,
    avatar: r.rating >= 5 ? '😀' : '🙂'
  }))
  return [...myReviews.value, ...statics]
})

onLoad(options => {
  if (options && options.id) id.value = options.id
})

function back() {
  const pages = getCurrentPages()
  if (pages.length > 1) uni.navigateBack()
  else uni.reLaunch({ url: '/pages/index/index' })
}

function call() {
  uni.makePhoneCall({ phoneNumber: '4000001234', fail: () => toast('门店电话：400-000-1234') })
}

function book(s) {
  go('/pages/booking/index?serviceId=maintain&merchantId=' + merchant.value.id)
}
</script>

<style scoped>
.hero { position: relative; padding: 0 32rpx 80rpx; overflow: hidden; }
.hero-mask {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 80% 0%, rgba(255, 255, 255, 0.25), transparent 60%);
}
.hero-top {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 44px;
  height: calc(44px + 88rpx);
}
.back {
  width: 64rpx;
  height: 64rpx;
  border-radius: 32rpx;
  background: rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
}
.back-arrow { font-size: 50rpx; color: #FFF; margin-top: -6rpx; font-weight: 300; }
.hero-title { font-size: 30rpx; color: rgba(255, 255, 255, 0.92); font-weight: 600; }
.hero-body { position: relative; display: flex; flex-direction: column; align-items: center; }
.logo {
  width: 140rpx;
  height: 140rpx;
  border-radius: 36rpx;
  background: rgba(255, 255, 255, 0.92);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 10rpx 30rpx rgba(0, 0, 0, 0.14);
}
.logo-emoji { font-size: 72rpx; }
.name {
  margin-top: 20rpx;
  font-size: 34rpx;
  font-weight: 700;
  color: #FFFFFF;
  text-align: center;
}
.badges { display: flex; gap: 12rpx; margin-top: 16rpx; }
.badge {
  font-size: 19rpx;
  color: #2A1F0C;
  background: linear-gradient(135deg, #F0D8A8, #D8B06A);
  padding: 4rpx 14rpx;
  border-radius: 8rpx;
  font-weight: 600;
}
.badge.light { background: rgba(255, 255, 255, 0.22); color: #FFFFFF; font-weight: 400; }
.rating-row { display: flex; align-items: center; gap: 10rpx; margin-top: 16rpx; }
.rating { font-size: 24rpx; color: #FFFFFF; font-weight: 700; }
.rdot { color: rgba(255, 255, 255, 0.4); font-size: 20rpx; }
.rmeta { font-size: 21rpx; color: rgba(255, 255, 255, 0.7); }

.svc-card { margin-top: -40rpx; position: relative; }
.sec-title {
  display: flex;
  align-items: center;
  gap: 12rpx;
  font-size: 29rpx;
  font-weight: 700;
  color: #1A1D23;
  margin-bottom: 20rpx;
}
.sec-bar {
  width: 8rpx;
  height: 26rpx;
  border-radius: 4rpx;
  background: linear-gradient(180deg, #FF7A3D, #FF4E12);
}
.more { font-size: 21rpx; color: #9AA3B0; font-weight: 400; }

.svc-row {
  display: flex;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #F4F6F9;
}
.svc-row:last-child { border-bottom: none; }
.svc-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6rpx; }
.svc-name { font-size: 26rpx; font-weight: 600; color: #1A1D23; }
.svc-desc { font-size: 20rpx; color: #9AA3B0; }
.svc-right { display: flex; align-items: center; gap: 16rpx; }
.svc-price { display: flex; align-items: baseline; }
.yen { font-size: 20rpx; color: #FF5A1F; font-weight: 700; }
.num { font-size: 32rpx; color: #FF5A1F; font-weight: 800; }
.unit { font-size: 18rpx; color: #A8B0BD; margin-left: 2rpx; }
.svc-btn {
  height: 54rpx;
  padding: 0 22rpx;
  border-radius: 27rpx;
  background: linear-gradient(135deg, #FF7A3D, #FF4E12);
  display: flex;
  align-items: center;
}
.svc-btn text { font-size: 21rpx; color: #FFFFFF; font-weight: 600; }

.info-card { padding: 10rpx 28rpx; }
.info-row { display: flex; align-items: flex-start; padding: 20rpx 0; border-bottom: 1rpx solid #F4F6F9; }
.info-row:last-child { border-bottom: none; }
.info-ico { font-size: 26rpx; width: 48rpx; }
.info-main { flex: 1; display: flex; flex-direction: column; gap: 6rpx; }
.info-k { font-size: 20rpx; color: #9AA3B0; }
.info-v { font-size: 24rpx; color: #2A3038; }
.info-v.link { color: #2B63F0; }

.promo-card {
  margin: 0 24rpx 24rpx;
  padding: 24rpx 26rpx;
  border-radius: 22rpx;
  background: linear-gradient(115deg, #FFF4EC, #FFFFFF);
  border: 1rpx solid #FFDCC8;
  display: flex;
  align-items: center;
  gap: 14rpx;
}
.promo-ico { font-size: 30rpx; }
.promo-main { flex: 1; display: flex; flex-direction: column; gap: 6rpx; }
.promo-title { font-size: 22rpx; font-weight: 700; color: #C2410C; }
.promo-text { font-size: 21rpx; color: #B45309; }
.promo-arrow { font-size: 32rpx; color: #E0BFA8; }

.certs { display: flex; }
.cert { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 10rpx; }
.cert-ico { font-size: 34rpx; }
.cert-name { font-size: 20rpx; color: #6B7484; }

.review { padding: 20rpx 0; border-bottom: 1rpx solid #F4F6F9; }
.review.no-border { border-bottom: none; }
.rv-head { display: flex; align-items: center; gap: 12rpx; }
.rv-avatar { font-size: 30rpx; }
.rv-name { font-size: 23rpx; color: #3A4250; font-weight: 600; }
.rv-stars { display: flex; gap: 2rpx; }
.rv-star { font-size: 20rpx; color: #E3E8EF; }
.rv-star.on { color: #FF8A00; }
.rv-mine { margin-left: 10rpx; font-size: 17rpx; color: #FF5A1F; background: #FFF1EB; padding: 2rpx 8rpx; border-radius: 6rpx; }
.rv-date { margin-left: auto; font-size: 18rpx; color: #B4BBC7; }
.rv-tags { display: flex; flex-wrap: wrap; gap: 8rpx; margin-top: 10rpx; }
.rv-tag { font-size: 18rpx; color: #FF5A1F; background: #FFF1EB; padding: 3rpx 10rpx; border-radius: 6rpx; }
.rv-text { display: block; margin-top: 12rpx; font-size: 22rpx; color: #6B7484; line-height: 1.6; }
.rv-empty { padding: 30rpx 0; text-align: center; }
.rv-empty text { font-size: 22rpx; color: #A8B0BD; }

.fixed-bar { gap: 16rpx; }
.act { height: 86rpx; border-radius: 43rpx; display: flex; align-items: center; justify-content: center; flex: 1; }
.act text { font-size: 27rpx; font-weight: 600; }
.act-ghost { background: #F4F6F9; }
.act-ghost text { color: #3A4250; }
.act-primary { background: linear-gradient(135deg, #FF7A3D, #FF4E12); }
.act-primary text { color: #FFFFFF; }
</style>
