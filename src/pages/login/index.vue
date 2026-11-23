<template>
  <view class="login-page">
    <view class="bg-glow"></view>

    <!-- 品牌 -->
    <view class="brand">
      <view class="logo"><text>🚗</text></view>
      <text class="brand-name">车管家</text>
      <text class="brand-slogan">一台车 · 一个会员 · 全年无忧</text>
    </view>

    <!-- 登录卡 -->
    <view class="login-card">
      <text class="card-title">手机号登录</text>
      <text class="card-sub">未注册的手机号将自动创建账号</text>
      <text v-if="inviteTip" class="invite-tip">好友邀请你加入，注册成功即可领取 20 元通用券 + 200 积分</text>

      <view class="field">
        <text class="field-prefix">+86</text>
        <input
          v-model="phone"
          class="input"
          type="number"
          maxlength="11"
          placeholder="请输入手机号"
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
        <text class="agree-text">我已阅读并同意</text>
        <text class="agree-link" @click.stop="showDoc('用户服务协议')">《用户服务协议》</text>
        <text class="agree-text">和</text>
        <text class="agree-link" @click.stop="showDoc('隐私政策')">《隐私政策》</text>
      </view>

      <view class="login-btn" :class="{ disabled: !canLogin || logging }" @click="doLogin">
        <text>{{ logging ? '登录中…' : '登录' }}</text>
      </view>
    </view>

    <!-- 其他方式 -->
    <view class="other">
      <view class="other-line">
        <view class="line"></view>
        <text>其他登录方式</text>
        <view class="line"></view>
      </view>
      <view class="wechat-btn" @click="wechatLogin">
        <text class="wechat-ico">💬</text>
        <text>微信一键登录</text>
      </view>

      <view class="merchant-login" @click="goMerchantLogin">
        <text class="merchant-ico">🏪</text>
        <text class="merchant-text">我是商家，进入商家工作台</text>
        <text class="merchant-arrow">›</text>
      </view>
    </view>

    <view class="footer">
      <text class="footer-tip">演示环境：获取验证码后会自动填入 123456</text>
      <text class="footer-sub">登录即代表同意车管家服务条款 · 客服 400-000-1234</text>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onUnmounted } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { state, login, loginWechat, toast } from '@/store/index'
import {
  captureInviteCode, captureInviteFromUrl, bindPendingInvite
} from '@/api/invite'

// 已登录用户直接进入首页（启动页是登录页）
onShow(() => {
  if (state.user && state.user.loggedIn) {
    uni.reLaunch({ url: '/pages/index/index' })
  }
})

const phone = ref('')
const code = ref('')
const agreed = ref(false)
const counting = ref(0)
const logging = ref(false)
const sentTip = ref('')
const inviteTip = ref('')

// 捕获邀请链接参数：未登录先存本地，登录成功后绑定
onLoad(options => {
  const invite = options && options.invite
  const saved = invite ? captureInviteCode(invite) : captureInviteFromUrl()
  if (saved) inviteTip.value = saved
})
let timer = null

const canLogin = computed(() => /^1\d{10}$/.test(phone.value) && code.value.length === 6 && agreed.value)

function sendCode() {
  if (counting.value > 0) return
  if (!/^1\d{10}$/.test(phone.value)) {
    toast('请输入正确的手机号')
    return
  }
  counting.value = 60
  sentTip.value = '验证码已发送（演示码 123456），已自动填入'
  // 演示环境自动填入验证码
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
  if (!/^1\d{10}$/.test(phone.value)) {
    toast('请输入正确的手机号')
    return
  }
  if (!code.value) {
    toast('请输入验证码')
    return
  }
  if (!agreed.value) {
    toast('请先阅读并同意服务协议')
    return
  }
  if (code.value !== '123456') {
    toast('验证码错误，演示验证码为 123456')
    return
  }
  logging.value = true
  setTimeout(() => {
    login(phone.value, code.value)
    logging.value = false
    // 登录成功后异步绑定邀请码（不阻塞跳转；服务端幂等，重复扫码不重复发奖）
    bindPendingInvite().catch(() => {})
    uni.reLaunch({ url: '/pages/index/index' })
  }, 400)
}

function wechatLogin() {
  uni.showLoading({ title: '微信授权中…', mask: true })
  setTimeout(() => {
    loginWechat()
    uni.hideLoading()
    toast('登录成功')
    bindPendingInvite().catch(() => {})
    setTimeout(() => uni.reLaunch({ url: '/pages/index/index' }), 400)
  }, 700)
}

function goMerchantLogin() {
  uni.navigateTo({ url: '/pages/merchant/login' })
}

