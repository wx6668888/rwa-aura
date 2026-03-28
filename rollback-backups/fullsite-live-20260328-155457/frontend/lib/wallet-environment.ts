/**
 * 检测安卓应用内 WebView / Capacitor 壳环境，用于引导 WalletConnect 深链连接。
 * 仅依赖 UA / 全局 Capacitor，可在客户端任意位置调用。
 */

export function isLikelyAndroidSystemWebView(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  if (!/Android/i.test(ua)) return false
  // 系统 WebView 典型标记：Android Chrome WebView
  if (/; wv\)/.test(ua)) return true
  return false
}

/** Capacitor 原生 Android 壳（远程 URL WebView） */
export function isCapacitorNativeAndroid(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const Cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean; getPlatform?: () => string } })
      .Capacitor
    return Cap?.isNativePlatform?.() === true && Cap?.getPlatform?.() === 'android'
  } catch {
    return false
  }
}

/** 应优先使用 WalletConnect / 深链 的环境（应用内壳、系统 WebView） */
export function shouldSuggestWalletConnectDeepLink(): boolean {
  return isLikelyAndroidSystemWebView() || isCapacitorNativeAndroid()
}
