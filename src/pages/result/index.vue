<template>
  <view class="page result-page">
    <view class="top-pad"></view>

    <view class="result-icon" :class="'icon-' + type">
      <view class="ri-ring"></view>
      <text class="ri-emoji">{{ icon }}</text>
    </view>

    <text class="result-title">{{ title }}</text>
    <text class="result-desc">{{ desc }}</text>

    <view class="info-card" v-if="type !== 'merchant'">
      <view v-for="(r, i) in rows" :key="i" class="info-row">
        <text class="info-k">{{ r.k }}</text>
        <text class="info-v" :class="{ highlight: r.hi }">{{ r.v }}</text>
      </view>
    </view>

    <view class="steps-hint" v-if="type === 'rescue'">
      <view class="hint-item">
        <text class="hint-ico">1</text>
        <text class="hint-txt">SOS 呼叫已提交，订单进入待接单状态</text>
      </view>
      <view class="hint-item">
        <text class="hint-ico">2</text>
        <text class="hint-txt">当前为演示环境，暂无真实救援车接单</text>
      </view>
      <view class="hint-item">
        <text class="hint-ico">3</text>
        <text class="hint-txt">如遇紧急情况，请直接拨打 122 / 120</text>
      </view>
    </view>

    <view class="actions">
      <view class="act act-ghost" @click="goHome"><text>返回首页</text></view>
      <view v-if="type !== 'merchant'" class="act act-primary" @click="viewOrder">
        <text>{{ type === 'member' ? '查看我的权益' : '查看订单' }}</text>
      </view>
    </view>

    <view class="service-line">
      <text>客服热线 400-000-1234 · 7×24 小时为您服务</text>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { state, memberInfo, orderStatusText } from '@/store/index'

const type = ref('order')
const orderId = ref('')
const tier = ref('premium')

const order = computed(() => state.orders.find(o => o.id === orderId.value) || state.orders[0])
const member = computed(() => memberInfo())

const icon = computed(() => ({ member: '👑', rescue: '🚨', order: '✅', merchant: '🏪' }[type.value] || '✅'))
const title = computed(() => ({
  member: '开通成功',
  rescue: '救援已呼叫',
  order: '预约成功',
  merchant: '入驻申请已提交'
}[type.value]))
const desc = computed(() => ({
  member: '会员权益已生效，全年用车养车一站托管',
  rescue: '呼叫已提交，正在等待救援车接单（演示环境暂无真实救援车）',
  order: '商家将尽快与您确认服务时间',
  merchant: '平台将在 1 个工作日内与您联系对接'
}[type.value]))
const rows = computed(() => {
  if (type.value === 'member') {
    return [
      { k: '会员类型', v: member.value.name },
      { k: '会员账号', v: state.user.phone },
      { k: '会员到期', v: member.value.expire, hi: true }
    ]
  }
  const o = order.value
  return [
    { k: '服务项目', v: o ? o.title : '车管家服务' },
    { k: '订单编号', v: o ? o.id : '—' },
    { k: '当前状态', v: o ? orderStatusText(o.status) : '—', hi: true }
  ]
})

onLoad(options => {
  if (options && options.type) type.value = options.type
  if (options && options.id) orderId.value = options.id
  if (options && options.tier) tier.value = options.tier
})

function goHome() {
  uni.reLaunch({ url: '/pages/index/index' })
}

function viewOrder() {
  if (type.value === 'member') {
    uni.redirectTo({ url: '/pages/member/index' })
  } else if (order.value) {
    uni.redirectTo({ url: '/pages/order/detail?id=' + order.value.id })
  } else {
    uni.reLaunch({ url: '/pages/orders/index' })
  }
}
</script>

<style scoped>
.result-page { display: flex; flex-direction: column; align-items: center; padding: 0 48rpx; }
.top-pad { height: 140rpx; }

.result-icon {
  position: relative;
  width: 180rpx;
  height: 180rpx;
  border-radius: 90rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(140deg, #12A06A, #08714A);
  box-shadow: 0 16rpx 40rpx rgba(8, 113, 74, 0.28);
}
.icon-member { background: linear-gradient(140deg, #D8B06A, #A97C2F); box-shadow: 0 16rpx 40rpx rgba(169, 124, 47, 0.3); }
.icon-rescue { background: linear-gradient(140deg, #FF5B4A, #C8071C); box-shadow: 0 16rpx 40rpx rgba(200, 7, 28, 0.3); }
.icon-merchant { background: linear-gradient(140deg, #4A8CF7, #1F5FD0); box-shadow: 0 16rpx 40rpx rgba(31, 95, 208, 0.3); }
.ri-ring {
  position: absolute;
  width: 220rpx;
  height: 220rpx;
  border-radius: 50%;
  border: 2rpx solid rgba(0, 0, 0, 0.06);
  animation: ripple 1.8s ease-out infinite;
}
@keyframes ripple {
  0% { transform: scale(0.9); opacity: 0.7; }
  100% { transform: scale(1.35); opacity: 0; }
}
.ri-emoji { font-size: 66rpx; }

.result-title { margin-top: 44rpx; font-size: 42rpx; font-weight: 700; color: #1A1D23; }
.result-desc { margin-top: 16rpx; font-size: 24rpx; color: #8A93A3; text-align: center; line-height: 1.5; }

.info-card {
  width: 100%;
  margin-top: 44rpx;
  background: #FFFFFF;
  border-radius: 24rpx;
  padding: 24rpx 28rpx;
  box-shadow: 0 6rpx 24rpx rgba(20, 30, 50, 0.05);
}
.info-row { display: flex; align-items: center; justify-content: space-between; padding: 14rpx 0; }
.info-k { font-size: 23rpx; color: #9AA3B0; }
.info-v { font-size: 23rpx; color: #2A3038; max-width: 400rpx; text-align: right; }
.info-v.highlight { color: #FF5A1F; font-weight: 600; }

.steps-hint {
  width: 100%;
  margin-top: 24rpx;
  background: #FFFFFF;
  border-radius: 24rpx;
  padding: 12rpx 28rpx;
  display: flex;
  flex-direction: column;
}
.hint-item { display: flex; align-items: center; padding: 18rpx 0; }
.hint-ico {
  width: 36rpx;
  height: 36rpx;
  border-radius: 18rpx;
  background: #FFEDEC;
  color: #D0021B;
  font-size: 19rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.hint-txt { margin-left: 16rpx; font-size: 22rpx; color: #4A5261; }

.actions { display: flex; gap: 20rpx; width: 100%; margin-top: 48rpx; }
.act {
  flex: 1;
  height: 88rpx;
  border-radius: 44rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.act text { font-size: 28rpx; font-weight: 600; }
.act-ghost { background: #FFFFFF; border: 2rpx solid #E6E9EF; }
.act-ghost text { color: #3A4250; }
.act-primary { background: linear-gradient(135deg, #FF7A3D, #FF4E12); }
.act-primary text { color: #FFFFFF; }

.service-line { margin-top: 40rpx; padding-bottom: 40rpx; }
.service-line text { font-size: 20rpx; color: #B4BBC7; }
</style>
