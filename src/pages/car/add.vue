<template>
  <view class="page" style="padding-bottom: 200rpx">
    <PageHeader :title="editId ? '编辑车辆' : '添加车辆'" />

    <view class="card form-card">
      <view class="form-row plate-row">
        <text class="form-label">车牌号<text class="req">*</text></text>
        <view class="plate-input-wrap">
          <view class="province-picker" :class="{ empty: !plateProvince }" @click="showProvince = true">
            <text>{{ plateProvince || '省份' }}</text>
            <text class="province-arrow">▾</text>
          </view>
          <input
            v-model="plateRest"
            class="plate-input"
            maxlength="7"
            placeholder="A88888"
            placeholder-class="ph"
            @input="onPlateInput"
          />
        </view>
      </view>
      <view v-if="platePreview" class="plate-preview">
        <text class="pp-value">{{ platePreview }}</text>
        <text class="pp-tip">自动格式化，无需输入「·」{{ plateRest.length === 7 ? ' · 新能源' : '' }}</text>
      </view>
      <view class="form-row">
        <text class="form-label">品牌车型<text class="req">*</text></text>
        <input v-model="form.brand" class="form-input" placeholder="如：宝马 3系 2021款 325Li" placeholder-class="ph" />
      </view>
      <view class="form-row">
        <text class="form-label">行驶里程</text>
        <input v-model="form.mileage" class="form-input" type="number" placeholder="单位：km" placeholder-class="ph" />
      </view>
      <view class="form-row no-border">
        <text class="form-label">车身颜色</text>
        <input v-model="form.color" class="form-input" placeholder="如：珍珠白" placeholder-class="ph" />
      </view>
    </view>

    <view class="card form-card">
      <view class="form-row">
        <text class="form-label">保险到期</text>
        <picker mode="date" :value="form.insuranceEnd" @change="e => (form.insuranceEnd = e.detail.value)">
          <view class="picker-value">
            <text :class="{ ph: !form.insuranceEnd }">{{ form.insuranceEnd || '请选择日期' }}</text>
            <text class="picker-arrow">›</text>
          </view>
        </picker>
      </view>
      <view class="form-row no-border">
        <text class="form-label">年检到期</text>
        <picker mode="date" :value="form.annualEnd" @change="e => (form.annualEnd = e.detail.value)">
          <view class="picker-value">
            <text :class="{ ph: !form.annualEnd }">{{ form.annualEnd || '请选择日期' }}</text>
            <text class="picker-arrow">›</text>
          </view>
        </picker>
      </view>
    </view>

    <view class="card">
      <text class="sec-title">车辆证件（选填）</text>
      <view class="upload-row">
        <view class="upload-item" @click="pickImage('licenseImage')">
          <image v-if="form.licenseImage" :src="form.licenseImage" class="upload-img" mode="aspectFill" />
          <view v-else class="upload-empty"><text class="upload-plus">＋</text></view>
          <text class="upload-label">行驶证</text>
        </view>
        <view class="upload-item" @click="pickImage('insuranceImage')">
          <image v-if="form.insuranceImage" :src="form.insuranceImage" class="upload-img" mode="aspectFill" />
          <view v-else class="upload-empty"><text class="upload-plus">＋</text></view>
          <text class="upload-label">保险单</text>
        </view>
      </view>
      <text class="upload-note">演示环境：图片仅本机预览，不会上传服务器。</text>
    </view>

    <!-- 省份选择弹层 -->
    <view v-if="showProvince" class="province-mask" @click="showProvince = false">
      <view class="province-sheet" @click.stop>
        <view class="ps-head">
          <text class="ps-title">选择车牌省份</text>
          <text class="ps-close" @click="showProvince = false">×</text>
        </view>
        <view class="province-grid">
          <view
            v-for="p in provinces"
            :key="p"
            class="province-chip"
            :class="{ on: plateProvince === p }"
            @click="pickProvince(p)"
          >
            <text>{{ p }}</text>
          </view>
        </view>
      </view>
    </view>

    <view class="card">
      <text class="sec-title">选择图标</text>
      <view class="emoji-row">
        <view
          v-for="e in emojis"
          :key="e"
          class="emoji-item"
          :class="{ active: form.emoji === e }"
          @click="form.emoji = e"
        >
          <text class="emoji-text">{{ e }}</text>
        </view>
      </view>
    </view>

    <view class="tips">
      <text>💡 绑定车辆后，平台将自动为您计算保险、年审到期时间并提前提醒。</text>
    </view>

    <view class="fixed-bar">
      <view class="save-btn" @click="save"><text>{{ editId ? '保存修改' : '保存车辆' }}</text></view>
    </view>
  </view>
</template>

