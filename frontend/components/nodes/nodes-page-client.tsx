'use client'

import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'
import { NodeStatusCard } from '@/components/nodes/node-status-card'
import { RewardRatesTable } from '@/components/nodes/reward-rates-table'
import { ReferralNetwork } from '@/components/nodes/referral-network'
import { QualityAssessmentCard } from '@/components/nodes/quality-assessment-card'

export function NodesPageClient() {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)

  return (
    <main className="relative mx-auto max-w-4xl px-4 pb-[100px] pt-below-navbar-safe lg:px-8">
      {/* Page Header */}
      <div className="pb-6">
        <h1 className="mt-1 font-[family-name:var(--font-space-grotesk)] text-3xl font-bold text-[#f1f5f9]">
          {t('nodes.title')}
        </h1>
      </div>

      <div className="flex flex-col gap-8">
        {/* Section 1: Node status */}
        <NodeStatusCard />

        {/* Section 2: Quality Assessment */}
        <QualityAssessmentCard />

        {/* Section 3: Reward rates table */}
        <RewardRatesTable />

        {/* Section 4: Referral network */}
        <ReferralNetwork />
      </div>
    </main>
  )
}
