'use client'

import { useAccount } from 'wagmi'
import { useQuery } from '@tanstack/react-query'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

/** 18 位精度转 USDT 显示（/1e18） */
function toUsdtHuman(raw: string): number {
  if (!raw || raw === '0') return 0
  return Number(BigInt(raw)) / 1e18
}

export interface LevelInfo {
  nodeLevel: number
  cumulativePersonalStakeUsdt: number
  teamVolumeUsdt: number
  teamRetainedUsdt: number
}

export function useLevelInfo() {
  const { address, isConnected, chainId } = useAccount()

  const defaultLevelInfo: LevelInfo = {
    nodeLevel: 1,
    cumulativePersonalStakeUsdt: 0,
    teamVolumeUsdt: 0,
    teamRetainedUsdt: 0,
  }

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['level-info', address?.toLowerCase(), chainId],
    queryFn: async (): Promise<LevelInfo> => {
      if (!address) return defaultLevelInfo
      const url = chainId != null ? `${API_BASE}/api/user/${address}/level-info?chainId=${chainId}` : `${API_BASE}/api/user/${address}/level-info`
      const res = await fetch(url)
      if (!res.ok) return defaultLevelInfo
      const json = await res.json()
      if (!json.success || !json.data) return defaultLevelInfo
      const d = json.data
      return {
        nodeLevel: Number(d.nodeLevel) || 1,
        cumulativePersonalStakeUsdt: toUsdtHuman(d.cumulativePersonalStake ?? '0'),
        teamVolumeUsdt: toUsdtHuman(d.teamVolume ?? '0'),
        teamRetainedUsdt: toUsdtHuman(d.teamRetained ?? '0'),
      }
    },
    enabled: !!address && isConnected,
    staleTime: 60 * 1000,
  })

  return {
    levelInfo: data ?? defaultLevelInfo,
    loading: isLoading,
    refetch,
  }
}
