// 车管家 App 图标 / 启动页设计（共享几何，改一处全局生效）

/* 车身路径（256 画布，车头朝右） */
const CAR_PATH = `M30 158
L30 147
C30 141 34 137 41 135
L86 128
C95 113 108 106 124 105
L156 105
C172 106 184 114 193 128
L215 132
C223 134 226 138 226 145
L226 156
C226 160 223 162 218 162
L37 162
C32 162 30 160 30 158
Z`

/* 侧窗（用车身色 B 柱切开） */
const GLASS_PATH = `M98 124
C106 112 116 107 128 106
L152 106
C164 107 174 113 182 124
Z`

const WHEEL_X = [74, 182]
const WHEEL_Y = 168
const WHEEL_R = 21
const CAR_TRANSFORM = 'translate(128 112) scale(1.08) translate(-128 -128)'

export const THEMES = {
  light: {
    bg: ['#FF9A55', '#FF6725', '#E63A00'],
    body: ['#FFFFFF', '#EDF1F5'],
    glass: '#3A4A5C',
    tire: '#211F1D',
    rim: '#F2F5F8',
    hub: '#211F1D'
  },
  dark: {
    bg: ['#2C3646', '#151C26', '#0A0E14'],
    body: ['#FFA463', '#FF6A22', '#F03A00'],
    glass: '#2A1810',
    tire: '#E9EDF2',
    rim: '#4A5462',
    hub: '#E9EDF2'
  }
}

function wheels(t, rim, hub) {
  return WHEEL_X.map(x => `
    <circle cx="${x}" cy="${WHEEL_Y}" r="${WHEEL_R}" fill="${t}"/>
    <circle cx="${x}" cy="${WHEEL_Y}" r="8.6" fill="${rim}"/>
    <circle cx="${x}" cy="${WHEEL_Y}" r="3.2" fill="${hub}"/>`).join('')
}

/** 车标主体（含轮拱镂空） */
export function carMarkup(opts) {
  const { body, glass, tire, rim, hub, shadow = true } = opts
  const arches = WHEEL_X.map(x => `<circle cx="${x}" cy="${WHEEL_Y}" r="25" fill="#000"/>`).join('')
  return `<g transform="${CAR_TRANSFORM}">
    ${shadow ? '<ellipse cx="128" cy="195" rx="92" ry="9" fill="#000" opacity="0.15"/>' : ''}
    <mask id="archMask">
      <rect x="0" y="0" width="256" height="256" fill="#FFF"/>
      ${arches}
    </mask>
    <g mask="url(#archMask)">
      <path d="${CAR_PATH}" fill="${body}"/>
      <path d="${GLASS_PATH}" fill="${glass}"/>
      <rect x="137" y="103" width="7" height="23" fill="${body}"/>
      <rect x="206" y="137" width="13" height="8" rx="3.5" fill="${glass}" opacity="0.55"/>
    </g>
    ${wheels(tire, rim, hub)}
  </g>`
}

function bodyGradient(t) {
  return `<linearGradient id="bodyG" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${t.body[0]}"/>
      <stop offset="1" stop-color="${t.body[1]}"/>
    </linearGradient>`
}

function carWithFill(t) {
  return carMarkup({
    body: 'url(#bodyG)',
    glass: t.glass,
    tire: t.tire,
    rim: t.rim,
    hub: t.hub
  })
}

/** 完整 App 图标（圆角方形底） */
export function buildIconSvg(size, themeName = 'light') {
  const t = THEMES[themeName] || THEMES.light
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 256 256">
  <defs>
    <linearGradient id="bgG" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${t.bg[0]}"/>
      <stop offset="0.45" stop-color="${t.bg[1]}"/>
      <stop offset="1" stop-color="${t.bg[2]}"/>
    </linearGradient>
    <radialGradient id="gloss" cx="0.26" cy="0.14" r="0.8">
      <stop offset="0" stop-color="#FFF" stop-opacity="0.38"/>
      <stop offset="0.55" stop-color="#FFF" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="spot" cx="0.5" cy="0.48" r="0.45">
      <stop offset="0" stop-color="#FFF" stop-opacity="0.12"/>
      <stop offset="1" stop-color="#FFF" stop-opacity="0"/>
    </radialGradient>
    ${bodyGradient(t)}
  </defs>
  <rect width="256" height="256" rx="58" fill="url(#bgG)"/>
  <rect width="256" height="256" rx="58" fill="url(#spot)"/>
  <rect width="256" height="256" rx="58" fill="url(#gloss)"/>
  ${carWithFill(t)}
</svg>`
}

/** 圆形图标（部分启动器使用） */
export function buildRoundIconSvg(size, themeName = 'light') {
  const t = THEMES[themeName] || THEMES.light
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 256 256">
  <defs>
    <linearGradient id="bgG" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${t.bg[0]}"/>
      <stop offset="0.45" stop-color="${t.bg[1]}"/>
      <stop offset="1" stop-color="${t.bg[2]}"/>
    </linearGradient>
    <radialGradient id="gloss" cx="0.26" cy="0.14" r="0.8">
      <stop offset="0" stop-color="#FFF" stop-opacity="0.38"/>
      <stop offset="0.55" stop-color="#FFF" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="spot" cx="0.5" cy="0.48" r="0.45">
      <stop offset="0" stop-color="#FFF" stop-opacity="0.12"/>
      <stop offset="1" stop-color="#FFF" stop-opacity="0"/>
    </radialGradient>
    <clipPath id="circleClip"><circle cx="128" cy="128" r="128"/></clipPath>
    ${bodyGradient(t)}
  </defs>
  <g clip-path="url(#circleClip)">
    <rect width="256" height="256" fill="url(#bgG)"/>
    <rect width="256" height="256" fill="url(#spot)"/>
    <rect width="256" height="256" fill="url(#gloss)"/>
    ${carWithFill(t)}
  </g>
</svg>`
}

/** 自适应图标前景（108dp 画布，透明底，车辆居中） */
export function buildAdaptiveForegroundSvg(size, themeName = 'light') {
  const t = THEMES[themeName] || THEMES.light
  const car = carMarkup({
    body: 'url(#bodyG)',
    glass: t.glass,
    tire: t.tire,
    rim: t.rim,
    hub: t.hub
  })
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 108 108">
  <defs>${bodyGradient(t)}</defs>
  <g transform="translate(54 54) scale(0.335) translate(-128 -136)">
    ${car}
  </g>
</svg>`
}

/** 启动页 logo（白车 + 品牌名，配橙色底） */
export function buildSplashLogoSvg(size = 480) {
  const car = carMarkup({
    body: '#FFFFFF',
    glass: '#D2450F',
    tire: '#D63300',
    rim: '#FFFFFF',
    hub: '#D63300',
    shadow: true
  })
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 480 480">
  <g transform="translate(240 196) scale(1.28) translate(-128 -136)">
    ${car}
  </g>
  <text x="240" y="392" text-anchor="middle" font-family="Microsoft YaHei, PingFang SC, sans-serif"
        font-size="54" font-weight="700" fill="#FFFFFF" letter-spacing="8">车管家</text>
</svg>`
}
