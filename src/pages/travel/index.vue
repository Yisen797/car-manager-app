<template>
  <view class="page">
    <PageHeader title="出行服务" />

    <!-- HERO -->
    <view class="hero">
      <view class="hero-glow"></view>
      <text class="hero-kicker">TRAVEL SERVICE</text>
      <text class="hero-title">叫车 · 代驾 · 租车</text>
      <text class="hero-sub">一个入口接入多家运力，实时比价，正规承运</text>
      <view class="hero-tags">
        <text class="hero-tag">聚合叫车</text>
        <text class="hero-tag">实时比价</text>
        <text class="hero-tag">全程可追溯</text>
      </view>
    </view>

    <!-- 聚合叫车（高德 + 腾讯统一入口） -->
    <view class="card">
      <view class="sec-title">
        <view class="sec-bar"></view>
        <text>聚合叫车</text>
      </view>

      <view class="taxi-card" @click="showProviders = true">
        <view class="taxi-logo"><text>🚕</text></view>
        <view class="taxi-main">
          <view class="taxi-title-row">
            <text class="taxi-name">打车出行</text>
            <text class="taxi-badge">高德 · 腾讯</text>
          </view>
          <text class="taxi-desc">一个入口接入高德打车与腾讯出行，按端自动匹配可用运力</text>
          <text class="taxi-carrier">承运：高德打车 / 腾讯出行</text>
        </view>
        <view class="taxi-go"><text>叫车</text></view>
      </view>

      <view class="taxi-tags">
        <text class="taxi-tag">实时比价</text>
        <text class="taxi-tag">正规承运</text>
        <text class="taxi-tag">电子发票</text>
      </view>
    </view>

    <!-- 平台内出行服务 -->
    <view class="card">
      <view class="sec-title">
        <view class="sec-bar"></view>
        <text>平台内出行服务</text>
      </view>
      <view class="mini-grid">
        <view
          v-for="s in inApp"
          :key="s.id"
          class="mini"
          @click="go('/pages/service/detail?id=' + s.id)"
        >
          <ServiceIcon :icon="s.icon" :gradient="s.gradient" :size="84" :radius="26" />
          <text class="mini-name">{{ s.name }}</text>
          <text class="mini-desc">{{ s.short.split(' · ')[0] }}</text>
        </view>
      </view>
    </view>

    <!-- 合规说明 -->
    <view class="notice">
      <text class="notice-title">承运与合规说明</text>
      <text class="notice-text">车管家仅提供出行服务的信息聚合与入口跳转，不参与实际承运。实际承运由高德打车、腾讯出行及其平台注册司机提供，订单价格、发票与售后服务均以承运平台为准。</text>
    </view>

    <view class="tip-row">
      <text class="tip-ico">🛡️</text>
      <text class="tip-text">行程中请核对车牌与司机信息，紧急情况可一键报警。</text>
    </view>

    <!-- 叫车平台选择 -->
    <view v-if="showProviders" class="mask" @click="showProviders = false">
      <view class="sheet" @click.stop>
        <view class="sheet-head">
          <text class="sheet-title">选择叫车平台</text>
          <text class="sheet-close" @click="showProviders = false">×</text>
        </view>

        <view
          v-for="(p, i) in providers"
          :key="p.key"
          class="provider"
          :class="{ last: i === providers.length - 1 }"
          @click="choose(p)"
        >
          <view class="p-logo" :class="p.cls"><text>{{ p.icon }}</text></view>
          <view class="p-main">
            <view class="p-title-row">
              <text class="p-name">{{ p.name }}</text>
              <text class="p-badge" :class="p.badgeCls">{{ p.badge }}</text>
            </view>
            <text class="p-desc">{{ p.desc }}</text>
            <text class="p-carrier">{{ p.carrier }}</text>
          </view>
          <view class="p-go" :class="{ 'p-go-gray': !p.ready }">
            <text>{{ p.ready ? '叫车' : '敬请期待' }}</text>
          </view>
        </view>

        <view class="sheet-note">两个平台均由第三方承运，价格、发票与售后以承运平台为准。</view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import ServiceIcon from '@/components/ServiceIcon.vue'
import { SERVICES } from '@/data/mock'
import { go } from '@/store/index'
import { openAmapTaxi, openTencentTaxi, tencentReady } from '@/utils/travel'

