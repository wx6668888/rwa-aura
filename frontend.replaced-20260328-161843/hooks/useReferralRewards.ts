'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAccount } from 'wagmi'

interface ReferralRewards {
  matured: number
  pending: number
  maturedCount: number
  pendingCount: number
  settledThisMonth: number
}

export function useReferralRewards() {
  const { address, isConnected } = useAccount()
  const [rewards, setRewards] = useState<ReferralRewards>({
    matured: 0,
    pending: 0,
    maturedCount: 0,
    pendingCount: 0,
    settledThisMonth: 0,
  })
  const [nextSettlement, setNextSettlement] = useState<string | null>(null)
  const [totalPending, setTotalPending] = useState<number>(0)
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    if (!isConnected || !address) {
      setRewards({ matured: 0, pending: 0, maturedCount: 0, pendingCount: 0, settledThisMonth: 0 })
      setNextSettlement(null)
      setTotalPending(0)
      return
    }
    setLoading(true)
    try {
      const [res, detailRes] = await Promise.all([
        fetch(`/api/referral-rewards/${address}`),
        fetch(`/api/referral-rewards-detail/${address}`),
      ])

      const data = await res.json()
      if (data?.success && data?.data) {
        setRewards({
          matured: data.data.matured ?? 0,
          pending: data.data.pending ?? 0,
          maturedCount: data.data.maturedCount ?? 0,
          pendingCount: data.data.pendingCount ?? 0,
          settledThisMonth: data.data.settledThisMonth ?? 0,
        })
      }

      const detail = await detailRes.json()
      if (detail?.success && detail?.data) {
        setNextSettlement(detail.data.nextSettlement || null)
        const p = parseFloat(detail.data.totalPending || '0')
        setTotalPending(Number.isFinite(p) ? p : 0)
      }
    } catch (error) {
      console.error('Failed to fetch referral rewards:', error)
    } finally {
      setLoading(false)
    }
  }, [address, isConnected])

  useEffect(() => {
    void refresh()
    const interval = setInterval(() => void refresh(), 30000)
    return () => clearInterval(interval)
  }, [refresh])

  return { rewards, loading, nextSettlement, totalPending, refresh }
}
