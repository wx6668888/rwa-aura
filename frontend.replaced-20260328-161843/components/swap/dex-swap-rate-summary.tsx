'use client'

import { RefreshCw } from 'lucide-react'
import type { SwapQuote } from '@/hooks/useSwap'

type Props = {
  fromSymbol: string
  toSymbol: string
  quote: SwapQuote | null
  hasInput: boolean
  isLoading: boolean
  onRefresh: () => void
  t: (k: string, p?: Record<string, string | number>) => string
  /** 嵌在第二大卡内：去掉外层描边 */
  embedded?: boolean
}

export function DexSwapRateSummary({
  fromSymbol,
  toSymbol,
  quote,
  hasInput,
  isLoading,
  onRefresh,
  t,
  embedded,
}: Props) {
  const impact = quote?.priceImpact
  const impactClass =
    impact == null
      ? 'text-text-disabled'
      : impact < 1
        ? 'text-emerald-400'
        : impact < 3
          ? 'text-amber-400'
          : 'text-rose-400'
  const impactText =
    impact == null ? '—' : impact < 0.01 ? '< 0.01%' : `${impact.toFixed(2)}%`

  const rateLine =
    quote && hasInput
      ? `1 ${fromSymbol} = ${quote.executionPrice} ${toSymbol}`
      : '—'

  const shell = embedded
    ? 'space-y-2.5'
    : 'rounded-[20px] border border-border-active/50 bg-surface-2/30 p-2.5 shadow-sm sm:p-3 space-y-2.5'

  return (
    <div className={shell}>
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2 border-b border-border-subtle/60 pb-2.5">
        <span className="text-[11px] text-text-secondary">{t('swap.dexRateSummaryTitle')}</span>
        <button
          type="button"
          onClick={() => void onRefresh()}
          className="inline-flex items-center gap-1.5 rounded-full border border-plasma-cyan/35 bg-plasma-cyan/12 px-3 py-1.5 text-[11px] font-semibold text-plasma-cyan/95 transition-colors hover:border-plasma-cyan/50 hover:bg-plasma-cyan/18 disabled:opacity-50"
          disabled={isLoading}
        >
          <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
          {t('swap.refreshQuote')}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-white/[0.06] bg-[#1a1a24]/90 px-2.5 py-2">
          <div className="text-[10px] font-medium text-text-disabled">{t('swap.dexSummaryRateBox')}</div>
          <div
            className={`mt-0.5 font-jetbrains text-[12px] font-bold leading-tight text-text-primary ${
              isLoading && hasInput ? 'animate-pulse' : ''
            }`}
          >
            {hasInput ? rateLine : t('swap.dexSummaryPlaceholder')}
          </div>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-[#1a1a24]/90 px-2.5 py-2">
          <div className="text-[10px] font-medium text-text-disabled">{t('swap.dexSummaryImpactBox')}</div>
          <div className={`mt-0.5 font-jetbrains text-[12px] font-bold ${impactClass}`}>
            {hasInput ? impactText : '—'}
          </div>
        </div>
      </div>

      {hasInput && quote && (
        <p className="mt-2 border-t border-border-subtle/50 pt-2 text-center text-[10px] leading-snug text-text-disabled">
          {t('swap.dexSummaryMinLine', {
            amount: quote.minOutputAmount,
            token: toSymbol,
          })}
        </p>
      )}

      <p className="mt-2 text-[9px] leading-snug text-text-disabled/90">{t('swap.dexSummaryFootnote')}</p>
    </div>
  )
}
