<template>
  <view class="page" style="padding-bottom: 180rpx" v-if="order">
    <PageHeader title="服务评价" />

    <!-- 订单摘要 -->
    <view class="card svc-card">
      <view class="svc-icon" :style="{ background: order.gradient }"><text>{{ order.icon }}</text></view>
      <view class="svc-main">
        <text class="svc-title">{{ order.title }}</text>
        <text class="svc-merchant">{{ order.merchant }}</text>
      </view>
    </view>

    <!-- 评分 -->
    <view class="card center-card">
      <text class="rate-title">{{ rateText }}</text>
      <view class="stars">
        <text
          v-for="n in 5"
          :key="n"
          class="star"
          :class="{ on: n <= rating }"
          @click="rating = n"
        >★</text>
      </view>
      <text class="rate-sub">点击星星评分</text>
    </view>

    <!-- 标签 -->
    <view class="card">
      <view class="sec-title"><view class="sec-bar"></view><text>服务印象</text></view>
      <view class="tags">
        <view
          v-for="t in tags"
          :key="t"
          class="tag-chip"
          :class="{ on: picked.includes(t) }"
          @click="toggleTag(t)"
        >
          <text>{{ t }}</text>
        </view>
      </view>
    </view>

    <!-- 文字 -->
    <view class="card">
      <view class="sec-title"><view class="sec-bar"></view><text>评价内容</text></view>
      <textarea
        v-model="text"
        class="review-input"
        maxlength="200"
        placeholder="说说这次服务怎么样，帮助更多车主～"
      />
      <text class="word-count">{{ text.length }}/200</text>

      <view class="anon-row" @click="anonymous = !anonymous">
        <view class="check" :class="{ on: anonymous }"><text v-if="anonymous">✓</text></view>
        <text class="anon-text">匿名评价</text>
      </view>
    </view>

    <view class="fixed-bar">
      <view class="bar-btn btn btn-primary" :class="{ disabled: submitting }" @click="submit">
        <text>{{ submitting ? '提交中…' : '提交评价' }}</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import PageHeader from '@/components/PageHeader.vue'
import { state, submitReview, toast } from '@/store/index'

const orderId = ref('')
const rating = ref(5)
const picked = ref([])
const text = ref('')
const anonymous = ref(false)
const submitting = ref(false)

const order = computed(() => state.orders.find(o => o.id === orderId.value) || null)

const tags = ['专业', '准时', '态度好', '价格透明', '效率高', '值得推荐']

const rateText = computed(() => {
  return ['', '很不满意', '不满意', '一般', '满意', '非常满意'][rating.value]
})

onLoad(options => {
  if (options && options.orderId) orderId.value = options.orderId
})

function toggleTag(t) {
  const i = picked.value.indexOf(t)
  if (i >= 0) picked.value.splice(i, 1)
  else picked.value.push(t)
}

function submit() {
  if (!order.value) {
    toast('订单不存在')
    return
  }
  if (!rating.value) {
    toast('请先评分')
    return
  }
  if (submitting.value) return
  submitting.value = true
  submitReview(order.value.id, {
    rating: rating.value,
    tags: picked.value.slice(),
    text: text.value.trim(),
    anonymous: anonymous.value
  })
  setTimeout(() => {
    submitting.value = false
    toast('评价成功，感谢反馈')
    setTimeout(() => {
      uni.redirectTo({ url: '/pages/order/detail?id=' + order.value.id })
    }, 600)
  }, 400)
}
</script>

<style scoped>
.svc-card { display: flex; align-items: center; padding: 24rpx 26rpx; }
.svc-icon { width: 76rpx; height: 76rpx; border-radius: 20rpx; display: flex; align-items: center; justify-content: center; font-size: 38rpx; }
.svc-main { margin-left: 18rpx; display: flex; flex-direction: column; gap: 8rpx; flex: 1; min-width: 0; }
.svc-title { font-size: 28rpx; font-weight: 700; color: #1A1D23; }
.svc-merchant { font-size: 21rpx; color: #8A93A3; }

.center-card { display: flex; flex-direction: column; align-items: center; padding: 34rpx 28rpx; }
.rate-title { font-size: 30rpx; font-weight: 700; color: #1A1D23; }
.stars { display: flex; gap: 16rpx; margin-top: 20rpx; }
.star { font-size: 64rpx; color: #E3E8EF; transition: color 0.15s; }
.star.on { color: #FFB400; }
.rate-sub { margin-top: 12rpx; font-size: 20rpx; color: #B4BBC7; }

.sec-title { display: flex; align-items: center; gap: 12rpx; font-size: 29rpx; font-weight: 700; color: #1A1D23; margin-bottom: 20rpx; }
.sec-bar { width: 8rpx; height: 26rpx; border-radius: 4rpx; background: linear-gradient(180deg, #FF7A3D, #FF4E12); }

.tags { display: flex; flex-wrap: wrap; gap: 14rpx; }
.tag-chip {
  padding: 12rpx 26rpx;
  border-radius: 30rpx;
  background: #F5F7FA;
  border: 2rpx solid transparent;
}
.tag-chip text { font-size: 23rpx; color: #5A6373; }
.tag-chip.on { background: #FFF1EB; border-color: #FFB68F; }
.tag-chip.on text { color: #FF5A1F; font-weight: 600; }

.review-input {
  width: 100%;
  height: 200rpx;
  background: #F7F8FA;
  border-radius: 16rpx;
  padding: 20rpx;
  font-size: 24rpx;
  color: #1A1D23;
  line-height: 1.6;
}
.word-count { display: block; margin-top: 8rpx; text-align: right; font-size: 19rpx; color: #B4BBC7; }

.anon-row { display: flex; align-items: center; gap: 10rpx; margin-top: 20rpx; }
.check {
  width: 32rpx;
  height: 32rpx;
  border-radius: 16rpx;
  border: 2rpx solid #D8DEE8;
  display: flex;
  align-items: center;
  justify-content: center;
}
.check.on { background: #FF5A1F; border-color: #FF5A1F; }
.check text { font-size: 18rpx; color: #FFFFFF; }
.anon-text { font-size: 23rpx; color: #5A6373; }

.fixed-bar { gap: 16rpx; }
.bar-btn { flex: 1; }
.bar-btn text { font-size: 30rpx; color: #FFFFFF; font-weight: 600; }
.bar-btn.disabled { opacity: 0.55; }
</style>