const isWeixinMP = ref(false)
const showProviders = ref(false)
// #ifdef MP-WEIXIN
isWeixinMP.value = true
// #endif

function choose(p) {
  showProviders.value = false
  setTimeout(() => p.action(), 150)
}

const inApp = computed(() =>
  ['driver', 'rent', 'errand'].map(id => SERVICES.find(s => s.id === id)).filter(Boolean)
)

const providers = computed(() => {
  const tReady = tencentReady()

  const amap = {
    key: 'amap',
    name: '高德打车',
    icon: '🚕',
    cls: 'p-amap',
    badge: isWeixinMP.value ? '备选' : '主推',
    badgeCls: '',
    desc: isWeixinMP.value
      ? '复制渠道链接，在浏览器中打开叫车'
      : '聚合多平台运力，快车 / 专车 / 出租车实时比价',
    carrier: '承运：高德打车及其合作运力',
    ready: true,
    action: openAmapTaxi
  }

  const tencent = {
    key: 'tencent',
    name: '腾讯出行',
    icon: '🚙',
    cls: 'p-tencent',
    badge: isWeixinMP.value ? (tReady ? '主推' : '待接入') : tReady ? '小程序' : '待接入',
    badgeCls: tReady ? 'p-badge-blue' : 'p-badge-gray',
    desc: tReady ? '微信内一键叫车，行程可分享' : '微信生态一键叫车，渠道接入中',
    carrier: '承运：腾讯出行服务',
    ready: tReady,
    action: openTencentTaxi
  }

  return isWeixinMP.value ? [tencent, amap] : [amap, tencent]
})
</script>

<style scoped>
.hero {
  position: relative;
  margin: 8rpx 24rpx 24rpx;
  padding: 34rpx 32rpx 36rpx;
  border-radius: 28rpx;
  background: linear-gradient(120deg, #10233F 0%, #123E63 55%, #1B6FA8 100%);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.hero-glow {
  position: absolute;
  right: -120rpx;
  top: -140rpx;
  width: 380rpx;
  height: 380rpx;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(53, 195, 255, 0.45), transparent 65%);
}
.hero-kicker {
  position: relative;
  font-size: 18rpx;
  letter-spacing: 4rpx;
  color: rgba(140, 210, 255, 0.85);
  font-weight: 600;
}
.hero-title {
  position: relative;
  margin-top: 12rpx;
  font-size: 44rpx;
  font-weight: 700;
  color: #FFFFFF;
  letter-spacing: 2rpx;
}
.hero-sub {
  position: relative;
  margin-top: 12rpx;
  font-size: 23rpx;
  color: rgba(255, 255, 255, 0.72);
  line-height: 1.5;
}
.hero-tags {
  position: relative;
  display: flex;
  gap: 12rpx;
  margin-top: 24rpx;
}
.hero-tag {
  font-size: 20rpx;
  color: rgba(255, 255, 255, 0.9);
  background: rgba(255, 255, 255, 0.14);
  border: 1rpx solid rgba(255, 255, 255, 0.18);
  padding: 6rpx 16rpx;
  border-radius: 22rpx;
}

