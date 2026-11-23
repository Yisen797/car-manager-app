<template>
  <view class="page" style="padding-bottom: 180rpx">
    <PageHeader title="呼叫救援" />

    <!-- 类型头 -->
    <view class="type-hero">
      <view class="type-hero-glow"></view>
      <view class="type-emoji-wrap"><text class="type-emoji">{{ currentType.icon }}</text></view>
      <view class="type-info">
        <text class="type-name">{{ currentType.name }}</text>
        <text class="type-desc">{{ currentType.desc }}</text>
      </view>
      <view class="type-price">
        <text class="tp-value">{{ currentType.price }}</text>
        <text class="tp-label">预估</text>
      </view>
    </view>

    <!-- 类型快选 -->
    <view class="type-picker">
      <view
        v-for="t in RESCUE_TYPES"
        :key="t.id"
        class="pick-item"
        :class="{ active: t.id === typeId }"
        @click="typeId = t.id"
      >
        <text>{{ t.name }}</text>
      </view>
    </view>

    <!-- 表单 -->
    <view class="card form-card">
      <view class="form-row" @click="go('/pages/car/list')">
        <text class="form-label">救援车辆</text>
        <view class="form-value">
          <text class="plate">{{ car ? car.plate : '请选择车辆' }}</text>
          <text class="form-model ellipsis">{{ car ? car.brand : '' }}</text>
        </view>
        <text class="form-arrow">›</text>
      </view>

      <view class="form-row" @click="pickLocation">
        <text class="form-label">救援地点</text>
        <view class="form-value">
          <text class="addr ellipsis">{{ address }}</text>
        </view>
        <text class="loc-btn">{{ locating ? '定位中…' : '定位' }}</text>
      </view>

      <view class="form-row">
        <text class="form-label">联系人</text>
        <input v-model="contact" class="form-input" placeholder="请输入称呼" placeholder-class="ph" />
      </view>

      <view class="form-row no-border">
        <text class="form-label">手机号</text>
        <input v-model="phone" class="form-input" type="number" placeholder="救援司机联系您" placeholder-class="ph" />
      </view>
    </view>

    <view class="card form-card">
      <view class="form-col">
        <text class="form-label">故障描述（选填）</text>
        <textarea
          v-model="remark"
          class="form-textarea"
          placeholder="例如：车辆打不着火 / 右前轮爆胎 / 地库出口托底"
          placeholder-class="ph"
          maxlength="120"
        />
        <text class="counter">{{ remark.length }}/120</text>
      </view>
    </view>

    <!-- 费用 -->
    <view class="card fee-card">
      <view class="fee-row">
        <text class="fee-label">服务费</text>
        <text class="fee-value">{{ currentType.price }}</text>
      </view>
      <view class="fee-row">
        <text class="fee-label">会员优惠</text>
        <text class="fee-value green">{{ member.active ? '优先调度 · 免咨询费' : '开通会员享折扣' }}</text>
      </view>
      <view class="divider"></view>
      <view class="fee-row">
        <text class="fee-total-label">预估合计</text>
        <text class="fee-total">{{ currentType.price }}</text>
      </view>
      <text class="fee-note">最终费用以现场实际服务项目为准，救援前会与您确认。</text>
    </view>

    <view class="safety">
      <text class="safety-ico">⚠️</text>
      <text class="safety-text">如遇交通事故或人员受伤，请先拨打 122 / 120，确保人身安全后再呼叫救援。</text>
    </view>

    <view class="fixed-bar">
      <view class="bar-left">
        <text class="bar-label">预估费用</text>
        <text class="bar-price">{{ currentType.price }}</text>
      </view>
      <view class="bar-btn" @click="submit">
        <text>SOS 立即呼叫</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import PageHeader from '@/components/PageHeader.vue'
import { RESCUE_TYPES } from '@/data/mock'
import { state, currentCar, memberInfo, createOrder, formatNow, go, toast } from '@/store/index'
import { locateAndSetCity } from '@/utils/location'

const typeId = ref('tow')
const address = ref(state.city + ' · 请补充详细地址')
const contact = ref('车主')
const phone = ref(state.user.phoneRaw || '13800008899')
const remark = ref('')
const locating = ref(false)

const car = computed(() => currentCar())
const member = computed(() => memberInfo())
const currentType = computed(() => RESCUE_TYPES.find(t => t.id === typeId.value) || RESCUE_TYPES[0])

onLoad(options => {
  if (options && options.type) typeId.value = options.type
})

async function pickLocation() {
  if (locating.value) return
  locating.value = true
  const res = await locateAndSetCity()
  locating.value = false
  if (res.ok) {
    address.value = res.city + '（当前位置，请补充门牌号）'
    toast('已定位到 ' + res.city)
    return
  }
  uni.showModal({
    title: '定位失败',
    content: '请检查系统定位权限和网络后重试，或直接手动填写详细地址。',
    showCancel: false,
    confirmText: '我知道了'
  })
}

function submit() {
  if (!phone.value) {
    toast('请填写手机号')
    return
  }
  const order = createOrder({
    serviceId: 'rescue',
    title: currentType.value.name + ' · 紧急呼叫',
    merchant: '24H 极速救援队',
    amount: 0,
    originalAmount: 0,
    status: 'waiting',
    icon: '🆘',
    gradient: 'linear-gradient(135deg,#FF5B4A,#D0021B)',
    payLabel: '现场支付',
    car: car.value ? car.value.plate : '未绑定车辆',
    booking: {
      date: new Date().toISOString().slice(0, 10),
      time: '立即',
      mode: '救援',
      address: address.value,
      contactName: contact.value,
      contactPhone: phone.value,
      remark: remark.value
    },
    timeline: [
      { text: 'SOS 呼叫已发出', time: formatNow(), done: true },
      { text: '等待救援车接单', time: '', done: false }
    ]
  })
  go('/pages/result/index?type=rescue&id=' + order.id)
}
</script>

