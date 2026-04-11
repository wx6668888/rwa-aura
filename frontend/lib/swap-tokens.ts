import type { Address } from 'viem'
import { getAddress } from 'viem'
import { bsc } from 'wagmi/chains'
import { CONTRACT_ADDRESSES } from '@/lib/contracts/addresses'

/** BSC 主网 WBNB（Pancake 常用底池资产） */
export const WBNB_BSC = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c' as const

/**
 * PancakeSwap 代币图标 CDN（BSC 合约 checksummed 地址）
 * @see https://tokens.pancakeswap.finance
 */
export function pcsTokenIconUrl(contract: string): string {
  try {
    return `https://tokens.pancakeswap.finance/images/${getAddress(contract as Address)}.png`
  } catch {
    return `https://tokens.pancakeswap.finance/images/${contract}.png`
  }
}

export type SwapTokenId = 'USDT' | 'RWA' | 'WBNB'

/** 当前可在 DEX/路由内兑换的代币 */
export type SwapTokenMeta = {
  id: SwapTokenId
  symbol: string
  name: string
  address: Address
  decimals: number
  /** 无图标或加载失败时，Swap 行用渐变字标回退 */
  accent: string
  iconUrl: string
  tradeable: true
}

/** 展示用 BSC 资产，暂不可在本站兑换 */
export type SwapTokenPreview = {
  id: string
  symbol: string
  name: string
  iconUrl: string
  tradeable: false
}

export type SwapTokenListItem = SwapTokenMeta | SwapTokenPreview

export function isTradeableSwapToken(t: SwapTokenListItem): t is SwapTokenMeta {
  return t.tradeable === true
}

/** 更多 BSC 常见资产（图标来自 Pancake 代币库；本站兑换待开放） */
const BSC_PREVIEW_TOKENS: Omit<SwapTokenPreview, 'tradeable' | 'iconUrl'>[] = [
  { id: 'ADA', symbol: 'ADA', name: 'Cardano Token' },
  { id: 'ATOM', symbol: 'ATOM', name: 'Cosmos Hub' },
  { id: 'AVAX', symbol: 'AVAX', name: 'Avalanche' },
  { id: 'BTCB', symbol: 'BTCB', name: 'Binance-Peg BTCB' },
  { id: 'BUSD', symbol: 'BUSD', name: 'BUSD Token' },
  { id: 'CAKE', symbol: 'CAKE', name: 'PancakeSwap' },
  { id: 'DOGE', symbol: 'DOGE', name: 'Binance-Peg Dogecoin' },
  { id: 'DOT', symbol: 'DOT', name: 'Polkadot' },
  { id: 'ETH', symbol: 'ETH', name: 'Binance-Peg Ethereum' },
  { id: 'FDUSD', symbol: 'FDUSD', name: 'First Digital USD' },
  { id: 'LINK', symbol: 'LINK', name: 'ChainLink' },
  { id: 'LTC', symbol: 'LTC', name: 'Litecoin' },
  { id: 'MATIC', symbol: 'MATIC', name: 'Polygon' },
  { id: 'SHIB', symbol: 'SHIB', name: 'SHIBA INU' },
  { id: 'TRX', symbol: 'TRX', name: 'TRON' },
  { id: 'TWT', symbol: 'TWT', name: 'Trust Wallet' },
  { id: 'UNI', symbol: 'UNI', name: 'Uniswap' },
  { id: 'USDC', symbol: 'USDC', name: 'USD Coin' },
  { id: 'XRP', symbol: 'XRP', name: 'XRP Token' },
]

/** BSC 主网合约 → Pancake 图标 */
const PREVIEW_CONTRACT: Record<string, `0x${string}`> = {
  ADA: '0x3EE2200Efb3400fAbB9AacF31297cBdD1d435D47',
  ATOM: '0x0Eb3a705FC546925AfEBFDcaF082bF6EA662071a',
  AVAX: '0x1CE0c2827e2eF14D5C4f29a091d735A204204031',
  BTCB: '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c',
  BUSD: '0xe9e7cea3dedca5984780bafc599bd69add087d56',
  CAKE: '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82',
  DOGE: '0xbA2aE424d960c26247Dd6c32edC70B295c744C43',
  DOT: '0x7083609fCE4d1d8Dc0C979AAb8c869Ea2C873402',
  ETH: '0x2170Ed0880ac9A755fd29B2688956BD959F933F8',
  FDUSD: '0xc5f0f7b66764F6ec8C8Dff7BA683102295E16409',
  LINK: '0xF8A0BF9cF54Bb92F17374d9e9A321E6a111a51bD',
  LTC: '0x4338665CBB7B2485A8855A139b75D5e34AB0DB94',
  MATIC: '0xCC42724C6683B7E57334c4E856f4c9969BB68c840',
  SHIB: '0x2859e4544C4bB03966803b044A93563Bd2D0DD4D',
  TRX: '0x85EAC5Ac2F758618dFa09bDbe0cf174e7d574D5B',
  TWT: '0x4B0F1812e5Df2A09796481Ff14017e6005508003',
  UNI: '0xBf5140A22578168FD562DcF235F5D42A02D12Fc1',
  USDC: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
  XRP: '0x1D2F0da169ceB9fC7B3144628dB156f3F6c60dBE',
}

