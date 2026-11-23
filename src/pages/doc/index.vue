<template>
  <view class="page">
    <PageHeader :title="doc.title" />

    <view class="card doc-card">
      <text class="doc-update">更新日期：2026-11-02 · 演示版本</text>
      <view v-for="(s, i) in doc.sections" :key="i" class="section">
        <text class="section-title">{{ s.title }}</text>
        <text class="section-text">{{ s.text }}</text>
      </view>
    </view>

    <view class="footer">
      <text>车管家 · 全品类汽车综合服务平台</text>
      <text class="footer-sub">v{{ APP_VERSION }} · 客服热线 400-000-1234</text>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import PageHeader from '@/components/PageHeader.vue'
import { APP_VERSION } from '@/config/version'

const type = ref('agreement')

const DOCS = {
  agreement: {
    title: '用户服务协议',
    sections: [
      {
        title: '一、服务内容',
        text: '车管家提供汽车服务信息展示、预约撮合、订单管理与会员权益服务。平台本身不直接提供维修、救援、代驾等线下服务，实际服务由具备资质的合作商家提供。'
      },
      {
        title: '二、账号与登录',
        text: '您需使用本人手机号登录。请妥善保管账号信息，因账号出借或泄露造成的损失由用户自行承担。演示版本采用模拟验证码登录，不会发送真实短信。'
      },
      {
        title: '三、订单与支付',
        text: '下单后请按页面提示完成支付。演示版本的支付均为模拟，不会产生真实扣款；如需真实服务，请以合作商家线下确认为准。'
      },
      {
        title: '四、会员权益',
        text: '会员折扣、免费次数、积分规则以会员中心页面展示为准。会员权益仅限本人使用，不得转售或用于非法用途。'
      },
      {
        title: '五、行为规范',
        text: '用户不得利用平台从事违法违规活动。平台不代办扣分、不买卖记分、不伪造任何材料。'
      },
      {
        title: '六、免责与争议',
        text: '因不可抗力或第三方服务导致的损失，平台将协助处理但不承担直接责任。服务争议优先由用户与商家协商解决。'
      }
    ]
  },
  privacy: {
    title: '隐私政策',
    sections: [
      {
        title: '一、我们收集的信息',
        text: '为提供服务，我们会收集：手机号（登录与联系）、车辆信息（车牌、车型、里程等）、预约与订单信息、评价与反馈内容、位置信息（用于城市匹配和附近门店）。云端模式下还会记录必要的登录时间与操作日志。'
      },
      {
        title: '二、信息的存储',
        text: '本产品支持两种运行模式：本地模式下数据仅保存在您的设备；云端模式下数据加密传输并保存在我们运营的服务器中，保存期限为账号存续期间。您申请注销账号后，我们将在 15 个工作日内删除或匿名化相关数据。'
      },
      {
        title: '三、信息的使用',
        text: '收集的信息仅用于账号登录、订单履约、售后联系、会员权益计算、附近门店与城市匹配，不会用于与服务无关的用途，也不会用于自动化歧视性决策。'
      },
      {
        title: '四、信息的共享',
        text: '仅在完成预约时向对应商家提供必要的联系人信息；使用附近门店时，将坐标与查询关键词提供给高德地图用于周边检索和导航，不附带手机号；云服务商仅按我们的指示存储数据。平台不会向任何第三方出售个人信息。'
      },
      {
        title: '五、定位与相册权限',
        text: '定位用于城市匹配、附近门店和救援位置，您可拒绝授权并手动选择城市，不影响其他功能；上传行驶证、保险单、营业执照时需授权相册或相机，演示版本图片仅本地预览，不上传图片文件。'
      },
      {
        title: '六、您的权利',
        text: '您可以在「我的-设置」中查看和修改资料、清除本机缓存或退出登录；如需查询、更正、删除云端数据或撤回授权，可通过客服热线或「意见反馈」提交申请，我们将在 15 个工作日内处理。'
      },
      {
        title: '七、未成年人保护',
        text: '本服务面向具备完全民事行为能力的车主。未成年人使用本服务应取得监护人同意，监护人可联系我们删除相关数据。'
      },
      {
        title: '八、联系我们',
        text: '如对隐私保护有任何疑问、投诉或数据删除申请，可拨打客服热线 400-000-1234 或通过「意见反馈」联系我们。政策更新时我们会在 App 内提示。'
      }
    ]
  },
  about: {
    title: '关于车管家',
    sections: [
      {
        title: '产品定位',
        text: '车管家是全品类汽车综合服务平台，覆盖买车、卖车、养车、用车、救援、出行等 12 大业务链条，为个人车主、企业车队和商家提供一站式服务。'
      },
      {
        title: '三端体系',
        text: '个人会员 29/99 元每年；企业 VIP 299 元每年，5 台车统一托管；商家免费入驻或选择银牌 299/金牌 999 合作。'
      },
      {
        title: '合规承诺',
        text: '平台坚持合规经营：不代办扣分、不买卖记分、不伪造材料；维修、租赁、代驾、救援均对接正规资质团队。'
      },
      {
        title: '演示说明',
        text: '当前为产品演示版本，订单、支付、审核、客服等均为模拟流程。未接入云端时数据仅保存在本机；接入云端后按隐私政策存储。'
      }
    ]
  }
}

const doc = computed(() => DOCS[type.value] || DOCS.agreement)

onLoad(options => {
  if (options && options.type && DOCS[options.type]) type.value = options.type
})
</script>

<style scoped>
.doc-card { padding: 30rpx 30rpx 10rpx; }
.doc-update { display: block; font-size: 19rpx; color: #B4BBC7; margin-bottom: 8rpx; }
.section { padding: 22rpx 0; border-bottom: 1rpx solid #F2F4F7; }
.section:last-child { border-bottom: none; }
.section-title { display: block; font-size: 27rpx; font-weight: 700; color: #1A1D23; }
.section-text { display: block; margin-top: 12rpx; font-size: 23rpx; color: #5A6373; line-height: 1.8; }
.footer { padding: 10rpx 0 40rpx; display: flex; flex-direction: column; align-items: center; gap: 8rpx; }
.footer text { font-size: 20rpx; color: #B4BBC7; }
.footer-sub { font-size: 18rpx !important; color: #C9CFD9 !important; }
</style>
