<template>
  <view class="page">
    <PageHeader title="邀请有礼" />

    <!-- 主视觉 -->
    <view class="hero">
      <view class="glow"></view>
      <text class="hero-kicker">INVITE · 邀请好友</text>
      <text class="hero-title">邀好友注册，双方都有礼</text>
      <text class="hero-desc">好友通过你的专属二维码完成注册，双方各得 20 元通用券 + 200 积分</text>

      <!-- 二维码 + 邀请码 -->
      <view class="qr-card">
        <InviteQr v-if="shareLink" ref="qrRef" :text="shareLink" :size="qrSize" />
        <view v-else class="qr-loading"><text>邀请码准备中…</text></view>
        <view class="qr-side">
          <text class="qr-label">我的邀请码</text>
          <text class="qr-code">{{ inviteCode || '——' }}</text>
          <text class="qr-tip">好友扫码或打开链接注册后自动绑定</text>
          <text v-if="isCloud" class="qr-status">{{ loading ? '正在同步…' : '数据以服务端为准' }}</text>
          <text v-else class="qr-status">本地演示模式</text>
          <text v-if="shareLink" class="qr-link">{{ shareLink }}</text>
        </view>
      </view>

      <view class="share-btn" @click="copyLink"><text>复制邀请链接，分享给好友</text></view>
      <view class="hero-actions">
        <view class="ghost-btn" @click="copyCode"><text>复制邀请码</text></view>
        <view class="ghost-btn" @click="saveQr"><text>保存二维码</text></view>
      </view>
      <text v-if="usePlaceholder" class="hero-note">
        当前为演示落地地址，上线前请在 src/config/invite.js 配置正式短链或小程序码地址
      </text>
    </view>

    <!-- 已绑定邀请人（每个账号只能绑定一次） -->
    <view v-if="bound" class="bound-card">
      <view class="bound-head">
        <text class="bound-title">已绑定邀请人</text>
        <text class="bound-code">{{ bound.code }}</text>
      </view>
      <text class="bound-desc">
        当前账号已通过该邀请码完成绑定，邀请关系不可重复绑定，也不会重复发放奖励。
      </text>
    </view>

    <!-- 进度 -->
    <view class="progress-card">
      <view class="progress-top">
        <text class="progress-title">已邀请 <text class="progress-num">{{ view.count }}</text> 人</text>
        <text class="progress-sub">{{ progressText }}</text>
      </view>
      <view class="progress-bar"><view class="progress-fill" :style="{ width: progress + '%' }"></view></view>
      <text v-if="isCloud && limitInfo" class="progress-limit">
        今日已计入 {{ view.usedToday || 0 }}/{{ limitInfo.daily }} 人 · 本月 {{ view.usedMonth || 0 }}/{{ limitInfo.monthly }} 人
      </text>
    </view>

    <!-- 阶梯奖励 -->
    <view class="section-head">
      <text class="card-title">邀请奖励</text>
      <text class="section-more">单层级奖励 · 多邀多得</text>
    </view>

    <view class="reward-list">
      <view
        v-for="r in rewards"
        :key="r.id"
        class="reward-card"
        :class="{ done: claimed(r.id), ready: ready(r) }"
      >
        <view class="reward-head">
          <view class="reward-badge" :style="{ background: gradientOf(r.id) }">
            <text>{{ r.need }}</text>
          </view>
          <view class="reward-main">
            <text class="reward-name">{{ r.short }}</text>
            <text class="reward-desc">{{ r.desc }}</text>
          </view>
          <view
            class="reward-btn"
            :class="{ done: claimed(r.id), ready: ready(r) }"
            @click="claim(r)"
          >
            <text>{{ claimed(r.id) ? '已领取' : ready(r) ? '立即领取' : '还差 ' + remaining(r) + ' 人' }}</text>
          </view>
        </view>
        <text class="reward-title">{{ r.title }}</text>
      </view>
    </view>

    <!-- 规则 -->
    <view class="card">
      <view class="sec-title"><view class="sec-bar"></view><text>活动规则</text></view>
      <view v-for="(r, i) in rules" :key="i" class="rule">
        <text class="rule-num">{{ i + 1 }}</text>
        <text class="rule-text">{{ r }}</text>
      </view>
    </view>

    <!-- 邀请记录 -->
    <view class="card">
      <view class="sec-title"><view class="sec-bar"></view><text>邀请记录</text></view>
      <view
        v-for="(r, i) in records"
        :key="r.id"
        class="record"
        :class="{ last: i === records.length - 1 }"
      >
        <view class="record-avatar"><text>🙂</text></view>
        <view class="record-main">
          <text class="record-name">{{ r.name }}</text>
          <text class="record-time">{{ r.time }}</text>
        </view>
        <text class="record-status">已注册</text>
      </view>
      <view v-if="records.length === 0" class="empty-inline">
        <text>还没有邀请记录，快去分享给好友吧</text>
      </view>
    </view>

    <!-- 演示工具：仅纯本地模式显示 -->
    <view v-if="!isCloud" class="demo-card">
      <text class="demo-title">演示工具</text>
      <text class="demo-desc">
        正式上线后由分享链接/二维码自动绑定并计数，演示环境可手动模拟好友注册。
        每次模拟都是新的被邀请人身份，并受每日/每月上限约束。
      </text>
      <view class="demo-btn" @click="doSimulate"><text>模拟一位好友注册</text></view>
    </view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import PageHeader from '@/components/PageHeader.vue'
