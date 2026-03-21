# RWA Protocol Android App

简单的WebView应用，将 https://rwaprotocol.dpdns.org/ 打包成Android APK。

## 构建APK

### 方法1：使用Android Studio（推荐）

1. 安装Android Studio
2. 打开项目文件夹 `android-app`
3. 等待Gradle同步完成
4. Build → Build Bundle(s) / APK(s) → Build APK(s)
5. APK生成在 `app/build/outputs/apk/release/`

### 方法2：使用在线工具（最简单）

访问这些网站，上传网址即可生成APK：
- https://appsgeyser.com/
- https://websitetoapk.com/
- https://gonative.io/

输入网址：`https://rwaprotocol.dpdns.org/`
应用名称：`RWA Protocol`
包名：`com.rwa.protocol`

### 方法3：命令行构建

```bash
cd android-app
./gradlew assembleRelease
```

APK位置：`app/build/outputs/apk/release/app-release.apk`

## 功能

- ✅ 加载网站 https://rwaprotocol.dpdns.org/
- ✅ 支持JavaScript
- ✅ 支持返回键导航
- ✅ 全屏显示

## 注意事项

- 需要网络权限
- 最低Android版本：5.0 (API 21)
- 目标Android版本：13 (API 33)
