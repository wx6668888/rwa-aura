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
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isConnected || !address) {
      setRewards({ matured: 0, pending: 0, maturedCount: 0, pendingCount: 0 })
      return
    }

    const fetchRewards = async () => {
      setLoading(true)
      try {
        const res = await fetch(`http://localhost:3001/api/referral-rewards/${address}`)
        const data = await res.json()
        if (data.success) {
          setRewards(data.data)
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

  return { rewards, loading }
}
