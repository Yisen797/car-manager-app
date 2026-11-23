<template>
  <view class="page" :style="{ paddingBottom: tab === 'chat' ? '170rpx' : '60rpx' }">
    <PageHeader title="客服中心" />

    <!-- 切换 -->
    <view class="tabs">
      <view class="tab" :class="{ on: tab === 'chat' }" @click="tab = 'chat'"><text>在线客服</text></view>
      <view class="tab" :class="{ on: tab === 'feedback' }" @click="tab = 'feedback'"><text>意见反馈</text></view>
    </view>

    <!-- 在线客服 -->
    <view v-if="tab === 'chat'" class="chat">
      <view class="chat-list">
        <view v-for="(m, i) in chat" :key="i" class="msg" :class="m.from">
          <view class="msg-avatar"><text>{{ m.from === 'me' ? state.user.avatar : '🎧' }}</text></view>
          <view class="msg-bubble"><text>{{ m.text }}</text></view>
        </view>
      </view>

      <view class="quick">
        <view v-for="q in quickQuestions" :key="q" class="quick-chip" @click="askQuick(q)">
          <text>{{ q }}</text>
        </view>
      </view>
    </view>

    <!-- 意见反馈 -->
    <view v-else class="feedback">
      <view class="card">
        <view class="sec-title"><view class="sec-bar"></view><text>反馈类型</text></view>
        <view class="type-chips">
          <view v-for="t in types" :key="t" class="type-chip" :class="{ on: form.type === t }" @click="form.type = t">
            <text>{{ t }}</text>
          </view>
        </view>

        <view class="sec-title mt"><view class="sec-bar"></view><text>问题描述</text></view>
        <textarea v-model="form.content" class="textarea" maxlength="300" placeholder="请详细描述您遇到的问题或建议～" />
        <text class="word-count">{{ form.content.length }}/300</text>

        <view class="upload-row">
          <view v-for="(img, i) in form.images" :key="i" class="thumb">
            <image :src="img" class="thumb-img" mode="aspectFill" />
            <view class="thumb-del" @click="removeImage(i)"><text>×</text></view>
          </view>
          <view v-if="form.images.length < 3" class="upload-add" @click="pickImages">
            <text class="upload-plus">＋</text>
            <text class="upload-tip">图片</text>
          </view>
        </view>

        <view class="field">
          <text class="field-label">联系方式</text>
          <input v-model="form.contact" class="field-input" type="number" maxlength="11" placeholder="手机号（选填）" />
        </view>

        <view class="submit-btn" @click="submit"><text>提交反馈</text></view>
      </view>

      <!-- 我的反馈 -->
      <view v-if="state.feedbacks.length" class="card">
        <view class="sec-title"><view class="sec-bar"></view><text>我的反馈</text></view>
        <view v-for="fb in state.feedbacks" :key="fb.id" class="fb-row">
          <view class="fb-top">
            <text class="fb-type">{{ fb.type }}</text>
            <text class="fb-status">{{ fb.status === 'pending' ? '待处理' : '已处理' }}</text>
          </view>
          <text class="fb-content">{{ fb.content }}</text>
          <text class="fb-time">{{ fb.createTime }}</text>
        </view>
      </view>
    </view>

    <!-- 聊天输入 -->
    <view v-if="tab === 'chat'" class="chat-bar">
      <input v-model="input" class="chat-input" placeholder="请描述您的问题…" confirm-type="send" @confirm="send" />
      <view class="send-btn" :class="{ disabled: !input.trim() }" @click="send"><text>发送</text></view>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive, nextTick } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import { state, submitFeedback, toast } from '@/store/index'

const tab = ref('chat')
const input = ref('')
const chat = ref([
  { from: 'service', text: '您好，我是车管家在线客服。请问有什么可以帮您？' },
  { from: 'service', text: '您可以直接输入问题，或点击下方常见问题快速咨询。' }
])
const quickQuestions = ['订单进度怎么查？', '如何取消订单？', '怎么开发票？', '会员有哪些权益？']

