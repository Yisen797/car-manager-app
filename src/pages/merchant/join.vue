<template>
  <view class="page" style="padding-bottom: 200rpx">
    <view class="hero" :style="{ paddingTop: topPad + 'px' }">
      <view class="hero-glow"></view>
      <view class="hero-top">
        <view class="back" @click="back"><text class="back-arrow">‹</text></view>
        <text class="hero-title">商家入驻</text>
        <view class="back" style="opacity: 0"></view>
      </view>
      <text class="hero-big">成为平台合伙人</text>
      <text class="hero-sub">修理厂 · 洗车店 · 轮胎店 · 二手车商 · 租车公司 · 代驾救援团队</text>
      <view class="hero-stats">
        <view class="hs"><text class="hs-num">0 元</text><text class="hs-label">免费入驻</text></view>
        <view class="hs-line"></view>
        <view class="hs"><text class="hs-num">精准</text><text class="hs-label">车主客源</text></view>
        <view class="hs-line"></view>
        <view class="hs"><text class="hs-num">区域</text><text class="hs-label">金牌独家</text></view>
      </view>
    </view>

    <!-- 已有申请 -->
    <view v-if="application" class="app-banner" @click="openApply">
      <text class="app-ico">🏪</text>
      <view class="app-main">
        <text class="app-name ellipsis">{{ application.name }}</text>
        <text class="app-status">{{ statusText(application.status) }}</text>
      </view>
      <text class="app-arrow">›</text>
    </view>

    <!-- 档位 -->
    <view class="section-head">
      <text class="card-title">选择入驻档位</text>
      <text class="section-more">按年计费</text>
    </view>

    <view
      v-for="t in tiers"
      :key="t.id"
      class="tier-card"
      :class="{ active: selected === t.id }"
      @click="selected = t.id"
    >
      <view class="tier-head">
        <view class="tier-badge" :style="{ background: t.gradient }">
          <text class="tier-badge-text">{{ t.tag.slice(0, 2) }}</text>
        </view>
        <view class="tier-main">
          <view class="row gap12">
            <text class="tier-name">{{ t.name }}</text>
            <text v-if="t.recommended" class="tier-flag">核心合伙人</text>
          </view>
          <text class="tier-tag">{{ t.tag }}</text>
        </view>
        <view class="tier-price">
          <text class="tp-yen">¥</text>
          <text class="tp-num">{{ t.price }}</text>
          <text class="tp-unit">/年</text>
        </view>
        <view class="tier-check" :class="{ on: selected === t.id }">
          <text v-if="selected === t.id">✓</text>
        </view>
      </view>
      <view class="tier-benefits">
        <view v-for="(b, i) in t.benefits" :key="i" class="tb-row">
          <text class="tb-dot">✓</text>
          <text class="tb-text">{{ b }}</text>
        </view>
      </view>
    </view>

    <!-- 流程 -->
    <view class="card">
      <view class="sec-head-inline">
        <text class="card-title">入驻流程</text>
      </view>
      <view class="flow">
        <view v-for="(f, i) in flow" :key="i" class="flow-item">
          <view class="flow-num"><text>{{ i + 1 }}</text></view>
          <text class="flow-text">{{ f }}</text>
          <text v-if="i !== flow.length - 1" class="flow-arrow">→</text>
        </view>
      </view>
    </view>

    <!-- 表单 -->
    <view class="card form-card">
      <view class="form-row">
        <text class="form-label">商家名称<text class="req">*</text></text>
        <input v-model="form.name" class="form-input" placeholder="请输入门店/公司全称" placeholder-class="ph" />
      </view>
      <view class="form-row">
        <text class="form-label">商家类型<text class="req">*</text></text>
        <picker :range="types" @change="e => (form.type = types[e.detail.value])">
          <view class="picker-value">
            <text :class="{ ph: !form.type }">{{ form.type || '请选择类型' }}</text>
            <text class="picker-arrow">›</text>
          </view>
        </picker>
      </view>
      <view class="form-row">
        <text class="form-label">联系人<text class="req">*</text></text>
        <input v-model="form.contact" class="form-input" placeholder="请输入联系人姓名" placeholder-class="ph" />
      </view>
      <view class="form-row">
        <text class="form-label">手机号<text class="req">*</text></text>
        <input v-model="form.phone" class="form-input" type="number" maxlength="11" placeholder="用于平台联系对接" placeholder-class="ph" />
      </view>
      <view class="form-row">
        <text class="form-label">所在城市</text>
        <view class="picker-value">
          <text>{{ state.city }}</text>
        </view>
      </view>
      <view class="form-row">
        <text class="form-label">门店地址<text class="req">*</text></text>
        <input v-model="form.address" class="form-input" placeholder="请输入详细经营地址" placeholder-class="ph" />
      </view>

      <!-- 门店定位：搜索 / 自动定位 / 小程序地图选点 -->
      <view class="loc-block">
        <view class="loc-head">
          <text class="loc-title">门店定位</text>
          <text class="loc-badge" :class="{ ok: hasLocation }">{{ hasLocation ? '已标记' : '未标记' }}</text>
        </view>
        <text class="loc-status">{{ locStatus }}</text>
        <view class="loc-actions">
          <view class="loc-btn" :class="{ loading: locating }" @click="autoLocate">
            <text>{{ locating ? '定位中…' : '自动定位' }}</text>
          </view>
          <view class="loc-btn" @click="openSearch"><text>搜索门店</text></view>
          <!-- #ifdef MP-WEIXIN -->
          <view class="loc-btn" @click="chooseOnMap"><text>地图选点</text></view>
          <!-- #endif -->
        </view>
        <text v-if="geoHint" class="loc-hint">{{ geoHint }}</text>
      </view>

      <view class="form-row">
        <text class="form-label">营业执照</text>
        <view class="upload" @click="pickLicense">
          <image v-if="form.licenseImage" :src="form.licenseImage" class="upload-img" mode="aspectFill" @error="form.licenseImage = ''" />
          <view v-else class="upload-empty">
            <text class="upload-plus">＋</text>
            <text class="upload-tip">上传照片</text>
          </view>
        </view>
      </view>
      <view class="form-row no-border">
        <text class="form-label">商家简介</text>
        <input v-model="form.intro" class="form-input" placeholder="主营业务、服务特色（选填）" placeholder-class="ph" />
      </view>
    </view>

    <view class="tips">
      <text>📌 提交后平台将在 1 个工作日内联系您，完成资质审核与合同签署。</text>
    </view>

    <view class="fixed-bar">
      <view class="bar-left">
        <text class="bar-label">已选档位</text>
        <text class="bar-value">{{ current.name }}</text>
      </view>
      <view class="bar-btn" @click="submit"><text>提交入驻申请</text></view>
    </view>

    <!-- 搜索门店（从高德 POI 选择，自动填地址/电话/坐标） -->
    <view v-if="showSearch" class="mask" @click="showSearch = false">
      <view class="sheet" @click.stop>
        <view class="sheet-head">
          <text class="sheet-title">搜索门店</text>
          <text class="sheet-close" @click="showSearch = false">×</text>
        </view>
        <view class="search-row">
          <input
            v-model="searchKeyword"
            class="search-input"
            placeholder="输入门店名称，例如：途虎养车"
            placeholder-class="ph"
            confirm-type="search"
            @confirm="doSearch"
          />
          <view class="search-btn" @click="doSearch"><text>搜索</text></view>
        </view>
        <text class="sheet-tip">从高德地图选择自己的门店，地址、电话和坐标会自动填入</text>

        <view v-if="searching" class="sheet-empty">搜索中…</view>
        <scroll-view v-else-if="searchResults.length" scroll-y class="result-list">
          <view v-for="p in searchResults" :key="p.id" class="result" @click="pickPlace(p)">
            <view class="result-main">
              <text class="result-name ellipsis">{{ p.name }}</text>
              <text class="result-addr">{{ p.address || '地址暂未提供' }}</text>
            </view>
            <text class="result-pick">选择</text>
          </view>
        </scroll-view>
        <view v-else-if="searchTried" class="sheet-empty">{{ searchTip }}</view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { MERCHANT_TIERS } from '@/data/mock'
