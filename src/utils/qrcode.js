// 纯前端 QR 码生成（字节模式 / 纠错等级 M / 版本 1-10 自动选择）
//
// 为什么自己实现：
// - 邀请链接里有邀请码，不能发给第三方二维码服务；也不引入需要构建/体积大的依赖
// - 三端（H5 / 微信小程序 / App）共用同一份纯 JS，不依赖 DOM / Canvas
//
// 算法来源：按 ISO/IEC 18004 标准独立实现，结构参考 Nayuki "QR Code generator"
// （MIT License, https://github.com/nayuki/QR-Code-generator）与
// Kazuhiko Arase "qrcode-generator"（MIT License）的公开表格。
// 本文件仅保留本产品需要的能力（单等级 M、版本 1-10、UTF-8 字节模式）。
//
// 用法：
//   import { qrMatrix } from '@/utils/qrcode'
//   const { size, modules } = qrMatrix('https://...#/pages/login/index?invite=XXX')

/* ---------------- GF(256) 运算 ---------------- */
const GF_EXP = new Uint8Array(512)
const GF_LOG = new Uint8Array(256)
;(() => {
  let x = 1
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x
    GF_LOG[x] = i
    x <<= 1
    if (x & 0x100) x ^= 0x11d // 本原多项式 x^8 + x^4 + x^3 + x^2 + 1
  }
  for (let i = 255; i < 512; i++) GF_EXP[i] = GF_EXP[i - 255]
})()

function gfMul(a, b) {
  if (a === 0 || b === 0) return 0
  return GF_EXP[GF_LOG[a] + GF_LOG[b]]
}

/* ---------------- 分块表格（纠错等级 M） ---------------- */
// [块数, 每块总码字, 每块数据码字]
const BLOCKS_M = {
  1: [[1, 26, 16]],
  2: [[1, 44, 28]],
  3: [[1, 70, 44]],
  4: [[2, 50, 32]],
  5: [[2, 67, 43]],
  6: [[4, 43, 27]],
  7: [[4, 49, 31]],
  8: [[2, 60, 38], [2, 61, 39]],
  9: [[3, 58, 36], [2, 59, 37]],
  10: [[4, 69, 43], [1, 70, 44]]
}

// 对齐图案中心坐标
const ALIGN = {
  1: [],
  2: [6, 18],
  3: [6, 22],
  4: [6, 26],
  5: [6, 30],
  6: [6, 34],
  7: [6, 22, 38],
  8: [6, 24, 42],
  9: [6, 26, 46],
  10: [6, 28, 50]
}

const MIN_VERSION = 1
const MAX_VERSION = 10

function dataCodewordCount(version) {
  let n = 0
  for (const [count, , dataCount] of BLOCKS_M[version]) n += count * dataCount
  return n
}

/* ---------------- UTF-8 ---------------- */
function toUtf8Bytes(str) {
  const out = []
  for (let i = 0; i < str.length; i++) {
    let code = str.charCodeAt(i)
    // 代理对
    if (code >= 0xd800 && code <= 0xdbff && i + 1 < str.length) {
      const next = str.charCodeAt(i + 1)
      if (next >= 0xdc00 && next <= 0xdfff) {
        code = 0x10000 + ((code - 0xd800) << 10) + (next - 0xdc00)
        i++
      }
    }
    if (code < 0x80) {
      out.push(code)
    } else if (code < 0x800) {
      out.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f))
    } else if (code < 0x10000) {
      out.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f))
    } else {
      out.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f)
      )
    }
  }
  return out
}

/* ---------------- 纠错码 ---------------- */
function rsGeneratorPoly(degree) {
  let poly = [1]
  for (let i = 0; i < degree; i++) {
    const next = new Array(poly.length + 1).fill(0)
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j]
      next[j + 1] ^= gfMul(poly[j], GF_EXP[i])
    }
    poly = next
  }
  return poly
}

function rsEncode(data, degree) {
  const gen = rsGeneratorPoly(degree)
  const rem = new Array(degree).fill(0)
  for (const byte of data) {
    const factor = byte ^ rem[0]
    rem.shift()
    rem.push(0)
    if (factor !== 0) {
      for (let i = 0; i < degree; i++) rem[i] ^= gfMul(gen[i + 1], factor)
    }
  }
  return rem
}

/* ---------------- 数据码字 ---------------- */
function pickVersion(byteLen) {
  for (let v = MIN_VERSION; v <= MAX_VERSION; v++) {
    const ccBits = v <= 9 ? 8 : 16
    const capacityBits = dataCodewordCount(v) * 8
    if (4 + ccBits + byteLen * 8 <= capacityBits) return v
  }
  return 0
}

