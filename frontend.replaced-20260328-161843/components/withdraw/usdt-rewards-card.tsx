'use client'

import { useAccount } from 'wagmi'
import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'
import { useStakingContract } from '@/hooks/useStakingContract'

export function UsdtRewardsCard() {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)
  const { isConnected } = useAccount()
  const { userStakeInfo } = useStakingContract()

  // USDT 奖励余额
  const usdtRewards = userStakeInfo?.usdtRewards || '0'
  const usdtRewardsNum = parseFloat(usdtRewards)

  const rows = [
    {
      date: t('withdraw.reward1Date'),
      type: t('withdraw.reward1Type'),
      amount: t('withdraw.reward1Amount'),
    },
    {
      date: t('withdraw.reward2Date'),
      type: t('withdraw.reward2Type'),
      amount: t('withdraw.reward2Amount'),
    },
    {
      date: t('withdraw.reward3Date'),
      type: t('withdraw.reward3Type'),
      amount: t('withdraw.reward3Amount'),
    },
  ]

  return (
    <div
      className="mt-4 rounded-2xl border p-6 transition-colors hover:border-[#ffffff1a]"
      style={{ background: '#0d0d14', borderColor: '#ffffff1a' }}
    >
      {/* Header */}
      <p className="text-[11px] font-semibold uppercase tracking-widest text-[#64748b]">
        {t('withdraw.usdtTitle')}
      </p>

      {/* Amount */}
      <div className="mt-3 flex items-baseline gap-2">
        <span className="font-[family-name:var(--font-jetbrains-mono)] text-[36px] font-bold leading-none text-[#8b5cf6]">
          {isConnected ? usdtRewardsNum.toFixed(2) : '0.00'}
        </span>
        <span className="font-[family-name:var(--font-jetbrains-mono)] text-base font-semibold text-[#8b5cf6]">
          USDT
        </span>
      </div>
      <p className="mt-1 text-xs text-[#64748b]">{t('withdraw.usdtSub')}</p>

      {/* Claim button */}
      <button
        type="button"
        disabled={!isConnected || usdtRewardsNum === 0}
        className="mt-4 flex h-12 w-full items-center justify-center rounded-full font-[family-name:var(--font-space-grotesk)] text-sm font-semibold text-white transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        style={{ background: '#8b5cf6' }}
      >
        {!isConnected ? t('common.connectWalletFirst') : usdtRewardsNum === 0 ? t('common.noRewardsAvailable') : t('withdraw.claimUsdt')}
      </button>

      {/* 说明文字 */}
      {isConnected && (
        <p className="mt-2 text-xs text-[#64748b] text-center">
          {t('withdraw.usdtAutoDistribute')}
        </p>
      )}

      {/* Divider */}
      <div className="my-4 h-px bg-[#ffffff0d]" />

      {/* Recent rewards */}
      <p className="text-[11px] font-semibold uppercase tracking-widest text-[#64748b]">
        {t('withdraw.recentLabel')}
      </p>

      <div className="mt-2">
        {rows.map((row, i) => (
          <div
            key={i}
            className="flex items-center justify-between py-3"
            style={{ borderBottom: i < rows.length - 1 ? '1px solid #ffffff0d' : 'none' }}
          >
            <div className="flex items-center gap-2">
              <span className="text-[13px] text-[#64748b]">{row.date}</span>
              <span
                className="rounded-full px-2 py-0.5 text-[11px] font-medium text-[#8b5cf6]"
                style={{ background: '#8b5cf626' }}
              >
                {row.type}
              </span>
            </div>
            <span className="font-[family-name:var(--font-jetbrains-mono)] text-sm font-semibold text-[#8b5cf6]">
              {row.amount}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
