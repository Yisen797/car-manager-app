// 版本信息统一来源：/version.json
// - versionName / versionCode：应用版本（安卓包版本由 tools/build-apk.sh 自动同步）
// - schemaVersion：本地数据结构版本，升级时必须提供迁移
import meta from '../../version.json'

export const APP_VERSION = meta.versionName
export const APP_VERSION_CODE = meta.versionCode
export const SCHEMA_VERSION = meta.schemaVersion
export const RELEASE_DATE = meta.releaseDate
export const MIN_SUPPORTED_VERSION = meta.minSupportedVersion

export const VERSION_LABEL = 'v' + APP_VERSION
export const VERSION_FULL = 'v' + APP_VERSION + '（build ' + APP_VERSION_CODE + ' · 数据 v' + SCHEMA_VERSION + '）'
