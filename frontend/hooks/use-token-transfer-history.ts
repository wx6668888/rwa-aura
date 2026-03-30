'use client'

import { useCallback, useEffect, useState } from 'react'
import { formatUnits } from 'viem'

export type TokenTransferItem = {
  txHash: `0x${string}`
  logIndex: number
  blockNumber: number
  timestampMs: number
  from: `0x${string}`
  to: `0x${string}`
  value: bigint
  direction: 'in' | 'out'
}

export function useTokenTransferHistory(
  tokenAddress: `0x${string}` | undefined,
  userAddress: `0x${string}` | undefined,
  tokenDecimals: number,
  maxRows: number,
  enabled: boolean
) {
  const [items, setItems] = useState<TokenTransferItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const scaleToTokenDecimals = useCallback(
    (raw: string, rowDecimals: number): bigint => {
      let v = BigInt(0)
      try {
        v = BigInt(raw || '0')
      } catch {
        v = BigInt(0)
      }
      const from = Number.isFinite(rowDecimals) ? Math.max(0, Math.floor(rowDecimals)) : tokenDecimals
      const to = Math.max(0, Math.floor(tokenDecimals))
      if (from === to) return v
      const diff = Math.abs(to - from)
      let mul = BigInt(1)
      for (let i = 0; i < diff; i++) mul *= BigInt(10)
      return from < to ? v * mul : v / mul
    },
    [tokenDecimals]
  )

  const fetchHistory = useCallback(async () => {
    if (!tokenAddress || !userAddress || !enabled) {
      setItems([])
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const qs = new URLSearchParams({
        address: userAddress,
        tokenAddress,
        limit: String(maxRows),
      })
      const resp = await fetch(`/api/wallet/token-transfers?${qs.toString()}`)
      const json = await resp.json()
      if (!resp.ok || !json?.success || !Array.isArray(json?.data?.rows)) {
        throw new Error('failed to fetch transfers')
      }
      const normalized: TokenTransferItem[] = (json.data.rows as any[]).map((r) => {
        const from = String(r.from || '').toLowerCase() as `0x${string}`
        const to = String(r.to || '').toLowerCase() as `0x${string}`
        const rowDecimals = Number(r.tokenDecimal ?? tokenDecimals)
        return {
          txHash: String(r.txHash || '') as `0x${string}`,
          logIndex: Number(r.logIndex || 0),
          blockNumber: Number(r.blockNumber || 0),
          timestampMs: Number(r.timestampMs || 0),
          from,
          to,
          value: scaleToTokenDecimals(String(r.valueRaw || '0'), rowDecimals),
          direction: from === userAddress.toLowerCase() ? 'out' : 'in',
        }
      })
      setItems(normalized)
    } catch (e) {
      console.error('[useTokenTransferHistory]', e)
      setError('api')
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [tokenAddress, userAddress, maxRows, enabled, tokenDecimals, scaleToTokenDecimals])

  useEffect(() => {
    if (!enabled) {
      setItems([])
      setError(null)
      return
    }
    fetchHistory()
  }, [enabled, fetchHistory])

  return { items, loading, error, refetch: fetchHistory, formatAmount: (v: bigint) => formatUnits(v, tokenDecimals) }
}