function buildDataCodewords(bytes, version) {
  const ccBits = version <= 9 ? 8 : 16
  const totalData = dataCodewordCount(version)
  const bits = []
  const push = (value, len) => {
    for (let i = len - 1; i >= 0; i--) bits.push((value >>> i) & 1)
  }

  push(0b0100, 4) // 字节模式
  push(bytes.length, ccBits)
  for (const b of bytes) push(b, 8)

  const capacity = totalData * 8
  // 终止符最多 4 位
  for (let i = 0; i < 4 && bits.length < capacity; i++) bits.push(0)
  // 补齐到字节
  while (bits.length % 8 !== 0) bits.push(0)

  const codewords = []
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0
    for (let j = 0; j < 8; j++) byte = (byte << 1) | bits[i + j]
    codewords.push(byte)
  }
  // 填充码字
  const PAD = [0xec, 0x11]
  let padIndex = 0
  while (codewords.length < totalData) {
    codewords.push(PAD[padIndex % 2])
    padIndex++
  }
  return codewords
}

function interleave(codewords, version) {
  const groups = []
  let offset = 0
  for (const [count, total, dataCount] of BLOCKS_M[version]) {
    for (let i = 0; i < count; i++) {
      const data = codewords.slice(offset, offset + dataCount)
      offset += dataCount
      groups.push({ data, ec: rsEncode(data, total - dataCount) })
    }
  }

  const out = []
  const maxData = Math.max(...groups.map(g => g.data.length))
  for (let i = 0; i < maxData; i++) {
    for (const g of groups) if (i < g.data.length) out.push(g.data[i])
  }
  const maxEc = Math.max(...groups.map(g => g.ec.length))
  for (let i = 0; i < maxEc; i++) {
    for (const g of groups) if (i < g.ec.length) out.push(g.ec[i])
  }
  return out
}

/* ---------------- 矩阵 ---------------- */
function createBoard(size) {
  return {
    size,
    modules: Array.from({ length: size }, () => new Array(size).fill(false)),
    reserved: Array.from({ length: size }, () => new Array(size).fill(false))
  }
}

function setFunc(board, row, col, dark) {
  if (row < 0 || col < 0 || row >= board.size || col >= board.size) return
  board.modules[row][col] = !!dark
  board.reserved[row][col] = true
}

function drawFinder(board, centerRow, centerCol) {
  for (let dr = -4; dr <= 4; dr++) {
    for (let dc = -4; dc <= 4; dc++) {
      const dist = Math.max(Math.abs(dr), Math.abs(dc))
      // 距离 2 = 内圈留白，距离 4 = 分隔带留白，其余为黑色
      setFunc(board, centerRow + dr, centerCol + dc, dist !== 2 && dist !== 4)
    }
  }
}

function drawAlignment(board, centerRow, centerCol) {
  for (let dr = -2; dr <= 2; dr++) {
    for (let dc = -2; dc <= 2; dc++) {
      const dist = Math.max(Math.abs(dr), Math.abs(dc))
      setFunc(board, centerRow + dr, centerCol + dc, dist !== 1)
    }
  }
}

// 格式信息：纠错等级 M（00）+ 掩码号，15 位 BCH
function formatBits(mask) {
  const data = (0b00 << 3) | mask
  let rem = data
  for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537)
  return ((data << 10) | rem) ^ 0x5412
}

function drawFormat(board, mask) {
  const size = board.size
  const bits = formatBits(mask)
  const bit = i => ((bits >>> i) & 1) === 1

  // 第一份（左上）
  for (let i = 0; i < 6; i++) setFunc(board, i, 8, bit(i))
  setFunc(board, 7, 8, bit(6))
  setFunc(board, 8, 8, bit(7))
  setFunc(board, 8, 7, bit(8))
  for (let i = 9; i < 15; i++) setFunc(board, 8, 14 - i, bit(i))

  // 第二份（右上 + 左下）
  for (let i = 0; i < 8; i++) setFunc(board, 8, size - 1 - i, bit(i))
  for (let i = 8; i < 15; i++) setFunc(board, size - 15 + i, 8, bit(i))
  // 固定暗模块
  setFunc(board, size - 8, 8, true)
}

function drawVersionInfo(board, version) {
  if (version < 7) return
  let rem = version
  for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25)
  const bits = (version << 12) | rem
  const size = board.size
  for (let i = 0; i < 18; i++) {
    const dark = ((bits >>> i) & 1) === 1
    const a = size - 11 + (i % 3)
    const b = Math.floor(i / 3)
    setFunc(board, b, a, dark)
    setFunc(board, a, b, dark)
  }
}

function drawFunctionPatterns(board, version) {
  const size = board.size

  // 定位图案（三个角）
  drawFinder(board, 3, 3)
  drawFinder(board, 3, size - 4)
  drawFinder(board, size - 4, 3)

  // 定时图案
  for (let i = 8; i < size - 8; i++) {
    setFunc(board, 6, i, i % 2 === 0)
    setFunc(board, i, 6, i % 2 === 0)
  }

  // 对齐图案（避开三个角的定位图案）
  const points = ALIGN[version]
  for (let i = 0; i < points.length; i++) {
    for (let j = 0; j < points.length; j++) {
      const r = points[i]
      const c = points[j]
      const atFinderCorner =
        (i === 0 && j === 0) ||
        (i === 0 && j === points.length - 1) ||
        (i === points.length - 1 && j === 0)
      if (!atFinderCorner) drawAlignment(board, r, c)
    }
  }

  // 先占位格式信息区域（掩码确定后重绘）
  drawFormat(board, 0)
  drawVersionInfo(board, version)
}

