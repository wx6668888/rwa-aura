'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAccount } from 'wagmi'
import { consumeLastDataRefresh, subscribeDataRefresh } from '@/lib/data-refresh'

interface TeamStats {
  teamTotalDeposited: number
  teamTotalWithdrawn: number
  teamRetained: number
  teamVolume: number
  directReferrals: number
  teamDownlineCount: number
  loading: boolean
}

function parseUsdtMetric(raw: unknown): number {
  if (raw == null) return 0
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : 0
  const s = String(raw).trim()
  if (!s) return 0
  // 已是人类可读小数（例如 "1234.56"）
  if (s.includes('.')) {
    const n = Number(s)
    return Number.isFinite(n) ? n : 0
  }
  // 纯数字：大多数接口返回 18 位精度 wei，这里统一转为 USDT
  // 注意：不要用 BigInt（部分构建 target < ES2020 会报错）
  if (/^[0-9]+$/.test(s)) {
    try {
      // string division by 1e18, keep 6 decimals
      const digits = s.replace(/^0+/, '') || '0'
      const DEC = 18
      const head = digits.length > DEC ? digits.slice(0, digits.length - DEC) : '0'
      const tail = digits.length > DEC ? digits.slice(digits.length - DEC) : digits.padStart(DEC, '0')
      const human = `${head}.${tail.slice(0, 6)}`
      const n = Number(human)
      return Number.isFinite(n) ? n : 0
    } catch {
      return 0
    }
  }
  const n = Number(s)
  return Number.isFinite(n) ? n : 0
}

export function useTeamStats() {
  const { address } = useAccount()
  const [stats, setStats] = useState<TeamStats>({
    teamTotalDeposited: 0,
    teamTotalWithdrawn: 0,
    teamRetained: 0,
    teamVolume: 0,
    directReferrals: 0,
    teamDownlineCount: 0,
    loading: false,
  })

  const syncWithBackend = useCallback(async () => {
    if (!address) {
      return
    }

    const normalizedAddress = address.toLowerCase()
    const API_BASE = typeof window !== 'undefined' ? '' : (process.env.NEXT_PUBLIC_RELAYER_URL || 'http://localhost:3001')

    setStats((s) => ({ ...s, loading: true }))
    try {
      const url = `${API_BASE}/api/data/${normalizedAddress}/team`
      const res = await fetch(url)
      const json = await res.json()

      if (json.success && json.data) {
        const teamVolume = parseUsdtMetric(json.data.teamVolume)
        const teamRetained = parseUsdtMetric(json.data.teamRetained)
        const directReferrals = Number(json.data.directReferrals ?? 0) || 0
        const teamDownlineCount = Number(json.data.teamDownlineCount ?? 0) || 0

        setStats({
          teamTotalDeposited: teamVolume,
          teamTotalWithdrawn: teamVolume - teamRetained,
          teamRetained: teamRetained,
          teamVolume: teamVolume,
          directReferrals,
          teamDownlineCount,
          loading: false,
        })
      } else {
        setStats((s) => ({ ...s, loading: false }))
      }
    } catch {
      setStats((s) => ({ ...s, loading: false }))
    }
  }, [address])

  useEffect(() => {
    if (address) {
      void syncWithBackend()
    }
  }, [address, syncWithBackend])

  // Auto-refresh after tx success (even across navigation).
  useEffect(() => {
    if (!address) return
    const last = consumeLastDataRefresh(address)
    if (last) {
      void syncWithBackend()
    }
    const unsub = subscribeDataRefresh((d) => {
      if (!d?.address) return
      if (String(d.address).toLowerCase() !== String(address).toLowerCase()) return
      void syncWithBackend()
    })
    return () => {
      unsub()
    }
  }, [address, syncWithBackend])

  return { ...stats, refresh: syncWithBackend }
}
