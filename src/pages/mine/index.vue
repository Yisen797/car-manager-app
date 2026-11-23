<template>
  <view class="page page-with-tabbar mine-page">
    <!-- 头部 -->
    <view class="header" :style="{ paddingTop: topPad + 'px' }">
      <view class="header-glow"></view>
      <view class="header-top">
        <text class="header-title">我的</text>
        <view class="settings" @click="go('/pages/settings/index')"><text>⚙️</text></view>
      </view>

      <view class="profile">
        <view class="avatar"><text class="avatar-emoji">{{ state.user.avatar }}</text></view>
        <view class="profile-main">
          <view class="profile-name-row">
            <text class="profile-name">{{ state.user.name }}</text>
            <view class="vip-chip" :class="{ on: member.active }">
              <text>{{ member.active ? '👑 ' + member.name : '未开通会员' }}</text>
            </view>
          </view>
          <text class="profile-phone">{{ state.user.phone }}</text>
        </view>
        <view class="edit" @click="go('/pages/profile/index')"><text>编辑</text></view>
      </view>

    </view>

    <!-- 会员卡 -->
    <view class="vip-wrap">
      <view class="vip-card" :class="member.active ? 'is-vip' : 'no-vip'" @click="go('/pages/member/index')">
        <view class="vip-main">
          <view class="vip-row">
            <text class="vip-crown">{{ member.active ? '👑' : '🎫' }}</text>
            <text class="vip-name">{{ member.active ? member.name : '开通会员' }}</text>
            <text v-if="member.active" class="vip-exp">{{ member.expire }} 到期</text>
          </view>
        </view>
        <view class="vip-cta">
          <text>{{ member.active ? '查看权益' : '立即开通' }}</text>
          <text class="vip-arrow">›</text>
        </view>
      </view>
    </view>

    <!-- 资产 -->
    <view class="assets">
      <view class="asset-item" @click="go('/pages/member/index')">
        <text class="asset-num">{{ benefitCount }}</text>
        <text class="asset-label">会员权益</text>
      </view>
      <view class="asset-line"></view>
      <view class="asset-item" @click="go('/pages/coupon/index')">
        <text class="asset-num">{{ couponCount() }}</text>
        <text class="asset-label">优惠券</text>
      </view>
      <view class="asset-line"></view>
      <view class="asset-item" @click="go('/pages/points/index')">
        <text class="asset-num">{{ state.user.points }}</text>
        <text class="asset-label">积分</text>
      </view>
      <view class="asset-line"></view>
      <view class="asset-item" @click="tip('余额：¥0.00')">
        <text class="asset-num">0.00</text>
        <text class="asset-label">余额</text>
      </view>
    </view>

    <!-- 邀请有礼 -->
    <view class="invite-card" @click="go('/pages/invite/index')">
      <view class="invite-glow"></view>
      <view class="invite-main">
        <text class="invite-title">🎁 邀请有礼 · 拉新奖励</text>
        <text class="invite-desc">邀 1 位好友，双方各得 20 元 + 200 积分</text>
        <text class="invite-sub">最高再得 99 元尊享会员年卡</text>
      </view>
      <view class="invite-btn"><text>立即邀请</text></view>
    </view>

    <!-- 我的服务 -->
    <view class="card">
      <view class="sec-head">
        <text class="card-title">我的服务</text>
      </view>
      <view class="grid">
        <view v-for="it in myServices" :key="it.label" class="grid-item" @click="handle(it)">
          <view class="grid-icon" :style="{ background: it.bg }">
            <text class="grid-emoji">{{ it.icon }}</text>
          </view>
          <text class="grid-label">{{ it.label }}</text>
          <text v-if="it.badge" class="grid-badge">{{ it.badge }}</text>
        </view>
      </view>
    </view>

    <!-- 活动与福利 -->
    <view class="section-head-inline">
      <text class="card-title">活动与福利</text>
      <text class="section-more" @click="go('/pages/member/index')">更多 ›</text>
    </view>

    <swiper
      class="act-swiper"
      :autoplay="true"
      :interval="4000"
      :circular="true"
      indicator-dots
      indicator-color="rgba(255,255,255,0.35)"
      indicator-active-color="#FFFFFF"
    >
      <swiper-item v-for="b in BANNERS" :key="b.id">
        <view class="act-item" :style="{ background: b.gradient }" @click="go(b.action)">
          <view class="act-main">
            <text class="act-title">{{ b.title }}</text>
            <text class="act-desc">{{ b.desc }}</text>
          </view>
          <view class="act-btn"><text>去看看</text></view>
        </view>
      </swiper-item>
    </swiper>

    <!-- 三端入口 -->
    <view class="card dual-card">
      <view class="dual" @click="go('/pages/enterprise/index')">
        <text class="dual-ico">🏢</text>
        <view class="dual-main">
          <text class="dual-title">企业会员</text>
          <text class="dual-desc">5 台车统一托管 · 299/年</text>
        </view>
        <text class="dual-arrow">›</text>
      </view>
      <view class="dual-line"></view>
      <view class="dual" @click="merchantEntry">
        <text class="dual-ico">🏪</text>
        <view class="dual-main">
          <text class="dual-title">{{ state.user.role === 'merchant' ? '商家中心' : '商家入驻' }}</text>
          <text class="dual-desc">{{ state.user.role === 'merchant' ? '接单 · 管理店铺 · 经营数据' : '免费入驻 · 金牌享区域独家' }}</text>
        </view>
        <text class="dual-arrow">›</text>
      </view>
    </view>

    <!-- 工具与设置 -->
    <view class="card list-card">
      <view v-for="(m, i) in toolMenu" :key="m.label" class="menu-row" :class="{ 'no-border': i === toolMenu.length - 1 }" @click="onMenu(m)">
        <text class="menu-ico">{{ m.icon }}</text>
        <text class="menu-label">{{ m.label }}</text>
        <text v-if="m.badge" class="menu-badge">{{ m.badge }}</text>
        <text class="menu-arrow">›</text>
      </view>
    </view>

    <view class="card list-card">
      <view v-for="(m, i) in settingMenu" :key="m.label" class="menu-row" :class="{ 'no-border': i === settingMenu.length - 1 }" @click="onMenu(m)">
        <text class="menu-ico">{{ m.icon }}</text>
        <text class="menu-label" :class="{ danger: m.action === 'logout' }">{{ m.label }}</text>
        <text class="menu-arrow">›</text>
      </view>
    </view>

    <view class="version">
      <text>车管家 {{ VERSION_FULL }}</text>
      <text class="version-sub">合规经营 · 不代办扣分 · 不伪造材料</text>
    </view>
  </view>

  <AppTabBar :current="4" />