import { state, applyMerchant, currentMerchantApplication, go, toast } from '@/store/index'
import { requestLocation } from '@/utils/location'
import { searchPlaces, reverseGeocode, geocodeAddress } from '@/api/integrations'

const topPad = ref(44)
// #ifndef H5
try {
  topPad.value = uni.getSystemInfoSync().statusBarHeight || 20
} catch (e) {
  topPad.value = 20
}
// #endif

const tiers = MERCHANT_TIERS
const selected = ref('gold')
const current = computed(() => tiers.find(t => t.id === selected.value) || tiers[2])

const types = ['汽车维修', '洗车美容', '轮胎服务', '二手车商', '租车公司', '代驾团队', '救援团队', '保险从业者', '跑腿团队']
const flow = ['提交申请', '资质审核', '签约缴费', '开通接单']

const form = reactive({
  name: '', type: '', contact: '', phone: '', address: '',
  lng: null, lat: null, licenseImage: '', intro: ''
})

/* ---------- 门店定位 ---------- */
const locating = ref(false)
const geoHint = ref('')
const showSearch = ref(false)
const searchKeyword = ref('')
const searchResults = ref([])
const searching = ref(false)
const searchTried = ref(false)
const searchTip = ref('')

const hasLocation = computed(
  () => form.lng != null && form.lat != null && Number.isFinite(Number(form.lng)) && Number.isFinite(Number(form.lat))
)
const locStatus = computed(() => {
  if (hasLocation.value) return `坐标 ${Number(form.lng).toFixed(5)}, ${Number(form.lat).toFixed(5)}`
  return '未定位时顾客无法在地图上找到你，建议搜索门店或自动定位'
})

