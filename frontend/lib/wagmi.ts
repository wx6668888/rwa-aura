import { http, createConfig } from 'wagmi'
import { bsc, bscTestnet } from 'wagmi/chains'
import { connectorsForWallets } from '@rainbow-me/rainbowkit'
import { binanceWallet, okxWallet, metaMaskWallet, walletConnectWallet } from '@rainbow-me/rainbowkit/wallets'
import { defineChain } from 'viem'

// 定义 Hardhat 本地链
export const hardhatLocal = defineChain({
  id: 31337,
  name: 'Hardhat Local',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: ['http://127.0.0.1:8545'],
    },
    public: {
      http: ['http://127.0.0.1:8545'],
    },
  },
  testnet: true,
})

// WalletConnect Project ID - 你需要从 https://cloud.walletconnect.com/ 获取
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '00000000000000000000000000000000'

// 国内网络优化：使用可访问的 RPC，避免默认节点超时导致一直转圈
// 部署在测试网时主要用 BSC Testnet，可在 .env 配置 NEXT_PUBLIC_BSC_RPC_URL / NEXT_PUBLIC_BSC_TESTNET_RPC_URL
const bscRpcUrl = process.env.NEXT_PUBLIC_BSC_RPC_URL || 'https://bsc-dataseed1.defibit.io'
// 测试网默认用 publicnode，国内比 binance.org 测试网节点更易访问
const bscTestnetRpcUrl = process.env.NEXT_PUBLIC_BSC_TESTNET_RPC_URL || 'https://bsc-testnet.publicnode.com'

// 如果没有配置 projectId，在开发环境给出警告
if (!projectId && typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  console.warn(
    '⚠️ WalletConnect Project ID 未配置。\n' +
    '为了获得更好的移动端钱包连接体验，请配置 NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID。\n' +
    '获取方式：访问 https://cloud.walletconnect.com/ 注册并创建项目，然后复制 Project ID 到 .env.local 文件'
  )
}

// 自定义钱包顺序：前三位为 币安、欧易、小狐狸，其余通过 WalletConnect 连接
const connectors = connectorsForWallets(
  [
    {
      groupName: 'Recommended',
      wallets: [
        binanceWallet,
        okxWallet,
        metaMaskWallet,
        walletConnectWallet,
      ],
    },
  ],
  {
    appName: 'RWA Protocol',
    projectId,
  }
)

// 使用 createConfig 手动配置，兼容 wagmi v2；BSC 使用国内可访问的 RPC 减少转圈
export const config = createConfig({
  chains: [hardhatLocal, bsc, bscTestnet],
  connectors,
  transports: {
    [hardhatLocal.id]: http('http://127.0.0.1:8545'),
    [bsc.id]: http(bscRpcUrl),
    [bscTestnet.id]: http(bscTestnetRpcUrl),
  },
  ssr: true,
})

declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
}
