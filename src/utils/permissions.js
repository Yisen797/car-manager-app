// 首次启动权限引导
// 当前功能集只需要定位权限：
// - 定位当前城市、附近商家、救援位置
// - 相册/拍照走系统文件选择器，不需要 App 额外申请存储/相机权限
const ASKED_KEY = 'car_manager_permission_asked_v1'

export function hasAskedPermissions() {
  try {
    return uni.getStorageSync(ASKED_KEY) === true
  } catch (e) {
    return false
  }
}

export function markPermissionsAsked() {
  try {
    uni.setStorageSync(ASKED_KEY, true)
  } catch (e) {
    // 忽略存储异常
  }
}
