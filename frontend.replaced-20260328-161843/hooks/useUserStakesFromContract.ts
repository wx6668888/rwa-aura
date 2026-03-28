import { useAccount } from 'wagmi'
import { useState, useEffect } from 'react'

const API_BASE = process.env.NEXT_PUBLIC_RELAYER_URL || 'http://localhost:3001'

export interface UserStake {
  stakeId: string
  amount: string
  timestamp: number
  lockPeriod?: 'flexible' | '30' | '90' | '180' | '365'
  isRWAStake?: boolean
  tokenDecimals?: number
}

function mapLockPeriod(days: number): UserStake['lockPeriod'] {
  if (days === 30) return '30'
  if (days === 90) return '90'
  if (days === 180) return '180'
  if (days === 365) return '365'
  return 'flexible'
}

export function useUserStakes() {
  const { address } = useAccount()
  const [stakes, setStakes] = useState<UserStake[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStakes() {
      if (!address) {
        setStakes([])
        setLoading(false)
        return
      }

      try {
        // 使用返回明细的 API
        const res = await fetch(`${API_BASE}/api/data/${address}/stake-list`)
        if (!res.ok) {
          setStakes([])
          setLoading(false)
          return
        }
        
        const json = await res.json()
        const stakesData = json?.data ?? []
        
        const stakeList = stakesData.map((s: any) => ({
          stakeId: s.stakeId,
          amount: s.amount,
          timestamp: s.timestamp,
          lockPeriod: mapLockPeriod(s.lockPeriod),
          isRWAStake: s.assetType === 'RWA',
          tokenDecimals: 18,
        }))
        
        setStakes(stakeList)
      } catch (err) {
        console.error('Failed to fetch stakes:', err)
        setStakes([])
      } finally {
        setLoading(false)
      }
    }

    fetchStakes()
  }, [address])

  const refetch = async () => {
    if (!address) return
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/data/${address}/stake-list`)
      if (res.ok) {
        const json = await res.json()
        const stakesData = json?.data ?? []
        const stakeList = stakesData.map((s: any) => ({
          stakeId: s.stakeId,
          amount: s.amount,
          timestamp: s.timestamp,
          lockPeriod: mapLockPeriod(s.lockPeriod),
          isRWAStake: s.assetType === 'RWA',
          tokenDecimals: 18,
        }))
        setStakes(stakeList)
      }
    } catch (err) {
      console.error('Failed to fetch stakes:', err)
    } finally {
      setLoading(false)
    }
  }

  return { stakes, loading, refetch }
}
