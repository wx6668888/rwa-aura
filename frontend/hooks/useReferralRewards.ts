'use client'

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'

interface ReferralRewards {
  matured: number
  pending: number
  maturedCount: number
  pendingCount: number
}

export function useReferralRewards() {
  const { address, isConnected } = useAccount()
  const [rewards, setRewards] = useState<ReferralRewards>({
    matured: 0,
    pending: 0,
    maturedCount: 0,
    pendingCount: 0
  })
  const [nextSettlement, setNextSettlement] = useState<string | null>(null)
  const [totalPending, setTotalPending] = useState<number>(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isConnected || !address) {
      setRewards({ matured: 0, pending: 0, maturedCount: 0, pendingCount: 0 })
      setNextSettlement(null)
      setTotalPending(0)
      return
    }

    const fetchRewards = async () => {
      setLoading(true)
      try {
        const API_BASE =
          process.env.NEXT_PUBLIC_API_URL ||
          process.env.NEXT_PUBLIC_RELAYER_URL ||
          'http://localhost:3001'

        const [res, detailRes] = await Promise.all([
          fetch(`${API_BASE}/api/referral-rewards/${address}`),
          fetch(`${API_BASE}/api/referral-rewards-detail/${address}`),
        ])

        const data = await res.json()
        if (data?.success && data?.data) {
          setRewards(data.data)
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
    }

    fetchRewards()
    const interval = setInterval(fetchRewards, 30000) // 每30秒更新
    return () => clearInterval(interval)
  }, [address, isConnected])

  return { rewards, loading, nextSettlement, totalPending }
}
