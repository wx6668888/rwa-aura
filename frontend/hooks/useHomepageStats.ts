'use client'

import { useState, useEffect } from 'react'

interface HomepageStats {
  tvlRwa: number
  tvlUsdt: number
  users: number
  price: number
}

export function useHomepageStats() {
  const [stats, setStats] = useState<HomepageStats>({
    tvlRwa: 0,
    tvlUsdt: 0,
    users: 0,
    price: 0.85
  })

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // 浏览器端走同源 /api，由 Next rewrites 转发到后端（避免 https 站点请求 localhost 失败）
        const res = await fetch('/api/stats/homepage')
        const data = await res.json()
        if (data.success) {
          const tvlRwa = Number(data.data?.tvlRwa || 0)
          const price = Number(data.data?.price || 0.85)
          let tvlUsdt = Number(data.data?.tvlUsdt || 0)
          if (!tvlUsdt && tvlRwa) {
            tvlUsdt = tvlRwa * price
          }
          setStats({
            tvlRwa,
            tvlUsdt,
            users: Number(data.data?.users || 0),
            price,
          })
        }
      } catch (error) {
        console.error('Failed to fetch homepage stats:', error)
      }
    }

    /** 首屏不抢带宽：空闲后再拉统计，与背景视频错峰 */
    const start = () => {
      void fetchStats()
    }
    let idleHandle: number | undefined
    let usedIdleCallback = false
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      usedIdleCallback = true
      idleHandle = window.requestIdleCallback(start, { timeout: 2200 })
    } else if (typeof window !== 'undefined') {
      idleHandle = window.setTimeout(start, 500) as unknown as number
    }

    const interval = setInterval(fetchStats, 60000)
    return () => {
      if (idleHandle !== undefined && typeof window !== 'undefined') {
        if (usedIdleCallback && 'cancelIdleCallback' in window) {
          window.cancelIdleCallback(idleHandle)
        } else {
          window.clearTimeout(idleHandle)
        }
      }
      clearInterval(interval)
    }
  }, [])

  return stats
}
