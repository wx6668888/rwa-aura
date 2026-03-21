'use client'

import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'
import { ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { useAnalyticsStats } from '@/hooks/useAnalyticsStats'
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

export default function TopStakersTable() {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)
  const { data } = useAnalyticsStats()

  const getMedalEmoji = (rank: number) => {
    if (rank === 1) return '🥇'
    if (rank === 2) return '🥈'
    if (rank === 3) return '🥉'
    return rank
  }

  const rows = data.topStakers || []

  return (
    <div className="p-6 rounded-2xl border border-[#ffffff0d] bg-[#0d0d14]/80 backdrop-blur-xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="text-[15px] font-bold text-[#f1f5f9]">{t('analytics.topStakers')}</div>
        <Link
          href="/leaderboard"
          className="text-[12px] text-[#00f5d4] hover:text-[#00f5d4]/80 transition-colors inline-flex items-center gap-1"
        >
          {t('analytics.viewLeaderboard')} →
        </Link>
      </div>

      <div className="mt-4 overflow-x-auto">
        {rows.length === 0 ? (
          <div className="py-12 text-center text-[#64748b] text-sm">—</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#ffffff0d]">
                <th className="py-3 px-2 text-left text-[11px] uppercase tracking-wide text-[#334155] font-medium">
                  {t('analytics.rank')}
                </th>
                <th className="py-3 px-2 text-left text-[11px] uppercase tracking-wide text-[#334155] font-medium">
                  {t('analytics.address')}
                </th>
                <th className="py-3 px-2 text-left text-[11px] uppercase tracking-wide text-[#334155] font-medium">
                  {t('analytics.level')}
                </th>
                <th className="py-3 px-2 text-right text-[11px] uppercase tracking-wide text-[#334155] font-medium">
                  {t('analytics.stakeAmount')}
                </th>
                <th className="py-3 px-2 text-right text-[11px] uppercase tracking-wide text-[#334155] font-medium">
                  {t('analytics.totalRewards')}
                </th>
                <th className="py-3 px-2 text-right text-[11px] uppercase tracking-wide text-[#334155] font-medium hidden sm:table-cell">
                  {t('analytics.share')}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((staker) => {
                const dispLevel = Math.min(Math.max(staker.level, 1), 9)
                const color = LEVEL_COLORS[dispLevel] || '#64748b'
                return (
                  <tr
                    key={staker.address}
                    className={`
                  border-b border-[#ffffff0d] hover:bg-[#13131e] transition-colors
                  ${staker.rank === 1 ? 'bg-[#f59e0b08]' : ''}
                `}
                  >
                    <td className="py-4 px-2">
                      <div
                        className="text-[13px] font-medium"
                        style={{ color: staker.rank <= 3 ? '#f59e0b' : '#64748b' }}
                      >
                        {getMedalEmoji(staker.rank)}
                      </div>
                    </td>
                    <td className="py-4 px-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="text-[13px] font-mono text-[#64748b]"
                          style={{ fontFamily: 'JetBrains Mono, monospace' }}
                        >
                          {shortenAddress(staker.address)}
                        </span>
                        <ExternalLink className="w-3 h-3 text-[#64748b] hover:text-[#00f5d4] cursor-pointer transition-colors" />
                      </div>
                    </td>
                    <td className="py-4 px-2">
                      <div
                        className="inline-flex items-center justify-center w-8 h-6 rounded text-[11px] font-bold"
                        style={{ backgroundColor: `${color}20`, color }}
                      >
                        L{dispLevel}
                      </div>
                    </td>
                    <td className="py-4 px-2 text-right">
                      <div
                        className="text-[14px] font-mono font-bold text-[#f1f5f9]"
                        style={{ fontFamily: 'JetBrains Mono, monospace' }}
                      >
                        ${Math.round(staker.stakeUsdt).toLocaleString()}
                      </div>
                    </td>
                    <td className="py-4 px-2 text-right">
                      <div
                        className="text-[13px] font-mono font-bold text-[#8b5cf6]"
                        style={{ fontFamily: 'JetBrains Mono, monospace' }}
                      >
                        ${Math.round(staker.rewardsUsdt).toLocaleString()}
                      </div>
                    </td>
                    <td className="py-4 px-2 text-right hidden sm:table-cell">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-10 h-1 rounded-full bg-[#1a1a2e] overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.min(100, staker.share)}%`,
                              backgroundColor: color,
                            }}
                          />
                        </div>
                        <span className="text-[12px] font-mono text-[#64748b]">{staker.share.toFixed(1)}%</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