</template>

<script setup>
import { ref, computed } from 'vue'
import AppTabBar from '@/components/AppTabBar.vue'
import { BANNERS } from '@/data/mock'
import { state, memberInfo, couponCount, unreadCount, logout, go, toast } from '@/store/index'
import { VERSION_FULL } from '@/config/version'

const topPad = ref(44)
// #ifndef H5
try {
  topPad.value = uni.getSystemInfoSync().statusBarHeight || 20
} catch (e) {
  topPad.value = 20
}
// #endif

const member = computed(() => memberInfo())
const benefitCount = computed(() => (member.value.tier ? member.value.tier.benefits.length : 0))

const myServices = [
  { label: '我的订单', icon: '🧾', bg: '#FFF1EB', action: 'orders' },
  { label: '我的车辆', icon: '🚗', bg: '#EDF3FF', action: 'cars', badge: '2' },
  { label: '我的保单', icon: '🛡️', bg: '#E9F9F1', action: 'cars' },
  { label: '违章记录', icon: '📋', bg: '#FFEDEC', action: 'violation' },
  { label: '代卖记录', icon: '🏷️', bg: '#F3EEFF', action: 'consign' },
  { label: '租赁订单', icon: '🔑', bg: '#FFF7E6', action: 'rent' },
  { label: '救援记录', icon: '🆘', bg: '#FFEDEC', action: 'orders' },
  { label: '优惠券', icon: '🎫', bg: '#FFF1EB', action: 'coupons' }
]

const toolMenu = computed(() => [
  { icon: '🔔', label: '消息中心', action: 'messages', badge: unreadCount() || '' },
  { icon: '🛍️', label: '积分商城', action: 'points' },
  { icon: '🧾', label: '我的发票', action: 'invoice' }
])

const settingMenu = computed(() => [
  { icon: '📞', label: '联系客服', action: 'support' },
  { icon: '📖', label: '服务协议', action: 'agreement' },
  { icon: '🔒', label: '隐私政策', action: 'privacy' },
  { icon: 'ℹ️', label: '关于车管家', action: 'about' },
  { icon: '🚪', label: '退出登录', action: 'logout' }
])

function merchantEntry() {
  if (state.user.role === 'merchant') {
    uni.reLaunch({ url: '/pages/merchant/center' })
    return
  }
  go('/pages/merchant/join')
}

function onMenu(m) {
  const routes = {
    messages: '/pages/messages/index',
    points: '/pages/points/index',
    invoice: '/pages/invoice/index',
    invite: '/pages/invite/index',
    support: '/pages/support/index',
    agreement: '/pages/doc/index?type=agreement',
    privacy: '/pages/doc/index?type=privacy',
    about: '/pages/doc/index?type=about'
  }
  if (routes[m.action]) {
    go(routes[m.action])
    return
  }
  if (m.action === 'logout') {
    uni.showModal({
      title: '退出登录',
      content: '确定退出当前账号吗？',
      confirmColor: '#E02B20',
      success: res => {
        if (!res.confirm) return
        logout()
        uni.reLaunch({ url: '/pages/login/index' })
      }
    })
    return
  }
  tip(m.label)
}

