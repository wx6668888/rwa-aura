'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Navbar } from '@/components/navbar'
import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'
import { BackgroundEffects } from '@/components/background-effects'
import { ExternalLink, Trophy } from 'lucide-react'
import { shortenAddress } from '@/lib/stats-display'

const LEVEL_COLORS: Record<number, string> = {
  1: '#64748b',
  2: '#00f5d4',
  3: '#10b981',
  4: '#8b5cf6',
  5: '#f59e0b',
  6: '#ec4899',
  7: '#06b6d4',
  8: '#eab308',
  9: '#f97316',
}

interface Row {
  rank: number
  address: string
  level: number
  stakeUsdt: number
  rewardsUsdt: number
  share: number
}

export default function LeaderboardPage() {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetch('/api/stats/leaderboard?limit=100')
      .then((r) => r.json())
      .then((j) => {
        if (!cancelled && j.success && Array.isArray(j.data?.rows)) {
          setRows(j.data.rows)
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const explorer = 'https://bscscan.com'

  return (
    <>
      <Navbar />
      <div className="relative min-h-screen">
        <BackgroundEffects />
        <div className="relative z-20 mx-auto max-w-5xl px-4 pb-24 pt-[calc(7rem+var(--app-safe-top))] sm:pt-[calc(8rem+var(--app-safe-top))]">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-[#00f5d4]">
                <Trophy className="h-6 w-6" />
                <span className="text-sm font-medium uppercase tracking-wider">{t('analytics.overline')}</span>
              </div>
              <h1 className="text-2xl font-bold text-[#f1f5f9] sm:text-3xl">{t('analytics.viewLeaderboard')}</h1>
              <p className="mt-2 text-sm text-[#64748b]">{t('analytics.subtitle')}</p>
            </div>
            <Link
              href="/analytics"
              className="inline-flex items-center justify-center rounded-xl border border-[#00f5d430] bg-[#0d0d14] px-4 py-2.5 text-sm font-medium text-[#00f5d4] transition-colors hover:bg-[#00f5d410]"
            >
              ← {t('analytics.title')}
            </Link>
          </div>

          <div className="overflow-hidden rounded-2xl border border-[#ffffff0d] bg-[#0d0d14]/80 backdrop-blur-xl">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead>
                  <tr className="border-b border-[#ffffff0d]">
                    <th className="px-4 py-4 text-left text-[11px] font-medium uppercase tracking-wide text-[#334155]">
                      {t('analytics.rank')}
                    </th>
                    <th className="px-4 py-4 text-left text-[11px] font-medium uppercase tracking-wide text-[#334155]">
                      {t('analytics.address')}
                    </th>
                    <th className="px-4 py-4 text-left text-[11px] font-medium uppercase tracking-wide text-[#334155]">
                      {t('analytics.level')}
                    </th>
                    <th className="px-4 py-4 text-right text-[11px] font-medium uppercase tracking-wide text-[#334155]">
                      {t('analytics.stakeAmount')}
                    </th>
                    <th className="px-4 py-4 text-right text-[11px] font-medium uppercase tracking-wide text-[#334155]">
                      {t('analytics.totalRewards')}
                    </th>
                    <th className="hidden px-4 py-4 text-right text-[11px] font-medium uppercase tracking-wide text-[#334155] sm:table-cell">
                      {t('analytics.share')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-16 text-center text-[#64748b]">
                        {t('fundActivity.loading')}
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-16 text-center text-[#64748b]">
                        —
                      </td>
                    </tr>
                  ) : (
                    rows.map((staker) => {
                      const dispLevel = Math.min(Math.max(staker.level, 1), 9)
                      const color = LEVEL_COLORS[dispLevel] || '#64748b'
                      return (
                        <tr
                          key={staker.address}
                          className="border-b border-[#ffffff0d] transition-colors hover:bg-[#13131e]"
                        >
                          <td className="px-4 py-4">
                            <span
                              className="text-[13px] font-medium"
                              style={{ color: staker.rank <= 3 ? '#f59e0b' : '#64748b' }}
                            >
                              {staker.rank <= 3 ? ['🥇', '🥈', '🥉'][staker.rank - 1] : staker.rank}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <a
                              href={`${explorer}/address/${staker.address}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 font-mono text-[13px] text-[#94a3b8] hover:text-[#00f5d4]"
                            >
                              {shortenAddress(staker.address)}
                              <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-70" />
                            </a>
                          </td>
                          <td className="px-4 py-4">
                            <div
                              className="inline-flex h-6 w-9 items-center justify-center rounded text-[11px] font-bold"
                              style={{ backgroundColor: `${color}20`, color }}
                            >
                              L{dispLevel}
                            </div>
                          </td>
                          <td className="px-4 py-4 text-right font-mono text-[14px] font-bold text-[#f1f5f9]">
                            ${Math.round(staker.stakeUsdt).toLocaleString()}
                          </td>
                          <td className="px-4 py-4 text-right font-mono text-[13px] font-bold text-[#8b5cf6]">
                            ${Math.round(staker.rewardsUsdt).toLocaleString()}
                          </td>
                          <td className="hidden px-4 py-4 text-right sm:table-cell">
                            <span className="font-mono text-[12px] text-[#64748b]">{staker.share.toFixed(1)}%</span>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