.sec-title {
  display: flex;
  align-items: center;
  gap: 12rpx;
  font-size: 30rpx;
  font-weight: 700;
  color: #1A1D23;
  margin-bottom: 8rpx;
}
.sec-bar {
  width: 8rpx;
  height: 28rpx;
  border-radius: 4rpx;
  background: linear-gradient(180deg, #35C3FF, #1668FF);
}

.taxi-card {
  display: flex;
  align-items: center;
  padding: 24rpx;
  border-radius: 20rpx;
  background: linear-gradient(120deg, #F4FAFF, #EAF3FF);
  border: 1rpx solid #D6E7FF;
}
.taxi-logo {
  width: 88rpx;
  height: 88rpx;
  border-radius: 24rpx;
  background: linear-gradient(135deg, #35C3FF, #1668FF);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.taxi-logo text { font-size: 42rpx; }
.taxi-main { flex: 1; min-width: 0; margin-left: 18rpx; display: flex; flex-direction: column; gap: 6rpx; }
.taxi-title-row { display: flex; align-items: center; gap: 12rpx; }
.taxi-name { font-size: 29rpx; font-weight: 700; color: #1A1D23; }
.taxi-badge { font-size: 17rpx; color: #1668FF; background: rgba(53, 195, 255, 0.14); padding: 3rpx 10rpx; border-radius: 8rpx; }
.taxi-desc { font-size: 20rpx; color: #6B7484; line-height: 1.5; }
.taxi-carrier { font-size: 18rpx; color: #A8B0BD; }
.taxi-go {
  flex-shrink: 0;
  margin-left: 14rpx;
  height: 60rpx;
  padding: 0 26rpx;
  border-radius: 30rpx;
  background: linear-gradient(135deg, #35C3FF, #1668FF);
  display: flex;
  align-items: center;
}
.taxi-go text { font-size: 24rpx; color: #FFFFFF; font-weight: 700; }
.taxi-tags { display: flex; gap: 12rpx; margin-top: 16rpx; }
.taxi-tag { font-size: 19rpx; color: #5A6373; background: #F5F7FA; padding: 6rpx 14rpx; border-radius: 8rpx; }

.mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 200;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.sheet {
  width: 100%;
  max-width: 480px;
  background: #FFFFFF;
  border-radius: 28rpx 28rpx 0 0;
  padding: 28rpx 24rpx calc(28rpx + env(safe-area-inset-bottom));
}
.sheet-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8rpx; }
.sheet-title { font-size: 30rpx; font-weight: 700; color: #1A1D23; }
.sheet-close { font-size: 40rpx; color: #A8B0BD; padding: 0 10rpx; }
.sheet-note { margin-top: 12rpx; font-size: 19rpx; color: #B4BBC7; line-height: 1.5; }

.provider {
  display: flex;
  align-items: center;
  padding: 24rpx 0;
  border-bottom: 1rpx solid #F2F4F7;
}
.provider.last { border-bottom: none; }
.p-logo {
  width: 88rpx;
  height: 88rpx;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.p-amap { background: linear-gradient(135deg, #35C3FF, #1668FF); }
.p-tencent { background: linear-gradient(135deg, #3ED7A0, #0A9C6B); }
.p-logo text { font-size: 42rpx; }
.p-main { flex: 1; min-width: 0; margin-left: 20rpx; display: flex; flex-direction: column; gap: 6rpx; }
.p-title-row { display: flex; align-items: center; gap: 12rpx; }
.p-name { font-size: 30rpx; font-weight: 700; color: #1A1D23; }
.p-badge {
  font-size: 18rpx;
  color: #FFFFFF;
  background: linear-gradient(135deg, #FF7A3D, #FF4E12);
  padding: 3rpx 12rpx;
  border-radius: 8rpx;
  font-weight: 600;
}
.p-badge-blue { background: linear-gradient(135deg, #3ED7A0, #0A9C6B); }
.p-badge-gray { background: #E9ECF1; color: #9AA3B0; }
.p-desc { font-size: 22rpx; color: #6B7484; line-height: 1.5; }
.p-carrier { font-size: 19rpx; color: #A8B0BD; }
.p-go {
  flex-shrink: 0;
  margin-left: 16rpx;
  height: 60rpx;
  padding: 0 26rpx;
  border-radius: 30rpx;
  background: linear-gradient(135deg, #35C3FF, #1668FF);
  display: flex;
  align-items: center;
  justify-content: center;
}
.p-go text { font-size: 24rpx; color: #FFFFFF; font-weight: 700; }
.p-go-gray {
  background: #F2F4F7;
}
.p-go-gray text { color: #A8B0BD; }

.mini-grid { display: flex; gap: 16rpx; margin-top: 8rpx; }
.mini {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20rpx 8rpx;
  border-radius: 20rpx;
  background: #F8F9FB;
}
.mini-name { margin-top: 12rpx; font-size: 25rpx; font-weight: 600; color: #1A1D23; }
.mini-desc { margin-top: 4rpx; font-size: 19rpx; color: #9AA3B0; }

.notice {
  margin: 0 24rpx 20rpx;
  padding: 24rpx;
  border-radius: 20rpx;
  background: #FFFBF2;
  border: 1rpx solid #F5E6C8;
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}
.notice-title { font-size: 23rpx; font-weight: 700; color: #A97C2F; }
.notice-text { font-size: 21rpx; color: #8A7A5E; line-height: 1.7; }

.tip-row {
  margin: 0 24rpx 24rpx;
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.tip-ico { font-size: 24rpx; }
.tip-text { font-size: 20rpx; color: #9AA3B0; }
</style>
