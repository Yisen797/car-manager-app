// 二维码渲染工具：矩阵 → SVG / PNG / uni canvas
// 纯函数实现，不发起任何网络请求；二维码内容只在本地生成

const DEFAULT_DARK = '#1A1D23'
const DEFAULT_LIGHT = '#FFFFFF'

function normalized(matrix) {
  if (!matrix || !Array.isArray(matrix.modules) || !matrix.size) return null
  return matrix
}

/**
 * 生成 SVG 字符串（可用于 H5 预览/下载）
 * @param {{size:number, modules:boolean[][]}} matrix
 */
export function qrToSvg(matrix, options = {}) {
  const m = normalized(matrix)
  if (!m) return ''
  const margin = options.margin != null ? options.margin : 4
  const dark = options.dark || DEFAULT_DARK
  const light = options.light || DEFAULT_LIGHT
  const n = m.size
  const total = n + margin * 2

  let path = ''
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (m.modules[r][c]) path += `M${c + margin} ${r + margin}h1v1h-1z`
    }
  }

  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + total + ' ' + total +
    '" shape-rendering="crispEdges">' +
    `<rect width="${total}" height="${total}" fill="${light}"/>` +
    `<path d="${path}" fill="${dark}"/>` +
    '</svg>'
}

/** SVG Data URL（H5 可用；小程序原生 image 对 SVG 支持不稳定，故仅 H5 使用） */
export function qrToSvgDataUrl(matrix, options = {}) {
  const svg = qrToSvg(matrix, options)
  if (!svg) return ''
  if (typeof btoa === 'function') {
    // 本 SVG 只含 ASCII，可安全 base64
    return 'data:image/svg+xml;base64,' + btoa(svg)
  }
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
}

/**
 * H5：用离屏 canvas 生成 PNG Data URL（不依赖 uni canvas，下载/长按保存都稳定）
 * 非 H5 环境返回空字符串。
 */
export function qrToPngDataUrl(matrix, options = {}) {
  const m = normalized(matrix)
  if (!m) return ''
  if (typeof document === 'undefined') return ''
  const margin = options.margin != null ? options.margin : 4
  const scale = options.scale || 8
  const dark = options.dark || DEFAULT_DARK
  const light = options.light || DEFAULT_LIGHT
  const n = m.size
  const pixel = (n + margin * 2) * scale

  const canvas = document.createElement('canvas')
  canvas.width = pixel
  canvas.height = pixel
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''
  ctx.fillStyle = light
  ctx.fillRect(0, 0, pixel, pixel)
  ctx.fillStyle = dark
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (!m.modules[r][c]) continue
      ctx.fillRect((c + margin) * scale, (r + margin) * scale, scale, scale)
    }
  }
  try {
    return canvas.toDataURL('image/png')
  } catch (e) {
    return ''
  }
}

/**
 * 小程序 / App：把矩阵画到 uni canvas
 * @param {object} ctx uni.createCanvasContext 返回的上下文
 * @param {{size:number, modules:boolean[][]}} matrix
 * @param {number} size 画布逻辑边长（px）
 */
export function drawQrToUniCanvas(ctx, matrix, size, options = {}) {
  const m = normalized(matrix)
  if (!ctx || !m) return false
  const margin = options.margin != null ? options.margin : 4
  const dark = options.dark || DEFAULT_DARK
  const light = options.light || DEFAULT_LIGHT
  const cell = size / (m.size + margin * 2)

  const setFill = color => {
    if (typeof ctx.setFillStyle === 'function') ctx.setFillStyle(color)
    else ctx.fillStyle = color
  }

  setFill(light)
  ctx.fillRect(0, 0, size, size)
  setFill(dark)
  for (let r = 0; r < m.size; r++) {
    for (let c = 0; c < m.size; c++) {
      if (!m.modules[r][c]) continue
      // +0.5 避免相邻模块出现缝隙
      ctx.fillRect(
        (c + margin) * cell,
        (r + margin) * cell,
        cell + 0.5,
        cell + 0.5
      )
    }
  }
  if (typeof ctx.draw === 'function') ctx.draw()
  return true
}