function handle(it) {
  switch (it.action) {
    case 'orders':
      uni.reLaunch({ url: '/pages/orders/index' })
      break
    case 'cars':
      go('/pages/car/list')
      break
    case 'violation':
      go('/pages/service/detail?id=violation')
      break
    case 'consign':
      go('/pages/service/detail?id=consign')
      break
    case 'rent':
      go('/pages/service/detail?id=rent')
      break
    case 'coupons':
      go('/pages/coupon/index')
      break
    default:
      tip(it.label)
  }
}

function tip(t) {
  toast(t)
}
</script>

<style scoped>
.mine-page { background: #F4F5F7; }

.header {
  position: relative;
  padding: 0 32rpx 90rpx;
  background: linear-gradient(165deg, #1E2836 0%, #121821 60%, #0E131A 100%);
  overflow: hidden;
}
.header-glow {
  position: absolute;
  top: -160rpx;
  right: -120rpx;
  width: 420rpx;
  height: 420rpx;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(201, 155, 74, 0.28), transparent 70%);
}
.header-top {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 16rpx;
}
.header-title { font-size: 34rpx; font-weight: 700; color: #FFFFFF; }
.settings {
  width: 64rpx;
  height: 64rpx;
  border-radius: 32rpx;
  background: rgba(255, 255, 255, 0.09);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
}

.profile { position: relative; display: flex; align-items: center; margin-top: 34rpx; }
.avatar {
  width: 118rpx;
  height: 118rpx;
  border-radius: 59rpx;
  background: linear-gradient(140deg, #3A465A, #1E2733);
  border: 3rpx solid rgba(255, 255, 255, 0.16);
  display: flex;
  align-items: center;
  justify-content: center;
}
.avatar-emoji { font-size: 56rpx; }
.profile-main { flex: 1; min-width: 0; margin-left: 24rpx; display: flex; flex-direction: column; gap: 12rpx; }
.profile-name-row { display: flex; align-items: center; gap: 14rpx; }
.profile-name { font-size: 36rpx; font-weight: 700; color: #FFFFFF; }
.vip-chip {
  padding: 4rpx 14rpx;
  border-radius: 8rpx;
  background: rgba(255, 255, 255, 0.12);
}
.vip-chip.on { background: linear-gradient(135deg, #D8B06A, #A97C2F); }
.vip-chip text { font-size: 18rpx; color: rgba(255, 255, 255, 0.85); }
.vip-chip.on text { color: #2A1F0C; font-weight: 700; }
.profile-phone { font-size: 22rpx; color: rgba(255, 255, 255, 0.4); }
.edit {
  padding: 8rpx 20rpx;
  border-radius: 24rpx;
  border: 1rpx solid rgba(255, 255, 255, 0.2);
}
.edit text { font-size: 20rpx; color: rgba(255, 255, 255, 0.7); }

.vip-wrap {
  position: relative;
  margin: -66rpx 24rpx 20rpx;
  z-index: 2;
}
.vip-card {
  padding: 26rpx 28rpx;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 10rpx 26rpx rgba(169, 124, 47, 0.18);
}
.vip-card.is-vip {
  background: linear-gradient(120deg, #2E2A22, #191612);
  border: 1rpx solid rgba(201, 155, 74, 0.45);
}
.vip-card.no-vip {
  background: linear-gradient(120deg, #2E2A22, #191612);
  border: 1rpx solid rgba(255, 255, 255, 0.12);
}
.vip-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 14rpx; }
.vip-row { display: flex; align-items: center; gap: 12rpx; }
.vip-crown { font-size: 30rpx; }
.vip-name { font-size: 30rpx; font-weight: 700; color: #F3D9A4; }
.vip-exp { font-size: 19rpx; color: rgba(243, 217, 164, 0.55); }
.vip-tags { display: flex; flex-wrap: wrap; gap: 10rpx; }
.vip-tag {
  font-size: 19rpx;
  color: rgba(243, 217, 164, 0.75);
  background: rgba(243, 217, 164, 0.1);
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
}
.vip-cta { display: flex; align-items: center; gap: 6rpx; flex-shrink: 0; margin-left: 16rpx; }
.vip-cta text { font-size: 21rpx; color: #E0B96A; font-weight: 600; }
.vip-arrow { font-size: 28rpx; color: rgba(224, 185, 106, 0.7); }

.assets {
  position: relative;
  margin: 0 24rpx 24rpx;
  background: #FFFFFF;
  border-radius: 24rpx;
  padding: 28rpx 0;
  display: flex;
  align-items: center;
  box-shadow: 0 8rpx 30rpx rgba(20, 30, 50, 0.08);
}
.asset-item { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 8rpx; }
.asset-num { font-size: 34rpx; font-weight: 700; color: #1A1D23; }
.asset-label { font-size: 20rpx; color: #9AA3B0; }
.asset-line { width: 1rpx; height: 44rpx; background: #F0F2F6; }

.sec-head { margin-bottom: 24rpx; }
.grid { display: flex; flex-wrap: wrap; }
.grid-item {
  width: 25%;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 26rpx;
  position: relative;
}
.grid-icon {
  width: 84rpx;
  height: 84rpx;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.grid-emoji { font-size: 38rpx; }
.grid-label { margin-top: 12rpx; font-size: 21rpx; color: #3A4250; }
.grid-badge {
  position: absolute;
  top: -6rpx;
  right: 26rpx;
  min-width: 28rpx;
  height: 28rpx;
  border-radius: 14rpx;
  background: #FF4E12;
  color: #FFF;
  font-size: 17rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.section-head-inline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 28rpx 16rpx;
}
.section-more { font-size: 22rpx; color: #8A93A3; }

.act-swiper {
  margin: 0 24rpx 24rpx;
  height: 160rpx;
  border-radius: 22rpx;
  overflow: hidden;
}
.act-item {
  height: 100%;
  padding: 24rpx 26rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.act-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 8rpx; }
.act-title { font-size: 28rpx; font-weight: 700; color: #FFFFFF; }
.act-desc { font-size: 19rpx; color: rgba(255, 255, 255, 0.7); }
.act-btn {
  height: 52rpx;
  padding: 0 22rpx;
  border-radius: 26rpx;
  background: rgba(255, 255, 255, 0.18);
  border: 1rpx solid rgba(255, 255, 255, 0.3);
  display: flex;
  align-items: center;
  flex-shrink: 0;
  margin-left: 14rpx;
}
.act-btn text { font-size: 20rpx; color: #FFFFFF; font-weight: 600; }

.dual-card { padding: 6rpx 28rpx; }
.dual { display: flex; align-items: center; padding: 26rpx 0; }
.dual-ico { font-size: 38rpx; }
.dual-main { flex: 1; margin-left: 20rpx; display: flex; flex-direction: column; gap: 8rpx; }
.dual-title { font-size: 27rpx; font-weight: 600; color: #1A1D23; }
.dual-desc { font-size: 21rpx; color: #9AA3B0; }
.dual-arrow { font-size: 32rpx; color: #D2D7E0; }
.dual-line { height: 1rpx; background: #F2F4F7; }

.list-card { padding: 6rpx 28rpx; }
.menu-row { display: flex; align-items: center; padding: 28rpx 0; border-bottom: 1rpx solid #F2F4F7; }
.menu-row.no-border { border-bottom: none; }
.menu-ico { font-size: 30rpx; width: 52rpx; }
.invite-card {
  position: relative;
  margin: 0 24rpx 24rpx;
  padding: 26rpx;
  border-radius: 24rpx;
  background: linear-gradient(120deg, #3A1D12, #5A3218);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.invite-glow {
  position: absolute;
  right: -60rpx;
  top: -80rpx;
  width: 280rpx;
  height: 280rpx;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 138, 76, 0.35), transparent 65%);
}
.invite-main { position: relative; flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6rpx; }
.invite-title { font-size: 27rpx; font-weight: 700; color: #FFD9A8; }
.invite-desc { font-size: 21rpx; color: rgba(255, 255, 255, 0.75); }
.invite-sub { font-size: 19rpx; color: rgba(255, 255, 255, 0.5); }
.invite-btn {
  position: relative;
  flex-shrink: 0;
  height: 60rpx;
  padding: 0 24rpx;
  border-radius: 30rpx;
  background: linear-gradient(135deg, #FF8A4C, #FF4E12);
  display: flex;
  align-items: center;
  margin-left: 16rpx;
}
.invite-btn text { font-size: 22rpx; color: #FFFFFF; font-weight: 700; }

.menu-label { flex: 1; font-size: 26rpx; color: #3A4250; }
.menu-label.danger { color: #E02B20; }
.menu-badge {
  min-width: 36rpx;
  height: 36rpx;
  padding: 0 10rpx;
  border-radius: 18rpx;
  background: #FF4E12;
  color: #FFFFFF;
  font-size: 19rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 10rpx;
}
.menu-arrow { font-size: 32rpx; color: #D2D7E0; }

.version { display: flex; flex-direction: column; align-items: center; gap: 10rpx; padding: 20rpx 0 30rpx; }
.version text { font-size: 19rpx; color: #B4BBC7; }
.version-sub { font-size: 18rpx !important; color: #C9CFD9 !important; }
</style>
