'use client'

import { ChevronDown, ChevronUp, Info } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import type { SwapQuote } from '@/hooks/useSwap'
import { RECOMMENDED_FEE } from '@/lib/contracts/pancakeswap'
import { cn } from '@/lib/utils'

type Props = {
  quote: SwapQuote
  fromSymbol: string
  toSymbol: string
  slippagePct: number
  secondsSinceUpdate: number | null
  isLoadingQuote: boolean
  t: (k: string, p?: Record<string, string | number>) => string
  embedded?: boolean
}

function feeTierLabel() {
  const pct = RECOMMENDED_FEE / 10000
  return `${pct}%`
}

function formatMinOut(s: string, symbol: string) {
  const n = parseFloat(s)
  if (!Number.isFinite(n)) return `— ${symbol}`
  const dec = symbol === 'USDT' || symbol === 'BUSD' ? 4 : 6
  return `${n.toLocaleString(undefined, { maximumFractionDigits: dec, minimumFractionDigits: Math.min(2, dec) })} ${symbol}`
}

function gasDisplay(gas: string | undefined, t: Props['t']) {
  if (!gas || gas === '0') return t('swap.gasUnknown')
  try {
    const g = BigInt(gas)
    if (g === 0n) return t('swap.gasUnknown')
    return g.toLocaleString()
  } catch {
    return t('swap.gasUnknown')
  }
}

export function DexSwapQuoteDetails({
  quote,
  fromSymbol,
  toSymbol,
  slippagePct,
  secondsSinceUpdate,
  isLoadingQuote,
  t,
  embedded,
}: Props) {
  const [open, setOpen] = useState(true)

  const impact = quote.priceImpact
  const impactClass =
    impact < 1 ? 'text-emerald-400' : impact < 3 ? 'text-amber-400' : 'text-rose-400'
  const impactText = impact < 0.01 ? '< 0.01%' : `${impact.toFixed(2)}%`

  return (
    <div
      className={cn(
        embedded
          ? 'border-t border-border-subtle/70 px-0.5 pt-3'
          : 'rounded-[20px] border border-border-subtle bg-surface-2/35 px-2.5 py-2 shadow-sm sm:px-3.5 sm:py-2.5',
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <span className="text-[13px] font-semibold text-text-primary">{t('swap.dexDetailsTitle')}</span>
        <span className="flex items-center gap-1 text-[11px] text-text-secondary">
          {secondsSinceUpdate != null && (
            <span className="font-jetbrains">{t('swap.quoteUpdatedAgo', { seconds: secondsSinceUpdate })}</span>
          )}
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </span>
      </button>

      {open && (
        <div className="mt-3 space-y-2.5 border-t border-border-subtle/80 pt-3">
          <Row label={t('swap.rate')} loading={isLoadingQuote}>
            <span className="font-jetbrains text-text-primary">
              1 {fromSymbol} = {quote.executionPrice} {toSymbol}
            </span>
          </Row>
          <Row label={t('swap.inverseRate')} loading={isLoadingQuote}>
            <span className="font-jetbrains text-text-primary">
              1 {toSymbol} ={' '}
              {(() => {
                const ep = parseFloat(quote.executionPrice)
                if (!Number.isFinite(ep) || ep === 0) return '—'
                return (1 / ep).toLocaleString(undefined, { maximumFractionDigits: 6 })
              })()}{' '}
              {fromSymbol}
            </span>
          </Row>
          <Row label={t('swap.priceImpact')} loading={isLoadingQuote}>
            <span className={`font-jetbrains ${impactClass}`}>{impactText}</span>
          </Row>
          <Row label={t('swap.slippageShort')} loading={false}>
            <span className="font-jetbrains text-text-primary">{slippagePct}%</span>
          </Row>
          <Row label={t('swap.minReceived')} loading={isLoadingQuote}>
            <span className="font-jetbrains text-text-primary">{formatMinOut(quote.minOutputAmount, toSymbol)}</span>
          </Row>
          <Row
            label={
              <span className="inline-flex items-center gap-1">
                {t('swap.lpFee')}
                <Info className="h-3 w-3 text-text-disabled" aria-hidden />
              </span>
            }
            loading={false}
          >
            <span className="font-jetbrains text-text-secondary">
              {feeTierLabel()} · {t('swap.dexFeeTierHint')}
            </span>
          </Row>
          <Row label={t('swap.estGasLabel')} loading={isLoadingQuote}>
            <span className="font-jetbrains text-text-secondary">{gasDisplay(quote.gasEstimate, t)}</span>
          </Row>
          <div className="rounded-xl bg-surface-1/60 px-3 py-2.5">
            <div className="text-[11px] text-text-disabled">{t('swap.route')}</div>
            <div className="mt-1 font-jetbrains text-[12px] text-text-secondary">
              {fromSymbol} → {toSymbol}
              <span className="ms-2 rounded-md border border-border-subtle px-1.5 py-0.5 text-[10px] text-text-disabled">
                {t('swap.routeSingleHop')}
              </span>
            </div>
            <p className="mt-2 text-[10px] leading-relaxed text-text-disabled">{t('swap.poweredBy')}</p>
          </div>
        </div>
      )}
    </div>
  )
}

function Row({
  label,
  children,
  loading,
}: {
  label: ReactNode
  children: ReactNode
  loading: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-3 text-[12px]">
      <span className="shrink-0 text-text-secondary">{label}</span>
      <span className={`min-w-0 text-end text-[12px] ${loading ? 'animate-pulse text-text-disabled' : ''}`}>
        {children}
      </span>
    </div>
  )
}