<script setup>
import { reactive, ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import PageHeader from '@/components/PageHeader.vue'
import { state, addCar, updateCar, toast } from '@/store/index'

const emojis = ['🚗', '⚡', '🚙', '🏎️', '🚐', '🛻']

// 省级行政区简称（民用号牌）
const provinces = [
  '京', '津', '冀', '晋', '蒙', '辽', '吉', '黑',
  '沪', '苏', '浙', '皖', '闽', '赣', '鲁', '豫',
  '鄂', '湘', '粤', '桂', '琼', '渝', '川', '贵',
  '云', '藏', '陕', '甘', '青', '宁', '新'
]

const editId = ref('')
const plateProvince = ref('')
const plateRest = ref('')
const showProvince = ref(false)

const platePreview = computed(() => {
  if (!plateProvince.value || !plateRest.value) return ''
  const p = plateProvince.value
  const r = plateRest.value
  return r.length > 1 ? `${p}${r[0]}·${r.slice(1)}` : `${p}${r}`
})

function pickProvince(p) {
  plateProvince.value = p
  showProvince.value = false
}

// 输入时自动大写、去掉分隔符；粘贴完整车牌时自动识别省份
function onPlateInput(e) {
  const raw = String((e && e.detail && e.detail.value) || '')
  let v = raw.toUpperCase().replace(/[\s·•.\-]/g, '')
  if (v && provinces.includes(v[0])) {
    plateProvince.value = v[0]
    v = v.slice(1)
  }
  v = v.replace(/[^A-Z0-9]/g, '').slice(0, 7)
  plateRest.value = v
}

function parsePlate(plate) {
  const raw = String(plate || '').toUpperCase().replace(/[\s·•.\-]/g, '')
  if (raw && provinces.includes(raw[0])) {
    plateProvince.value = raw[0]
    plateRest.value = raw.slice(1)
  } else {
    plateProvince.value = ''
    plateRest.value = raw.replace(/[^A-Z0-9]/g, '').slice(0, 7)
  }
}

function buildPlate() {
  if (!plateProvince.value || !plateRest.value) return ''
  const p = plateProvince.value
  const r = plateRest.value
  return r.length > 1 ? `${p}${r[0]}·${r.slice(1)}` : `${p}${r}`
}

function plateError() {
  if (!plateProvince.value) return '请选择车牌省份'
  if (!/^[A-Z][A-Z0-9]{4,6}$/.test(plateRest.value)) {
    return '请填写正确的车牌号（如 A88888）'
  }
  return ''
}

const form = reactive({
  brand: '',
  mileage: '',
  color: '',
  insuranceEnd: '',
  annualEnd: '',
  emoji: '🚗',
  licenseImage: '',
  insuranceImage: ''
})

onLoad(options => {
  if (!options || !options.id) return
  const car = state.cars.find(c => c.id === options.id)
  if (!car) return
  editId.value = car.id
  parsePlate(car.plate)
  Object.assign(form, {
    brand: car.brand,
    mileage: car.mileage,
    color: car.color === '未填写' ? '' : car.color,
    insuranceEnd: car.insuranceEnd === '未填写' ? '' : car.insuranceEnd,
    annualEnd: car.annualEnd === '未填写' ? '' : car.annualEnd,
    emoji: car.emoji || '🚗',
    licenseImage: car.licenseImage || '',
    insuranceImage: car.insuranceImage || ''
  })
})

function pickImage(field) {
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: res => {
      form[field] = res.tempFilePaths[0] || ''
    }
  })
}

function save() {
  const plateErr = plateError()
  if (plateErr) {
    toast(plateErr)
    return
  }
  if (!form.brand.trim()) {
    toast('请填写品牌车型')
    return
  }
  const plate = buildPlate()
  if (editId.value) {
    updateCar(editId.value, {
      plate,
      brand: form.brand.trim(),
      mileage: Number(form.mileage) || 0,
      color: form.color.trim() || '未填写',
      insuranceEnd: form.insuranceEnd || '未填写',
      annualEnd: form.annualEnd || '未填写',
      emoji: form.emoji,
      licenseImage: form.licenseImage,
      insuranceImage: form.insuranceImage
    })
    toast('车辆已更新')
  } else {
    addCar({ ...form, plate })
    toast('车辆已添加')
  }
  setTimeout(() => {
    const pages = getCurrentPages()
    if (pages.length > 1) uni.navigateBack()
    else uni.redirectTo({ url: '/pages/car/list' })
  }, 600)
}
</script>

