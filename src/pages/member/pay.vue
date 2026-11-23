<template>
  <view class="page" style="padding-bottom: 200rpx" v-if="tier">
    <PageHeader title="确认支付" />

    <view class="amount-card">
      <text class="amount-label">支付金额</text>
      <view class="amount-row">
        <text class="amount-yen">¥</text>
        <text class="amount-num">{{ tier.price }}</text>
      </view>
      <text class="amount-tip">{{ tier.name }} · 有效期 1 年</text>
    </view>

    <view class="card">
      <view class="kv">
        <text class="k">购买项目</text>
        <text class="v">{{ tier.name }}（{{ tier.tag }}）</text>
      </view>
      <view class="kv">
        <text class="k">生效时间</text>
        <text class="v">{{ startDate }}</text>
      </view>
      <view class="kv">
        <text class="k">到期时间</text>
        <text class="v">{{ endDate }}</text>
      </view>
      <view class="kv">
        <text class="k">会员账号</text>
        <text class="v">{{ state.user.phone }}</text>
      </view>
    </view>

    <view class="card pay-card">
      <text class="pay-title">支付方式</text>
      <view class="pay-item" :class="{ active: method === 'wechat' }" @click="method = 'wechat'">
        <view class="pay-icon wx"><text>💚</text></view>
        <view class="pay-main">
          <text class="pay-name">微信支付</text>
          <text class="pay-desc">推荐使用，安全快捷</text>
        </view>
        <view class="radio" :class="{ on: method === 'wechat' }"><text v-if="method === 'wechat'">✓</text></view>
      </view>
      <view class="pay-item" :class="{ active: method === 'balance' }" @click="method = 'balance'">
        <view class="pay-icon bal"><text>💰</text></view>
        <view class="pay-main">
          <text class="pay-name">余额支付</text>
          <text class="pay-desc">当前余额 ¥{{ state.user.balance.toFixed(2) }}</text>
        </view>
        <view class="radio" :class="{ on: method === 'balance' }"><text v-if="method === 'balance'">✓</text></view>
      </view>
    </view>

    <view class="agreement" @click="agreed = !agreed">
      <view class="checkbox" :class="{ on: agreed }"><text v-if="agreed">✓</text></view>
      <text class="agree-text">我已阅读并同意《车管家会员服务协议》与《合规经营条款》</text>
    </view>

    <view class="safe-note">
      <text>🔒 支付由持牌支付机构提供服务，平台不留存银行卡信息</text>
    </view>

    <view class="fixed-bar">
      <view class="bar-left">
        <text class="bar-label">合计</text>
        <text class="bar-price">¥{{ tier.price }}</text>
      </view>
      <view class="bar-btn" :class="{ disabled: !agreed || paying }" @click="pay">
        <text>{{ paying ? '支付中…' : '确认支付' }}</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import PageHeader from '@/components/PageHeader.vue'
import { MEMBER_TIERS } from '@/data/mock'
import { state, activateMember, toast } from '@/store/index'

const tierId = ref('premium')
const method = ref('wechat')
const agreed = ref(true)
const paying = ref(false)

const tier = computed(() => MEMBER_TIERS.find(t => t.id === tierId.value) || MEMBER_TIERS[1])

const startDate = computed(() => fmt(new Date()))
const endDate = computed(() => {
  const d = new Date()
  d.setFullYear(d.getFullYear() + 1)
  return fmt(d)
})

onLoad(options => {
  if (options && options.tier) tierId.value = options.tier
})

function fmt(d) {
  const p = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function pay() {
  if (!agreed.value) {
    toast('请先阅读并同意服务协议')
    return
  }
  if (paying.value) return
  paying.value = true
  setTimeout(() => {
    activateMember(tier.value.id, endDate.value)
    paying.value = false
    uni.redirectTo({ url: '/pages/result/index?type=member&tier=' + tier.value.id })
  }, 900)
}
</script>

<style scoped>
.amount-card {
  margin: 8rpx 24rpx 24rpx;
  padding: 40rpx 0 36rpx;
  border-radius: 26rpx;
  background: linear-gradient(150deg, #2E2A22, #17140F);
  display: flex;
  flex-direction: column;
  align-items: center;
  border: 2rpx solid rgba(201, 155, 74, 0.35);
}
.amount-label { font-size: 22rpx; color: rgba(243, 217, 164, 0.6); }
.amount-row { display: flex; align-items: baseline; margin-top: 14rpx; }
.amount-yen { font-size: 30rpx; color: #F3D9A4; font-weight: 700; }
.amount-num { font-size: 76rpx; color: #F3D9A4; font-weight: 800; line-height: 1; }
.amount-tip { margin-top: 16rpx; font-size: 21rpx; color: rgba(255, 255, 255, 0.42); }

.kv { display: flex; align-items: center; justify-content: space-between; padding: 14rpx 0; }
.k { font-size: 24rpx; color: #8A93A3; }
.v { font-size: 24rpx; color: #2A3038; }

.pay-card { padding: 28rpx; }
.pay-title { display: block; font-size: 28rpx; font-weight: 700; color: #1A1D23; margin-bottom: 12rpx; }
.pay-item {
  display: flex;
  align-items: center;
  padding: 22rpx 20rpx;
  border-radius: 18rpx;
  border: 2rpx solid transparent;
  margin-top: 14rpx;
}
.pay-item.active { background: #FFF9F5; border-color: #FFC9B0; }
.pay-icon {
  width: 68rpx;
  height: 68rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 34rpx;
}
.pay-icon.wx { background: #E9F9F1; }
.pay-icon.bal { background: #FFF4E0; }
.pay-main { flex: 1; margin-left: 18rpx; display: flex; flex-direction: column; gap: 6rpx; }
.pay-name { font-size: 26rpx; font-weight: 600; color: #1A1D23; }
.pay-desc { font-size: 20rpx; color: #9AA3B0; }
.radio {
  width: 38rpx;
  height: 38rpx;
  border-radius: 19rpx;
  border: 2rpx solid #D8DDE4;
  display: flex;
  align-items: center;
  justify-content: center;
}
.radio.on { background: #FF5A1F; border-color: #FF5A1F; }
.radio text { font-size: 20rpx; color: #FFF; font-weight: 700; }

.agreement { display: flex; align-items: flex-start; padding: 8rpx 32rpx 0; gap: 12rpx; }
.checkbox {
  width: 34rpx;
  height: 34rpx;
  border-radius: 8rpx;
  border: 2rpx solid #D8DDE4;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 2rpx;
}
.checkbox.on { background: #FF5A1F; border-color: #FF5A1F; }
.checkbox text { font-size: 19rpx; color: #FFF; }
.agree-text { flex: 1; font-size: 20rpx; color: #8A93A3; line-height: 1.6; }

.safe-note { padding: 24rpx 32rpx; text-align: center; }
.safe-note text { font-size: 19rpx; color: #B4BBC7; }

.bar-left { flex: 1; display: flex; flex-direction: column; gap: 2rpx; }
.bar-label { font-size: 20rpx; color: #9AA3B0; }
.bar-price { font-size: 38rpx; font-weight: 800; color: #FF5A1F; }
.bar-btn {
  width: 320rpx;
  height: 90rpx;
  border-radius: 45rpx;
  background: linear-gradient(135deg, #D8B06A, #A97C2F);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 10rpx 26rpx rgba(169, 124, 47, 0.32);
}
.bar-btn.disabled { opacity: 0.45; box-shadow: none; }
.bar-btn text { font-size: 30rpx; color: #2A1F0C; font-weight: 700; }
</style>
