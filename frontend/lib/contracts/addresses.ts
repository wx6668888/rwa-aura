import { bsc } from 'wagmi/chains'

// BSC 主网已部署合约（与 .env.local 一致，作为 fallback 避免未配置时用零地址）
const BSC_MAINNET_STAKING = process.env.NEXT_PUBLIC_STAKING_CONTRACT_BSC || '0x8FA4A4BE954a80c940623DDa1ed6e3D50FC25175'
const BSC_MAINNET_RWA = process.env.NEXT_PUBLIC_RWA_TOKEN_BSC || '0x0B4f2Ca412466fDBf7B0691Ca6F5b51A197f4812'
const BSC_MAINNET_LOTTERY = process.env.NEXT_PUBLIC_LOTTERY_CONTRACT_BSC || '0xD4Fce5360C56200ca299EF53E13904dAf1b1662c'

export const CONTRACT_ADDRESSES = {
  [bsc.id]: {
    stakingContract: BSC_MAINNET_STAKING,
    usdtToken: '0x55d398326f99059fF775485246999027B3197955',
    rwaToken: BSC_MAINNET_RWA,
    // 专用 USDT↔RWA 互换合约（不依赖 PancakeSwap 流动性）
    usdtRwaSwap: process.env.NEXT_PUBLIC_USDT_RWA_SWAP_BSC || '0xE6812B78091D64D983079B375c9afEfF9d2EB764',
    stRWA: process.env.NEXT_PUBLIC_ST_RWA_BSC || '0x0000000000000000000000000000000000000000',
    swapContract: process.env.NEXT_PUBLIC_SWAP_CONTRACT_BSC || '0x0000000000000000000000000000000000000000',
    treasuryContract: process.env.NEXT_PUBLIC_TREASURY_CONTRACT_BSC || '0x0000000000000000000000000000000000000000',
    lotteryContract: BSC_MAINNET_LOTTERY,
    teamDividendPool: process.env.NEXT_PUBLIC_TEAM_DIVIDEND_POOL_BSC || '0x0000000000000000000000000000000000000000',
    ReferralRewardPool: process.env.NEXT_PUBLIC_REFERRAL_REWARD_POOL_BSC || '0x0000000000000000000000000000000000000000',
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