import InviteQr from '@/components/InviteQr.vue'
import {
  state, ensureInviteState, claimInviteReward, simulateInvite, toast
} from '@/store/index'
import { INVITE_REWARDS, INVITE_RULES, INVITE_LIMITS } from '@/data/invite'
import { INVITE_QR_SIZE, buildInviteLink, usingPlaceholderLanding } from '@/config/invite'
import {
  fetchInviteMe, claimInviteRemote, inviteCloudReady, isCloudMode, bindPendingInvite
} from '@/api/invite'
import { bootstrapCloud } from '@/api/sync'

const rewards = INVITE_REWARDS
const rules = INVITE_RULES
const limitInfo = INVITE_LIMITS
const qrSize = INVITE_QR_SIZE
const isCloud = isCloudMode()
const usePlaceholder = usingPlaceholderLanding()

// 纯本地模式：保证有本地邀请码；云端模式以服务端邀请码为准
ensureInviteState()

const qrRef = ref(null)
const remote = ref(null)
const loading = ref(false)

// 云端数据优先；后端不可用时回退到本地状态
const view = computed(() => remote.value || {
  code: state.invite.code,
  count: state.invite.count,
  records: state.invite.records,
  claimed: state.invite.claimed,
  bound: state.invite.bound
})

const inviteCode = computed(() => view.value.code || state.invite.code || '')
const shareLink = computed(() => buildInviteLink(inviteCode.value))
const bound = computed(() => view.value.bound || null)
const records = computed(() => (Array.isArray(view.value.records) ? view.value.records : []))

const nextReward = computed(
  () => rewards.find(r => !claimed(r.id) && view.value.count < r.need) || null
)

const progress = computed(() => {
  if (!nextReward.value) return 100
  return Math.min(100, Math.round((view.value.count / nextReward.value.need) * 100))
})

const progressText = computed(() => {
  if (!nextReward.value) return '全部奖励已解锁'
  const left = nextReward.value.need - view.value.count
  return `再邀 ${left} 人解锁「${nextReward.value.title}」`
})

function claimed(id) {
  return (view.value.claimed || []).includes(id)
}

function ready(r) {
  return view.value.count >= r.need
}

function remaining(r) {
  return Math.max(0, r.need - view.value.count)
}

function gradientOf(id) {
  if (id === 'inv1') return 'linear-gradient(135deg,#FFB03C,#FF7200)'
  if (id === 'inv3') return 'linear-gradient(135deg,#9B7BFF,#6A3DF5)'
  return 'linear-gradient(135deg,#D8B06A,#A97C2F)'
}

