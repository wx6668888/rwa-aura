'use client'

import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'
import { ExternalLink } from 'lucide-react'
import Link from 'next/link'

export default function TopStakersTable() {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)

  const topStakers = [
    { rank: 1, address: '0x1a2b...3c4d', level: 'V5', stake: 1250000, rewards: 125000, share: 10.0, color: '#f59e0b' },
    { rank: 2, address: '0x2b3c...4d5e', level: 'V5', stake: 980000, rewards: 98000, share: 7.9, color: '#f59e0b' },
    { rank: 3, address: '0x3c4d...5e6f', level: 'V4', stake: 750000, rewards: 75000, share: 6.0, color: '#8b5cf6' },
    { rank: 4, address: '0x4d5e...6f7g', level: 'V4', stake: 620000, rewards: 62000, share: 5.0, color: '#8b5cf6' },
    { rank: 5, address: '0x5e6f...7g8h', level: 'V3', stake: 500000, rewards: 50000, share: 4.0, color: '#10b981' },
    { rank: 6, address: '0x6f7g...8h9i', level: 'V3', stake: 450000, rewards: 45000, share: 3.6, color: '#10b981' },
    { rank: 7, address: '0x7g8h...9i0j', level: 'V3', stake: 380000, rewards: 38000, share: 3.1, color: '#10b981' },
    { rank: 8, address: '0x8h9i...0j1k', level: 'V2', stake: 320000, rewards: 32000, share: 2.6, color: '#00f5d4' },
    { rank: 9, address: '0x9i0j...1k2l', level: 'V2', stake: 280000, rewards: 28000, share: 2.2, color: '#00f5d4' },
    { rank: 10, address: '0x0j1k...2l3m', level: 'V2', stake: 250000, rewards: 25000, share: 2.0, color: '#00f5d4' },
  ]

  const getMedalEmoji = (rank: number) => {
    if (rank === 1) return '🥇'
    if (rank === 2) return '🥈'
    if (rank === 3) return '🥉'
    return rank
  }

  return (
    <div className="p-6 rounded-2xl border border-[#ffffff0d] bg-[#0d0d14]/80 backdrop-blur-xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="text-[15px] font-bold text-[#f1f5f9]">
          {t('analytics.topStakers')}
        </div>
        <Link
          href="/leaderboard"
          className="text-[12px] text-[#00f5d4] hover:text-[#00f5d4]/80 transition-colors inline-flex items-center gap-1"
        >
          {t('analytics.viewLeaderboard')} →
        </Link>
      </div>

      <div className="mt-4 overflow-x-auto">
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
            {topStakers.map((staker, index) => (
              <tr
                key={index}
                className={`
                  border-b border-[#ffffff0d] hover:bg-[#13131e] transition-colors
                  ${staker.rank === 1 ? 'bg-[#f59e0b08]' : ''}
                `}
              >
                <td className="py-4 px-2">
                  <div className="text-[13px] font-medium" style={{ color: staker.rank <= 3 ? '#f59e0b' : '#64748b' }}>
                    {getMedalEmoji(staker.rank)}
                  </div>
                </td>
                <td className="py-4 px-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-mono text-[#64748b]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                      {staker.address}
                    </span>
                    <ExternalLink className="w-3 h-3 text-[#64748b] hover:text-[#00f5d4] cursor-pointer transition-colors" />
                  </div>
                </td>
                <td className="py-4 px-2">
                  <div
                    className="inline-flex items-center justify-center w-8 h-6 rounded text-[11px] font-bold"
                    style={{ backgroundColor: `${staker.color}20`, color: staker.color }}
                  >
                    {staker.level}
                  </div>
                </td>
                <td className="py-4 px-2 text-right">
                  <div className="text-[14px] font-mono font-bold text-[#f1f5f9]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                    ${staker.stake.toLocaleString()}
                  </div>
                </td>
                <td className="py-4 px-2 text-right">
                  <div className="text-[13px] font-mono font-bold text-[#8b5cf6]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                    ${staker.rewards.toLocaleString()}
                  </div>
                </td>
                <td className="py-4 px-2 text-right hidden sm:table-cell">
                  <div className="flex items-center justify-end gap-2">
                    <div className="w-10 h-1 rounded-full bg-[#1a1a2e] overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${staker.share * 10}%`,
                          backgroundColor: staker.color,
                        }}
                      />
                    </div>
                    <span className="text-[12px] text-[#64748b] w-10">
                      {staker.share}%
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
