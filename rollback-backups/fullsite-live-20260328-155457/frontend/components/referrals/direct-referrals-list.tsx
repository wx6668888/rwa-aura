'use client'

import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'
import { useDirectReferrals } from '@/hooks/useDirectReferrals'
import { formatUnits } from 'viem'
import { User, Loader2 } from 'lucide-react'

export function DirectReferralsList() {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)
  const { referrals, loading, count } = useDirectReferrals()

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-[#00f5d4]" />
        <span className="ml-2 text-sm text-[#64748b]">{t('common.loading') || 'Loading...'}</span>
      </div>
    )
  }

  if (count === 0) {
    return (
      <div className="rounded-lg border border-[#ffffff0d] bg-[#0a0a0f] p-6">
        <div className="flex items-center gap-3 mb-4">
          <User className="h-5 w-5 text-[#64748b]" />
          <h3 className="text-lg font-semibold text-[#f1f5f9]">
            {t('stats.directRefs') || 'Direct Referrals'}
          </h3>
          <span className="text-sm text-[#64748b]">({count})</span>
        </div>
        <p className="text-sm text-[#64748b]">
          {t('referrals.noReferrals') || 'No direct referrals yet. Share your referral link to invite friends!'}
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-[#ffffff0d] bg-[#0a0a0f] p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <User className="h-5 w-5 text-[#00f5d4]" />
          <h3 className="text-lg font-semibold text-[#f1f5f9]">
            {t('stats.directRefs') || 'Direct Referrals'}
          </h3>
          <span className="text-sm text-[#64748b]">({count})</span>
        </div>
      </div>

      <div className="space-y-3 max-h-[400px] overflow-y-auto scrollbar-hide">
        {referrals.map((referral, index) => {
          const totalStakedNum = parseFloat(formatUnits(BigInt(referral.totalStaked), 18))
          const formattedAddress = `${referral.address.slice(0, 6)}...${referral.address.slice(-4)}`
          const stakeDate = new Date(referral.firstStakeTime * 1000).toLocaleDateString()

          return (
            <div
              key={referral.address}
              className="flex items-center justify-between rounded-lg bg-[#0d0d14] px-4 py-3 border border-[#ffffff05] hover:border-[#00f5d420] transition-colors"
            >
              <div className="flex items-center gap-4 flex-1">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#00f5d410] border border-[#00f5d420]">
                  <span className="text-sm font-semibold text-[#00f5d4]">{index + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-mono text-[#f1f5f9] font-semibold">
                      {formattedAddress}
                    </p>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(referral.address)
                      }}
                      className="text-xs text-[#64748b] hover:text-[#00f5d4] transition-colors"
                      title="Copy address"
                    >
                      📋
                    </button>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-[#64748b]">
                    <span>{t('stake.totalStaked') || 'Total Staked'}: {totalStakedNum.toFixed(2)} RWA</span>
                    <span>•</span>
                    <span>{t('stake.stakeDate') || 'Stake Date'}: {stakeDate}</span>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
