'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAccount } from 'wagmi'

interface TeamStats {
  teamTotalDeposited: number
  teamTotalWithdrawn: number
  teamRetained: number
  teamVolume: number
  loading: boolean
}

export function useTeamStats() {
  const { address } = useAccount()
  const [stats, setStats] = useState<TeamStats>({
    teamTotalDeposited: 0,
    teamTotalWithdrawn: 0,
    teamRetained: 0,
    teamVolume: 0,
    loading: false,
  })

  console.log('--- Hook Mount: useTeamStats ---', { address })

  // 从后端获取数据
  const syncWithBackend = useCallback(async () => {
    if (!address) {
      console.log('--- No address, skipping fetch ---')
      return
    }

    const normalizedAddress = address.toLowerCase()
    const API_BASE = process.env.NEXT_PUBLIC_RELAYER_URL || 'http://localhost:3001'
    
    console.log('--- Fetching Team Data Now ---', { normalizedAddress, API_BASE })
    
    try {
      const url = `${API_BASE}/api/data/${normalizedAddress}/team`
      console.log('--- Fetch URL ---', url)
      
      const res = await fetch(url)
      const json = await res.json()
      
      console.log('--- API Response ---', json)
      
      if (json.success && json.data) {
        const teamVolume = parseFloat(json.data.teamVolume) / 1e18 || 0
        const teamRetained = parseFloat(json.data.teamRetained) / 1e18 || 0
        
        console.log('--- Parsed Data ---', { teamVolume, teamRetained })
        
        setStats({
          teamTotalDeposited: teamVolume,
          teamTotalWithdrawn: teamVolume - teamRetained,
          teamRetained: teamRetained,
          teamVolume: teamVolume,
          loading: false,
        })
      }
    } catch (error) {
      console.error('--- Fetch Error ---', error)
    }
  }, [address])

  // 强制触发：只要有地址就立即fetch
  useEffect(() => {
    console.log('--- useEffect triggered ---', { address })
    if (address) {
      syncWithBackend()
    }
  }, [address, syncWithBackend])

  return { ...stats, refresh: syncWithBackend }
}
