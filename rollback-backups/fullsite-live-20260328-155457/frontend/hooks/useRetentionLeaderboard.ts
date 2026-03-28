'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAccount } from 'wagmi'

export type RetentionRow = {
  rank: number
  address: string
  teamRetainedUsdt: number
  directReferrals: number
  level: number
}

export function useRetentionLeaderboard(limit = 50) {
  const { address } = useAccount()
  const [rows, setRows] = useState<RetentionRow[]>([])
  const [myRank, setMyRank] = useState<number | null>(null)
  const [myRetainedUsdt, setMyRetainedUsdt] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const q = new URLSearchParams({ limit: String(limit) })
      if (address) q.set('address', address.toLowerCase())
      const res = await fetch(`/api/stats/leaderboard-retention?${q}`)
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'failed')
      setRows(json.data?.rows || [])
      setMyRank(json.data?.myRank ?? null)
      setMyRetainedUsdt(Number(json.data?.myRetainedUsdt) || 0)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'error')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [address, limit])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { rows, myRank, myRetainedUsdt, loading, error, refresh }
}