const types = ['功能建议', '服务投诉', '故障反馈', '其他']
const form = reactive({
  type: '功能建议',
  content: '',
  images: [],
  contact: state.user.phoneRaw || ''
})

const RULES = [
  { kw: ['订单', '进度', '查'], reply: '您可以在底部「订单」页查看全部订单和实时进度；订单详情里还有服务时间轴。' },
  { kw: ['取消', '退款'], reply: '待支付和待接单的订单可以取消；已支付的订单取消后会原路退回（演示环境为模拟退款）。' },
  { kw: ['发票'], reply: '进入「我的 - 发票中心」，选择已完成的订单即可申请电子发票（演示环境为模拟开票）。' },
  { kw: ['会员', '权益', '折扣'], reply: '普通会员服务费 95 折，尊享会员 9 折（保养 7 折），每月还可免费代驾或跑腿 1 次。' },
  { kw: ['人工', '电话'], reply: '人工客服热线 400-000-1234，7×24 小时为您服务。' }
]

function scrollBottom() {
  nextTick(() => {
    uni.pageScrollTo({ scrollTop: 99999, duration: 200 })
  })
}

function reply(text) {
  setTimeout(() => {
    chat.value.push({ from: 'service', text })
    scrollBottom()
  }, 700)
}

function send() {
  const text = input.value.trim()
  if (!text) return
  chat.value.push({ from: 'me', text })
  input.value = ''
  scrollBottom()

  const rule = RULES.find(r => r.kw.some(k => text.includes(k)))
  reply(rule ? rule.reply : '已收到您的消息。当前为演示环境，客服会以自动回复为您解答；如需人工服务请拨打 400-000-1234。')
}

function askQuick(q) {
  input.value = q
  send()
}

function pickImages() {
  uni.chooseImage({
    count: 3 - form.images.length,
    sizeType: ['compressed'],
    success: res => {
      form.images = [...form.images, ...res.tempFilePaths].slice(0, 3)
    }
  })
}

function removeImage(i) {
  form.images.splice(i, 1)
}

function submit() {
  if (!form.content.trim()) return toast('请填写问题描述')
  submitFeedback({
    type: form.type,
    content: form.content.trim(),
    images: form.images.slice(),
    contact: form.contact.trim()
  })
  form.content = ''
  form.images = []
  toast('反馈已提交')
}
</script>