function buildPreviewRows(): SwapTokenPreview[] {
  return BSC_PREVIEW_TOKENS.map((row) => {
    const addr = PREVIEW_CONTRACT[row.id]
    return {
      ...row,
      iconUrl: addr ? pcsTokenIconUrl(addr) : '',
      tradeable: false as const,
    }
  }).sort((a, b) => a.symbol.localeCompare(b.symbol))
}

export function getDexTokens(chainId: number | undefined): SwapTokenListItem[] {
  const id = chainId ?? bsc.id
  const a = CONTRACT_ADDRESSES[id as keyof typeof CONTRACT_ADDRESSES]
  if (!a) {
    return []
  }

  const tradeable: SwapTokenMeta[] = [
    {
      id: 'USDT',
      symbol: 'USDT',
      name: 'Tether USD',
      address: a.usdtToken as Address,
      // BSC 主网 USDT(0x55d398...) 精度为 18；此前写成 6 会导致余额放大 1e12
      decimals: 18,
      accent: 'from-[#26a17b] to-[#1a8f6a]',
      iconUrl: pcsTokenIconUrl(a.usdtToken),
      tradeable: true,
    },
    {
      id: 'RWA',
      symbol: 'RWA',
      name: 'RWA Protocol',
      address: a.rwaToken as Address,
      decimals: 18,
      accent: 'from-[#00f5d4] to-[#00b4a0]',
      /** 仅 RWA 使用站点小图（WebP ~1KB）；大图见 public/app-icon.png */
      iconUrl: '/rwa-icon-64.webp',
      tradeable: true,
    },
    {
      id: 'WBNB',
      symbol: 'WBNB',
      name: 'Wrapped BNB',
      address: WBNB_BSC,
      decimals: 18,
      accent: 'from-[#f3ba2f] to-[#d4a017]',
      iconUrl: pcsTokenIconUrl(WBNB_BSC),
      tradeable: true,
    },
  ]

  return [...tradeable, ...buildPreviewRows()]
}

export function getTokenById(chainId: number | undefined, tokenId: SwapTokenId): SwapTokenMeta | undefined {
  const row = getDexTokens(chainId).find((t) => t.id === tokenId)
  return row && isTradeableSwapToken(row) ? row : undefined
}

/** 与 TokenSelectSheet 一致的渐变回退（非 DEX 代币） */
const WALLET_PREVIEW_ACCENT = 'from-slate-600 to-slate-800'

export type WalletBalanceTarget = 'native' | Address

/** 钱包资产弹窗行：与 /swap 选币列表同源顺序与图标 */
export type WalletAssetRow = {
  key: string
  symbol: string
  name: string
  iconUrl: string
  accent: string
  balanceTarget: WalletBalanceTarget
  /** 用于余额解析与折合 USDT；预览资产多为 18 */
  decimals: number
  /** 与站内 DEX 可兑换列表一致；false 时显示「待开放」徽标 */
  dexTradeable: boolean
}

/**
 * BNB 原生 → RWA → USDT → WBNB → 其余 BSC 预览资产（与 Swap 弹层相同集合）
 */
export function getWalletAssetRows(chainId: number | undefined): WalletAssetRow[] {
  const all = getDexTokens(chainId)
  if (all.length === 0) return []

  const tradeable = all.filter(isTradeableSwapToken)
  const rwa = tradeable.find((t) => t.id === 'RWA')
  const usdt = tradeable.find((t) => t.id === 'USDT')
  const wbnb = tradeable.find((t) => t.id === 'WBNB')
  const restT = tradeable.filter((t) => !['RWA', 'USDT', 'WBNB'].includes(t.id))

  const nativeRow: WalletAssetRow = {
    key: 'BNB-native',
    symbol: 'BNB',
    name: 'BNB',
    iconUrl: pcsTokenIconUrl(WBNB_BSC),
    accent: 'from-[#f3ba2f] to-[#d4a017]',
    balanceTarget: 'native',
    decimals: 18,
    dexTradeable: false,
  }

  const metaToRow = (t: SwapTokenMeta): WalletAssetRow => ({
    key: t.id,
    symbol: t.symbol,
    name: t.name,
    iconUrl: t.iconUrl,
    accent: t.accent,
    balanceTarget: t.address,
    decimals: t.decimals,
    dexTradeable: true,
  })

  const previewRows: WalletAssetRow[] = all
    .filter((x): x is SwapTokenPreview => !isTradeableSwapToken(x))
    .map((p) => {
      const addr = PREVIEW_CONTRACT[p.id]
      return {
        key: p.id,
        symbol: p.symbol,
        name: p.name,
        iconUrl: p.iconUrl,
        accent: WALLET_PREVIEW_ACCENT,
        balanceTarget: addr as Address,
        decimals: 18,
        dexTradeable: false,
      }
    })
    .filter((r) => r.balanceTarget)

  const out: WalletAssetRow[] = [nativeRow]
  if (rwa) out.push(metaToRow(rwa))
  if (usdt) out.push(metaToRow(usdt))
  if (wbnb) out.push(metaToRow(wbnb))
  restT.forEach((t) => out.push(metaToRow(t)))
  out.push(...previewRows)
  return out
}
