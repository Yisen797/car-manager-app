<template>
  <view class="page" style="padding-bottom: 60rpx">
    <PageHeader title="企业认证" />

    <!-- 已有申请 -->
    <template v-if="app">
      <view class="status-hero" :class="'s-' + app.status">
        <view class="status-glow"></view>
        <text class="status-title">{{ statusTitle }}</text>
        <text class="status-desc">{{ statusDesc }}</text>
        <view class="status-id"><text>申请编号 {{ app.id }}</text></view>
      </view>

      <view class="card">
        <view class="sec-title"><view class="sec-bar"></view><text>申请信息</text></view>
        <view class="kv"><text class="k">企业名称</text><text class="v">{{ app.company }}</text></view>
        <view class="kv"><text class="k">信用代码</text><text class="v">{{ app.creditCode }}</text></view>
        <view class="kv"><text class="k">联系人</text><text class="v">{{ app.contact }} {{ app.phone }}</text></view>
        <view class="kv"><text class="k">车辆数量</text><text class="v">{{ app.carCount }} 台</text></view>
        <view class="kv"><text class="k">开票抬头</text><text class="v">{{ app.invoiceTitle || '未填写' }}</text></view>
        <view class="kv"><text class="k">企业地址</text><text class="v">{{ app.address || '未填写' }}</text></view>
        <view class="kv"><text class="k">提交时间</text><text class="v">{{ app.submitTime }}</text></view>
        <view v-if="app.status !== 'reviewing'" class="kv"><text class="k">审核时间</text><text class="v">{{ app.reviewTime }}</text></view>
      </view>

      <view v-if="app.status === 'reviewing'" class="demo-card">
        <text class="demo-title">演示工具</text>
        <text class="demo-desc">当前没有真实审核人员，点击按钮模拟企业认证通过。通过后企业 VIP 立即生效。</text>
        <view class="demo-btn" @click="approve"><text>模拟审核通过</text></view>
      </view>

      <view v-if="app.status === 'approved'" class="card">
        <view class="sec-title"><view class="sec-bar"></view><text>企业权益已生效</text></view>
        <text class="benefit">· 5 台以内车辆统一托管</text>
        <text class="benefit">· 批量年审、违章、过户统一处理</text>
        <text class="benefit">· 企业车险团报、统一理赔</text>
        <text class="benefit">· 专属客户经理一对一服务</text>
      </view>

      <view class="actions">
        <view v-if="app.status === 'approved'" class="btn btn-gold" @click="go('/pages/enterprise/index')"><text>查看企业权益</text></view>
        <view v-if="app.status === 'reviewing'" class="btn btn-ghost" @click="go('/pages/enterprise/index')"><text>返回企业会员</text></view>
      </view>
    </template>

    <!-- 申请表单 -->
    <template v-else>
      <view class="intro">
        <text class="intro-title">企业 VIP · 299 元/年</text>
        <text class="intro-desc">5 台以内车辆统一托管，专属客户经理对接。提交认证后由平台审核（演示环境可模拟通过）。</text>
      </view>

      <view class="card">
        <view class="field">
          <text class="field-label">企业名称<text class="req">*</text></text>
          <input v-model="form.company" class="field-input" placeholder="营业执照上的企业全称" />
        </view>
        <view class="field">
          <text class="field-label">信用代码<text class="req">*</text></text>
          <input v-model="form.creditCode" class="field-input" maxlength="18" placeholder="统一社会信用代码" />
        </view>
        <view class="field">
          <text class="field-label">联系人<text class="req">*</text></text>
          <input v-model="form.contact" class="field-input" placeholder="联系人姓名" />
        </view>
        <view class="field">
          <text class="field-label">手机号<text class="req">*</text></text>
          <input v-model="form.phone" class="field-input" type="number" maxlength="11" placeholder="用于审核联系" />
        </view>
        <view class="field">
          <text class="field-label">车辆数量<text class="req">*</text></text>
          <input v-model="form.carCount" class="field-input" type="number" maxlength="1" placeholder="1-5 台" />
        </view>
        <view class="field">
          <text class="field-label">开票抬头</text>
          <input v-model="form.invoiceTitle" class="field-input" placeholder="选填，与企业名称一致" />
        </view>
        <view class="field no-border">
          <text class="field-label">企业地址</text>
          <input v-model="form.address" class="field-input" placeholder="选填" />
        </view>
      </view>

      <view class="tips">
        <text>📌 演示环境：认证与缴费均为模拟，不会产生真实扣款。</text>
      </view>

      <view class="actions">
        <view class="btn btn-gold" @click="submit"><text>提交企业认证</text></view>
      </view>
    </template>
  </view>
</template>

<script setup>
import { reactive, computed } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import {
  state, applyEnterprise, approveEnterprise, currentEnterpriseApplication, go, toast
} from '@/store/index'

const app = computed(() => currentEnterpriseApplication())

