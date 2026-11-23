#!/bin/bash
# 一键打包安卓 APK
# 用法：bash tools/build-apk.sh
set -e

PROJ="<项目根目录>"
STAGE="/d/android-build/carapp"
export JAVA_HOME="%ANDROID_BUILD%/jdk17/jdk-17.0.20.1+1"
export ANDROID_SDK_ROOT="%ANDROID_BUILD%/android-sdk"
export GRADLE_USER_HOME="%ANDROID_BUILD%/gradle-home"
export PATH="$JAVA_HOME/bin:$PATH"

echo "==> 1/4 构建 H5 生产包"
cd "$PROJ"
npm run build:h5

echo "==> 同步版本号（version.json → build.gradle）"
VERSION_NAME=$(node -p "require('$PROJ/version.json').versionName")
VERSION_CODE=$(node -p "require('$PROJ/version.json').versionCode")
GRADLE="$PROJ/app-shell/android/app/build.gradle"
sed -i "s/^\( *\)versionCode .*/\1versionCode $VERSION_CODE/" "$GRADLE"
sed -i "s/^\( *\)versionName .*/\1versionName \"$VERSION_NAME\"/" "$GRADLE"
echo "    versionName=$VERSION_NAME versionCode=$VERSION_CODE"

echo "==> 2/4 同步网页资源到原生壳"
rm -rf "$PROJ/app-shell/www"
mkdir -p "$PROJ/app-shell/www"
cp -r "$PROJ/dist/build/h5/." "$PROJ/app-shell/www/"
cd "$PROJ/app-shell"
npx cap sync android

echo "==> 3/4 同步到无中文路径（Android 构建工具不支持中文路径）"
rm -rf "$STAGE"
mkdir -p "$STAGE"
cp -r "$PROJ/app-shell/." "$STAGE/"

echo "==> 4/4 Gradle 打包"
cd "$STAGE/android"
./gradlew assembleRelease

APK="$STAGE/android/app/build/outputs/apk/release/app-release.apk"
cp "$APK" "$PROJ/车管家.apk"
echo ""
echo "完成：$PROJ/车管家.apk"
ls -lh "$PROJ/车管家.apk"
