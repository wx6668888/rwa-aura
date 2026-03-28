'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import { useAccount } from 'wagmi'
import { ExternalLink } from 'lucide-react'
import psLogo from '../../ps.png'
import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'
import { CONTRACT_ADDRESSES } from '@/lib/contracts/addresses'
import { ProtocolSwapEngine } from '@/components/swap/protocol-swap-engine'
import { DexSwapPanel } from '@/components/swap/dex-swap-panel'
import { TronRechargeCard } from '@/components/swap/tron-recharge-card'
import type { SwapModeTab } from '@/components/swap/swap-trade-toolbar'

type Props = {
  tab: SwapModeTab
}

export function UnifiedSwapCard({ tab }: Props) {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)
  const { chainId } = useAccount()
  const [dexSlippage, setDexSlippage] = useState(0.5)

  const pancakeUrl = useMemo(() => {
    const a = chainId ? CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES] : CONTRACT_ADDRESSES[56]
    if (!a) return 'https://pancakeswap.finance/swap?chain=bsc'
    return `https://pancakeswap.finance/swap?chain=bsc&inputCurrency=${a.usdtToken}&outputCurrency=${a.rwaToken}`
  }, [chainId])

  const PancakeCard = (
    <div className="space-y-4 px-0 py-1 text-center">
      <div className="rounded-2xl border border-border-active bg-gradient-to-br from-surface-2 to-surface-1 p-6">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center overflow-visible bg-transparent">
          <Image
            src={psLogo}
            alt="PancakeSwap"
            width={56}
            height={56}
            className="object-contain"
            priority
          />
        </div>
        <h3 className="font-[family-name:var(--font-space-grotesk)] text-lg font-bold text-text-primary">
          {t('swap.pancakeCtaTitle')}
        </h3>
        <p className="mt-2 text-[12px] leading-relaxed text-text-secondary">{t('swap.pancakeCtaSub')}</p>
        <a
          href={pancakeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#1fc7d4] py-3.5 text-[14px] font-bold text-[#191326] transition-transform hover:scale-[1.02] hover:brightness-110"
        >
          {t('swap.openPancakeFull')}
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>
      <p className="text-[10px] text-text-disabled">{t('swap.pancakeDisclaimer')}</p>
    </div>
  )

  return (
    <div
      className={
        tab === 'dex'
          ? 'mx-auto mt-1 w-full max-w-[480px] sm:mt-2'
          : tab === 'tron'
            ? ''
            : 'mx-auto w-full max-w-[480px] overflow-hidden rounded-[28px] border-2 border-plasma-cyan/25 bg-surface-1/95 shadow-[0_0_48px_rgba(0,245,212,0.12)] backdrop-blur-xl'
      }
    >
      <div className={tab === 'dex' || tab === 'tron' ? '' : 'p-5 sm:p-6'}>
        {tab === 'protocol' && <ProtocolSwapEngine />}

        {tab === 'dex' && (
          <div className="space-y-6">
            <DexSwapPanel slippage={dexSlippage} onSlippageChange={setDexSlippage} />
            {PancakeCard}
          </div>
        )}

        {tab === 'tron' && <TronRechargeCard />}
      </div>
    </div>
  )
}