<style scoped>
.tabs { display: flex; gap: 16rpx; padding: 8rpx 24rpx 20rpx; }
.tab { flex: 1; height: 68rpx; border-radius: 20rpx; background: #FFFFFF; display: flex; align-items: center; justify-content: center; }
.tab text { font-size: 25rpx; color: #5A6373; }
.tab.on { background: linear-gradient(135deg, #FF7A3D, #FF4E12); }
.tab.on text { color: #FFFFFF; font-weight: 700; }

.chat { padding: 0 24rpx; }
.chat-list { display: flex; flex-direction: column; gap: 20rpx; }
.msg { display: flex; gap: 14rpx; align-items: flex-start; }
.msg.me { flex-direction: row-reverse; }
.msg-avatar {
  width: 64rpx;
  height: 64rpx;
  border-radius: 32rpx;
  background: #F2F4F7;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.msg-avatar text { font-size: 32rpx; }
.msg-bubble {
  max-width: 76%;
  padding: 18rpx 22rpx;
  border-radius: 20rpx;
  background: #FFFFFF;
}
.msg-bubble text { font-size: 24rpx; color: #2A3038; line-height: 1.6; }
.msg.me .msg-bubble { background: #FFF1EB; }

.quick { display: flex; flex-wrap: wrap; gap: 12rpx; margin-top: 26rpx; }
.quick-chip { padding: 10rpx 20rpx; border-radius: 24rpx; background: #FFFFFF; border: 1rpx solid #E6EAF0; }
.quick-chip text { font-size: 21rpx; color: #5A6373; }

.chat-bar {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  bottom: 0;
  width: 100%;
  max-width: 480px;
  background: #FFFFFF;
  padding: 16rpx 24rpx calc(16rpx + env(safe-area-inset-bottom));
  display: flex;
  gap: 16rpx;
  box-shadow: 0 -6rpx 24rpx rgba(20, 30, 50, 0.06);
  z-index: 98;
}
.chat-input { flex: 1; height: 76rpx; background: #F5F7FA; border-radius: 38rpx; padding: 0 26rpx; font-size: 24rpx; }
.send-btn { width: 128rpx; height: 76rpx; border-radius: 38rpx; background: linear-gradient(135deg, #FF7A3D, #FF4E12); display: flex; align-items: center; justify-content: center; }
.send-btn text { font-size: 26rpx; color: #FFFFFF; font-weight: 600; }
.send-btn.disabled { opacity: 0.5; }

.feedback { padding: 0 24rpx; }
.sec-title { display: flex; align-items: center; gap: 12rpx; font-size: 28rpx; font-weight: 700; color: #1A1D23; margin-bottom: 18rpx; }
.sec-title.mt { margin-top: 30rpx; }
.sec-bar { width: 8rpx; height: 26rpx; border-radius: 4rpx; background: linear-gradient(180deg, #FF7A3D, #FF4E12); }
.type-chips { display: flex; flex-wrap: wrap; gap: 14rpx; }
.type-chip { padding: 12rpx 24rpx; border-radius: 26rpx; background: #F5F7FA; border: 2rpx solid transparent; }
.type-chip text { font-size: 22rpx; color: #5A6373; }
.type-chip.on { background: #FFF1EB; border-color: #FFB68F; }
.type-chip.on text { color: #FF5A1F; font-weight: 600; }
.textarea { width: 100%; height: 200rpx; background: #F7F8FA; border-radius: 16rpx; padding: 20rpx; font-size: 24rpx; line-height: 1.6; }
.word-count { display: block; text-align: right; margin-top: 6rpx; font-size: 19rpx; color: #B4BBC7; }
.upload-row { display: flex; gap: 14rpx; margin-top: 16rpx; }
.thumb { position: relative; width: 140rpx; height: 140rpx; border-radius: 14rpx; overflow: hidden; }
.thumb-img { width: 140rpx; height: 140rpx; }
.thumb-del { position: absolute; top: 0; right: 0; width: 36rpx; height: 36rpx; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; }
.thumb-del text { color: #FFF; font-size: 24rpx; }
.upload-add { width: 140rpx; height: 140rpx; border-radius: 14rpx; border: 2rpx dashed #D8DEE8; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4rpx; }
.upload-plus { font-size: 30rpx; color: #A8B0BD; }
.upload-tip { font-size: 18rpx; color: #B4BBC7; }
.field { display: flex; align-items: center; padding: 22rpx 0; border-bottom: 1rpx solid #F2F4F7; margin-top: 6rpx; }
.field-label { width: 150rpx; font-size: 24rpx; color: #8A93A3; }
.field-input { flex: 1; font-size: 24rpx; }
.submit-btn { margin-top: 24rpx; height: 86rpx; border-radius: 43rpx; background: linear-gradient(135deg, #FF7A3D, #FF4E12); display: flex; align-items: center; justify-content: center; }
.submit-btn text { font-size: 28rpx; color: #FFFFFF; font-weight: 700; }

.fb-row { padding: 18rpx 0; border-bottom: 1rpx solid #F2F4F7; }
.fb-row:last-child { border-bottom: none; }
.fb-top { display: flex; align-items: center; justify-content: space-between; }
.fb-type { font-size: 22rpx; color: #FF5A1F; background: #FFF1EB; padding: 4rpx 12rpx; border-radius: 8rpx; }
.fb-status { font-size: 19rpx; color: #A8B0BD; }
.fb-content { display: block; margin-top: 10rpx; font-size: 23rpx; color: #3A4250; line-height: 1.6; }
.fb-time { display: block; margin-top: 6rpx; font-size: 18rpx; color: #B4BBC7; }
</style>
