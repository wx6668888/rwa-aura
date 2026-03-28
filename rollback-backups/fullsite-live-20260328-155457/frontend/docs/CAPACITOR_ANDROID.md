# RWA Protocol · 安卓应用（Capacitor）

壳应用使用 **`webDir: dist-capacitor`** 本地入口页，再由 `index.html` 里 `location.replace` 跳到线上站点：

**https://rwa.lat**

配置见根目录 `capacitor.config.ts`。

### 重要：`server.allowNavigation`

若未把业务域名列入 `server.allowNavigation`，在 WebView 里导航到 `https://rwa.lat/...` 时，**Capacitor 会交给系统浏览器打开（Chrome）**，看起来像「一打开就跳到浏览器」。当前已配置：

- `rwa.lat`
- `www.rwa.lat`

若以后改用 `www` 子域或增加钱包回调域名，需同步追加到该数组。

## 环境要求（本机打 APK）

1. **JDK 17+**（`java -version`）
2. **Android SDK**（可只装 Android Studio 自带的 SDK，或单独装 command-line tools）
3. 环境变量：
   - `ANDROID_HOME` 指向 SDK 目录（例如 `~/Android/Sdk`）
   - 可选：把 `$ANDROID_HOME/platform-tools` 加入 `PATH`（方便 `adb`）

## 一条命令打调试包（Debug APK）

在 `frontend` 目录：

```bash
npm run android:debug
```

成功后 APK 路径一般为：

```
android/app/build/outputs/apk/debug/app-debug.apk
```

发给手机安装即可（需允许「安装未知来源」）。

## 正式签名包（Release）

需先在 `android/` 里配置 `signingConfigs`（keystore），再执行：

```bash
npm run android:release
```

具体密钥与 `build.gradle` 配置请参考 [Android 官方应用签名说明](https://developer.android.com/studio/publish/app-signing)。

## 与前端环境变量

- **`NEXT_PUBLIC_APP_URL`**：请设为 `https://rwa.lat`（与壳加载地址一致，利于 WalletConnect / 分享链接）。
- **`NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`**：必须在 [WalletConnect Cloud](https://cloud.walletconnect.com/) 创建项目并填入。

## 无 Android Studio 时

仍可用 **命令行 + SDK** 完成 `assembleDebug`；若本机没有 SDK，可把仓库拷到带 SDK 的机器/Codespaces，执行 `npm run android:debug`。

---

## WalletConnect：钱包跳不回 App / 网页

**原因简述**：授权完成后，钱包会用系统打开「返回链接」。若只有普通浏览器装了该域名，系统会打开 **Chrome** 而不是你的 **Capacitor 壳**，看起来像「根本跳不回来」——多数情况要改 **原生清单 + 元数据**，不单是 React 代码。

### 已在工程里做的（需重新打 APK）

1. **`lib/wagmi.ts`** 里为 WalletConnect `metadata` 增加了 **`redirect`**：
   - **`native`**：默认 `rwaprotocol://wc`（可用环境变量 `NEXT_PUBLIC_WC_REDIRECT_NATIVE` 覆盖）
   - **`universal`**：你的站点根 URL（如 `https://rwa.lat/`）
2. **`AndroidManifest.xml`** 为 `MainActivity` 增加了两类 **intent-filter**：
   - `https://rwa.lat`（带 `autoVerify`，需 assetlinks）
   - `rwaprotocol://wc`（自定义 scheme，**不依赖** assetlinks，多数钱包会优先用 native 返回）

### 你必须完成的部署步骤

1. **重新构建并安装 APK**（清单已变，旧包无效）。
2. **（推荐）配置 Digital Asset Links**，让 `https://rwa.lat` 的返回链接**验证后直达你的 App**：
   - 用调试签名打包时，用 debug keystore 导出 **SHA256**：
     ```bash
     keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
     ```
   - 将 `docs/assetlinks.json.example` 复制为线上可访问的：  
     **`https://rwa.lat/.well-known/assetlinks.json`**  
     （Next 部署：放在 `public/.well-known/assetlinks.json`，内容里的指纹改成上面得到的，**必须是合法 JSON**，不要用中文占位）。
   - 发布后可用 [Google 语句测试工具](https://developers.google.com/digital-asset-links/tools/generator) 校验。
3. 在 [WalletConnect Cloud](https://cloud.walletconnect.com/) 项目里，如有 **Allowed redirect / Domain** 之类配置，把 **`https://rwa.lat`** 与 **`rwaprotocol://wc`** 按面板说明加入白名单（以控制台为准）。

### 仅用手机浏览器（不用 App）时

一般 **`universal`（https）** 返回即可回到同一浏览器标签；若仍异常，多为钱包版本或 Project ID / 域名配置问题。