<style scoped>
.form-card { padding: 4rpx 28rpx; }
.form-row {
  display: flex;
  align-items: center;
  padding: 28rpx 0;
  border-bottom: 1rpx solid #F2F4F7;
  min-height: 100rpx;
}
.form-row.no-border { border-bottom: none; }
.form-label { width: 160rpx; font-size: 26rpx; color: #5A6373; flex-shrink: 0; }
.req { color: #E02B20; margin-left: 4rpx; }
.form-input { flex: 1; font-size: 26rpx; color: #1A1D23; }
.ph { color: #B4BBC7; font-size: 25rpx; }

/* 车牌号：省份选择 + 号段输入 */
.plate-input-wrap { flex: 1; display: flex; align-items: center; gap: 14rpx; }
.province-picker {
  min-width: 112rpx;
  height: 76rpx;
  padding: 0 18rpx;
  border-radius: 14rpx;
  background: #F4F6F9;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  flex-shrink: 0;
}
.province-picker text { font-size: 28rpx; font-weight: 600; color: #1A1D23; }
.province-picker.empty text { font-size: 24rpx; font-weight: 400; color: #B4BBC7; }
.province-arrow { font-size: 20rpx; color: #8A93A3; }

/* 省份选择弹层 */
.province-mask {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgba(10, 14, 20, 0.55);
  display: flex;
  align-items: flex-end;
}
.province-sheet {
  width: 100%;
  background: #FFFFFF;
  border-radius: 32rpx 32rpx 0 0;
  padding: 28rpx 28rpx calc(36rpx + env(safe-area-inset-bottom));
}
.ps-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20rpx; }
.ps-title { font-size: 30rpx; font-weight: 700; color: #1A1D23; }
.ps-close { font-size: 44rpx; color: #B4BBC7; line-height: 1; }
.province-grid { display: flex; flex-wrap: wrap; }
.province-chip {
  width: 16.666%;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.province-chip text {
  width: 72rpx;
  height: 72rpx;
  line-height: 72rpx;
  text-align: center;
  border-radius: 16rpx;
  background: #F4F6F9;
  font-size: 26rpx;
  color: #1A1D23;
}
.province-chip.on text { background: #FF5A1F; color: #FFFFFF; font-weight: 700; }
.plate-input {
  flex: 1;
  height: 76rpx;
  padding: 0 20rpx;
  border-radius: 14rpx;
  background: #F4F6F9;
  font-size: 28rpx;
  font-weight: 600;
  letter-spacing: 2rpx;
  color: #1A1D23;
  text-transform: uppercase;
}
.plate-preview { display: flex; align-items: center; gap: 16rpx; padding: 0 0 24rpx 160rpx; }
.pp-value {
  padding: 6rpx 18rpx;
  border-radius: 10rpx;
  background: #F2F7FF;
  border: 1rpx solid #D6E6FF;
  font-size: 30rpx;
  font-weight: 700;
  letter-spacing: 3rpx;
  color: #1A1D23;
}
.pp-tip { font-size: 19rpx; color: #A2AAB8; }
.picker-value { display: flex; align-items: center; justify-content: flex-end; gap: 8rpx; }
.picker-value text { font-size: 26rpx; color: #1A1D23; }
.picker-value text.ph { color: #B4BBC7; }
.picker-arrow { font-size: 32rpx; color: #D2D7E0; }

.sec-title { display: block; font-size: 27rpx; font-weight: 600; color: #1A1D23; margin-bottom: 20rpx; }
.emoji-row { display: flex; gap: 18rpx; }
.emoji-item {
  width: 88rpx;
  height: 88rpx;
  border-radius: 24rpx;
  background: #F4F6F9;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2rpx solid transparent;
}
.emoji-item.active { background: #FFF1EB; border-color: #FFB08A; }
.emoji-text { font-size: 40rpx; }

.upload-row { display: flex; gap: 24rpx; }
.upload-item { display: flex; flex-direction: column; align-items: center; gap: 8rpx; }
.upload-img { width: 200rpx; height: 140rpx; border-radius: 14rpx; }
.upload-empty {
  width: 200rpx;
  height: 140rpx;
  border-radius: 14rpx;
  border: 2rpx dashed #D8DEE8;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
}
.upload-plus { font-size: 34rpx; color: #A8B0BD; line-height: 1; }
.upload-tip { font-size: 19rpx; color: #B4BBC7; }
.upload-label { font-size: 19rpx; color: #8A93A3; }
.upload-note { display: block; margin-top: 16rpx; font-size: 18rpx; color: #B4BBC7; }

.tips { padding: 0 40rpx; }
.tips text { font-size: 20rpx; color: #A8B0BD; line-height: 1.6; }

.save-btn {
  flex: 1;
  height: 90rpx;
  border-radius: 45rpx;
  background: linear-gradient(135deg, #FF7A3D, #FF4E12);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 10rpx 26rpx rgba(255, 78, 18, 0.28);
}
.save-btn text { font-size: 30rpx; color: #FFFFFF; font-weight: 700; }
</style>
