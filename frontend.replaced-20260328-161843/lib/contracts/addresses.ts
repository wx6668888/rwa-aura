import { bsc } from 'wagmi/chains'

// BSC 主网已部署合约（与 backend/src/config/bsc-mainnet-addresses.ts、backend/.env 须一致）
const BSC_MAINNET_STAKING = process.env.NEXT_PUBLIC_STAKING_CONTRACT_BSC || '0x1E297055ffAA3BDD2a2eD96bD86A1B89d9245f99'
const BSC_MAINNET_RWA = process.env.NEXT_PUBLIC_RWA_TOKEN_BSC || '0x9EF16931f3628f48dE1A2FfCF6f7fdf34A5240A6'
const BSC_MAINNET_USDT =
  process.env.NEXT_PUBLIC_USDT_TOKEN_BSC || '0x55d398326f99059fF775485246999027B3197955'
/** 迁移前老 Staking 绑定的 RWA（BSC 主网）；用于提示「新版合约余额为 0 但旧版有余额」的用户 */
const BSC_MAINNET_LEGACY_RWA =
  process.env.NEXT_PUBLIC_LEGACY_RWA_TOKEN_BSC || '0x0b4f2cA412466fdbF7b0691cA6F5B51a197f4812'
const BSC_MAINNET_LOTTERY =
  process.env.NEXT_PUBLIC_LOTTERY_CONTRACT_BSC || '0x82D475812BE018BF113c6815783DFa6d6658Ff88'

export const CONTRACT_ADDRESSES = {
  [bsc.id]: {
    stakingContract: BSC_MAINNET_STAKING,
    usdtToken: BSC_MAINNET_USDT,
    rwaToken: BSC_MAINNET_RWA,
    /** 与 rwaToken 相同时可不展示「旧版余额」行 */
    legacyRwaToken:
      BSC_MAINNET_LEGACY_RWA.toLowerCase() === BSC_MAINNET_RWA.toLowerCase()
        ? ''
        : BSC_MAINNET_LEGACY_RWA,
    // 专用 USDT↔RWA 互换合约（不依赖 PancakeSwap 流动性）
    usdtRwaSwap: process.env.NEXT_PUBLIC_USDT_RWA_SWAP_BSC || '0x485a3bba1EB07680E418846ba412f1BB1E65F7a1',
    stRWA: process.env.NEXT_PUBLIC_ST_RWA_BSC || '0xE86fF3ddC9e1e39c5b3aee90a01C487882C9DAF1',
    swapContract: process.env.NEXT_PUBLIC_SWAP_CONTRACT_BSC || '0xdE4296FD71c0634129C93155b9DB68eF647B326b',
    treasuryContract: process.env.NEXT_PUBLIC_TREASURY_CONTRACT_BSC || '0x80c992C57c6439163E14050d01d1387706a27D37',
    lotteryContract: BSC_MAINNET_LOTTERY,
    teamDividendPool:
      process.env.NEXT_PUBLIC_TEAM_DIVIDEND_POOL_BSC || '0x1616E70452c5A4adcF9faA93c5a4A691d0215924',
    ReferralRewardPool:
      process.env.NEXT_PUBLIC_REFERRAL_REWARD_POOL_BSC || '0x80748B89042Ee30953E55856Cac473D1126720A6',
  },
} as const

export type ContractAddresses = typeof CONTRACT_ADDRESSES
export type ChainId = keyof ContractAddresses

/** BSC 浏览器根 URL（勿带末尾 /） */
export const BSC_BLOCK_EXPLORER = (
  typeof process !== 'undefined' && process.env.NEXT_PUBLIC_BSC_EXPLORER_URL
    ? process.env.NEXT_PUBLIC_BSC_EXPLORER_URL
    : 'https://bscscan.com'
).replace(/\/$/, '')

export function bscscanAddressUrl(addr: string) {
  return `${BSC_BLOCK_EXPLORER}/address/${addr}`
}

export function bscscanTokenUrl(tokenAddress: string) {
  return `${BSC_BLOCK_EXPLORER}/token/${tokenAddress}`
}

/** 站点对外链接（与导航/公告等保持一致） */
export const SITE_EXTERNAL = {
  twitter: 'https://twitter.com/RWAProtocol',
  telegram: 'https://t.me/RWAProtocol',
  discord: 'https://discord.gg/RWAProtocol',
  github: 'https://github.com/rwa-protocol',
} as const
