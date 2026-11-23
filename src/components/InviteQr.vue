<template>
  <view class="invite-qr" :style="{ width: size + 'px', height: size + 'px' }">
    <!-- #ifdef H5 -->
    <!-- H5 用离屏 canvas 生成的 PNG，支持右键/长按保存与点击下载 -->
    <image
      v-if="pngUrl"
      class="qr-img"
      :src="pngUrl"
      :style="{ width: size + 'px', height: size + 'px' }"
      mode="aspectFit"
    />
    <view v-else class="qr-empty"><text>二维码生成中…</text></view>
    <!-- #endif -->

    <!-- #ifndef H5 -->
    <!-- 小程序 / App 使用 uni canvas，保存时导出临时图片 -->
    <canvas
      class="qr-canvas"
      :canvas-id="canvasId"
      :id="canvasId"
      :style="{ width: size + 'px', height: size + 'px' }"
    ></canvas>
    <!-- #endif -->
  </view>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick, getCurrentInstance } from 'vue'
import { qrMatrix } from '@/utils/qrcode'
import { qrToPngDataUrl, drawQrToUniCanvas } from '@/utils/qr-render'

const props = defineProps({
  text: { type: String, default: '' },
  size: { type: Number, default: 220 },
  margin: { type: Number, default: 4 }
})

const instance = getCurrentInstance()
const canvasId = 'inviteQr' + Math.random().toString(36).slice(2, 8)
const pngUrl = ref('')
const matrix = ref(null)
const error = ref('')

const hasContent = computed(() => !!props.text)

function buildMatrix() {
  error.value = ''
  if (!hasContent.value) {
    matrix.value = null
    pngUrl.value = ''
    return
  }
  try {
    matrix.value = qrMatrix(props.text)
  } catch (e) {
    matrix.value = null
    error.value = e.message || '二维码生成失败'
    return
  }
  // H5 直接产出 PNG Data URL（非 H5 下 document 未定义，返回空）
  pngUrl.value = qrToPngDataUrl(matrix.value, { margin: props.margin })
  nextTick(drawCanvas)
}

function drawCanvas() {
  if (!matrix.value) return
  if (typeof uni === 'undefined' || !uni.createCanvasContext) return
  // #ifndef H5
  const ctx = uni.createCanvasContext(canvasId, instance && instance.proxy)
  drawQrToUniCanvas(ctx, matrix.value, props.size, { margin: props.margin })
  // #endif
}

watch(() => [props.text, props.size, props.margin], buildMatrix, { immediate: true })
onMounted(() => {
  nextTick(drawCanvas)
})

/**
 * 保存二维码图片
 * H5：下载 PNG；小程序/App：保存到相册，失败时用预览图让用户长按保存
 * @returns {Promise<{ok:boolean, reason?:string, message?:string}>}
 */
function save() {
  if (typeof document !== 'undefined' && pngUrl.value) {
    try {
      const a = document.createElement('a')
      a.href = pngUrl.value
      a.download = 'cheguanjia-invite-qr.png'
      document.body.appendChild(a)
      a.click()
      window.setTimeout(() => {
        try { document.body.removeChild(a) } catch (e) { /* ignore */ }
      }, 0)
      return Promise.resolve({ ok: true })
    } catch (e) {
      return Promise.resolve({ ok: false, reason: 'download', message: '下载失败，请长按二维码保存' })
    }
  }

  return new Promise(resolve => {
    if (typeof uni === 'undefined' || !uni.canvasToTempFilePath) {
      resolve({ ok: false, reason: 'unsupported', message: '当前端不支持保存，请截图保存' })
      return
    }
    uni.canvasToTempFilePath({
      canvasId,
      success(res) {
        const filePath = res && res.tempFilePath
        if (!filePath) return resolve({ ok: false, reason: 'empty', message: '图片生成失败，请重试' })
        if (!uni.saveImageToPhotosAlbum) {
          uni.previewImage({ urls: [filePath] })
          return resolve({ ok: true, preview: true })
        }
        uni.saveImageToPhotosAlbum({
          filePath,
          success: () => resolve({ ok: true }),
          fail: () => {
            // 没有相册权限时降级为预览（长按保存）
            uni.previewImage({ urls: [filePath] })
            resolve({ ok: true, preview: true })
          }
        })
      },
      fail: () => resolve({ ok: false, reason: 'canvas', message: '图片生成失败，请重试' })
    }, instance && instance.proxy)
  })
}

defineExpose({ save, error })
</script>

<style scoped>
.invite-qr {
  position: relative;
  border-radius: 16rpx;
  overflow: hidden;
  background: #FFFFFF;
  display: flex;
  align-items: center;
  justify-content: center;
}
.qr-img { display: block; }
.qr-canvas { display: block; }
.qr-empty { display: flex; align-items: center; justify-content: center; }
.qr-empty text { font-size: 20rpx; color: #A8B0BD; }
</style>