function setLocation(lng, lat) {
  form.lng = Number(lng)
  form.lat = Number(lat)
}

async function autoLocate() {
  if (locating.value) return
  locating.value = true
  geoHint.value = ''
  const r = await requestLocation()
  if (r.lng != null && r.lat != null) {
    setLocation(r.lng, r.lat)
    geoHint.value = '已获取坐标，正在解析地址…'
    const rev = await reverseGeocode({ lng: r.lng, lat: r.lat })
    if (rev.ok) {
      if (!form.address.trim()) form.address = rev.address
      geoHint.value = '已定位：' + rev.address
    } else {
      geoHint.value = '已获取坐标，请补充详细地址（配置高德 Key 后可自动解析）'
    }
    toast('已获取门店位置')
  } else {
    geoHint.value = '定位失败：请检查定位权限，或使用「搜索门店」选择'
    toast('定位失败')
  }
  locating.value = false
}

// #ifdef MP-WEIXIN
function chooseOnMap() {
  uni.chooseLocation({
    success: res => {
      setLocation(res.longitude, res.latitude)
      const addr = (res.address || '') + (res.name ? ' ' + res.name : '')
      if (addr) form.address = addr.trim()
      geoHint.value = '已在地图上选点：' + (res.name || res.address || '')
    },
    fail: () => toast('未选择位置')
  })
}
// #endif

function openSearch() {
  searchKeyword.value = form.name || ''
  searchTried.value = false
  searchResults.value = []
  searchTip.value = ''
  showSearch.value = true
}

async function doSearch() {
  const kw = searchKeyword.value.trim()
  if (!kw) return toast('请输入门店名称')
  if (searching.value) return
  searching.value = true
  searchTried.value = true
  const res = await searchPlaces({ keyword: kw, city: state.city })
  searching.value = false
  searchResults.value = res.items || []
  if (!res.ok) {
    searchTip.value = '未连接后端，暂时无法搜索，请手动填写地址'
  } else if (!searchResults.value.length) {
    searchTip.value = res.source === 'demo'
      ? '后端未配置高德 Key，请手动填写地址'
      : '未找到门店，请换个关键词或手动填写地址'
  }
}

function pickPlace(p) {
  if (!form.name.trim()) form.name = p.name
  if (p.address) form.address = p.address
  if (p.tel && !form.phone) form.phone = String(p.tel).split(';')[0].trim()
  if (p.lng != null && p.lat != null) setLocation(p.lng, p.lat)
  showSearch.value = false
  geoHint.value = '已选择：' + p.name
}

const application = computed(() => currentMerchantApplication())

const STATUS_TEXT = { reviewing: '审核中', approved: '已通过', rejected: '未通过' }
function statusText(s) {
  return STATUS_TEXT[s] || '审核中'
}

