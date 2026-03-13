'use client'

import { useState, useEffect } from 'react'

interface HomepageStats {
  tvl: number
  users: number
  price: number
}

export function useHomepageStats() {
  const [stats, setStats] = useState<HomepageStats>({
    tvl: 5000000,
    users: 1000,
    price: 0.85
  })

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('http://localhost:3001/api/stats/homepage')
        const data = await res.json()
        if (data.success) {
          setStats(data.data)
        }
      } catch (error) {
        console.error('Failed to fetch homepage stats:', error)
      }
    }

    fetchStats()
    const interval = setInterval(fetchStats, 60000) // 每分钟更新
    return () => clearInterval(interval)
  }, [])

  return stats
}
