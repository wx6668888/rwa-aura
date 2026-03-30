'use client'

import { useMemo } from 'react'
import { erc20Abi, formatUnits } from 'viem'
import { useBalance, useReadContracts } from 'wagmi'
import { useQuery } from '@tanstack/react-query'
import type { WalletAssetRow } from '@/lib/swap-tokens'

/** 与弹窗说明一致：RWA 按 0.85 USDT/枚折算 */
export const WALLET_RWA_USDT_RATE = 0.85

const STABLE_SYMBOLS = new Set(['USDT', 'USDC', 'BUSD', 'FDUSD'])
const PRICEABLE_SYMBOLS = new Set(['RWA', 'USDT', 'WBNB', 'USDC', 'BUSD', 'FDUSD'])

/** 返回代币余额的映射：symbol -> formatted amount */
export type WalletBalancesMap = Record<string, string>

export function useWalletUsdtEstimate(
  address: `0x${string}` | undefined,
  rows: WalletAssetRow[],
  enabled: boolean
) {
  const shouldFetch = Boolean(enabled && address)

  // 弹窗里会展示很多预览资产，但目前仅对可明确定价的部分做折算
  const erc20Rows = useMemo(
    () => rows.filter((r) => r.balanceTarget !== 'native' && PRICEABLE_SYMBOLS.has(r.symbol)),
    [rows],
  )

  const contracts = useMemo(
    () =>
      shouldFetch
        ? erc20Rows.map((r) => ({
            address: r.balanceTarget as `0x${string}`,
            abi: erc20Abi,
            functionName: 'balanceOf' as const,
            args: [address],
          }))
        : [],
    [erc20Rows, address, shouldFetch]
  )

  const nativeQuery = useBalance({
    address: shouldFetch ? address : undefined,
    query: { enabled: shouldFetch },
  })

  const erc20Query = useReadContracts({
    contracts,
    query: { enabled: shouldFetch && contracts.length > 0 },
  })

  const bnbPriceQuery = useQuery({
    queryKey: ['walletModalBnbUsdt'],
    queryFn: async () => {
      const res = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BNBUSDT')
      if (!res.ok) throw new Error('BNB price')
      const j = (await res.json()) as { price: string }
      return parseFloat(j.price)
    },
    staleTime: 60_000,
    enabled: shouldFetch,
    retry: 2,
  })

  const nativeRow = useMemo(() => rows.find((r) => r.balanceTarget === 'native'), [rows])

  // 仅用于 BNB/WBNB 折算；拿不到时允许仅展示 RWA/稳定币等可用部分
  const bnbUsd = bnbPriceQuery.data ?? null

  const isBalancesReady =
    shouldFetch &&
    !nativeQuery.isPending &&
    (contracts.length === 0 || !erc20Query.isPending)

  const totalUsdt = useMemo(() => {
    if (!enabled || !address || !isBalancesReady) return null

    let sum = 0

    if (nativeRow && nativeQuery.data?.value != null && bnbUsd != null) {
      const amt = parseFloat(formatUnits(nativeQuery.data.value, nativeRow.decimals))
      sum += amt * bnbUsd
    }

    if (contracts.length > 0 && erc20Query.data) {
      erc20Rows.forEach((row, i) => {
        const r = erc20Query.data![i]
        if (r?.status !== 'success' || r.result == null) return
        const raw = r.result as bigint
        const amt = parseFloat(formatUnits(raw, row.decimals))

        if (row.symbol === 'RWA') sum += amt * WALLET_RWA_USDT_RATE
        else if (row.symbol === 'WBNB' && bnbUsd != null) sum += amt * bnbUsd
        else if (STABLE_SYMBOLS.has(row.symbol)) sum += amt
      })
    }

    return sum
  }, [
    enabled,
    address,
    isBalancesReady,
    bnbUsd,
    nativeRow,
    nativeQuery.data,
    contracts.length,
    erc20Query.data,
    erc20Rows,
  ])

  const isLoading = Boolean(enabled && address) && !isBalancesReady

  // 创建余额映射，供组件直接使用
  const balancesMap = useMemo<WalletBalancesMap>(() => {
    const map: WalletBalancesMap = {}
    if (nativeRow && nativeQuery.data?.value != null) {
      map[nativeRow.symbol] = formatUnits(nativeQuery.data.value, nativeRow.decimals)
    }
    if (erc20Query.data) {
      erc20Rows.forEach((row, i) => {
        const r = erc20Query.data![i]
        if (r?.status === 'success' && r.result !== undefined) {
          map[row.symbol] = formatUnits(r.result as bigint, row.decimals)
        }
      })
    }
    return map
  }, [nativeRow, nativeQuery.data, erc20Query.data, erc20Rows])

  return { totalUsdt, isLoading, balancesMap }
}