onLoad(() => {
  // 驳回复填，方便修改后重新提交
  const a = currentMerchantApplication()
  if (a && a.status === 'rejected') {
    form.name = a.name
    form.type = a.type
    form.contact = a.contact
    form.phone = a.phone
    form.address = a.address
    form.lng = a.lng != null ? a.lng : null
    form.lat = a.lat != null ? a.lat : null
    form.intro = a.intro
    form.licenseImage = a.licenseImage
    selected.value = a.tier || 'gold'
  }
})

function openApply() {
  go('/pages/merchant/apply?id=' + application.value.id)
}

function pickLicense() {
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: res => {
      form.licenseImage = res.tempFilePaths[0] || ''
    }
  })
}

function back() {
  const pages = getCurrentPages()
  if (pages.length > 1) uni.navigateBack()
  else uni.reLaunch({ url: '/pages/index/index' })
}

async function submit() {
  const exist = currentMerchantApplication()
  if (exist && exist.status === 'reviewing') {
    toast('已有申请正在审核中')
    go('/pages/merchant/apply?id=' + exist.id)
    return
  }
  if (!form.name.trim()) return toast('请填写商家名称')
  if (!form.type) return toast('请选择商家类型')
  if (!form.contact.trim()) return toast('请填写联系人')
  if (!/^1\d{10}$/.test(form.phone.trim())) return toast('请填写正确的手机号')
  if (!form.address.trim()) return toast('请填写门店地址')

  // 没有坐标时，用地址自动补点（配置高德 Key 后生效）
  if (!hasLocation.value) {
    uni.showLoading({ title: '解析地址中…', mask: true })
    const g = await geocodeAddress({ address: form.address.trim(), city: state.city })
    uni.hideLoading()
    if (g.ok) {
      setLocation(g.lng, g.lat)
      if (g.address) form.address = g.address
    } else {
      geoHint.value = '未获取到坐标，可先提交，审核后在店铺管理补充定位'
      toast('未获取到门店坐标，仍可提交')
    }
  }

  const app = applyMerchant({ ...form, tier: selected.value, city: state.city })
  uni.redirectTo({ url: '/pages/merchant/apply?id=' + app.id })
}
</script>

