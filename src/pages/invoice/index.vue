<template>
  <view class="page" style="padding-bottom: 60rpx">
    <PageHeader title="发票中心" />

    <!-- 可开票订单 -->
    <view class="card">
      <view class="sec-title between">
        <view class="row gap12">
          <view class="sec-bar"></view>
          <text>可开票订单</text>
        </view>
        <text class="sec-sub">{{ billable.length }} 笔</text>
      </view>

      <view v-if="billable.length" class="order-list">
        <view v-for="o in billable" :key="o.id" class="order-row">
          <view class="order-icon" :style="{ background: o.gradient }"><text>{{ o.icon }}</text></view>
          <view class="order-main">
            <text class="order-title ellipsis">{{ o.title }}</text>
            <text class="order-meta">{{ o.createTime }} · ¥{{ o.amount }}</text>
          </view>
          <view class="invoice-btn" @click="openApply(o)"><text>申请开票</text></view>
        </view>
      </view>
      <view v-else class="empty-inline">
        <text>暂无可开票订单</text>
      </view>
    </view>

    <!-- 开票记录 -->
    <view class="card">
      <view class="sec-title between">
        <view class="row gap12">
          <view class="sec-bar"></view>
          <text>开票记录</text>
        </view>
        <text class="sec-sub">{{ state.invoices.length }} 笔</text>
      </view>

      <view v-if="state.invoices.length" class="invoice-list">
        <view v-for="inv in state.invoices" :key="inv.id" class="invoice-row">
          <view class="invoice-main">
            <view class="invoice-top">
              <text class="invoice-title ellipsis">{{ inv.title }}</text>
              <text class="invoice-status">{{ inv.status === 'issued' ? '已开具' : '开票中' }}</text>
            </view>
            <text class="invoice-meta">{{ inv.type === 'company' ? '企业' : '个人' }} · ¥{{ inv.amount }} · {{ inv.createTime }}</text>
            <text class="invoice-meta">{{ inv.email }}</text>
          </view>
        </view>
      </view>
      <view v-else class="empty-inline">
        <text>暂无开票记录</text>
      </view>
    </view>

    <!-- 说明 -->
    <view class="notice">
      <text class="notice-title">开票说明</text>
      <text class="notice-text">演示环境为模拟开票，不会生成真实发票。正式版本将由平台或实际服务商家在 1-3 个工作日内开具电子发票，并发送至填写的邮箱。</text>
    </view>

    <!-- 申请弹层 -->
    <view v-if="applying" class="mask" @click="applying = false">
      <view class="sheet" @click.stop>
        <view class="sheet-head">
          <text class="sheet-title">申请发票</text>
          <text class="sheet-close" @click="applying = false">×</text>
        </view>

        <view class="order-brief">
          <text class="brief-title ellipsis">{{ currentOrder.title }}</text>
          <text class="brief-amount">¥{{ currentOrder.amount }}</text>
        </view>

        <view class="type-tabs">
          <view class="type-tab" :class="{ on: form.type === 'personal' }" @click="form.type = 'personal'">
            <text>个人</text>
          </view>
          <view class="type-tab" :class="{ on: form.type === 'company' }" @click="form.type = 'company'">
            <text>企业</text>
          </view>
        </view>

        <view class="field">
          <text class="field-label">抬头名称</text>
          <input v-model="form.title" class="field-input" placeholder="个人姓名 / 企业名称" />
        </view>
        <view v-if="form.type === 'company'" class="field">
          <text class="field-label">税号</text>
          <input v-model="form.taxNo" class="field-input" placeholder="统一社会信用代码" />
        </view>
        <view class="field">
          <text class="field-label">接收邮箱</text>
          <input v-model="form.email" class="field-input" type="text" placeholder="用于接收电子发票" />
        </view>

        <view class="submit-btn" @click="submit"><text>提交申请</text></view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import { state, applyInvoice, toast } from '@/store/index'

const applying = ref(false)
const currentOrder = ref(null)

const form = reactive({ type: 'personal', title: '', taxNo: '', email: '' })

const billable = computed(() =>
  state.orders.filter(o => {
    if (o.amount <= 0) return false
    if (!['waiting', 'serving', 'review', 'done'].includes(o.status)) return false
    return !state.invoices.some(inv => (inv.orderIds || []).includes(o.id))
  })
)

function openApply(o) {
  currentOrder.value = o
  form.type = 'personal'
  form.title = state.user.name || ''
  form.taxNo = ''
  form.email = ''
  applying.value = true
}

function submit() {
  if (!form.title.trim()) return toast('请填写抬头名称')
  if (form.type === 'company' && !form.taxNo.trim()) return toast('请填写企业税号')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return toast('请填写正确的邮箱')

  applyInvoice({
    orderIds: [currentOrder.value.id],
    orderTitle: currentOrder.value.title,
    amount: currentOrder.value.amount,
    type: form.type,
    title: form.title.trim(),
    taxNo: form.taxNo.trim(),
    email: form.email.trim()
  })
  applying.value = false
  toast('申请已提交')
}
</script>

