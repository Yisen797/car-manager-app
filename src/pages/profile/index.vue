<template>
  <view class="page" style="padding-bottom: 180rpx">
    <PageHeader title="编辑资料" />

    <!-- 头像 -->
    <view class="card avatar-card">
      <view class="avatar-big"><text>{{ form.avatar }}</text></view>
      <text class="avatar-tip">选择头像</text>
      <view class="avatar-grid">
        <view
          v-for="a in avatars"
          :key="a"
          class="avatar-item"
          :class="{ on: form.avatar === a }"
          @click="form.avatar = a"
        >
          <text>{{ a }}</text>
        </view>
      </view>
    </view>

    <!-- 资料 -->
    <view class="card">
      <view class="field">
        <text class="field-label">昵称</text>
        <input v-model="form.name" class="field-input" maxlength="12" placeholder="请输入昵称" />
      </view>
      <view class="field">
        <text class="field-label">手机号</text>
        <input v-model="form.phone" class="field-input" type="number" maxlength="11" placeholder="请输入手机号" />
      </view>
      <view class="field readonly">
        <text class="field-label">会员等级</text>
        <text class="field-value">{{ member.name }}</text>
      </view>
      <view class="field readonly">
        <text class="field-label">注册时间</text>
        <text class="field-value">{{ state.user.loginTime || '2026-10-01 10:00' }}</text>
      </view>
    </view>

    <view class="tips">
      <text>昵称与头像仅用于平台内展示，手机号用于登录与订单联系。</text>
    </view>

    <view class="fixed-bar">
      <view class="bar-btn btn btn-primary" @click="save"><text>保存资料</text></view>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import { state, memberInfo, updateProfile, toast } from '@/store/index'

const member = computed(() => memberInfo())
const avatars = ['🙂', '😎', '🧑‍✈️', '👨‍🔧', '🚗', '⚡', '🐯', '🐼', '🦁', '🌟']

const form = reactive({
  avatar: state.user.avatar || '🙂',
  name: state.user.name || '',
  phone: state.user.phoneRaw || ''
})

function save() {
  if (!form.name.trim()) return toast('请填写昵称')
  if (!/^1\d{10}$/.test(form.phone)) return toast('请填写正确的手机号')
  updateProfile({ name: form.name.trim(), avatar: form.avatar, phone: form.phone })
  toast('资料已保存')
  setTimeout(() => {
    const pages = getCurrentPages()
    if (pages.length > 1) uni.navigateBack()
  }, 600)
}
</script>

<style scoped>
.avatar-card { display: flex; flex-direction: column; align-items: center; padding: 34rpx 28rpx 28rpx; }
.avatar-big {
  width: 140rpx;
  height: 140rpx;
  border-radius: 70rpx;
  background: linear-gradient(135deg, #FFF1EB, #FFE0D0);
  display: flex;
  align-items: center;
  justify-content: center;
}
.avatar-big text { font-size: 76rpx; }
.avatar-tip { margin-top: 16rpx; font-size: 22rpx; color: #9AA3B0; }
.avatar-grid { display: flex; flex-wrap: wrap; gap: 18rpx; margin-top: 22rpx; justify-content: center; }
.avatar-item {
  width: 84rpx;
  height: 84rpx;
  border-radius: 42rpx;
  background: #F5F7FA;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 3rpx solid transparent;
}
.avatar-item text { font-size: 40rpx; }
.avatar-item.on { border-color: #FF8A4C; background: #FFF1EB; }

.field { display: flex; align-items: center; padding: 22rpx 0; border-bottom: 1rpx solid #F2F4F7; }
.field:last-child { border-bottom: none; }
.field-label { width: 160rpx; font-size: 25rpx; color: #8A93A3; flex-shrink: 0; }
.field-input { flex: 1; font-size: 26rpx; color: #1A1D23; }
.field-value { flex: 1; font-size: 25rpx; color: #3A4250; text-align: right; }
.field.readonly { opacity: 0.85; }

.tips { padding: 0 36rpx; }
.tips text { font-size: 20rpx; color: #A8B0BD; line-height: 1.6; }

.bar-btn { flex: 1; }
.bar-btn text { font-size: 30rpx; color: #FFFFFF; font-weight: 600; }
</style>
