'use client'

import Link from 'next/link'
import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'
import { StakeActionPanel } from '@/components/stake/stake-action-panel'
import { StakeInfoPanelContent } from '@/components/stake/stake-info-panel'
import { StakeMobileAccordion } from '@/components/stake/stake-mobile-accordion'
import { FileText } from 'lucide-react'

export function StakePageClient() {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)

  return (
    <main className="mx-auto max-w-7xl px-4 pb-[100px] pt-24 lg:px-8">
      {/* Page Header */}
      <div className="pb-4">
        <h1 className="font-[family-name:var(--font-space-grotesk)] text-3xl font-bold text-[#f1f5f9]">
          {t('stake.title')}
        </h1>
      </div>

      {/* RWA 质押引导：购买 RWA 再质押，卖出税更低 */}
      <div className="mt-4 rounded-xl border border-[#00f5d4]/25 bg-[#00f5d4]/05 px-4 py-3">
        <p className="text-[13px] leading-relaxed text-[#e2e8f0]">
          {t('stake.rwaGuideBanner')}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
          <Link
            href="/swap"
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#00f5d4] hover:underline"
          >
            {t('stake.rwaGuideBuyLink')}
          </Link>
          <Link
            href="/knowledge?article=rwa-dynamic-sell-tax"
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#00f5d4] hover:underline"
          >
            <FileText className="h-3.5 w-3.5" />
            {t('stake.rwaGuideLink')}
          </Link>
        </div>
      </div>

      {/* Desktop: 60/40 asymmetric grid | Mobile: single column */}
      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[3fr_2fr]">

        {/* LEFT 60% — Action Panel + mobile accordion */}
        <div>
          <StakeActionPanel />
          <StakeMobileAccordion />
        </div>

        {/* RIGHT 40% — Sticky info card (desktop only) */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 rounded-2xl border border-[#00f5d420] bg-gradient-to-br from-[#0d0d14] to-[#13131e] p-6 backdrop-blur-xl shadow-[0_0_20px_rgba(0,245,212,0.05)]">
            <StakeInfoPanelContent />
          </div>
        </aside>
      </div>
    </main>
  )
}
