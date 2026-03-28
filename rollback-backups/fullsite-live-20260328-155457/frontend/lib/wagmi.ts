import { http, createConfig } from 'wagmi'
import { bsc } from 'wagmi/chains'
import { connectorsForWallets } from '@rainbow-me/rainbowkit'
import { binanceWallet, okxWallet, metaMaskWallet, walletConnectWallet } from '@rainbow-me/rainbowkit/wallets'
import { isCapacitorNativeAndroid, isLikelyAndroidSystemWebView } from '@/lib/wallet-environment'

// WalletConnect Project ID - 你需要从 https://cloud.walletconnect.com/ 获取
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '00000000000000000000000000000000'

// 国内网络优化：可选覆盖 WalletConnect relay（默认通常是 wss://relay.walletconnect.org）
const walletConnectRelayUrl = process.env.NEXT_PUBLIC_WALLETCONNECT_RELAY_URL?.trim()

// 供前端 session 恢复逻辑判断：relayUrl 发生变化时清理旧缓存
export const WALLETCONNECT_RELAY_URL = walletConnectRelayUrl || ''

// 与 Capacitor / 生产站点一致，供 WalletConnect 元数据与 Universal Link 校验
const appUrl =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'https://rwaprotocol.dpdns.org'

// 钱包授权后「跳回 DApp」：须与 AndroidManifest 里的 intent-filter 一致（见 docs/CAPACITOR_ANDROID.md）
const wcRedirectNative =
  process.env.NEXT_PUBLIC_WC_REDIRECT_NATIVE?.trim() || 'rwaprotocol://wc'

const isInvalidWalletConnectProjectId =
  !projectId || /^0+$/.test(projectId.replace(/-/g, '')) || projectId === '00000000000000000000000000000000'

// 国内网络优化：使用可访问的主网 RPC，避免默认节点超时导致一直转圈
const bscRpcUrl = process.env.NEXT_PUBLIC_BSC_RPC_URL || 'https://bsc-dataseed1.defibit.io'

// 占位或缺失 Project ID 时提示（安卓 WalletConnect 深链依赖有效 ID）
if (isInvalidWalletConnectProjectId && typeof window !== 'undefined') {
  console.warn(
    '⚠️ WalletConnect Project ID 无效或未配置，移动端（尤其安卓应用内）连接可能失败。\n' +
      '请在环境变量中设置 NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID（https://cloud.walletconnect.com/）。'
  )
}

/**
 * 在安卓系统 WebView / Capacitor 壳内，MetaMask「浏览器扩展式」入口几乎不可用，
 * 隐藏该选项，避免用户反复点失败；仍可通过 WalletConnect 选择 MetaMask 移动端。
 */
function metaMaskWalletForAndroidShell() {
  return ((params: Parameters<typeof metaMaskWallet>[0]) => {
    const base = metaMaskWallet(params)
    const prevHidden = base.hidden
    return {
      ...base,
      hidden: () => {
        if (typeof window === 'undefined') return prevHidden?.() ?? false
        if (isLikelyAndroidSystemWebView() || isCapacitorNativeAndroid()) return true
        return prevHidden?.() ?? false
      },
    }
  }) as typeof metaMaskWallet
}

// 构建用：在 Capacitor 包中可设 NEXT_PUBLIC_PREFER_WALLETCONNECT_FIRST=1，把 WC 提到最前
const preferWalletConnectFirst = process.env.NEXT_PUBLIC_PREFER_WALLETCONNECT_FIRST === '1'

const shellSafeMetaMask = metaMaskWalletForAndroidShell()

const recommendedWallets = preferWalletConnectFirst
  ? [walletConnectWallet, binanceWallet, okxWallet, shellSafeMetaMask]
  : [binanceWallet, okxWallet, walletConnectWallet, shellSafeMetaMask]

// 自定义钱包顺序：币安 / 欧易 / WalletConnect（深链）优先于 MetaMask 浏览器入口
const connectors = connectorsForWallets(
  [
    {
      groupName: 'Recommended',
      wallets: recommendedWallets,
    },
  ],
  {
    appName: 'RWA Protocol',
    appDescription: 'RWA Protocol on BSC',
    appUrl,
    projectId,
    walletConnectParameters: {
      metadata: {
        name: 'RWA Protocol',
        description: 'RWA Protocol on BSC',
        url: appUrl,
        icons: [`${appUrl}/icon.svg`],
        redirect: {
          native: wcRedirectNative,
          // 去掉末尾 `/`，避免部分钱包深链/通用回跳时 URL 匹配失败
          universal: `${appUrl}`,
        },
      },
      ...(walletConnectRelayUrl ? { relayUrl: walletConnectRelayUrl } : {}),
    },
  }
)

// 仅 BSC 主网（已移除 Hardhat Local，避免移动端 WalletConnect 协商 31337 导致钱包报错）
export const config = createConfig({
  chains: [bsc],
  connectors,
  transports: {
    [bsc.id]: http(bscRpcUrl),
  },
  ssr: true,
})

declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
}
