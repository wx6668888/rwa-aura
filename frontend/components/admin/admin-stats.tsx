'use client'

import { useEffect, useState } from 'react'
import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'

interface GlobalStats {
  totalUsers: number
  activeUsers: number
  totalStaked: string
  totalStaticRewards: string
  totalDynamicRewards: string
}

export function AdminStats() {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)
  const [stats, setStats] = useState<GlobalStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchGlobalStats()
    // 每30秒刷新一次
    const interval = setInterval(fetchGlobalStats, 30000)
    return () => clearInterval(interval)
  }, [])

  async function fetchGlobalStats() {
    try {
      setLoading(true)
      setError(null)
      
      // 后端 API 地址（默认 3001，如果前端在 3000）
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      const response = await fetch(`${apiUrl}/api/stats/global`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch stats')
      }
      
      const result = await response.json()
      if (result.success) {
        setStats(result.data)
      } else {
        throw new Error(result.error || 'Unknown error')
      }
    } catch (err: any) {
      console.error('Error fetching global stats:', err)
      setError(err.message || 'Failed to load statistics')
    } finally {
      setLoading(false)
    }
  }

  const formatNumber = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value
    if (num >= 1e18) {
      return (num / 1e18).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    }
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  const formatUSDT = (value: string) => {
    // USDT 是 6 decimals，但后端返回的是 18 decimals 格式
    const num = parseFloat(value)
    if (num >= 1e18) {
      return (num / 1e18).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    }
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-[#64748b]">{t('admin.loading') || '加载中...'}</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4">
        <p className="text-red-400">
          {t('admin.error.loadFailed') || '加载失败'}：{error}
        </p>
        <p className="mt-2 text-sm text-[#64748b]">
          {t('admin.error.checkBackend') || '请确保后端服务正在运行（http://localhost:3001）'}
        </p>
        <button
          onClick={fetchGlobalStats}
          className="mt-4 rounded-lg bg-[#00f5d4] px-4 py-2 text-sm font-semibold text-[#05050a] transition-all hover:brightness-110"
        >
          {t('admin.retry') || '重试'}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
        {/* Total Users */}
        <div className="rounded-2xl bg-gradient-to-br from-[#0d0d14] to-[#13131e] p-6" style={{ border: '1px solid #00f5d420' }}>
          <p className="text-[11px] uppercase tracking-widest text-[#64748b]" style={{ fontVariant: 'small-caps' }}>
            {t('admin.stats.totalUsers') || '总用户数'}
          </p>
          <p className="mt-2 font-mono text-3xl font-bold text-[#f1f5f9]">
            {stats?.totalUsers?.toLocaleString() || '0'}
          </p>
        </div>

        {/* Active Users */}
        <div className="rounded-2xl bg-gradient-to-br from-[#0d0d14] to-[#13131e] p-6" style={{ border: '1px solid #00f5d420' }}>
          <p className="text-[11px] uppercase tracking-widest text-[#64748b]" style={{ fontVariant: 'small-caps' }}>
            {t('admin.stats.activeUsers') || '活跃用户'}
          </p>
          <p className="mt-2 font-mono text-3xl font-bold text-[#00f5d4]">
            {stats?.activeUsers?.toLocaleString() || '0'}
          </p>
        </div>

        {/* Total Staked */}
        <div className="rounded-2xl bg-gradient-to-br from-[#0d0d14] to-[#13131e] p-6" style={{ border: '1px solid #00f5d420' }}>
          <p className="text-[11px] uppercase tracking-widest text-[#64748b]" style={{ fontVariant: 'small-caps' }}>
            {t('admin.stats.totalStaked') || '总质押量'}
          </p>
          <p className="mt-2 font-mono text-2xl font-bold text-[#f1f5f9]">
            {formatUSDT(stats?.totalStaked || '0')}
          </p>
          <p className="mt-1 text-xs text-[#64748b]">USDT</p>
        </div>

        {/* Total Static Rewards */}
        <div className="rounded-2xl bg-gradient-to-br from-[#0d0d14] to-[#13131e] p-6" style={{ border: '1px solid #00f5d420' }}>
          <p className="text-[11px] uppercase tracking-widest text-[#64748b]" style={{ fontVariant: 'small-caps' }}>
            {t('admin.stats.totalStaticRewards') || '静态奖励'}
          </p>
          <p className="mt-2 font-mono text-2xl font-bold text-[#f59e0b]">
            {formatUSDT(stats?.totalStaticRewards || '0')}
          </p>
          <p className="mt-1 text-xs text-[#64748b]">USDT</p>
        </div>

        {/* Total Dynamic Rewards */}
        <div className="rounded-2xl bg-gradient-to-br from-[#0d0d14] to-[#13131e] p-6" style={{ border: '1px solid #00f5d420' }}>
          <p className="text-[11px] uppercase tracking-widest text-[#64748b]" style={{ fontVariant: 'small-caps' }}>
            {t('admin.stats.totalDynamicRewards') || '动态奖励'}
          </p>
          <p className="mt-2 font-mono text-2xl font-bold text-[#f59e0b]">
            {formatUSDT(stats?.totalDynamicRewards || '0')}
          </p>
          <p className="mt-1 text-xs text-[#64748b]">USDT</p>
        </div>
      </div>

      {/* Refresh Button */}
      <div className="flex justify-end">
        <button
          onClick={fetchGlobalStats}
          disabled={loading}
          className="rounded-lg bg-[#00f5d4] px-6 py-2 text-sm font-semibold text-[#05050a] transition-all hover:brightness-110 disabled:opacity-50"
        >
          {loading ? (t('admin.loading') || '加载中...') : (t('admin.refresh') || '刷新数据')}
        </button>
      </div>
    </div>
  )
}