<style scoped>
.type-hero {
  position: relative;
  margin: 8rpx 24rpx 20rpx;
  padding: 28rpx;
  border-radius: 26rpx;
  background: linear-gradient(115deg, #2A0F0D, #180A0A);
  border: 2rpx solid rgba(224, 43, 32, 0.35);
  display: flex;
  align-items: center;
  overflow: hidden;
}
.type-hero-glow {
  position: absolute;
  right: -80rpx;
  top: -80rpx;
  width: 260rpx;
  height: 260rpx;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(224, 43, 32, 0.4), transparent 70%);
}
.type-emoji-wrap {
  width: 96rpx;
  height: 96rpx;
  border-radius: 26rpx;
  background: rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
}
.type-emoji { font-size: 48rpx; }
.type-info { flex: 1; min-width: 0; margin-left: 22rpx; display: flex; flex-direction: column; gap: 10rpx; }
.type-name { font-size: 32rpx; font-weight: 700; color: #FFFFFF; }
.type-desc { font-size: 21rpx; color: rgba(255, 255, 255, 0.45); }
.type-price { display: flex; flex-direction: column; align-items: flex-end; gap: 4rpx; }
.tp-value { font-size: 26rpx; font-weight: 700; color: #FF6B5A; }
.tp-label { font-size: 18rpx; color: rgba(255, 255, 255, 0.35); }

.type-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 14rpx;
  margin: 0 24rpx 24rpx;
}
.pick-item {
  padding: 12rpx 24rpx;
  border-radius: 30rpx;
  background: #FFFFFF;
  border: 2rpx solid #EDF0F4;
}
.pick-item text { font-size: 23rpx; color: #5A6373; }
.pick-item.active {
  background: #FFEDEC;
  border-color: #FF8A7A;
}
.pick-item.active text { color: #D0021B; font-weight: 600; }

.form-card { padding: 4rpx 28rpx; }
.form-row {
  display: flex;
  align-items: center;
  padding: 28rpx 0;
  border-bottom: 1rpx solid #F2F4F7;
  min-height: 96rpx;
}
.form-row.no-border { border-bottom: none; }
.form-label { width: 150rpx; font-size: 26rpx; color: #5A6373; flex-shrink: 0; }
.form-value { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6rpx; }
.plate { font-size: 28rpx; font-weight: 600; color: #1A1D23; }
.form-model { font-size: 20rpx; color: #9AA3B0; }
.addr { font-size: 25rpx; color: #1A1D23; }
.form-input { flex: 1; font-size: 26rpx; color: #1A1D23; text-align: right; }
.ph { color: #B4BBC7; font-size: 25rpx; }
.form-arrow { font-size: 34rpx; color: #D2D7E0; margin-left: 8rpx; }
.loc-btn {
  font-size: 21rpx;
  color: #FF5A1F;
  border: 1rpx solid #FFD2BF;
  border-radius: 8rpx;
  padding: 4rpx 12rpx;
  margin-left: 12rpx;
}
.form-col { display: flex; flex-direction: column; gap: 14rpx; padding: 26rpx 0; }
.form-col .form-label { width: auto; }
.form-textarea {
  width: 100%;
  height: 140rpx;
  font-size: 25rpx;
  color: #1A1D23;
  line-height: 1.6;
}
.counter { text-align: right; font-size: 20rpx; color: #B4BBC7; }

.fee-card { padding: 24rpx 28rpx; }
.fee-row { display: flex; align-items: center; justify-content: space-between; padding: 10rpx 0; }
.fee-label { font-size: 25rpx; color: #6B7484; }
.fee-value { font-size: 25rpx; color: #1A1D23; }
.fee-value.green { color: #0E9E6B; }
.fee-total-label { font-size: 27rpx; font-weight: 600; color: #1A1D23; }
.fee-total { font-size: 34rpx; font-weight: 700; color: #E02B20; }
.fee-note { display: block; margin-top: 12rpx; font-size: 20rpx; color: #A8B0BD; line-height: 1.6; }

.safety {
  margin: 0 24rpx 24rpx;
  padding: 20rpx 24rpx;
  border-radius: 18rpx;
  background: #FFF8E9;
  border: 1rpx solid #F5E2BB;
  display: flex;
  gap: 12rpx;
}
.safety-ico { font-size: 24rpx; }
.safety-text { flex: 1; font-size: 20rpx; color: #9A7B36; line-height: 1.6; }

.bar-left { flex: 1; display: flex; flex-direction: column; gap: 4rpx; }
.bar-label { font-size: 20rpx; color: #9AA3B0; }
.bar-price { font-size: 32rpx; font-weight: 700; color: #E02B20; }
.bar-btn {
  width: 360rpx;
  height: 92rpx;
  border-radius: 46rpx;
  background: linear-gradient(135deg, #FF5240, #C8071C);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 10rpx 26rpx rgba(200, 7, 28, 0.32);
}
.bar-btn text { font-size: 30rpx; color: #FFFFFF; font-weight: 700; letter-spacing: 1rpx; }
</style>
