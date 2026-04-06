'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { useAccount } from 'wagmi'
import { consumeLastDataRefresh, subscribeDataRefresh } from '@/lib/data-refresh'

export interface UserStake {
  stakeId: string
  amount: string
  timestamp: number
  lockPeriod?: 'flexible' | '30' | '90' | '180' | '365'
  isRWAStake?: boolean
  tokenDecimals?: number
  /** 质押所在区块（来自 stake_events.block_number） */
  blockNumber?: number
}

interface StakesContextType {
  stakes: UserStake[]
  loading: boolean
  refetch: () => void
}

const StakesContext = createContext<StakesContextType | undefined>(undefined)

function mapLockPeriod(days: number): UserStake['lockPeriod'] {
  if (days === 30) return '30'
  if (days === 90) return '90'
  if (days === 180) return '180'
  if (days === 365) return '365'
  return 'flexible'
}

export function StakesProvider({ children }: { children: ReactNode }) {
  const { address } = useAccount()
  const [stakes, setStakes] = useState<UserStake[]>([])
  const [loading, setLoading] = useState(true)

  const fetchStakes = useCallback(async () => {
    if (!address) {
      setStakes([])
      setLoading(false)
      return
    }

    setLoading(true)
    const maxAttempts = 3
    let lastErr: unknown = null

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const res = await fetch(`/api/data/${address}/stake-list`)
        if (!res.ok) {
          lastErr = new Error(`HTTP ${res.status}`)
          if (attempt < maxAttempts - 1) {
            await new Promise((r) => setTimeout(r, 400 * (attempt + 1)))
            continue
          }
          setStakes([])
          break
        }

        const json = await res.json()
        const stakesData = json?.data ?? []

        const stakeList = stakesData.map((s: any) => ({
          stakeId: s.stakeId,
          amount: s.amount,
          timestamp: s.timestamp,
          lockPeriod: s.lockPeriod,
          isRWAStake: s.assetType === 'RWA',
          tokenDecimals: 18,
          blockNumber:
            typeof s.blockNumber === 'number' && Number.isFinite(s.blockNumber)
              ? s.blockNumber
              : undefined,
        }))

        setStakes(stakeList)
        lastErr = null
        break
      } catch (err) {
        lastErr = err
        console.error('Failed to fetch stakes:', err)
        if (attempt < maxAttempts - 1) {
          await new Promise((r) => setTimeout(r, 400 * (attempt + 1)))
          continue
        }
        setStakes([])
      }
    }

    if (lastErr != null) {
      console.warn('[StakesContext] stake-list failed after retries')
    }
    setLoading(false)
  }, [address])

  useEffect(() => {
    fetchStakes()
  }, [address])

  // Auto-refresh after tx success (even across navigation).
  useEffect(() => {
    if (!address) return
    const last = consumeLastDataRefresh(address)
    if (last) {
      void fetchStakes()
    }
    const unsub = subscribeDataRefresh((d) => {
      if (!d?.address) return
      if (String(d.address).toLowerCase() !== String(address).toLowerCase()) return
      void fetchStakes()
    })
    return () => {
      unsub()
    }
  }, [address, fetchStakes])

  return (
    <StakesContext.Provider value={{ stakes, loading, refetch: fetchStakes }}>
      {children}
    </StakesContext.Provider>
  )
}

export function useStakesContext() {
  const context = useContext(StakesContext)
  if (!context) {
    throw new Error('useStakesContext must be used within StakesProvider')
  }
  return context
}