function placeData(board, codewords) {
  const bits = []
  for (const byte of codewords) {
    for (let i = 7; i >= 0; i--) bits.push((byte >>> i) & 1)
  }

  const size = board.size
  let index = 0
  let upward = true
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5 // 跳过竖向定时图案所在列
    for (let vert = 0; vert < size; vert++) {
      const row = upward ? size - 1 - vert : vert
      for (let j = 0; j < 2; j++) {
        const col = right - j
        if (board.reserved[row][col]) continue
        const dark = index < bits.length && bits[index] === 1
        board.modules[row][col] = dark
        index++
      }
    }
    upward = !upward
  }
}

const MASKS = [
  (r, c) => (r + c) % 2 === 0,
  r => r % 2 === 0,
  (r, c) => c % 3 === 0,
  (r, c) => (r + c) % 3 === 0,
  (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
  (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
  (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
  (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0
]

function applyMask(base, mask) {
  const size = base.size
  const out = {
    size,
    modules: base.modules.map(row => row.slice()),
    reserved: base.reserved
  }
  const fn = MASKS[mask]
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!base.reserved[r][c] && fn(r, c)) out.modules[r][c] = !out.modules[r][c]
    }
  }
  return out
}

/* ---------------- 掩码惩罚 ---------------- */
function penalty(modules) {
  const size = modules.length
  let score = 0

  // 规则 1：连续 5 个及以上同色
  for (let r = 0; r < size; r++) {
    let run = 1
    for (let c = 1; c < size; c++) {
      if (modules[r][c] === modules[r][c - 1]) {
        run++
      } else {
        if (run >= 5) score += 3 + (run - 5)
        run = 1
      }
    }
    if (run >= 5) score += 3 + (run - 5)
  }
  for (let c = 0; c < size; c++) {
    let run = 1
    for (let r = 1; r < size; r++) {
      if (modules[r][c] === modules[r - 1][c]) {
        run++
      } else {
        if (run >= 5) score += 3 + (run - 5)
        run = 1
      }
    }
    if (run >= 5) score += 3 + (run - 5)
  }

  // 规则 2：2x2 同色块
  for (let r = 0; r < size - 1; r++) {
    for (let c = 0; c < size - 1; c++) {
      const v = modules[r][c]
      if (v === modules[r][c + 1] && v === modules[r + 1][c] && v === modules[r + 1][c + 1]) {
        score += 3
      }
    }
  }

  // 规则 3：类似定位图案的 1:1:3:1:1 序列
  const P1 = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0]
  const P2 = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1]
  const match = (get, start, pattern) => {
    for (let i = 0; i < 11; i++) {
      if ((get(start + i) ? 1 : 0) !== pattern[i]) return false
    }
    return true
  }
  for (let r = 0; r < size; r++) {
    for (let c = 0; c <= size - 11; c++) {
      const get = i => modules[r][c + i]
      if (match(get, 0, P1) || match(get, 0, P2)) score += 40
    }
  }
  for (let c = 0; c < size; c++) {
    for (let r = 0; r <= size - 11; r++) {
      const get = i => modules[r + i][c]
      if (match(get, 0, P1) || match(get, 0, P2)) score += 40
    }
  }

  // 规则 4：暗模块比例
  let dark = 0
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) if (modules[r][c]) dark++
  }
  const total = size * size
  const k = Math.floor(Math.abs(dark * 20 - total * 10) / total)
  score += k * 10

  return score
}

/**
 * 生成二维码矩阵
 * @param {string} text 待编码内容（UTF-8）
 * @param {{mask?:number}} [options] mask 可强制指定掩码（0-7），不传则按标准罚分自动选择
 * @returns {{size:number, modules:boolean[][], version:number, mask:number}}
 */
export function qrMatrix(text, options = {}) {
  const bytes = toUtf8Bytes(String(text == null ? '' : text))
  const version = pickVersion(bytes.length)
  if (!version) {
    throw new Error('内容过长，无法生成二维码（最多 ' +
      Math.floor((dataCodewordCount(MAX_VERSION) * 8 - 4 - 16) / 8) + ' 字节）')
  }

  const board = createBoard(version * 4 + 17)
  drawFunctionPatterns(board, version)
  placeData(board, interleave(buildDataCodewords(bytes, version), version))

  const forced = Number.isInteger(options.mask) && options.mask >= 0 && options.mask <= 7
    ? options.mask
    : null

  let best = null
  let bestScore = Infinity
  let bestMask = 0
  for (let mask = 0; mask < 8; mask++) {
    if (forced !== null && mask !== forced) continue
    const trial = applyMask(board, mask)
    drawFormat(trial, mask)
    const score = penalty(trial.modules)
    if (score < bestScore) {
      bestScore = score
      best = trial
      bestMask = mask
    }
  }

  return { size: best.size, modules: best.modules, version, mask: bestMask }
}

export default qrMatrix
