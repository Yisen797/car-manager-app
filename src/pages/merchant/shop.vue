<template>
  <view class="page page-with-tabbar">
    <PageHeader title="店铺管理" />

    <template v-if="app">
      <view class="shop-card">
        <view class="shop-glow"></view>
        <view class="shop-top">
          <view class="shop-logo"><text>🏪</text></view>
          <view class="shop-main">
            <text class="shop-name">{{ app.name }}</text>
            <text class="shop-meta">{{ app.type }} · {{ tierName }}</text>
          </view>
          <view class="shop-switch" :class="{ on: app.open }" @click="toggleOpen">
            <text>{{ app.open ? '营业中' : '休息中' }}</text>
          </view>
        </view>
        <view class="shop-id"><text>商家编号 {{ app.merchantId }}</text></view>
      </view>

      <view class="card">
        <view class="sec-title"><view class="sec-bar"></view><text>店铺资料</text></view>

        <view class="field readonly">
          <text class="field-label">商家名称</text>
          <text class="field-value">{{ app.name }}</text>
        </view>
        <view class="field readonly">
          <text class="field-label">商家类型</text>
          <text class="field-value">{{ app.type }}</text>
        </view>
        <view class="field readonly">
          <text class="field-label">入驻档位</text>
          <text class="field-value">{{ tierName }}</text>
        </view>
        <view class="field">
          <text class="field-label">联系电话</text>
          <input v-model="form.phone" class="field-input" type="number" maxlength="11" placeholder="门店联系电话" />
        </view>
        <view class="field">
          <text class="field-label">营业时间</text>
          <input v-model="form.hours" class="field-input" placeholder="如 09:00 - 21:00" />
        </view>
        <view class="field">
          <text class="field-label">门店地址</text>
          <input v-model="form.address" class="field-input" placeholder="请输入详细地址" />
        </view>
        <view class="field">
          <text class="field-label">门店定位</text>
          <view class="loc-side">
            <text class="loc-state" :class="{ ok: hasLoc }">{{ hasLoc ? '已标记' : '未标记' }}</text>
            <view class="loc-mini" @click="autoLocate">
              <text>{{ locating ? '定位中…' : '自动定位' }}</text>
            </view>
          </view>
        </view>
        <text v-if="geoHint" class="geo-hint">{{ geoHint }}</text>
        <view class="field no-border">
          <text class="field-label">店铺简介</text>
          <input v-model="form.intro" class="field-input" placeholder="主营业务、服务特色" />
        </view>
      </view>

      <view class="card">
        <view class="sec-title"><view class="sec-bar"></view><text>服务能力</text></view>
        <view class="tags">
          <text v-for="t in tags" :key="t" class="tag">{{ t }}</text>
        </view>
        <text class="tags-note">服务能力由入驻时选择的商家类型决定，如需调整请联系平台运营。</text>
      </view>

      <view class="tips">
        <text>📌 演示环境：店铺资料仅保存在本机，不会同步到平台。</text>
      </view>

      <view class="actions">
        <view class="btn btn-gold" @click="save"><text>保存店铺资料</text></view>
      </view>
    </template>

    <view v-else class="empty">
      <text class="empty-icon">🔒</text>
      <text class="empty-text">当前账号没有商家权限</text>
      <view class="empty-btn" @click="goApply"><text>去申请入驻</text></view>
    </view>

    <MerchantTabBar :current="2" />
  </view>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import MerchantTabBar from '@/components/MerchantTabBar.vue'
import { MERCHANT_TIERS } from '@/data/mock'
import { approvedMerchantApp, updateMerchantShop, toast } from '@/store/index'
import { requestLocation } from '@/utils/location'
import { reverseGeocode } from '@/api/integrations'

const app = approvedMerchantApp()

const tierName = computed(() => {
  const t = MERCHANT_TIERS.find(x => x.id === (app && app.tier))
  return t ? t.name : '免费入驻'
})

const tags = computed(() => (app ? [app.type || '汽车服务', '平台认证', '到店/上门'] : []))

const form = reactive({
  phone: app ? app.phone : '',
  hours: app ? app.hours || '09:00 - 21:00' : '',
  address: app ? app.address : '',
  lng: app && app.lng != null ? app.lng : null,
  lat: app && app.lat != null ? app.lat : null,
  intro: app ? app.intro || '' : ''
})

const locating = ref(false)
const geoHint = ref(app && app.lng != null ? '门店已在地图上标记' : '')
const hasLoc = computed(
  () => form.lng != null && form.lat != null && Number.isFinite(Number(form.lng)) && Number.isFinite(Number(form.lat))
)

async function autoLocate() {
  if (locating.value) return
  locating.value = true
  const r = await requestLocation()
  if (r.lng != null && r.lat != null) {
    form.lng = Number(r.lng)
    form.lat = Number(r.lat)
    geoHint.value = '已获取坐标，正在解析地址…'
    const rev = await reverseGeocode({ lng: r.lng, lat: r.lat })
    if (rev.ok && !form.address.trim()) form.address = rev.address
    geoHint.value = rev.ok ? '已定位：' + rev.address : '已获取坐标，请核对门店地址'
    toast('已更新门店位置')
  } else {
    geoHint.value = '定位失败，请检查定位权限'
    toast('定位失败')
  }
  locating.value = false
}

