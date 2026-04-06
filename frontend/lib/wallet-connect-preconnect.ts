/**
 * WalletConnect / Web3Modal 依赖的 HTTPS 源；在慢网或国内环境下，
 * 晚注入会导致点击 WalletConnect 后主列表已关、中继尚未就绪 → 像「没反应」。
 */
const WC_HTTPS_ORIGINS = [
  'https://api.web3modal.org',
  'https://pulse.walletconnect.org',
] as const

export function injectWalletConnectInfraPreconnect(attr = 'data-wc-infra-preconnect') {
  if (typeof document === 'undefined') return
  for (const href of WC_HTTPS_ORIGINS) {
    if (document.querySelector(`link[${attr}="${href}"]`)) continue
    const link = document.createElement('link')
    link.rel = 'preconnect'
    link.href = href
    link.crossOrigin = 'anonymous'
    link.setAttribute(attr, href)
    document.head.appendChild(link)
  }
}

/** 在打开 RainbowKit 连接弹窗前调用，提前握手 WalletConnect 相关域名 */
export function warmConnectModal() {
  injectWalletConnectInfraPreconnect()
}
