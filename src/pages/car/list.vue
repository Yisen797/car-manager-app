<template>
  <view class="page" style="padding-bottom: 200rpx">
    <PageHeader title="我的车辆" />

    <view class="hint">
      <text class="hint-ico">💡</text>
      <text class="hint-text">绑定车辆后可自动提醒保险、年审到期，并支持违章台账管理。</text>
    </view>

    <view
      v-for="c in state.cars"
      :key="c.id"
      class="car-card"
      :class="{ current: c.id === state.currentCarId }"
    >
      <view class="car-top">
        <view class="car-emoji-wrap"><text class="car-emoji">{{ c.emoji }}</text></view>
        <view class="car-main">
          <view class="plate-row">
            <text class="plate">{{ c.plate }}</text>
            <text v-if="c.id === state.currentCarId" class="default-tag">默认</text>
          </view>
          <text class="brand">{{ c.brand }}</text>
        </view>
        <view class="mileage">
          <text class="mileage-num">{{ formatKm(c.mileage) }}</text>
          <text class="mileage-unit">km</text>
        </view>
      </view>

      <view class="chips">
        <view class="chip">
          <text class="chip-k">保险到期</text>
          <text class="chip-v">{{ c.insuranceEnd }}</text>
          <text class="chip-d" :class="{ warn: days(c.insuranceEnd) !== null && days(c.insuranceEnd) < 60 }">
            {{ dayText(days(c.insuranceEnd)) }}
          </text>
        </view>
        <view class="chip">
          <text class="chip-k">年检到期</text>
          <text class="chip-v">{{ c.annualEnd }}</text>
          <text class="chip-d" :class="{ warn: days(c.annualEnd) !== null && days(c.annualEnd) < 60 }">
            {{ dayText(days(c.annualEnd)) }}
          </text>
        </view>
      </view>

      <view class="docs">
        <text class="doc-tag" :class="{ on: c.licenseImage }">行驶证{{ c.licenseImage ? '已上传' : '未上传' }}</text>
        <text class="doc-tag" :class="{ on: c.insuranceImage }">保单{{ c.insuranceImage ? '已上传' : '未上传' }}</text>
      </view>

      <view class="car-actions">
        <view class="ca" @click="edit(c)"><text>编辑</text></view>
        <view class="ca" @click="tip('已生成违章查询台账')"><text>查违章</text></view>
        <view class="ca danger" @click="remove(c)"><text>删除</text></view>
        <view class="ca primary" @click="setDefault(c)">
          <text>{{ c.id === state.currentCarId ? '当前车辆' : '设为默认' }}</text>
        </view>
      </view>
    </view>

    <view class="add-card" @click="go('/pages/car/add')">
      <text class="add-plus">＋</text>
      <text class="add-text">添加车辆</text>
    </view>

    <view class="tips">
      <text class="tips-title">温馨提示</text>
      <text class="tips-text">企业会员可绑定 5 台以内车辆统一托管，批量年审、批量违章、批量过户一次搞定。</text>
      <view class="tips-btn" @click="go('/pages/enterprise/index')"><text>了解企业VIP ›</text></view>
    </view>

    <view class="fixed-bar">
      <view class="act act-primary" style="flex:1" @click="go('/pages/car/add')">
        <text>＋ 添加车辆</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import { state, setCurrentCar, removeCar, daysUntil, go, toast } from '@/store/index'

function formatKm(n) {
  return Number(n).toLocaleString('en-US')
}

function days(d) {
  return daysUntil(d)
}

function dayText(d) {
  if (d === null) return '未设置'
  if (d < 0) return '已过期'
  return '剩 ' + d + ' 天'
}

function edit(c) {
  go('/pages/car/add?id=' + c.id)
}

function remove(c) {
  uni.showModal({
    title: '删除车辆',
    content: `确定删除 ${c.plate} 吗？该车辆的提醒和记录将一并移除。`,
    confirmColor: '#E02B20',
    success: res => {
      if (!res.confirm) return
      removeCar(c.id)
      toast('车辆已删除')
    }
  })
}

function setDefault(c) {
  setCurrentCar(c.id)
  toast('已设为默认车辆')
}

function tip(t) {
  toast(t)
}
</script>

