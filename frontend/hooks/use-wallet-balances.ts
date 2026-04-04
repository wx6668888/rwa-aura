'use client'

import { useMemo } from 'react'
import { erc20Abi, formatUnits } from 'viem'
import { useBalance, useReadContracts } from 'wagmi'
import type { WalletAssetRow } from '@/lib/swap-tokens'

export function useWalletBalances(
  address: `0x${string}` | undefined,
  rows: WalletAssetRow[],
  enabled: boolean
) {
  const shouldFetch = Boolean(enabled && address)

  const erc20Rows = useMemo(
    () => rows.filter((r) => r.balanceTarget !== 'native'),
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

  const isLoading = Boolean(enabled && address) && (nativeQuery.isPending || erc20Query.isPending)

  return {
    nativeQuery,
    erc20Query,
    erc20Rows,
    isLoading,
  }
}
