'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'
import { StakeActionPanel } from '@/components/stake/stake-action-panel'
import { StakeMobileAccordion } from '@/components/stake/stake-mobile-accordion'
import { FileText } from 'lucide-react'

/** 与 /swap（TRON 充值卡）同系：surface + plasma 描边 + 表单内输入行样式一致 */
export function StakePageClient() {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)
  const [stakeMode, setStakeMode] = useState<'USDT' | 'RWA'>('RWA')

  return (
    <main className="relative z-10 mx-auto max-w-[min(100%,480px)] px-4 pb-[calc(100px+env(safe-area-inset-bottom,0px))] pt-below-navbar-safe sm:px-4">
      <section
        aria-label={locale.startsWith('zh') ? '质押类型' : 'Staking type'}
        className="mb-4 flex justify-center px-1"
      >
        <div className="inline-flex items-center gap-1 rounded-full border border-white/[0.08] bg-[#12121a]/95 p-1">
          <button
            type="button"
            onClick={() => setStakeMode('USDT')}
            className={`min-w-[7.25rem] rounded-full px-4 py-2 text-center text-[13px] font-semibold tracking-tight transition-all duration-200 sm:min-w-[7.75rem] sm:px-5 ${
              stakeMode === 'USDT'
                ? 'bg-plasma-cyan text-void-black shadow-[0_0_20px_rgba(0,245,212,0.35)]'
                : 'text-text-secondary hover:bg-white/[0.04] hover:text-text-primary'
            }`}
          >
            {t('stake.stakeModeUSDT')}
          </button>
          <button
            type="button"
            onClick={() => setStakeMode('RWA')}
            className={`min-w-[7.25rem] rounded-full px-4 py-2 text-center text-[13px] font-semibold tracking-tight transition-all duration-200 sm:min-w-[7.75rem] sm:px-5 ${
              stakeMode === 'RWA'
                ? 'bg-plasma-cyan text-void-black shadow-[0_0_20px_rgba(0,245,212,0.35)]'
                : 'text-text-secondary hover:bg-white/[0.04] hover:text-text-primary'
            }`}
          >
            {t('stake.stakeModeRWA')}
          </button>
        </div>
      </section>

      <div className="overflow-hidden rounded-[28px] border-2 border-plasma-cyan/25 bg-surface-1/95 p-5 shadow-[0_0_48px_rgba(0,245,212,0.12)] backdrop-blur-xl sm:p-6">
        <StakeActionPanel stakeMode={stakeMode} />
      </div>

      <div className="mt-4">
        <StakeMobileAccordion />
      </div>

      <div className="mt-5 rounded-2xl border border-white/[0.08] bg-[#12121a]/95 px-4 py-3">
        <p className="text-[13px] leading-relaxed text-text-secondary">{t('stake.rwaGuideBanner')}</p>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
          <Link
            href="/swap"
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-plasma-cyan hover:underline"
          >
            {t('stake.rwaGuideBuyLink')}
          </Link>
          <Link
            href="/knowledge?article=rwa-dynamic-sell-tax"
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-plasma-cyan hover:underline"
          >
            <FileText className="h-3.5 w-3.5" />
            {t('stake.rwaGuideLink')}
          </Link>
        </div>
      </div>
    </main>
  )
}