<style scoped>
.sec-title { display: flex; align-items: center; gap: 12rpx; font-size: 29rpx; font-weight: 700; color: #1A1D23; margin-bottom: 18rpx; }
.sec-bar { width: 8rpx; height: 26rpx; border-radius: 4rpx; background: linear-gradient(180deg, #FF7A3D, #FF4E12); }
.sec-sub { font-size: 20rpx; color: #A8B0BD; font-weight: 400; }
.row { display: flex; align-items: center; }
.gap12 { gap: 12rpx; }
.between { justify-content: space-between; }

.order-row { display: flex; align-items: center; padding: 18rpx 0; border-bottom: 1rpx solid #F2F4F7; }
.order-row:last-child { border-bottom: none; }
.order-icon { width: 68rpx; height: 68rpx; border-radius: 18rpx; display: flex; align-items: center; justify-content: center; font-size: 32rpx; flex-shrink: 0; }
.order-main { flex: 1; min-width: 0; margin-left: 16rpx; display: flex; flex-direction: column; gap: 6rpx; }
.order-title { font-size: 24rpx; font-weight: 600; color: #1A1D23; }
.order-meta { font-size: 19rpx; color: #9AA3B0; }
.invoice-btn { height: 54rpx; padding: 0 20rpx; border-radius: 27rpx; background: #FFF1EB; display: flex; align-items: center; flex-shrink: 0; }
.invoice-btn text { font-size: 20rpx; color: #FF5A1F; font-weight: 600; }

.invoice-row { padding: 18rpx 0; border-bottom: 1rpx solid #F2F4F7; }
.invoice-row:last-child { border-bottom: none; }
.invoice-top { display: flex; align-items: center; justify-content: space-between; gap: 16rpx; }
.invoice-title { font-size: 25rpx; font-weight: 600; color: #1A1D23; }
.invoice-status { font-size: 19rpx; color: #E8890C; flex-shrink: 0; }
.invoice-meta { display: block; margin-top: 6rpx; font-size: 19rpx; color: #9AA3B0; }

.empty-inline { padding: 26rpx 0; text-align: center; }
.empty-inline text { font-size: 22rpx; color: #A8B0BD; }

.notice { margin: 0 24rpx; padding: 24rpx; border-radius: 20rpx; background: #FFFBF2; border: 1rpx solid #F5E6C8; display: flex; flex-direction: column; gap: 10rpx; }
.notice-title { font-size: 22rpx; font-weight: 700; color: #A97C2F; }
.notice-text { font-size: 20rpx; color: #8A7A5E; line-height: 1.7; }

.mask { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.45); z-index: 200; display: flex; align-items: flex-end; justify-content: center; }
.sheet { width: 100%; max-width: 480px; background: #FFFFFF; border-radius: 28rpx 28rpx 0 0; padding: 28rpx 28rpx calc(28rpx + env(safe-area-inset-bottom)); }
.sheet-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20rpx; }
.sheet-title { font-size: 30rpx; font-weight: 700; color: #1A1D23; }
.sheet-close { font-size: 40rpx; color: #A8B0BD; padding: 0 10rpx; }
.order-brief { display: flex; align-items: center; justify-content: space-between; padding: 18rpx 20rpx; border-radius: 16rpx; background: #F7F8FA; margin-bottom: 20rpx; }
.brief-title { font-size: 23rpx; color: #3A4250; flex: 1; min-width: 0; }
.brief-amount { font-size: 26rpx; font-weight: 700; color: #E02B20; margin-left: 16rpx; }
.type-tabs { display: flex; gap: 14rpx; margin-bottom: 8rpx; }
.type-tab { flex: 1; height: 64rpx; border-radius: 16rpx; background: #F5F7FA; display: flex; align-items: center; justify-content: center; border: 2rpx solid transparent; }
.type-tab text { font-size: 24rpx; color: #5A6373; }
.type-tab.on { background: #FFF1EB; border-color: #FFB68F; }
.type-tab.on text { color: #FF5A1F; font-weight: 600; }
.field { display: flex; align-items: center; padding: 20rpx 0; border-bottom: 1rpx solid #F2F4F7; }
.field-label { width: 150rpx; font-size: 24rpx; color: #8A93A3; }
.field-input { flex: 1; font-size: 25rpx; color: #1A1D23; }
.submit-btn { margin-top: 28rpx; height: 88rpx; border-radius: 44rpx; background: linear-gradient(135deg, #FF7A3D, #FF4E12); display: flex; align-items: center; justify-content: center; }
.submit-btn text { font-size: 29rpx; color: #FFFFFF; font-weight: 700; }
</style>