<style scoped>
.hero {
  position: relative;
  padding: 0 32rpx 90rpx;
  background: linear-gradient(160deg, #2E2A22 0%, #17140F 55%, #0D0C0A 100%);
  overflow: hidden;
}
.hero-glow {
  position: absolute;
  top: -160rpx;
  right: -100rpx;
  width: 440rpx;
  height: 440rpx;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(201, 155, 74, 0.34), transparent 70%);
}
.hero-top {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 16rpx;
}
.back {
  width: 64rpx;
  height: 64rpx;
  border-radius: 32rpx;
  background: rgba(255, 255, 255, 0.09);
  display: flex;
  align-items: center;
  justify-content: center;
}
.back-arrow { font-size: 50rpx; color: #FFFFFF; margin-top: -6rpx; font-weight: 300; }
.hero-title { font-size: 30rpx; font-weight: 600; color: #FFFFFF; }
.hero-big {
  position: relative;
  display: block;
  margin-top: 32rpx;
  font-size: 46rpx;
  font-weight: 800;
  color: #F3D9A4;
  letter-spacing: 1rpx;
}
.hero-sub {
  position: relative;
  display: block;
  margin-top: 14rpx;
  font-size: 21rpx;
  color: rgba(243, 217, 164, 0.5);
  line-height: 1.6;
}
.hero-stats {
  position: relative;
  display: flex;
  align-items: center;
  margin-top: 32rpx;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 20rpx;
  padding: 18rpx 0;
}
.hs { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6rpx; }
.hs-num { font-size: 27rpx; font-weight: 700; color: #FFFFFF; }
.hs-label { font-size: 18rpx; color: rgba(255, 255, 255, 0.38); }
.hs-line { width: 1rpx; height: 36rpx; background: rgba(255, 255, 255, 0.1); }

.section-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding: 24rpx 28rpx 18rpx;
}
.section-more { font-size: 21rpx; color: #9AA3B0; }

.tier-card {
  position: relative;
  margin: 0 24rpx 20rpx;
  padding: 26rpx 28rpx;
  border-radius: 24rpx;
  background: #FFFFFF;
  border: 2rpx solid #EDF0F4;
  box-shadow: 0 4rpx 20rpx rgba(20, 30, 50, 0.04);
}
.tier-card.active { border-color: #C99B4A; box-shadow: 0 10rpx 30rpx rgba(201, 155, 74, 0.18); }
.tier-head { display: flex; align-items: center; }
.tier-badge {
  width: 72rpx;
  height: 72rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.tier-badge-text { font-size: 20rpx; color: #FFFFFF; font-weight: 700; }
.tier-main { flex: 1; min-width: 0; margin-left: 18rpx; display: flex; flex-direction: column; gap: 8rpx; }
.tier-name { font-size: 28rpx; font-weight: 700; color: #1A1D23; }
.tier-flag {
  font-size: 16rpx;
  color: #A97C2F;
  background: #FBF3E3;
  padding: 2rpx 8rpx;
  border-radius: 6rpx;
}
.tier-tag { font-size: 20rpx; color: #9AA3B0; }
.tier-price { display: flex; align-items: baseline; }
.tp-yen { font-size: 20rpx; color: #1A1D23; font-weight: 700; }
.tp-num { font-size: 40rpx; color: #1A1D23; font-weight: 800; line-height: 1; }
.tp-unit { font-size: 18rpx; color: #9AA3B0; margin-left: 2rpx; }

.tier-benefits { margin-top: 20rpx; display: flex; flex-direction: column; gap: 12rpx; }
.tb-row { display: flex; align-items: flex-start; gap: 12rpx; }
.tb-dot { font-size: 19rpx; color: #C99B4A; font-weight: 700; }
.tb-text { flex: 1; font-size: 21rpx; color: #6B7484; line-height: 1.5; }

.tier-check {
  width: 40rpx;
  height: 40rpx;
  border-radius: 20rpx;
  border: 2rpx solid #E2E6EC;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-left: 16rpx;
}
.tier-check.on { background: #C99B4A; border-color: #C99B4A; }
.tier-check text { font-size: 20rpx; color: #FFFFFF; font-weight: 700; }

.sec-head-inline { margin-bottom: 20rpx; }
.flow { display: flex; align-items: center; }
.flow-item { display: flex; align-items: center; flex: 1; }
.flow-num {
  width: 38rpx;
  height: 38rpx;
  border-radius: 19rpx;
  background: #FFF1EB;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.flow-num text { font-size: 19rpx; color: #FF5A1F; font-weight: 700; }
.flow-text { margin-left: 10rpx; font-size: 21rpx; color: #4A5261; }
.flow-arrow { margin: 0 8rpx; font-size: 20rpx; color: #D6DBE3; }

.form-card { padding: 4rpx 28rpx; }
.form-row {
  display: flex;
  align-items: center;
  padding: 28rpx 0;
  border-bottom: 1rpx solid #F2F4F7;
  min-height: 100rpx;
}
.form-row.no-border { border-bottom: none; }
.form-label { width: 170rpx; font-size: 26rpx; color: #5A6373; flex-shrink: 0; }
.req { color: #E02B20; margin-left: 4rpx; }
.form-input { flex: 1; font-size: 26rpx; color: #1A1D23; }
.ph { color: #B4BBC7; font-size: 25rpx; }
.picker-value { display: flex; align-items: center; justify-content: flex-end; gap: 8rpx; }
.picker-value text { font-size: 26rpx; color: #1A1D23; }
.picker-value text.ph { color: #B4BBC7; }
.picker-arrow { font-size: 32rpx; color: #D2D7E0; }

/* 门店定位 */
.loc-block {
  padding: 26rpx 0 10rpx;
  border-bottom: 1rpx solid #F2F4F7;
}
.loc-head { display: flex; align-items: center; gap: 14rpx; }
.loc-title { font-size: 26rpx; color: #5A6373; }
.loc-badge {
  padding: 3rpx 12rpx;
  border-radius: 8rpx;
  background: #F2F4F7;
  color: #8A93A3;
  font-size: 19rpx;
}
.loc-badge.ok { background: #E8F7F1; color: #0E9E6B; }
.loc-status { display: block; margin-top: 10rpx; font-size: 21rpx; color: #8A93A3; line-height: 1.6; }
.loc-actions { display: flex; flex-wrap: wrap; gap: 14rpx; margin-top: 16rpx; }
.loc-btn { padding: 14rpx 26rpx; border-radius: 999rpx; background: #F2F5FA; }
.loc-btn text { font-size: 22rpx; color: #2B63F0; font-weight: 600; }
.loc-btn.loading { opacity: 0.6; }
.loc-hint { display: block; margin-top: 12rpx; font-size: 20rpx; color: #A8792A; line-height: 1.6; }

/* 搜索门店弹层 */
.mask {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgba(10, 14, 20, 0.55);
  display: flex;
  align-items: flex-end;
}
.sheet {
  width: 100%;
  max-height: 78vh;
  background: #FFFFFF;
  border-radius: 32rpx 32rpx 0 0;
  padding: 28rpx 32rpx calc(32rpx + env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
}
.sheet-head { display: flex; align-items: center; justify-content: space-between; }
.sheet-title { font-size: 30rpx; font-weight: 700; color: #1A1D23; }
.sheet-close { font-size: 44rpx; color: #B4BBC7; line-height: 1; }
.search-row { display: flex; gap: 14rpx; margin-top: 22rpx; }
.search-input {
  flex: 1;
  height: 76rpx;
  padding: 0 22rpx;
  border-radius: 14rpx;
  background: #F5F7FA;
  font-size: 25rpx;
  color: #1A1D23;
}
.search-btn {
  width: 120rpx;
  height: 76rpx;
  border-radius: 14rpx;
  background: #1A1D23;
  display: flex;
  align-items: center;
  justify-content: center;
}
.search-btn text { color: #FFFFFF; font-size: 24rpx; font-weight: 600; }
.sheet-tip { display: block; margin-top: 12rpx; font-size: 20rpx; color: #A2AAB8; }
.result-list { flex: 1; max-height: 52vh; margin-top: 14rpx; }
.result {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 22rpx 0;
  border-bottom: 1rpx solid #F2F4F7;
}
.result-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 8rpx; }
.result-name { font-size: 26rpx; font-weight: 600; color: #1A1D23; }
.result-addr { font-size: 21rpx; color: #8A93A3; line-height: 1.5; }
.result-pick { font-size: 21rpx; color: #2B63F0; font-weight: 600; }
.sheet-empty {
  padding: 50rpx 0;
  text-align: center;
  color: #A2AAB8;
  font-size: 22rpx;
  line-height: 1.7;
}

.tips { padding: 0 36rpx; }
.tips text { font-size: 20rpx; color: #A8B0BD; line-height: 1.6; }

.bar-left { flex: 1; display: flex; flex-direction: column; gap: 4rpx; }
.bar-label { font-size: 20rpx; color: #9AA3B0; }
.bar-value { font-size: 28rpx; font-weight: 700; color: #1A1D23; }
.bar-btn {
  width: 340rpx;
  height: 90rpx;
  border-radius: 45rpx;
  background: linear-gradient(135deg, #D8B06A, #A97C2F);
  display: flex;
  align-items: center;
  justify-content: center;
}
.bar-btn text { font-size: 29rpx; color: #2A1F0C; font-weight: 700; }

.app-banner {
  margin: 0 24rpx 24rpx;
  padding: 22rpx 24rpx;
  border-radius: 20rpx;
  background: #FFFFFF;
  border: 1rpx solid #E9D9B8;
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.app-ico { font-size: 34rpx; }
.app-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6rpx; }
.app-name { font-size: 25rpx; font-weight: 600; color: #1A1D23; }
.app-status { font-size: 20rpx; color: #A97C2F; }
.app-arrow { font-size: 30rpx; color: #C3CAD6; }

.upload { flex: 1; display: flex; justify-content: flex-end; }
.upload-img { width: 140rpx; height: 100rpx; border-radius: 12rpx; }
.upload-empty {
  width: 140rpx;
  height: 100rpx;
  border-radius: 12rpx;
  border: 2rpx dashed #D8DEE8;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4rpx;
}
.upload-plus { font-size: 30rpx; color: #A8B0BD; line-height: 1; }
.upload-tip { font-size: 18rpx; color: #B4BBC7; }
</style>
