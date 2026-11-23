<template>
  <view class="mlogin-page">
    <view class="bg-glow"></view>

    <view class="brand">
      <view class="logo"><text>🏪</text></view>
      <text class="brand-name">商家工作台</text>
      <text class="brand-slogan">接单 · 管理门店 · 查看经营数据</text>
    </view>

    <view class="login-card">
      <text class="card-title">商家登录</text>
      <text class="card-sub">仅限已通过入驻审核的商家账号</text>

      <view class="field">
        <text class="field-prefix">+86</text>
        <input
          v-model="phone"
          class="input"
          type="number"
          maxlength="11"
          placeholder="请输入商家手机号"
          placeholder-class="ph"
        />
      </view>

      <view class="field">
        <input
          v-model="code"
          class="input"
          type="number"
          maxlength="6"
          placeholder="请输入验证码"
          placeholder-class="ph"
        />
        <view class="send-btn" :class="{ disabled: counting > 0 }" @click="sendCode">
          <text>{{ counting > 0 ? counting + 's 后重发' : '获取验证码' }}</text>
        </view>
      </view>

      <text v-if="sentTip" class="sent-tip">{{ sentTip }}</text>

      <view class="agree" @click="agreed = !agreed">
        <view class="check" :class="{ on: agreed }"><text v-if="agreed">✓</text></view>
        <text class="agree-text">我已阅读并同意《商家服务协议》与《隐私政策》</text>
      </view>

      <view class="login-btn" :class="{ disabled: !canLogin || logging }" @click="doLogin">
        <text>{{ logging ? '登录中…' : '进入商家工作台' }}</text>
      </view>
    </view>

    <view class="links">
      <text class="link" @click="apply">还不是商家？申请入驻 ›</text>
      <text class="link sub" @click="backToCustomer">返回车主登录</text>
    </view>

    <view class="footer">
      <text class="footer-tip">演示环境：验证码会自动填入 123456</text>
      <text class="footer-sub">商家客服 400-000-1234</text>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onUnmounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { state, loginAsMerchant, toast } from '@/store/index'

const phone = ref('')
const code = ref('')
const agreed = ref(false)
const counting = ref(0)
const logging = ref(false)
const sentTip = ref('')
let timer = null

const canLogin = computed(() => /^1\d{10}$/.test(phone.value) && code.value.length === 6 && agreed.value)

onShow(() => {
  // 已是商家登录态时直接进入工作台
  if (state.user && state.user.loggedIn && state.user.role === 'merchant') {
    uni.reLaunch({ url: '/pages/merchant/center' })
  }
})

function sendCode() {
  if (counting.value > 0) return
  if (!/^1\d{10}$/.test(phone.value)) {
    toast('请输入正确的手机号')
    return
  }
  counting.value = 60
  sentTip.value = '验证码已发送（演示码 123456），已自动填入'
  setTimeout(() => { code.value = '123456' }, 600)
  timer = setInterval(() => {
    counting.value -= 1
    if (counting.value <= 0) {
      clearInterval(timer)
      timer = null
    }
  }, 1000)
}

function doLogin() {
  if (logging.value) return
  if (!/^1\d{10}$/.test(phone.value)) return toast('请输入正确的手机号')
  if (!code.value) return toast('请输入验证码')
  if (!agreed.value) return toast('请先阅读并同意商家服务协议')
  if (code.value !== '123456') return toast('验证码错误，演示验证码为 123456')

  logging.value = true
  const res = loginAsMerchant(phone.value, code.value)
  logging.value = false

  if (res.ok) {
    toast('登录成功')
    setTimeout(() => uni.reLaunch({ url: '/pages/merchant/center' }), 500)
    return
  }
  if (res.reason === 'not-merchant') {
    uni.showModal({
      title: '未找到商家账号',
      content: '该手机号还没有已通过审核的入驻申请。是否现在申请入驻？',
      confirmText: '去入驻',
      cancelText: '取消',
      success: r => {
        if (r.confirm) uni.redirectTo({ url: '/pages/merchant/join' })
      }
    })
    return
  }
  toast('登录失败，请稍后重试')
}

function apply() {
  uni.navigateTo({ url: '/pages/merchant/join' })
}

