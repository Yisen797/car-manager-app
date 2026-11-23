<template>
  <view class="page" style="padding-bottom: 60rpx" v-if="app">
    <PageHeader title="入驻申请" />

    <!-- 状态 -->
    <view class="status-hero" :class="'s-' + app.status">
      <view class="status-glow"></view>
      <text class="status-title">{{ statusTitle }}</text>
      <text class="status-desc">{{ statusDesc }}</text>
      <view class="status-id"><text>申请编号 {{ app.id }}</text></view>
    </view>

    <!-- 进度 -->
    <view class="card">
      <view class="sec-title"><view class="sec-bar"></view><text>申请进度</text></view>
      <view class="timeline">
        <view v-for="(s, i) in steps" :key="i" class="tl-item">
          <view class="tl-rail">
            <view class="tl-dot" :class="{ done: s.done, current: s.current }">
              <text v-if="s.done">✓</text>
              <text v-else-if="s.current">•</text>
            </view>
            <view v-if="i !== steps.length - 1" class="tl-line" :class="{ done: s.done }"></view>
          </view>
          <view class="tl-main">
            <text class="tl-text" :class="{ done: s.done, current: s.current }">{{ s.text }}</text>
            <text v-if="s.time" class="tl-time">{{ s.time }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 申请信息 -->
    <view class="card">
      <view class="sec-title"><view class="sec-bar"></view><text>申请信息</text></view>
      <view class="kv"><text class="k">商家名称</text><text class="v">{{ app.name }}</text></view>
      <view class="kv"><text class="k">商家类型</text><text class="v">{{ app.type }}</text></view>
      <view class="kv"><text class="k">所在城市</text><text class="v">{{ app.city || '北京' }}</text></view>
      <view class="kv"><text class="k">入驻档位</text><text class="v">{{ tierName }}</text></view>
      <view class="kv"><text class="k">联系人</text><text class="v">{{ app.contact }} {{ app.phone }}</text></view>
      <view class="kv"><text class="k">门店地址</text><text class="v">{{ app.address || '未填写' }}</text></view>
      <view class="kv"><text class="k">营业执照</text><text class="v">{{ app.licenseImage ? '已上传' : '未上传' }}</text></view>
      <view v-if="app.intro" class="kv"><text class="k">商家简介</text><text class="v">{{ app.intro }}</text></view>
      <view class="kv"><text class="k">提交时间</text><text class="v">{{ app.submitTime }}</text></view>
      <image
        v-if="app.licenseImage && showLicense"
        :src="app.licenseImage"
        class="license"
        mode="aspectFill"
        @error="showLicense = false"
      />
    </view>

    <!-- 驳回原因 -->
    <view v-if="app.status === 'rejected'" class="reject-card">
      <text class="reject-title">驳回原因</text>
      <text class="reject-text">{{ app.reason }}</text>
    </view>

    <!-- 演示工具 -->
    <view v-if="app.status === 'reviewing'" class="demo-card">
      <text class="demo-title">演示工具</text>
      <text class="demo-desc">当前没有真实审核人员，可用下面的按钮模拟审核结果。</text>
      <view class="demo-actions">
        <view class="demo-btn primary" @click="approve"><text>模拟审核通过</text></view>
        <view class="demo-btn" @click="reject"><text>模拟驳回</text></view>
      </view>
    </view>

    <!-- 操作 -->
    <view class="actions">
      <view v-if="app.status === 'approved'" class="btn btn-gold" @click="openCenter"><text>进入商家中心</text></view>
      <view v-if="app.status === 'rejected'" class="btn btn-primary" @click="reapply"><text>修改资料并重新提交</text></view>
      <view v-if="app.status === 'reviewing'" class="btn btn-ghost" @click="back"><text>返回</text></view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import PageHeader from '@/components/PageHeader.vue'
import { MERCHANT_TIERS } from '@/data/mock'
import {
  state, approveMerchant, rejectMerchant, currentMerchantApplication, toast
} from '@/store/index'

const appId = ref('')
const showLicense = ref(true)

const app = computed(() => {
  return state.merchantApplications.find(a => a.id === appId.value) || currentMerchantApplication()
})

const tierName = computed(() => {
  const t = MERCHANT_TIERS.find(x => x.id === (app.value && app.value.tier))
  return t ? t.name : '免费入驻'
})

const statusTitle = computed(() => {
  if (!app.value) return ''
  return { reviewing: '审核中', approved: '审核已通过', rejected: '审核未通过' }[app.value.status] || ''
})

const statusDesc = computed(() => {
  if (!app.value) return ''
  return {
    reviewing: '平台将在 1 个工作日内完成资质审核',
    approved: '恭喜！您已成为平台合作商家',
    rejected: '资料未通过审核，请修改后重新提交'
  }[app.value.status] || ''
})

const steps = computed(() => {
  const a = app.value
  if (!a) return []
  const reviewing = a.status === 'reviewing'
  const approved = a.status === 'approved'
  return [
    { text: '提交入驻申请', time: a.submitTime, done: true },
    {
      text: a.status === 'rejected' ? '资质审核未通过' : '资质审核',
      time: reviewing ? '' : a.reviewTime,
      done: !reviewing,
      current: reviewing
    },
    { text: '开通商家接单', time: '', done: approved, current: false }
  ]
})

onLoad(options => {
  if (options && options.id) appId.value = options.id
})

function approve() {
  approveMerchant(app.value.id)
  toast('审核已通过（模拟）')
}

function reject() {
  rejectMerchant(app.value.id)
  toast('已驳回（模拟）')
}

function openCenter() {
  uni.redirectTo({ url: '/pages/merchant/center?id=' + app.value.id })
}

function reapply() {
  uni.redirectTo({ url: '/pages/merchant/join' })
}

function back() {
  const pages = getCurrentPages()
  if (pages.length > 1) uni.navigateBack()
  else uni.reLaunch({ url: '/pages/index/index' })
}
</script>

<style scoped>
.status-hero {
  position: relative;
  margin: 0 24rpx 24rpx;
  padding: 36rpx 30rpx;
  border-radius: 26rpx;
  overflow: hidden;
}
.s-reviewing { background: linear-gradient(125deg, #D98A12, #8F5606); }
.s-approved { background: linear-gradient(125deg, #12A06A, #08714A); }
.s-rejected { background: linear-gradient(125deg, #D23B3B, #8E1616); }
.status-glow {
  position: absolute;
  right: -60rpx;
  top: -80rpx;
  width: 300rpx;
  height: 300rpx;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.22), transparent 70%);
}
.status-title { position: relative; display: block; font-size: 40rpx; font-weight: 700; color: #FFFFFF; }
.status-desc { position: relative; display: block; margin-top: 12rpx; font-size: 22rpx; color: rgba(255, 255, 255, 0.8); }
.status-id { position: relative; margin-top: 20rpx; display: inline-flex; background: rgba(255, 255, 255, 0.16); border-radius: 10rpx; padding: 6rpx 16rpx; }
.status-id text { font-size: 19rpx; color: rgba(255, 255, 255, 0.85); }

.sec-title { display: flex; align-items: center; gap: 12rpx; font-size: 29rpx; font-weight: 700; color: #1A1D23; margin-bottom: 20rpx; }
.sec-bar { width: 8rpx; height: 26rpx; border-radius: 4rpx; background: linear-gradient(180deg, #FF7A3D, #FF4E12); }

.timeline { padding-left: 4rpx; }
.tl-item { display: flex; align-items: flex-start; }
.tl-rail { display: flex; flex-direction: column; align-items: center; }
.tl-dot {
  width: 34rpx; height: 34rpx; border-radius: 17rpx; background: #EDF0F4;
  display: flex; align-items: center; justify-content: center;
}
.tl-dot.done { background: #12A06A; }
.tl-dot.current { background: #E8890C; }
.tl-dot text { font-size: 18rpx; color: #FFFFFF; }
.tl-line { width: 2rpx; height: 44rpx; background: #EDF0F4; }
.tl-line.done { background: #B7E7D2; }
.tl-main { margin-left: 20rpx; padding-bottom: 16rpx; display: flex; flex-direction: column; gap: 4rpx; }
.tl-text { font-size: 25rpx; color: #A8B0BD; }
.tl-text.done { color: #1A1D23; font-weight: 500; }
.tl-text.current { color: #E8890C; font-weight: 600; }
.tl-time { font-size: 19rpx; color: #B4BBC7; }

.kv { display: flex; align-items: flex-start; justify-content: space-between; padding: 10rpx 0; gap: 20rpx; }
.k { font-size: 24rpx; color: #8A93A3; flex-shrink: 0; }
.v { font-size: 24rpx; color: #2A3038; text-align: right; max-width: 440rpx; }
.license { width: 220rpx; height: 160rpx; border-radius: 14rpx; margin-top: 16rpx; }

.reject-card {
  margin: 0 24rpx 20rpx;
  padding: 24rpx;
  border-radius: 18rpx;
  background: #FFF1F0;
  border: 1rpx solid #F8D4D1;
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}
.reject-title { font-size: 23rpx; font-weight: 700; color: #C02A20; }
.reject-text { font-size: 22rpx; color: #8A5A55; line-height: 1.6; }

.demo-card {
  margin: 0 24rpx 20rpx;
  padding: 22rpx 24rpx;
  border-radius: 18rpx;
  background: #F5F7FA;
  border: 2rpx dashed #D8DEE8;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
.demo-title { font-size: 22rpx; font-weight: 700; color: #6B7484; }
.demo-desc { font-size: 20rpx; color: #9AA3B0; line-height: 1.5; }
.demo-actions { display: flex; gap: 16rpx; margin-top: 12rpx; }
.demo-btn {
  flex: 1; height: 64rpx; border-radius: 32rpx; background: #FFFFFF;
  border: 2rpx solid #D8DEE8; display: flex; align-items: center; justify-content: center;
}
.demo-btn text { font-size: 22rpx; color: #5A6373; font-weight: 600; }
.demo-btn.primary { background: #FFF1EB; border-color: #FFB68F; }
.demo-btn.primary text { color: #FF5A1F; }

.actions { padding: 8rpx 24rpx 30rpx; display: flex; flex-direction: column; gap: 16rpx; }
.actions .btn text { font-size: 29rpx; font-weight: 600; }
</style>
