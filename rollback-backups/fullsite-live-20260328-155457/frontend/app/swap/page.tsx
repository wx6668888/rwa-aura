'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Navbar } from '@/components/navbar'
import { BackgroundEffects } from '@/components/background-effects'
import { UnifiedSwapCard } from '@/components/swap/unified-swap-card'
import { SwapTradeToolbar, type SwapModeTab } from '@/components/swap/swap-trade-toolbar'
import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'

export default function SwapPage() {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)
  const searchParams = useSearchParams()
  const [tab, setTab] = useState<SwapModeTab>('tron')

  // Allow URL override, e.g. /swap?tab=dex
  useEffect(() => {
    const v = (searchParams?.get('tab') || '').toLowerCase()
    if (v === 'dex' || v === 'tron') setTab(v as SwapModeTab)
  }, [searchParams])

  return (
    <div className="relative min-h-screen bg-void-black text-text-primary overflow-x-hidden">
      <BackgroundEffects />

      <Navbar />
      <SwapTradeToolbar tab={tab} onTabChange={setTab} />

      <main className="relative z-10 mx-auto max-w-lg px-4 pb-24 pt-[9.75rem] sm:pt-[10.5rem]">
        <UnifiedSwapCard tab={tab} />
        {tab === 'dex' && (
          <p className="mt-5 pr-1 text-right text-[10px] leading-snug text-text-secondary/70">
            {t('swap.pancakeLiquidityCredit')}
          </p>
        )}
      </main>
    </div>
  )
}
