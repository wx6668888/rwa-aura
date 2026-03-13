'use client'

import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'
import { useAccount } from 'wagmi'
import { useReferralRewards } from '@/hooks/useReferralRewards'
import { Users, ArrowRight } from 'lucide-react'
import { useState } from 'react'
import Link from 'next/link'

export function ReferralRewardCard() {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)
  const { isConnected } = useAccount()
  const { balance, records, loading } = useReferralRewards()
  const [showRecords, setShowRecords] = useState(false)
  const isZh = locale === 'zh'

  const totalRewards = records.reduce((sum, r) => sum + r.rewardAmount, 0)

  if (!isConnected) {
    return (
      <div className="rounded-2xl border border-[#f59e0b20] bg-gradient-to-br from-[#0d0d14] to-[#13131e] p-6 backdrop-blur-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#f59e0b20] to-[#f59e0b08]">
            <Users className="h-6 w-6 text-[#f59e0b]" />
          </div>
          <div>
            <h3 className="font-[family-name:var(--font-space-grotesk)] text-lg font-bold text-[#f1f5f9]">
              {isZh ? '推荐奖励' : 'Referral Rewards'}
            </h3>
            <p className="text-xs text-[#64748b]">
              {isZh ? '实时发放' : 'Real-time'}
            </p>
          </div>
        </div>
        <p className="text-sm text-[#64748b]">
          {isZh ? '连接钱包后查看您的推荐奖励' : 'Connect wallet to view rewards'}
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-[#f59e0b20] bg-gradient-to-br from-[#0d0d14] to-[#13131e] p-6 backdrop-blur-xl shadow-[0_0_30px_rgba(245,158,11,0.1)]">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#f59e0b20] to-[#f59e0b08]">
            <Users className="h-6 w-6 text-[#f59e0b]" />
          </div>
          <div>
            <h3 className="font-[family-name:var(--font-space-grotesk)] text-lg font-bold text-[#f1f5f9]">
              {isZh ? '推荐奖励' : 'Referral Rewards'}
            </h3>
            <p className="text-xs text-[#f59e0b]">
              {records.length} {isZh ? '有效推荐' : 'Referrals'}
            </p>
          </div>
        </div>
        <Link 
          href="/withdraw"
          className="flex items-center gap-1 text-xs text-[#f59e0b] hover:text-[#d97706] transition-colors"
        >
          {isZh ? '去提现' : 'Withdraw'}
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="space-y-3">
        <div className="rounded-xl border border-[#f59e0b20] bg-[#f59e0b08] p-4">
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-xs text-[#64748b]">
              {isZh ? '可提取余额' : 'Withdrawable'}
            </span>
            <div className="text-right">
              <p className="font-[family-name:var(--font-jetbrains-mono)] text-2xl font-bold text-[#f59e0b]">
                {balance.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
              <p className="text-xs text-[#64748b]">USDT</p>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#64748b]">{isZh ? '累计奖励' : 'Total Rewards'}</span>
            <span className="font-mono text-[#94a3b8]">
              {totalRewards.toLocaleString('en-US', { maximumFractionDigits: 2 })} USDT
            </span>
          </div>
        </div>

        <button
          onClick={() => setShowRecords(!showRecords)}
          className="w-full rounded-xl border border-[#f59e0b20] bg-[#0d0d1480] px-4 py-2.5 text-sm font-medium text-[#f1f5f9] transition-colors hover:bg-[#13131e]"
        >
          {showRecords 
            ? (isZh ? '隐藏推荐记录' : 'Hide Records')
            : (isZh ? '查看推荐记录' : 'View Records')
          }
        </button>

        {showRecords && records.length > 0 && (
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {records.map((record, index) => (
              <div
                key={index}
                className="rounded-lg border border-[#f59e0b20] bg-[#0d0d1480] p-3"
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="font-mono text-xs text-[#94a3b8]">
                    {record.referee.slice(0, 6)}...{record.referee.slice(-4)}
                  </span>
                  <span className="font-[family-name:var(--font-jetbrains-mono)] text-sm font-semibold text-[#f59e0b]">
                    +{record.rewardAmount.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-[10px] text-[#64748b]">
                  <span>{isZh ? '质押' : 'Staked'} {record.stakeAmount.toFixed(0)}</span>
                  <span>L{record.userLevel}</span>
                  <span>{new Date(record.timestamp * 1000).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {showRecords && records.length === 0 && (
          <div className="rounded-lg border border-[#f59e0b20] bg-[#0d0d1480] p-4 text-center">
            <p className="text-sm text-[#64748b]">
              {isZh ? '暂无推荐记录' : 'No records yet'}
            </p>
          </div>
        )}

        <div className="text-[10px] text-[#64748b] flex items-center gap-1">
          <span className="inline-block w-1 h-1 rounded-full bg-[#f59e0b]"></span>
          {isZh 
            ? '满100 USDT可提现，手续费8%' 
            : 'Min 100 USDT, 8% fee'}
        </div>
      </div>
    </div>
  )
}
