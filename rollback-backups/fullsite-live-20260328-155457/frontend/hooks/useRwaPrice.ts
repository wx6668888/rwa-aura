'use client'

import { useState, useEffect } from 'react'

/** 与后端一致：基址无论是否含 `/api`，最终请求 `/api/price/rwa`（API 子域也挂载了 `/price/rwa` 作兼容）。 */
function rwaPriceApiUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api').trim().replace(/\/$/, '')
  if (!raw) return '/api/price/rwa'
  const withApi = raw.endsWith('/api') ? raw : `${raw}/api`
  return `${withApi}/price/rwa`
}

const FALLBACK_RWA_PRICE = 0.85

/**
 * RWA/USDT price from backend oracle (or fallback).
 * Use this instead of hardcoded 0.85 for dashboard, withdraw, swap, lottery USD display.
 */
export function useRwaPrice(): { price: number; isLive: boolean } {
  const [price, setPrice] = useState(FALLBACK_RWA_PRICE)
  const [isLive, setIsLive] = useState(false)

  useEffect(() => {
    let cancelled = false
    const fetchPrice = async () => {
      try {
        const res = await fetch(rwaPriceApiUrl())
        const json = await res.json()
        if (!cancelled && json?.success && json?.data?.price != null) {
          const p = Number(json.data.price)
          if (!Number.isNaN(p) && p > 0) {
            setPrice(p)
            setIsLive(true)
          }
        }
      } catch {
        // keep fallback
      }
    }
    fetchPrice()
    const interval = setInterval(fetchPrice, 60_000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  return { price, isLive }
}