/* ---------------- 数据加载 ---------------- */
// 服务端数据同时回写本地状态（不触发保存）：避免后续整包推送把服务端统计覆盖成旧值
function mergeIntoLocal(me) {
  if (!me || !state.invite) return
  state.invite.count = me.count
  state.invite.records = me.records || []
  state.invite.claimed = me.claimed || []
  if (me.code) state.invite.code = me.code
  state.invite.bound = me.bound || null
}

async function loadRemote() {
  if (!isCloud || !inviteCloudReady()) return
  loading.value = true
  try {
    const me = await fetchInviteMe()
    if (me) {
      remote.value = me
      mergeIntoLocal(me)
    }
  } catch (e) {
    // 后端不可用时静默回退本地数据，不影响页面使用
  } finally {
    loading.value = false
  }
}

onShow(() => {
  // 从邀请链接进入且尚未绑定时，这里兜底绑定一次（服务端幂等）
  bindPendingInvite({ waitMs: 1500 }).catch(() => {})
  loadRemote()
})

/* ---------------- 分享 ---------------- */
function copyCode() {
  if (!inviteCode.value) return
  uni.setClipboardData({
    data: inviteCode.value,
    success: () => toast('邀请码已复制')
  })
}

function copyLink() {
  if (!shareLink.value) return toast('邀请码准备中，请稍后重试')
  uni.setClipboardData({
    data: shareLink.value,
    success: () => toast('邀请链接已复制，去分享给好友吧')
  })
}

async function saveQr() {
  if (!qrRef.value) return toast('二维码生成中，请稍后重试')
  const res = await qrRef.value.save()
  if (!res || !res.ok) return toast((res && res.message) || '保存失败，请长按二维码保存')
  toast(res.preview ? '已生成图片，长按可保存到相册' : '二维码已保存')
}

/* ---------------- 领奖 ---------------- */
function showClaim(reward) {
  uni.showModal({
    title: '领取成功',
    content: reward.member ? '尊享会员年卡已生效，权益已到账' : '奖励已发放到卡包/积分账户',
    confirmText: '去看看',
    cancelText: '关闭',
    success: m => {
      if (!m.confirm) return
      uni.navigateTo({ url: reward.member ? '/pages/member/index' : '/pages/coupon/index' })
    }
  })
}

async function claim(reward) {
  if (claimed(reward.id)) return toast('该奖励已领取')
  if (!ready(reward)) return toast(`再邀请 ${remaining(reward)} 位好友即可解锁`)

  // 云端模式：服务端校验并发放，接口幂等（重复调用返回"已领取"）
  if (isCloud) {
    if (!inviteCloudReady()) return toast('登录已失效，请重新登录')
    try {
      const res = await claimInviteRemote(reward.id)
      if (res && res.invite) {
        remote.value = res.invite
        mergeIntoLocal(res.invite)
      }
      if (res && res.already) return toast('该奖励已领取')
      showClaim(reward)
      // 拉取最新整包状态，积分/券/会员与云端保持一致
      bootstrapCloud().catch(() => {})
    } catch (e) {
      toast(e.message || '领取失败，请稍后重试')
    }
    return
  }

  // 本地模式：同一 reward.id 只发放一次
  const res = claimInviteReward(reward)
  if (!res.ok) {
    if (res.reason === 'claimed') return toast('该奖励已领取')
    if (res.reason === 'not-ready') return toast('邀请人数不足，暂不能领取')
    return toast('领取失败，请稍后重试')
  }
  showClaim(reward)
}

/* ---------------- 演示 ---------------- */
function doSimulate() {
  const res = simulateInvite()
  if (!res.ok) return toast(res.message || '今日邀请已达上限')
  toast('好友注册成功（模拟）')
}
</script>

