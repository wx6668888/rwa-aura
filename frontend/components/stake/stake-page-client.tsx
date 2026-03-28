'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'
import { StakeActionPanel } from '@/components/stake/stake-action-panel'
import { StakeMobileAccordion } from '@/components/stake/stake-mobile-accordion'
import { FileText } from 'lucide-react'

/** Pancake 式质押页：模式卡片在大盘外 + 主表单卡片 + 底部池子信息 */
export function StakePageClient() {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)
  const [stakeMode, setStakeMode] = useState<'USDT' | 'RWA'>('RWA')

  return (
    <main className="mx-auto max-w-[min(100%,432px)] px-3 pb-[calc(100px+env(safe-area-inset-bottom,0px))] pt-below-navbar-safe sm:px-4">
      {/* 居中、紧凑的分段选择器（无标题文案） */}
      <section
        aria-label={locale.startsWith('zh') ? '质押类型' : 'Staking type'}
        className="mb-4 flex justify-center px-1"
      >
        <div className="inline-flex items-center gap-1 rounded-full border border-[#ffffff0a] bg-[#121216] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <button
            type="button"
            onClick={() => setStakeMode('USDT')}
            className={`min-w-[7.25rem] rounded-full px-4 py-2 text-center text-[13px] font-semibold tracking-tight transition-all duration-200 sm:min-w-[7.75rem] sm:px-5 ${
              stakeMode === 'USDT'
                ? 'bg-[#00f5d4] text-[#05050a] shadow-[0_0_20px_rgba(0,245,212,0.35)]'
                : 'text-[#94a3b8] hover:bg-[#ffffff06] hover:text-[#e2e8f0]'
            }`}
          >
            {t('stake.stakeModeUSDT')}
          </button>
          <button
            type="button"
            onClick={() => setStakeMode('RWA')}
            className={`min-w-[7.25rem] rounded-full px-4 py-2 text-center text-[13px] font-semibold tracking-tight transition-all duration-200 sm:min-w-[7.75rem] sm:px-5 ${
              stakeMode === 'RWA'
                ? 'bg-[#00f5d4] text-[#05050a] shadow-[0_0_20px_rgba(0,245,212,0.35)]'
                : 'text-[#94a3b8] hover:bg-[#ffffff06] hover:text-[#e2e8f0]'
            }`}
          >
            {t('stake.stakeModeRWA')}
          </button>
        </div>
      </section>

      {/* 主卡片：仅表单（不再包含 USDT/RWA 切换） */}
      <div className="rounded-[20px] border border-[#00f5d4]/28 bg-[#1c1c22] p-3 shadow-[0_8px_32px_rgba(0,0,0,0.45)] sm:p-4">
        <StakeActionPanel stakeMode={stakeMode} />
      </div>

      {/* 池子信息（真实数据见 StakeInfoPanelContent + useAnalyticsStats） */}
      <div className="mt-4">
        <StakeMobileAccordion />
      </div>

      {/* 引导说明：置于页面最下方 */}
      <div className="mt-5 rounded-2xl border border-[#ffffff0d] bg-[#13131e]/90 px-4 py-3">
        <p className="text-[13px] leading-relaxed text-[#cbd5e1]">{t('stake.rwaGuideBanner')}</p>
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
    </main>
  )
}