function showDoc(name) {
  uni.showModal({
    title: name,
    content: name === '隐私政策'
      ? '车管家仅收集服务所必需的信息（手机号、车辆、订单、位置），用于登录、履约、附近门店与售后，不会出售个人信息。未接入云端时数据仅保存在本机，接入云端后按隐私政策存储。'
      : '车管家提供汽车服务信息聚合与预约撮合服务，实际服务由合作商家提供。请如实填写信息，平台不代办扣分、不伪造材料。',
    showCancel: false,
    confirmText: '我知道了'
  })
}

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  background: #F4F5F7;
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
  background: radial-gradient(circle, rgba(255, 122, 61, 0.22), transparent 65%);
}
.brand {
  position: relative;
  padding: 120rpx 0 90rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.logo {
  width: 132rpx;
  height: 132rpx;
  border-radius: 40rpx;
  background: linear-gradient(135deg, #FF8A4C, #FF4E1E);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 16rpx 40rpx rgba(255, 78, 30, 0.32);
}
.logo text { font-size: 70rpx; }
.brand-name {
  margin-top: 24rpx;
  font-size: 48rpx;
  font-weight: 700;
  color: #1A1D23;
  letter-spacing: 4rpx;
}
.brand-slogan {
  margin-top: 10rpx;
  font-size: 22rpx;
  color: #9AA3B0;
}

.login-card {
  position: relative;
  margin: 0 40rpx;
  padding: 40rpx 34rpx 36rpx;
  border-radius: 28rpx;
  background: #FFFFFF;
  box-shadow: 0 10rpx 40rpx rgba(20, 30, 50, 0.06);
}
.card-title { font-size: 34rpx; font-weight: 700; color: #1A1D23; }
.card-sub { display: block; margin-top: 8rpx; font-size: 21rpx; color: #A8B0BD; }

.field {
  display: flex;
  align-items: center;
  height: 92rpx;
  margin-top: 24rpx;
  border-radius: 16rpx;
  background: #F7F8FA;
  padding: 0 22rpx;
}
.field-prefix {
  font-size: 25rpx;
  color: #3A4250;
  font-weight: 600;
  padding-right: 18rpx;
  border-right: 1rpx solid #E3E8EF;
  margin-right: 18rpx;
}
.input { flex: 1; font-size: 26rpx; color: #1A1D23; }
.ph { color: #B4BBC7; font-size: 25rpx; }
.send-btn {
  height: 56rpx;
  padding: 0 20rpx;
  border-radius: 28rpx;
  background: #FFF1EB;
  display: flex;
  align-items: center;
  flex-shrink: 0;
}
.send-btn text { font-size: 21rpx; color: #FF5A1F; font-weight: 600; }
.send-btn.disabled { background: #F2F4F7; }
.send-btn.disabled text { color: #A8B0BD; }

.sent-tip {
  display: block;
  margin-top: 18rpx;
  padding: 0 6rpx;
  font-size: 20rpx;
  color: #0E9E6B;
}
.invite-tip {
  display: block;
  margin-top: 16rpx;
  padding: 12rpx 16rpx;
  border-radius: 12rpx;
  background: #FFF6EF;
  font-size: 20rpx;
  line-height: 1.5;
  color: #C25A12;
}
.agree {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6rpx;
  margin-top: 26rpx;
  padding: 0 4rpx;
}
.check {
  width: 32rpx;
  height: 32rpx;
  border-radius: 16rpx;
  border: 2rpx solid #D8DEE8;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.check.on { background: #FF5A1F; border-color: #FF5A1F; }
.check text { font-size: 18rpx; color: #FFFFFF; }
.agree-text { font-size: 20rpx; color: #8A93A3; }
.agree-link { font-size: 20rpx; color: #2B63F0; }

.login-btn {
  height: 92rpx;
  border-radius: 46rpx;
  margin-top: 32rpx;
  background: linear-gradient(135deg, #FF7A3D, #FF4E12);
  box-shadow: 0 12rpx 28rpx rgba(255, 78, 18, 0.28);
  display: flex;
  align-items: center;
  justify-content: center;
}
.login-btn text { font-size: 30rpx; color: #FFFFFF; font-weight: 700; letter-spacing: 2rpx; }
.login-btn.disabled { opacity: 0.5; box-shadow: none; }

.other { margin: 54rpx 40rpx 0; }
.other-line { display: flex; align-items: center; gap: 18rpx; }
.other-line text { font-size: 20rpx; color: #B4BBC7; }
.line { flex: 1; height: 1rpx; background: #E6EAF0; }
.wechat-btn {
  margin-top: 26rpx;
  height: 88rpx;
  border-radius: 44rpx;
  background: #FFFFFF;
  border: 2rpx solid #E6EAF0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
}
.wechat-ico { font-size: 30rpx; }
.wechat-btn text { font-size: 26rpx; color: #1A1D23; font-weight: 600; }

.merchant-login {
  margin-top: 20rpx;
  height: 88rpx;
  border-radius: 44rpx;
  background: #FBF7EE;
  border: 1rpx solid #E9D9B8;
  display: flex;
  align-items: center;
  padding: 0 28rpx;
  gap: 12rpx;
}
.merchant-ico { font-size: 30rpx; }
.merchant-text { flex: 1; font-size: 24rpx; color: #8A6A2F; font-weight: 600; }
.merchant-arrow { font-size: 30rpx; color: #C0A97E; }

.footer {
  margin-top: auto;
  padding: 40rpx 40rpx calc(40rpx + env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10rpx;
}
.footer-tip { font-size: 20rpx; color: #C98A2F; }
.footer-sub { font-size: 18rpx; color: #B4BBC7; }
</style>