<style scoped>
.hint {
  margin: 8rpx 24rpx 20rpx;
  padding: 20rpx 24rpx;
  border-radius: 18rpx;
  background: #FFFBF2;
  border: 1rpx solid #F5E6C8;
  display: flex;
  gap: 12rpx;
}
.hint-ico { font-size: 24rpx; }
.hint-text { flex: 1; font-size: 20rpx; color: #9A7B36; line-height: 1.6; }

.car-card {
  margin: 0 24rpx 20rpx;
  padding: 28rpx;
  border-radius: 26rpx;
  background: linear-gradient(125deg, #2C3A4F 0%, #151D29 100%);
  border: 2rpx solid transparent;
}
.car-card.current { border-color: rgba(255, 122, 61, 0.5); }
.car-top { display: flex; align-items: center; }
.car-emoji-wrap {
  width: 88rpx;
  height: 88rpx;
  border-radius: 24rpx;
  background: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}
.car-emoji { font-size: 44rpx; }
.car-main { flex: 1; min-width: 0; margin-left: 22rpx; display: flex; flex-direction: column; gap: 8rpx; }
.plate-row { display: flex; align-items: center; gap: 12rpx; }
.plate { font-size: 32rpx; font-weight: 700; color: #FFFFFF; letter-spacing: 2rpx; }
.default-tag {
  font-size: 17rpx;
  color: #2A1F0C;
  background: linear-gradient(135deg, #D8B06A, #A97C2F);
  padding: 2rpx 10rpx;
  border-radius: 6rpx;
  font-weight: 600;
}
.brand { font-size: 21rpx; color: rgba(255, 255, 255, 0.48); }
.mileage { display: flex; align-items: baseline; gap: 4rpx; }
.mileage-num { font-size: 28rpx; font-weight: 700; color: #FFFFFF; }
.mileage-unit { font-size: 19rpx; color: rgba(255, 255, 255, 0.4); }

.chips { display: flex; gap: 16rpx; margin-top: 24rpx; }
.chip {
  flex: 1;
  background: rgba(255, 255, 255, 0.07);
  border-radius: 16rpx;
  padding: 16rpx 18rpx;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}
.chip-k { font-size: 19rpx; color: rgba(255, 255, 255, 0.4); }
.chip-v { font-size: 23rpx; color: #FFFFFF; font-weight: 600; }
.chip-d { font-size: 19rpx; color: #4CD7A0; }
.chip-d.warn { color: #FF8A6B; }

.car-actions { display: flex; gap: 14rpx; margin-top: 24rpx; }
.ca {
  flex: 1;
  height: 62rpx;
  border-radius: 31rpx;
  background: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}
.ca text { font-size: 22rpx; color: rgba(255, 255, 255, 0.8); }
.ca.primary { background: linear-gradient(135deg, #FF7A3D, #FF4E12); }
.ca.primary text { color: #FFFFFF; font-weight: 600; }
.ca.danger text { color: #FF9A8C; }
.docs { display: flex; gap: 12rpx; margin-top: 18rpx; }
.doc-tag { font-size: 19rpx; color: rgba(255, 255, 255, 0.45); background: rgba(255, 255, 255, 0.08); padding: 5rpx 14rpx; border-radius: 8rpx; }
.doc-tag.on { color: #7BE8BE; background: rgba(18, 160, 106, 0.18); }

.add-card {
  margin: 0 24rpx 24rpx;
  height: 120rpx;
  border-radius: 24rpx;
  border: 2rpx dashed #D6DBE3;
  background: #FFFFFF;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
}
.add-plus { font-size: 34rpx; color: #B4BBC7; }
.add-text { font-size: 26rpx; color: #8A93A3; }

.tips {
  margin: 0 24rpx 24rpx;
  padding: 26rpx 28rpx;
  border-radius: 22rpx;
  background: #FFFFFF;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}
.tips-title { font-size: 24rpx; font-weight: 700; color: #3A4250; }
.tips-text { font-size: 21rpx; color: #8A93A3; line-height: 1.6; }
.tips-btn { align-self: flex-start; margin-top: 4rpx; }
.tips-btn text { font-size: 21rpx; color: #FF5A1F; font-weight: 600; }

.act { height: 88rpx; border-radius: 44rpx; display: flex; align-items: center; justify-content: center; }
.act-primary { background: linear-gradient(135deg, #FF7A3D, #FF4E12); }
.act-primary text { color: #FFFFFF; font-size: 28rpx; font-weight: 600; }
</style>
