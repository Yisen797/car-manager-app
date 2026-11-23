<template>
  <view class="page">
    <PageHeader title="消息中心">
      <template #right>
        <text v-if="unread > 0" class="read-all" @click="readAll">全部已读</text>
      </template>
    </PageHeader>

    <view class="summary" v-if="messages.length">
      <text class="summary-text">共 {{ messages.length }} 条消息 · {{ unread }} 条未读</text>
    </view>

    <view class="list">
      <view
        v-for="m in messages"
        :key="m.id"
        class="msg"
        :class="{ unread: !m.read }"
        @click="open(m)"
      >
        <view class="msg-icon" :style="{ background: styleOf(m.type).bg }">
          <text>{{ styleOf(m.type).icon }}</text>
        </view>
        <view class="msg-main">
          <view class="msg-top">
            <view v-if="!m.read" class="msg-dot"></view>
            <text class="msg-title ellipsis">{{ m.title }}</text>
            <text class="msg-time">{{ m.time }}</text>
          </view>
          <text class="msg-desc">{{ m.desc }}</text>
        </view>
      </view>

      <view v-if="messages.length === 0" class="empty">
        <text class="empty-icon">📭</text>
        <text class="empty-text">暂无消息</text>
      </view>
    </view>

    <view class="tip">
      <text>订单进度、优惠券到账、审核结果都会在这里通知你</text>
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import { state, unreadCount, markMessageRead, markAllMessagesRead, toast } from '@/store/index'

const messages = computed(() => state.messages)
const unread = computed(() => unreadCount())

const STYLES = {
  order: { icon: '🧾', bg: '#FFF1EB' },
  coupon: { icon: '🎫', bg: '#FBF3E3' },
  merchant: { icon: '🏪', bg: '#EDF3FF' },
  member: { icon: '👑', bg: '#FBF3E3' },
  car: { icon: '🚗', bg: '#EDF3FF' },
  system: { icon: '📢', bg: '#F2F4F7' }
}

function styleOf(type) {
  return STYLES[type] || STYLES.system
}

function readAll() {
  markAllMessagesRead()
  toast('已全部标记为已读')
}

function open(m) {
  markMessageRead(m.id)
  if (!m.target) return
  uni.navigateTo({
    url: m.target,
    fail: () => uni.redirectTo({ url: m.target })
  })
}
</script>

<style scoped>
.read-all {
  font-size: 23rpx;
  color: #8A93A3;
  padding: 0 12rpx;
}
.summary { padding: 8rpx 32rpx 16rpx; }
.summary-text { font-size: 20rpx; color: #A8B0BD; }

.list { padding: 0 24rpx; }
.msg {
  display: flex;
  align-items: flex-start;
  background: #FFFFFF;
  border-radius: 20rpx;
  padding: 24rpx 22rpx;
  margin-bottom: 16rpx;
  position: relative;
}
.msg-icon {
  width: 76rpx;
  height: 76rpx;
  border-radius: 22rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36rpx;
  flex-shrink: 0;
}
.msg-main { flex: 1; min-width: 0; margin-left: 18rpx; display: flex; flex-direction: column; gap: 8rpx; }
.msg-top { display: flex; align-items: center; gap: 12rpx; }
.msg-title { font-size: 26rpx; color: #6B7484; font-weight: 500; flex: 1; min-width: 0; }
.msg.unread .msg-title { color: #1A1D23; font-weight: 700; }
.msg-time { font-size: 18rpx; color: #B4BBC7; flex-shrink: 0; }
.msg-desc { font-size: 22rpx; color: #9AA3B0; line-height: 1.6; }
.msg.unread .msg-desc { color: #5A6373; }
.msg-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 6rpx;
  background: #FF4E12;
  flex-shrink: 0;
}
.tip { padding: 20rpx 40rpx 30rpx; text-align: center; }
.tip text { font-size: 20rpx; color: #B4BBC7; }
</style>
