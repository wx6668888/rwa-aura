'use client'

import { useEffect, useState } from 'react'
import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'
import { useMarketData } from '@/hooks/useMarketData'

export function PriceHeader() {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)
  const { price, change24h, high24h, low24h, volume24h, marketCap, isLive } = useMarketData()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="border-b border-[#ffffff0d] bg-[#0d0d14] px-6 py-5 mt-16">
        <div className="mx-auto max-w-7xl">
          <div className="h-24 animate-pulse bg-[#13131e] rounded" />
        </div>
      </div>
    )
  }

  const priceNum = Number.isFinite(price as any) ? Number(price) : 0
  const changeNum = Number.isFinite(change24h as any) ? Number(change24h) : 0
  const highNum = Number.isFinite(high24h as any) ? Number(high24h) : 0
  const lowNum = Number.isFinite(low24h as any) ? Number(low24h) : 0
  const volumeNum = Number.isFinite(volume24h as any) ? Number(volume24h) : 0
  const marketCapNum = Number.isFinite(marketCap as any) ? Number(marketCap) : 0

  const isPositive = changeNum >= 0

  return (
    <div className="border-b border-[#ffffff0d] bg-[#0d0d14] px-6 py-5 mt-16">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          {/* Left block */}
          <div>
            {/* Row 1: Token info */}
            <div className="flex items-center gap-3">
              <img 
                src="/rwa-icon-64.webp" 
                alt="RWA" 
                className="h-9 w-9 rounded-full"
              />
              <span className="font-[family-name:var(--font-space-grotesk)] text-xl font-bold text-[#f1f5f9]">
                RWA
              </span>
              <span className="text-xs text-[#64748b]">{t('market.tokenName')}</span>
              <span className="rounded-full border border-[#ffffff0d] bg-[#1a1a2e] px-2 py-0.5 text-[11px] text-[#64748b]">
                BSC
              </span>
            </div>

            {/* Row 2: Price and change */}
            <div className="mt-2 flex items-end gap-4">
              <span className="font-[family-name:var(--font-space-grotesk)] text-5xl font-black text-[#f1f5f9] font-mono">
                ${priceNum.toFixed(4)}
              </span>
              <div
                className={`flex items-center gap-1 rounded-lg px-3 py-1.5 font-[family-name:var(--font-jetbrains-mono)] text-base font-bold ${
                  isPositive
                    ? 'bg-[#10b98126] text-[#10b981]'
                    : 'bg-[#f43f5e26] text-[#f43f5e]'
                }`}
              >
                {isPositive ? '▲' : '▼'} {isPositive ? '+' : ''}
                {changeNum.toFixed(2)}%
              </div>
              <span className="mb-1 text-[11px] text-[#334155]">{t('market.24h')}</span>
            </div>
          </div>

          {/* Right block: Stats (desktop only) */}
          <div className="hidden gap-6 lg:flex">
            <div className="flex flex-col">
              <span className="font-[family-name:var(--font-jetbrains-mono)] text-base text-[#10b981]">
                ${highNum.toFixed(4)}
              </span>
              <span className="mt-0.5 text-[11px] text-[#64748b]">{t('market.high24h')}</span>
            </div>
            <div className="flex flex-col">
              <span className="font-[family-name:var(--font-jetbrains-mono)] text-base text-[#f43f5e]">
                ${lowNum.toFixed(4)}
              </span>
              <span className="mt-0.5 text-[11px] text-[#64748b]">{t('market.low24h')}</span>
            </div>
            <div className="flex flex-col">
              <span className="font-[family-name:var(--font-jetbrains-mono)] text-base text-[#f1f5f9]">
                ${volumeNum.toLocaleString()}
              </span>
              <span className="mt-0.5 text-[11px] text-[#64748b]">{t('market.volume24h')}</span>
            </div>
            <div className="flex flex-col">
              <span className="font-[family-name:var(--font-jetbrains-mono)] text-base text-[#f1f5f9]">
                ${marketCapNum.toLocaleString()}
              </span>
              <span className="mt-0.5 text-[11px] text-[#64748b]">{t('market.marketCap')}</span>
            </div>
            <div className="flex flex-col items-center justify-center">
              <div className="flex items-center gap-1.5">
                <span className={`h-1.5 w-1.5 rounded-full ${isLive ? 'bg-[#10b981] animate-pulse' : 'bg-[#64748b]'}`} />
                <span className={`text-[11px] font-medium ${isLive ? 'text-[#10b981]' : 'text-[#64748b]'}`}>
                  {t('market.live')}
                </span>
              </div>
            </div>
          </div>

          {/* Mobile: Stats in 2x2 grid */}
          <div className="grid grid-cols-2 gap-4 lg:hidden">
            <div className="flex flex-col">
              <span className="font-[family-name:var(--font-jetbrains-mono)] text-sm text-[#10b981]">
                ${highNum.toFixed(4)}
              </span>
              <span className="mt-0.5 text-[11px] text-[#64748b]">{t('market.high24h')}</span>
            </div>
            <div className="flex flex-col">
              <span className="font-[family-name:var(--font-jetbrains-mono)] text-sm text-[#f43f5e]">
                ${lowNum.toFixed(4)}
              </span>
              <span className="mt-0.5 text-[11px] text-[#64748b]">{t('market.low24h')}</span>
            </div>
            <div className="flex flex-col">
              <span className="font-[family-name:var(--font-jetbrains-mono)] text-sm text-[#f1f5f9]">
                ${volumeNum.toLocaleString()}
              </span>
              <span className="mt-0.5 text-[11px] text-[#64748b]">{t('market.volume24h')}</span>
            </div>
            <div className="flex flex-col">
              <span className="font-[family-name:var(--font-jetbrains-mono)] text-sm text-[#f1f5f9]">
                ${marketCapNum.toLocaleString()}
              </span>
              <span className="mt-0.5 text-[11px] text-[#64748b]">{t('market.marketCap')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