function toggleOpen() {
  updateMerchantShop({ open: !app.open })
  toast(app.open ? '已开始营业' : '已切换为休息中')
}

function save() {
  if (form.phone && !/^1\d{10}$/.test(form.phone)) return toast('请填写正确的联系电话')
  if (!form.address.trim()) return toast('请填写门店地址')
  updateMerchantShop({
    phone: form.phone,
    hours: form.hours.trim(),
    address: form.address.trim(),
    lng: form.lng,
    lat: form.lat,
    intro: form.intro.trim()
  })
  toast('店铺资料已保存')
}

function goApply() {
  uni.reLaunch({ url: '/pages/merchant/join' })
}
</script>

<style scoped>
.shop-card { position: relative; margin: 8rpx 24rpx 24rpx; padding: 30rpx 28rpx; border-radius: 26rpx; background: linear-gradient(130deg, #2E2A22, #17140F); overflow: hidden; }
.shop-glow { position: absolute; right: -80rpx; top: -100rpx; width: 320rpx; height: 320rpx; border-radius: 50%; background: radial-gradient(circle, rgba(201, 155, 74, 0.35), transparent 70%); }
.shop-top { position: relative; display: flex; align-items: center; gap: 18rpx; }
.shop-logo { width: 84rpx; height: 84rpx; border-radius: 22rpx; background: rgba(243, 217, 164, 0.14); border: 1rpx solid rgba(243, 217, 164, 0.25); display: flex; align-items: center; justify-content: center; }
.shop-logo text { font-size: 40rpx; }
.shop-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 8rpx; }
.shop-name { font-size: 30rpx; font-weight: 700; color: #FFFFFF; }
.shop-meta { font-size: 21rpx; color: rgba(243, 217, 164, 0.65); }
.shop-switch { height: 54rpx; padding: 0 22rpx; border-radius: 27rpx; background: rgba(255, 255, 255, 0.12); display: flex; align-items: center; flex-shrink: 0; }
.shop-switch text { font-size: 21rpx; color: rgba(255, 255, 255, 0.65); }
.shop-switch.on { background: rgba(18, 160, 106, 0.35); border: 1rpx solid rgba(62, 215, 160, 0.5); }
.shop-switch.on text { color: #7BE8BE; font-weight: 600; }
.shop-id { position: relative; margin-top: 20rpx; display: inline-flex; background: rgba(255, 255, 255, 0.1); border-radius: 10rpx; padding: 6rpx 14rpx; }
.shop-id text { font-size: 18rpx; color: rgba(255, 255, 255, 0.6); }

.card { padding: 8rpx 28rpx; }
.sec-title { display: flex; align-items: center; gap: 12rpx; font-size: 29rpx; font-weight: 700; color: #1A1D23; margin: 20rpx 0 18rpx; }
.sec-bar { width: 8rpx; height: 26rpx; border-radius: 4rpx; background: linear-gradient(180deg, #D8B06A, #A97C2F); }
.field { display: flex; align-items: center; padding: 22rpx 0; border-bottom: 1rpx solid #F2F4F7; min-height: 96rpx; }
.field:last-child { border-bottom: none; }
.field-label { width: 160rpx; font-size: 25rpx; color: #8A93A3; flex-shrink: 0; }
.field-input { flex: 1; font-size: 25rpx; color: #1A1D23; }
.field-value { flex: 1; font-size: 25rpx; color: #3A4250; text-align: right; }
.field.readonly { opacity: 0.85; }
.loc-side { flex: 1; display: flex; align-items: center; justify-content: flex-end; gap: 14rpx; }
.loc-state { font-size: 21rpx; color: #A2AAB8; }
.loc-state.ok { color: #0E9E6B; }
.loc-mini { padding: 10rpx 22rpx; border-radius: 999rpx; background: #F2F5FA; }
.loc-mini text { font-size: 21rpx; color: #2B63F0; font-weight: 600; }
.geo-hint { display: block; padding: 0 0 16rpx; font-size: 20rpx; color: #A8792A; line-height: 1.6; }

.tags { display: flex; flex-wrap: wrap; gap: 12rpx; }
.tag { font-size: 21rpx; color: #A97C2F; background: #FBF3E3; padding: 8rpx 18rpx; border-radius: 10rpx; }
.tags-note { display: block; margin-top: 16rpx; font-size: 19rpx; color: #B4BBC7; }

.tips { padding: 0 36rpx; }
.tips text { font-size: 20rpx; color: #A8B0BD; }

.actions { padding: 24rpx; }
.actions .btn text { font-size: 29rpx; font-weight: 700; }

.empty-btn { margin-top: 26rpx; height: 72rpx; padding: 0 36rpx; border-radius: 36rpx; background: linear-gradient(135deg, #D8B06A, #A97C2F); display: flex; align-items: center; }
.empty-btn text { font-size: 24rpx; color: #FFFFFF; font-weight: 700; }
</style>
