import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'org.rwaprotocol.app',
  appName: 'RWA Protocol',
  webDir: 'dist-capacitor',
  // 使用本地入口（dist-capacitor/index.html）启动，增强启动阶段的原生体感。
  // 业务页由本地入口页预热后跳转到线上站点。
  //
  // 必须配置 allowNavigation：壳内 location.replace(https://...) 时，若主机名不在此列表，
  // Capacitor Android 会走 Intent.ACTION_VIEW，系统会打开外部 Chrome 而不是留在 WebView。
  server: {
    allowNavigation: ['rwa.lat', 'www.rwa.lat'],
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 900,
      launchAutoHide: true,
      backgroundColor: '#0a0a0f',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0a0a0f',
      overlaysWebView: false,
    },
    Keyboard: {
      resize: 'body',
      style: 'dark',
      resizeOnFullScreen: true,
    },
  },
}

export default config