const form = reactive({
  company: '',
  creditCode: '',
  contact: '',
  phone: state.user.phoneRaw || '',
  carCount: '5',
  invoiceTitle: '',
  address: ''
})

const statusTitle = computed(() => {
  if (!app.value) return ''
  return { reviewing: '认证审核中', approved: '企业 VIP 已生效' }[app.value.status] || '认证审核中'
})

const statusDesc = computed(() => {
  if (!app.value) return ''
  return {
    reviewing: '平台将在 1 个工作日内完成企业资质审核',
    approved: '企业认证已通过，5 台车统一托管权益已生效'
  }[app.value.status] || ''
})

function submit() {
  if (!form.company.trim()) return toast('请填写企业名称')
  if (!/^[0-9A-Za-z]{15,18}$/.test(form.creditCode.trim())) return toast('请填写正确的信用代码')
  if (!form.contact.trim()) return toast('请填写联系人')
  if (!/^1\d{10}$/.test(form.phone.trim())) return toast('请填写正确的手机号')
  const count = Number(form.carCount)
  if (!count || count > 5) return toast('车辆数量需为 1-5 台')

  applyEnterprise({ ...form, carCount: count })
  toast('认证申请已提交')
}

function approve() {
  approveEnterprise(app.value.id)
  toast('企业认证已通过（模拟）')
}
</script>

<style scoped>
.intro { padding: 8rpx 40rpx 24rpx; display: flex; flex-direction: column; gap: 10rpx; }
.intro-title { font-size: 32rpx; font-weight: 700; color: #1A1D23; }
.intro-desc { font-size: 22rpx; color: #8A93A3; line-height: 1.6; }

.card { padding: 8rpx 28rpx; }
.field { display: flex; align-items: center; padding: 24rpx 0; border-bottom: 1rpx solid #F2F4F7; }
.field.no-border { border-bottom: none; }
.field-label { width: 170rpx; font-size: 25rpx; color: #5A6373; flex-shrink: 0; }
.req { color: #E02B20; margin-left: 4rpx; }
.field-input { flex: 1; font-size: 25rpx; color: #1A1D23; }

.tips { padding: 4rpx 36rpx 0; }
.tips text { font-size: 20rpx; color: #A8B0BD; line-height: 1.6; }

.status-hero { position: relative; margin: 0 24rpx 24rpx; padding: 36rpx 30rpx; border-radius: 26rpx; overflow: hidden; }
.s-reviewing { background: linear-gradient(125deg, #D98A12, #8F5606); }
.s-approved { background: linear-gradient(125deg, #12A06A, #08714A); }
.status-glow { position: absolute; right: -60rpx; top: -80rpx; width: 300rpx; height: 300rpx; border-radius: 50%; background: radial-gradient(circle, rgba(255,255,255,0.22), transparent 70%); }
.status-title { position: relative; display: block; font-size: 40rpx; font-weight: 700; color: #FFFFFF; }
.status-desc { position: relative; display: block; margin-top: 12rpx; font-size: 22rpx; color: rgba(255,255,255,0.8); }
.status-id { position: relative; margin-top: 20rpx; display: inline-flex; background: rgba(255,255,255,0.16); border-radius: 10rpx; padding: 6rpx 16rpx; }
.status-id text { font-size: 19rpx; color: rgba(255,255,255,0.85); }

.sec-title { display: flex; align-items: center; gap: 12rpx; font-size: 29rpx; font-weight: 700; color: #1A1D23; margin-bottom: 18rpx; }
.sec-bar { width: 8rpx; height: 26rpx; border-radius: 4rpx; background: linear-gradient(180deg, #FF7A3D, #FF4E12); }
.kv { display: flex; align-items: flex-start; justify-content: space-between; padding: 10rpx 0; gap: 20rpx; }
.k { font-size: 24rpx; color: #8A93A3; flex-shrink: 0; }
.v { font-size: 24rpx; color: #2A3038; text-align: right; max-width: 430rpx; }
.benefit { display: block; font-size: 23rpx; color: #3A4250; line-height: 1.8; }

.demo-card { margin: 0 24rpx 20rpx; padding: 22rpx 24rpx; border-radius: 18rpx; background: #F5F7FA; border: 2rpx dashed #D8DEE8; display: flex; flex-direction: column; gap: 8rpx; }
.demo-title { font-size: 22rpx; font-weight: 700; color: #6B7484; }
.demo-desc { font-size: 20rpx; color: #9AA3B0; line-height: 1.5; }
.demo-btn { margin-top: 10rpx; height: 64rpx; border-radius: 32rpx; background: #FFF1EB; border: 2rpx solid #FFB68F; display: flex; align-items: center; justify-content: center; }
.demo-btn text { font-size: 22rpx; color: #FF5A1F; font-weight: 600; }

.actions { padding: 8rpx 24rpx 30rpx; display: flex; flex-direction: column; gap: 16rpx; }
.actions .btn text { font-size: 29rpx; font-weight: 600; }
</style>
