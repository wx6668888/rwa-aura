'use client'

import { useState, useCallback } from 'react'
import { Info } from 'lucide-react'
import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'
import { RwaWithdrawCard } from '@/components/withdraw/rwa-withdraw-card'
import { PrincipalWithdrawActions } from '@/components/withdraw/principal-withdraw-actions'
import { UsdtRewardsCard } from '@/components/withdraw/usdt-rewards-card'
import { StRWAUnlockCard } from '@/components/withdraw/st-rwa-unlock-card'
import { InvestmentSharesCard } from '@/components/withdraw/investment-shares-card'
import { ProjectDividendCard } from '@/components/dividend/project-dividend-card'
import { DividendWithdrawCard } from '@/components/withdraw/dividend-withdraw-card'
import { ReferralWithdrawCard } from '@/components/withdraw/referral-withdraw-card'
import { TxOverlay } from '@/components/withdraw/tx-overlay'

export function WithdrawPageClient() {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)

  const [txPending, setTxPending] = useState(false)
  const [txHash, setTxHash] = useState<string | string[] | undefined>()

  const handlePendingChange = useCallback((pending: boolean, hash?: string | string[]) => {
    setTxPending(pending)
    setTxHash(hash)
  }, [])

  return (
    <>
      <main className="mx-auto max-w-[600px] px-4 pb-[100px] pt-24">
        {/* Page header */}
        <div className="mb-6">
          <h1 className="font-[family-name:var(--font-space-grotesk)] text-[28px] font-bold leading-tight text-[#f1f5f9] tracking-tight sm:text-[32px]">
            {t('withdraw.title')}
          </h1>
          <p className="mt-1.5 text-[13px] text-[#64748b]">
            {t('withdraw.subtitle')}
          </p>
        </div>

        {/* Card 1 — RWA withdrawal */}
        <RwaWithdrawCard onPendingChange={handlePendingChange} />

        {/* Card 2 — Principal actions */}
        <div className="mt-4">
          <PrincipalWithdrawActions onPendingChange={handlePendingChange} />
        </div>

        {/* Card 3 — stRWA unlock */}
        <div className="mt-4">
          <StRWAUnlockCard />
        </div>

        {/* Card 4 — USDT rewards */}
        <div className="mt-4">
          <UsdtRewardsCard />
        </div>

        {/* Card 5 — Investment Shares */}
        <div className="mt-4">
          <InvestmentSharesCard />
        </div>

        {/* Card 6 — 提取项目分红 */}
        <div className="mt-4">
          <DividendWithdrawCard />
        </div>

        {/* Card 7 — 提取推荐奖励 */}
        <div className="mt-4">
          <ReferralWithdrawCard />
        </div>

        <div className="mt-4 flex items-start gap-2">
          <Info className="mt-0.5 h-3 w-3 shrink-0 text-[#64748b]" aria-hidden="true" />
          <p className="text-[11px] leading-relaxed text-[#64748b]">{t('withdraw.notice')}</p>
        </div>
      </main>

      {/* Transaction overlay */}
      <TxOverlay visible={txPending} txHash={txHash} />
    </>
  )
}