function backToCustomer() {
  uni.redirectTo({ url: '/pages/login/index' })
}

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<style scoped>
.mlogin-page {
  min-height: 100vh;
  background: #F6F4EF;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.bg-glow {
  position: absolute;
  top: -260rpx;
  right: -160rpx;
  width: 620rpx;
  height: 620rpx;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(201, 155, 74, 0.25), transparent 65%);
}
.brand { position: relative; padding: 110rpx 0 80rpx; display: flex; flex-direction: column; align-items: center; }
.logo {
  width: 132rpx;
  height: 132rpx;
  border-radius: 40rpx;
  background: linear-gradient(135deg, #D8B06A, #A97C2F);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 16rpx 40rpx rgba(169, 124, 47, 0.3);
}
.logo text { font-size: 68rpx; }
.brand-name { margin-top: 24rpx; font-size: 46rpx; font-weight: 700; color: #2B2418; letter-spacing: 3rpx; }
.brand-slogan { margin-top: 10rpx; font-size: 21rpx; color: #A08D6E; }

.login-card {
  position: relative;
  margin: 0 40rpx;
  padding: 40rpx 34rpx 36rpx;
  border-radius: 28rpx;
  background: #FFFFFF;
  border: 1rpx solid #EADDC4;
  box-shadow: 0 12rpx 40rpx rgba(107, 74, 23, 0.08);
}
.card-title { font-size: 34rpx; font-weight: 700; color: #2B2418; }
.card-sub { display: block; margin-top: 8rpx; font-size: 21rpx; color: #A08D6E; }

.field {
  display: flex;
  align-items: center;
  height: 92rpx;
  margin-top: 24rpx;
  border-radius: 16rpx;
  background: #FAF8F3;
  padding: 0 22rpx;
  border: 1rpx solid #F0E8D8;
}
.field-prefix { font-size: 25rpx; color: #5A4A32; font-weight: 600; padding-right: 18rpx; border-right: 1rpx solid #E6DCC8; margin-right: 18rpx; }
.input { flex: 1; font-size: 26rpx; color: #2B2418; }
.ph { color: #BBAE96; font-size: 25rpx; }
.send-btn { height: 56rpx; padding: 0 20rpx; border-radius: 28rpx; background: #FBF3E3; display: flex; align-items: center; flex-shrink: 0; }
.send-btn text { font-size: 21rpx; color: #A97C2F; font-weight: 600; }
.send-btn.disabled { background: #F2F4F7; }
.send-btn.disabled text { color: #A8B0BD; }

.sent-tip { display: block; margin-top: 18rpx; padding: 0 6rpx; font-size: 20rpx; color: #0E9E6B; }

.agree { display: flex; align-items: center; gap: 8rpx; margin-top: 26rpx; padding: 0 4rpx; }
.check {
  width: 32rpx;
  height: 32rpx;
  border-radius: 16rpx;
  border: 2rpx solid #D9CDB5;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.check.on { background: #A97C2F; border-color: #A97C2F; }
.check text { font-size: 18rpx; color: #FFFFFF; }
.agree-text { font-size: 20rpx; color: #8A7A5E; }

.login-btn {
  height: 92rpx;
  border-radius: 46rpx;
  margin-top: 32rpx;
  background: linear-gradient(135deg, #D8B06A, #A97C2F);
  box-shadow: 0 12rpx 28rpx rgba(169, 124, 47, 0.28);
  display: flex;
  align-items: center;
  justify-content: center;
}
.login-btn text { font-size: 29rpx; color: #FFFFFF; font-weight: 700; letter-spacing: 2rpx; }
.login-btn.disabled { opacity: 0.55; box-shadow: none; }

.links { margin-top: 42rpx; display: flex; flex-direction: column; align-items: center; gap: 20rpx; }
.link { font-size: 24rpx; color: #A97C2F; font-weight: 600; }
.link.sub { font-size: 22rpx; color: #9AA3B0; font-weight: 400; }

.footer { margin-top: auto; padding: 40rpx 40rpx calc(40rpx + env(safe-area-inset-bottom)); display: flex; flex-direction: column; align-items: center; gap: 10rpx; }
.footer-tip { font-size: 20rpx; color: #A97C2F; }
.footer-sub { font-size: 18rpx; color: #B4BBC7; }
</style>
