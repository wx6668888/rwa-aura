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

/** PWA /「添加到主屏幕」等独立显示模式（含 iOS Safari standalone） */
export function isStandaloneWebApp(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const standalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true
    const mq =
      window.matchMedia?.('(display-mode: standalone)')?.matches ||
      window.matchMedia?.('(display-mode: fullscreen)')?.matches ||
      window.matchMedia?.('(display-mode: minimal-ui)')?.matches
    return Boolean(standalone || mq)
  } catch {
    return false
  }
}

/**
 * 钱包内置浏览器里走 WalletConnect 时，是否展示「在钱包 App 内继续 / 深链」类提示。
 * 与 `shouldSuggestWalletConnectDeepLink` 互补：部分钱包 UA 不含 wv 但仍为应用内 WebView。
 */
export function shouldHintInWalletBrowserForWc(): boolean {
  if (typeof navigator === 'undefined') return false
  if (shouldSuggestWalletConnectDeepLink()) return true
  const ua = navigator.userAgent || ''
  if (!/Mobi|Android|iPhone|iPad/i.test(ua)) return false
  return /TokenPocket|imToken|BitKeep|MetaMask|TrustWallet|Phantom|OKApp|OKXWallet|BNB|Binance|CoinbaseWallet|Rainbow/i.test(
    ua
  )
}