<style scoped>
.hero {
  position: relative;
  margin: 8rpx 24rpx 20rpx;
  padding: 34rpx 30rpx 30rpx;
  border-radius: 28rpx;
  background: linear-gradient(135deg, #3A1D12 0%, #4A2A17 55%, #5A3218 100%);
  overflow: hidden;
}
.glow {
  position: absolute;
  right: -100rpx;
  top: -120rpx;
  width: 380rpx;
  height: 380rpx;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 138, 76, 0.35), transparent 65%);
}
.hero-kicker { position: relative; font-size: 18rpx; letter-spacing: 3rpx; color: rgba(255, 200, 150, 0.7); font-weight: 600; }
.hero-title { position: relative; display: block; margin-top: 12rpx; font-size: 42rpx; font-weight: 700; color: #FFFFFF; }
.hero-desc { position: relative; display: block; margin-top: 10rpx; font-size: 22rpx; color: rgba(255, 255, 255, 0.7); line-height: 1.5; }

.qr-card {
  position: relative;
  margin-top: 26rpx;
  padding: 20rpx;
  border-radius: 18rpx;
  background: rgba(255, 255, 255, 0.1);
  border: 1rpx solid rgba(255, 255, 255, 0.18);
  display: flex;
  align-items: center;
  gap: 20rpx;
}
.qr-loading {
  width: 200px;
  height: 200px;
  border-radius: 16rpx;
  background: #FFFFFF;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.qr-loading text { font-size: 20rpx; color: #A8B0BD; }
.qr-side { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 8rpx; }
.qr-label { font-size: 19rpx; color: rgba(255, 255, 255, 0.55); }
.qr-code { font-size: 34rpx; font-weight: 700; color: #FFD9A8; letter-spacing: 3rpx; }
.qr-tip { font-size: 19rpx; color: rgba(255, 255, 255, 0.62); line-height: 1.5; }
.qr-status { margin-top: 4rpx; font-size: 17rpx; color: rgba(255, 200, 150, 0.55); }
.qr-link {
  margin-top: 4rpx;
  font-size: 15rpx;
  color: rgba(255, 255, 255, 0.4);
  line-height: 1.4;
  word-break: break-all;
}

.share-btn {
  position: relative;
  margin-top: 22rpx;
  height: 86rpx;
  border-radius: 43rpx;
  background: linear-gradient(135deg, #FF8A4C, #FF4E12);
  box-shadow: 0 12rpx 28rpx rgba(255, 78, 18, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
}
.share-btn text { font-size: 27rpx; color: #FFFFFF; font-weight: 700; }
.hero-actions { position: relative; display: flex; gap: 18rpx; margin-top: 16rpx; }
.ghost-btn {
  flex: 1;
  height: 68rpx;
  border-radius: 34rpx;
  border: 1rpx solid rgba(255, 255, 255, 0.35);
  background: rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
}
.ghost-btn text { font-size: 22rpx; color: #FFE3C4; font-weight: 600; }
.hero-note {
  position: relative;
  display: block;
  margin-top: 14rpx;
  font-size: 17rpx;
  color: rgba(255, 200, 150, 0.55);
  line-height: 1.5;
}

.bound-card {
  margin: 0 24rpx 20rpx;
  padding: 20rpx 24rpx;
  border-radius: 20rpx;
  background: #EFFAF4;
  border: 1rpx solid #C8EBD9;
}
.bound-head { display: flex; align-items: center; justify-content: space-between; gap: 16rpx; }
.bound-title { font-size: 24rpx; font-weight: 700; color: #0E7A55; }
.bound-code { font-size: 22rpx; font-weight: 700; color: #0E9E6B; letter-spacing: 2rpx; }
.bound-desc { display: block; margin-top: 10rpx; font-size: 20rpx; color: #4D7A68; line-height: 1.6; }

.progress-card {
  margin: 0 24rpx 22rpx;
  padding: 22rpx 24rpx;
  border-radius: 20rpx;
  background: #FFFFFF;
}
.progress-top { display: flex; align-items: center; justify-content: space-between; gap: 16rpx; }
.progress-title { font-size: 23rpx; color: #3A4250; }
.progress-num { font-size: 30rpx; font-weight: 700; color: #FF5A1F; }
.progress-sub { font-size: 19rpx; color: #A8B0BD; text-align: right; }
.progress-bar { margin-top: 14rpx; height: 14rpx; border-radius: 7rpx; background: #F2F4F7; overflow: hidden; }
.progress-fill { height: 14rpx; border-radius: 7rpx; background: linear-gradient(90deg, #FFB03C, #FF4E12); transition: width 0.3s; }
.progress-limit { display: block; margin-top: 12rpx; font-size: 18rpx; color: #B4BBC7; }

.section-head { display: flex; align-items: center; justify-content: space-between; padding: 4rpx 28rpx 16rpx; }
.card-title { font-size: 30rpx; font-weight: 700; color: #1A1D23; }
.section-more { font-size: 21rpx; color: #8A93A3; }

.reward-list { padding: 0 24rpx 6rpx; }
.reward-card {
  background: #FFFFFF;
  border-radius: 22rpx;
  padding: 22rpx 24rpx;
  margin-bottom: 16rpx;
  border: 2rpx solid transparent;
}
.reward-card.ready { border-color: #FFD2B8; }
.reward-card.done { opacity: 0.72; }
.reward-head { display: flex; align-items: center; gap: 16rpx; }
.reward-badge { width: 64rpx; height: 64rpx; border-radius: 20rpx; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.reward-badge text { font-size: 30rpx; color: #FFFFFF; font-weight: 700; }
.reward-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6rpx; }
.reward-name { font-size: 26rpx; font-weight: 700; color: #1A1D23; }
.reward-desc { font-size: 19rpx; color: #9AA3B0; }
.reward-btn { height: 58rpx; padding: 0 22rpx; border-radius: 29rpx; background: #F2F4F7; display: flex; align-items: center; flex-shrink: 0; }
.reward-btn text { font-size: 20rpx; color: #A8B0BD; font-weight: 600; }
.reward-btn.ready { background: linear-gradient(135deg, #FF8A4C, #FF4E12); }
.reward-btn.ready text { color: #FFFFFF; }
.reward-btn.done { background: #F2F4F7; }
.reward-btn.done text { color: #B4BBC7; }
.reward-title { display: block; margin-top: 14rpx; padding-top: 14rpx; border-top: 1rpx dashed #F2F4F7; font-size: 23rpx; color: #E8890C; font-weight: 600; }

.sec-title { display: flex; align-items: center; gap: 12rpx; font-size: 29rpx; font-weight: 700; color: #1A1D23; margin-bottom: 16rpx; }
.sec-bar { width: 8rpx; height: 26rpx; border-radius: 4rpx; background: linear-gradient(180deg, #FF7A3D, #FF4E12); }

.rule { display: flex; align-items: flex-start; gap: 14rpx; padding: 9rpx 0; }
.rule-num { width: 34rpx; height: 34rpx; border-radius: 17rpx; background: #FFF1EB; color: #FF5A1F; font-size: 18rpx; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.rule-text { flex: 1; font-size: 22rpx; color: #3A4250; line-height: 1.6; }

.record { display: flex; align-items: center; padding: 18rpx 0; border-bottom: 1rpx solid #F2F4F7; }
.record.last { border-bottom: none; }
.record-avatar { width: 64rpx; height: 64rpx; border-radius: 32rpx; background: #F5F7FA; display: flex; align-items: center; justify-content: center; }
.record-avatar text { font-size: 30rpx; }
.record-main { flex: 1; min-width: 0; margin-left: 16rpx; display: flex; flex-direction: column; gap: 6rpx; }
.record-name { font-size: 24rpx; color: #1A1D23; font-weight: 500; }
.record-time { font-size: 18rpx; color: #B4BBC7; }
.record-status { font-size: 20rpx; color: #0E9E6B; }
.empty-inline { padding: 24rpx 0; text-align: center; }
.empty-inline text { font-size: 21rpx; color: #A8B0BD; }

.demo-card { margin: 0 24rpx 30rpx; padding: 20rpx 22rpx; border-radius: 18rpx; background: #F5F7FA; border: 2rpx dashed #D8DEE8; display: flex; flex-direction: column; gap: 8rpx; }
.demo-title { font-size: 21rpx; font-weight: 700; color: #6B7484; }
.demo-desc { font-size: 19rpx; color: #9AA3B0; line-height: 1.5; }
.demo-btn { margin-top: 8rpx; height: 64rpx; border-radius: 32rpx; background: #FFFFFF; border: 2rpx solid #D8DEE8; display: flex; align-items: center; justify-content: center; }
.demo-btn text { font-size: 22rpx; color: #5A6373; font-weight: 600; }
</style>
