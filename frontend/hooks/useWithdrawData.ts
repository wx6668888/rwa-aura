'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAccount } from 'wagmi'

export function useWithdrawData() {
  const { address, isConnected } = useAccount()
  
  const [data, setData] = useState({
    yieldAmount: '0',
    rwaPrincipal: '0',
    usdtPrincipal: '0',
    referralAmount: '0',
    dividendAmount: '0',
    strwaAmount: '0',
    totalUSD: '0',
    loading: true,
    lockedStakes: [] as Array<{
      stakeId: string
      amount: number
      lockPeriod: string
      lockEndTime: number
      isRWAStake: boolean
      timestamp: number
    }>
  })

  const fetchData = useCallback(async () => {
    if (!isConnected || !address) {
      setData(prev => ({ ...prev, loading: false }))
      return
    }

    try {
      const API_BASE = process.env.NEXT_PUBLIC_RELAYER_URL || 'http://localhost:3001'
      
      // 尝试使用 v2 API
      const res = await fetch(`${API_BASE}/api/withdraw-v2/${address}`)
      
      if (res.ok) {
        const json = await res.json()
        if (json.success) {
          setData({
            ...json.data,
            loading: false
          })
          return
        }
      }
      
      // Fallback: 如果 v2 API 失败，返回空数据
      setData({
        yieldAmount: '0',
        rwaPrincipal: '0',
        usdtPrincipal: '0',
        referralAmount: '0',
        dividendAmount: '0',
        strwaAmount: '0',
        totalUSD: '0',
        loading: false,
        lockedStakes: []
      })
      
    } catch (error) {
      console.error('[useWithdrawData] Error:', error)
      setData(prev => ({ ...prev, loading: false }))
    }
  }, [address, isConnected])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { ...data, refetch: fetchData }
}
