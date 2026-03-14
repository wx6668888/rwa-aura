'use client'

import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'
import { useAccount } from 'wagmi'
import { useReferralRewards } from '@/hooks/useReferralRewards'
import { Gift, Users, TrendingUp } from 'lucide-react'
import { useState } from 'react'
import { ReferralRewardCountdown } from './referral-reward-countdown'

export function ReferralRewardCard() {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)
  const { isConnected } = useAccount()
  const { balance, records, loading } = useReferralRewards()
  const [showRecords, setShowRecords] = useState(false)
  const isZh = locale === 'zh'

  if (!isConnected) {
    return (
      <div className="rounded-2xl border border-[#00f5d420] bg-gradient-to-br from-[#0d0d14] to-[#13131e] p-8 backdrop-blur-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#10b98120]">
            <Users className="h-5 w-5 text-[#10b981]" />
          </div>
          <h2 className="font-[family-name:var(--font-space-grotesk)] text-xl font-bold text-[#f1f5f9]">
            {isZh ? '推荐奖励' : 'Referral Rewards'}
          </h2>
        </div>
        <p className="text-[13px] text-[#64748b]">
          {isZh ? '连接钱包后查看您的推荐奖励。' : 'Connect wallet to view your referral rewards.'}
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-[#00f5d420] bg-gradient-to-br from-[#0d0d14] to-[#13131e] p-8 backdrop-blur-xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#10b98120]">
          <Users className="h-5 w-5 text-[#10b981]" />
        </div>
        <h2 className="font-[family-name:var(--font-space-grotesk)] text-xl font-bold text-[#f1f5f9]">
          {isZh ? '推荐奖励' : 'Referral Rewards'}
        </h2>
      </div>

      {/* 可提取余额 */}
      <div className="mb-6 rounded-xl border border-[#10b98120] bg-[#10b98110] p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-[#64748b]">
            {isZh ? '可提取余额' : 'Withdrawable Balance'}
          </span>
          <span className="font-[family-name:var(--font-jetbrains-mono)] text-2xl font-bold text-[#10b981]">
            {balance.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{' '}
            <span className="text-base">USDT</span>
          </span>
        </div>
      </div>

      {/* 推荐奖励倒计时 */}
      <ReferralRewardCountdown />

      {/* 统计信息 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="rounded-xl border border-[#00f5d420] bg-[#0d0d1480] p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-[#f59e0b]" />
            <span className="text-xs text-[#64748b]">
              {isZh ? '累计奖励' : 'Total Rewards'}
            </span>
          </div>
          <p className="font-[family-name:var(--font-jetbrains-mono)] text-lg font-semibold text-[#f1f5f9]">
            {records.reduce((sum, r) => sum + r.rewardAmount, 0).toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{' '}
            USDT
          </p>
        </div>

        <div className="rounded-xl border border-[#00f5d420] bg-[#0d0d1480] p-4">
          <div className="flex items-center gap-2 mb-2">
            <Gift className="h-4 w-4 text-[#f59e0b]" />
            <span className="text-xs text-[#64748b]">
              {isZh ? '有效推荐' : 'Valid Referrals'}
            </span>
          </div>
          <p className="font-[family-name:var(--font-jetbrains-mono)] text-lg font-semibold text-[#f1f5f9]">
            {records.length}
          </p>
        </div>
      </div>

      {/* 查看详细记录按钮 */}
      <button
        onClick={() => setShowRecords(!showRecords)}
        className="w-full rounded-xl border border-[#00f5d420] bg-[#0d0d1480] px-4 py-3 text-sm font-medium text-[#f1f5f9] transition-colors hover:bg-[#13131e]"
      >
        {showRecords 
          ? (isZh ? '隐藏推荐记录' : 'Hide Records')
          : (isZh ? '查看推荐记录' : 'View Records')
        }
      </button>

      {/* 推荐记录列表 */}
      {showRecords && records.length > 0 && (
        <div className="mt-4 space-y-2 max-h-[400px] overflow-y-auto">
          {records.map((record, index) => (
            <div
              key={index}
              className="rounded-lg border border-[#00f5d420] bg-[#0d0d1480] p-3"
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <p className="text-xs text-[#64748b] mb-1">
                    {isZh ? '被推荐人' : 'Referee'}
                  </p>
                  <p className="font-mono text-xs text-[#f1f5f9]">
                    {record.referee.slice(0, 6)}...{record.referee.slice(-4)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-[#64748b] mb-1">
                    {isZh ? '奖励' : 'Reward'}
                  </p>
                  <p className="font-[family-name:var(--font-jetbrains-mono)] text-sm font-semibold text-[#10b981]">
                    +{record.rewardAmount.toFixed(2)} USDT
                  </p>
                </div>
              </div>
              <div className="flex justify-between text-xs text-[#64748b]">
                <span>
                  {isZh ? '质押' : 'Staked'}: {record.stakeAmount.toFixed(2)} USDT
                </span>
                <span>
                  {isZh ? '等级' : 'Level'}: L{record.userLevel}
                </span>
                <span>
                  {new Date(record.timestamp * 1000).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showRecords && records.length === 0 && (
        <div className="mt-4 rounded-lg border border-[#00f5d420] bg-[#0d0d1480] p-6 text-center">
          <p className="text-sm text-[#64748b]">
            {isZh ? '暂无推荐记录' : 'No referral records yet'}
          </p>
        </div>
      )}

      <div className="mt-4 text-xs text-[#64748b]">
        {isZh 
          ? '* 推荐奖励按月结算，根据您的节点等级实时发放' 
          : '* Referral rewards are settled monthly based on your node level'}
      </div>
    </div>
  )
}
