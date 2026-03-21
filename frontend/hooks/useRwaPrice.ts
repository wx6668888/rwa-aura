'use client'

import { useState, useEffect } from 'react'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'
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
        const res = await fetch(`${API_BASE_URL}/price/rwa`)
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
