'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAccount, useReadContract } from 'wagmi'
import { formatUnits } from 'viem'
import { Loader2, AlertTriangle, Shield } from 'lucide-react'
import { HollowSwapArrows } from '@/components/swap/hollow-swap-arrows'
import { erc20ABI } from '@/lib/contracts/erc20ABI'
import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'
import { useSwapQuote } from '@/hooks/useSwapQuote'
import { useSwap, type SwapQuote } from '@/hooks/useSwap'
import { SwapTransactionOverlay } from '@/components/swap/swap-transaction-overlay'
import { DexSwapQuoteDetails } from '@/components/swap/dex-swap-quote-details'
import { DexSwapRateSummary } from '@/components/swap/dex-swap-rate-summary'
import { SwapAmountRow } from '@/components/swap/swap-amount-row'
import { TokenSelectSheet } from '@/components/swap/token-select-sheet'
import type { SwapTokenId, SwapTokenListItem, SwapTokenMeta } from '@/lib/swap-tokens'
import { getDexTokens, getTokenById, isTradeableSwapToken } from '@/lib/swap-tokens'
import { formatSwapError, isWalletUserRejected } from '@/lib/error-parser'

function useErc20Balance(tokenAddress: `0x${string}` | undefined, decimals: number) {
  const { address } = useAccount()
  const { data, refetch } = useReadContract({
    address: tokenAddress,
    abi: erc20ABI,
    functionName: 'balanceOf',
    args: address && tokenAddress ? [address] : undefined,
    query: { enabled: !!address && !!tokenAddress },
  })
  const balance = data != null ? formatUnits(data, decimals) : '0'
  return { balance, refetch }
}

function fmtBal(s: string) {
  const n = parseFloat(s)
  if (!Number.isFinite(n)) return '0.00'
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(2)}K`
  return n.toLocaleString(undefined, { maximumFractionDigits: 6 })
}

type InnerProps = {
  fromMeta: SwapTokenMeta
  toMeta: SwapTokenMeta
  fromAmount: string
  quote: SwapQuote | null
  isLoadingQuote: boolean
  t: (k: string, p?: Record<string, string | number>) => string
  onRefetchBalances: () => void
  locale: string
}

function DexPairInner({
  fromMeta: fm,
  toMeta: tm,
  fromAmount,
  quote,
  isLoadingQuote: isLoading,
  t,
  onRefetchBalances,
  locale,
}: InnerProps) {
  const { checkAllowance, approveToken, executeSwap, isLoading: txBusy } = useSwap(
    fm.address,
    tm.address,
    fm.decimals,
    tm.decimals
  )

  const [showOverlay, setShowOverlay] = useState(false)
  const [overlayStatus, setOverlayStatus] = useState<'waiting' | 'pending' | 'success' | 'error'>('waiting')
  const [txHash, setTxHash] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [needsAppr, setNeedsAppr] = useState(false)
  const [approving, setApproving] = useState(false)

  const toAmount = quote?.outputAmount || ''
  const hasAmt = parseFloat(fromAmount || '0') > 0

  useEffect(() => {
    let cancelled = false
    if (!hasAmt) {
      setNeedsAppr(false)
      return
    }
    ;(async () => {
      try {
        const ok = await checkAllowance(fromAmount)
        if (!cancelled) setNeedsAppr(!ok)
      } catch {
        if (!cancelled) setNeedsAppr(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [fromAmount, hasAmt, checkAllowance])

  const runApprove = useCallback(async () => {
    setErr(null)
    setApproving(true)
    try {
      await approveToken()
      setNeedsAppr(false)
    } catch (e: unknown) {
      setErr(formatSwapError(e, locale))
    } finally {
      setApproving(false)
    }
  }, [approveToken, locale])

  const runSwap = useCallback(async () => {
    if (!quote?.minOutputAmount) return
    setErr(null)
    setShowOverlay(true)
    setOverlayStatus('waiting')
    setTxHash(null)
    try {
      const hash = await executeSwap(fromAmount, quote.minOutputAmount)
      setTxHash(hash || null)
      setOverlayStatus('pending')
      await new Promise((r) => setTimeout(r, 1800))
      setOverlayStatus('success')
      onRefetchBalances()
    } catch (e: unknown) {
      const friendly = formatSwapError(e, locale)
      if (isWalletUserRejected(e)) {
        setShowOverlay(false)
        setErr(friendly)
        return
      }
      setErr(friendly)
      setOverlayStatus('error')
    }
  }, [executeSwap, fromAmount, quote, onRefetchBalances, locale])

  const quoteFail = hasAmt && !isLoading && !quote

  return (
    <div className="space-y-4">
      <SwapTransactionOverlay
        show={showOverlay}
        status={overlayStatus}
        txHash={txHash}
        fromAmount={fromAmount}
        toAmount={toAmount}
        fromToken={fm.symbol}
        toToken={tm.symbol}
        error={err}
        onClose={() => {
          setShowOverlay(false)
          window.location.reload()
        }}
      />

      {quoteFail && (
        <div className="flex items-start gap-2 rounded-xl border border-[#fbbf2440] bg-[#fbbf2412] p-3 text-[11px] text-[#fbbf24]">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{t('swap.dexNoRoute')}</span>
        </div>
      )}

      {err && !showOverlay && (
        <div className="flex items-start gap-2 rounded-xl border border-[#f43f5e40] bg-[#f43f5e10] p-2.5 text-[11px] text-[#f43f5e]">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{err}</span>
        </div>
      )}

      {!hasAmt ? (
        <button
          type="button"
          disabled
          className="mt-2 w-full cursor-not-allowed rounded-2xl border border-border-subtle bg-surface-2 py-4 text-[15px] font-bold text-text-disabled"
        >
          {t('swap.enterAmount')}
        </button>
      ) : needsAppr ? (
        <button
          type="button"
          disabled={approving}
          onClick={() => void runApprove()}
          className="mt-4 w-full rounded-2xl border border-plasma-cyan/35 bg-plasma-cyan/85 py-4 text-[15px] font-bold text-void-black transition-colors hover:bg-plasma-cyan disabled:opacity-60"
        >
          {approving ? (
            <span className="inline-flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              {t('swap.approving')}
            </span>
          ) : (
            t('swap.approveForDex', { token: fm.symbol })
          )}
        </button>
      ) : (
        <button
          type="button"
          disabled={txBusy || !quote || quoteFail}
          onClick={() => void runSwap()}
          className="mt-4 w-full rounded-2xl border border-plasma-cyan/30 bg-plasma-cyan/88 py-4 text-[15px] font-bold text-void-black transition-colors hover:bg-plasma-cyan disabled:opacity-50"
        >
          {txBusy ? (
            <span className="inline-flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              {t('swap.swapping')}
            </span>
          ) : (
            t('swap.swapNow')
          )}
        </button>
      )}
    </div>
  )
}

type PanelProps = {
  slippage: number
  onSlippageChange: (pct: number) => void
}

function QuoteRefreshToggle({
  enabled,
  onChange,
  title,
}: {
  enabled: boolean
  onChange: (v: boolean) => void
  title: string
}) {
  /* flex 两端对齐滑块，避免 translate 与轨道宽度误差导致溢出 */
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      title={title}
      onClick={() => onChange(!enabled)}
      className={`flex h-7 w-[52px] shrink-0 flex-row items-center rounded-full p-1 transition-all duration-200 ${
        enabled ? 'justify-end bg-plasma-cyan/75' : 'justify-start bg-surface-3 ring-1 ring-inset ring-white/10'
      }`}
    >
      <span className="pointer-events-none h-5 w-5 shrink-0 rounded-full bg-void-black shadow-md" />
    </button>
  )
}

export function DexSwapPanel({ slippage, onSlippageChange }: PanelProps) {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)
  const { isConnected, chainId } = useAccount()
  const tokens = useMemo(() => getDexTokens(chainId), [chainId])
  const [fromId, setFromId] = useState<SwapTokenId>('USDT')
  const [toId, setToId] = useState<SwapTokenId>('RWA')
  const [fromAmount, setFromAmount] = useState('')
  const [picker, setPicker] = useState<'from' | 'to' | null>(null)
  const [autoRefreshQuote, setAutoRefreshQuote] = useState(true)

  const fm = getTokenById(chainId, fromId)!
  const tm = getTokenById(chainId, toId)!

  const balFrom = useErc20Balance(fm.address, fm.decimals)
  const balTo = useErc20Balance(tm.address, tm.decimals)

  const quoteInterval = autoRefreshQuote ? 12_000 : 0

  const { quote, isLoading: quoteLoading, refresh, secondsSinceUpdate } = useSwapQuote(
    fm.address,
    tm.address,
    fromAmount,
    slippage,
    quoteInterval,
    fm.decimals,
    tm.decimals
  )

  useEffect(() => {
    setFromAmount('')
  }, [fromId, toId])

  const flip = () => {
    setFromId(toId)
    setToId(fromId)
    setFromAmount('')
  }

  const refetchAll = useCallback(() => {
    void balFrom.refetch()
    void balTo.refetch()
  }, [balFrom, balTo])

  const hasInput = parseFloat(fromAmount || '0') > 0
  const pairOk = fromId !== toId
  const rwaToUsdtBlocked = fromId === 'RWA' && toId === 'USDT'

  const onPick = (side: 'from' | 'to', meta: SwapTokenListItem) => {
    if (!isTradeableSwapToken(meta)) return
    const id = meta.id
    if (side === 'from') {
      if (id === toId) flip()
      else setFromId(id)
    } else {
      if (id === fromId) flip()
      else setToId(id)
    }
  }

  return (
    <div className="space-y-8 sm:space-y-10">
      {/* 大卡 ①：从 + 分割线翻转 + 到（独立一张，参考 Pancake 主输入卡） */}
      <div className="rounded-[24px] border border-white/[0.08] bg-gradient-to-b from-[#16161f] to-[#0c0c12] p-3 shadow-[0_4px_20px_rgba(0,0,0,0.28)] sm:rounded-[26px] sm:p-3.5">
        {rwaToUsdtBlocked && (
          <div className="mb-3 flex items-start gap-2 rounded-xl border border-plasma-cyan/15 bg-plasma-cyan/6 p-2.5 text-[11px] text-text-secondary">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-plasma-cyan/70" />
            <span>{t('swap.rwaToUsdtComingSoon')}</span>
          </div>
        )}
        <SwapAmountRow
          label={t('swap.from')}
          value={fromAmount}
          onChange={setFromAmount}
          token={fm}
          balanceDisplay={isConnected ? fmtBal(balFrom.balance) : '0'}
          onTokenClick={() => setPicker('from')}
          showMaxHalf={isConnected}
          onMax={() => setFromAmount(balFrom.balance)}
          onHalf={() => setFromAmount(String(parseFloat(balFrom.balance || '0') / 2))}
          disabled={!isConnected}
          usdHint={t('swap.dexPowered')}
          compact
          embedded
        />

        <div className="relative my-2 flex min-h-[2.35rem] items-center sm:my-2.5">
          <div
            className="pointer-events-none absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border-active/40"
            aria-hidden
          />
          <div className="relative z-[1] mx-auto flex w-full justify-center">
            <button
              type="button"
              onClick={flip}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-plasma-cyan/35 bg-surface-2 text-plasma-cyan/95 ring-2 ring-[#0a0a0f] hover:border-plasma-cyan/50 hover:bg-surface-3"
              aria-label={t('swap.flipAria')}
              title={t('swap.flipAria')}
            >
              <HollowSwapArrows className="text-plasma-cyan" sizeClassName="h-[15px] w-[22px]" />
            </button>
          </div>
        </div>

        <SwapAmountRow
          label={t('swap.to')}
          value={quote?.outputAmount || ''}
          onChange={() => {}}
          token={tm}
          balanceDisplay={isConnected ? fmtBal(balTo.balance) : '0'}
          onTokenClick={() => setPicker('to')}
          readOnly
          disabled={!isConnected}
          compact
          embedded
        />
      </div>

      {/* 大卡 ②：市价摘要 + 交易详情 */}
      <div className="rounded-[24px] border border-white/[0.08] bg-[#12121a]/95 p-3 shadow-[0_4px_20px_rgba(0,0,0,0.22)] sm:rounded-[26px] sm:p-3.5">
        {!pairOk && (
          <p className="py-6 text-center text-[12px] leading-relaxed text-text-secondary">{t('swap.dexCard2SameToken')}</p>
        )}
        {pairOk && !isConnected && (
          <p className="py-6 text-center text-[12px] leading-relaxed text-text-secondary">{t('swap.dexCard2NeedConnect')}</p>
        )}
        {pairOk && isConnected && rwaToUsdtBlocked && (
          <p className="py-6 text-center text-[12px] leading-relaxed text-text-secondary">{t('swap.rwaToUsdtComingSoon')}</p>
        )}
        {pairOk && isConnected && !rwaToUsdtBlocked && (
          <>
            <DexSwapRateSummary
              fromSymbol={fm.symbol}
              toSymbol={tm.symbol}
              quote={quote}
              hasInput={hasInput}
              isLoading={quoteLoading}
              onRefresh={refresh}
              t={t}
              embedded
            />
            {hasInput && quote && (
              <DexSwapQuoteDetails
                quote={quote}
                fromSymbol={fm.symbol}
                toSymbol={tm.symbol}
                slippagePct={slippage}
                secondsSinceUpdate={secondsSinceUpdate}
                isLoadingQuote={quoteLoading}
                t={t}
                embedded
              />
            )}
          </>
        )}
      </div>

      {/* 大卡 ③：滑点 + 主按钮 + 开关 */}
      <div className="rounded-[24px] border border-white/[0.08] bg-[#12121a]/95 p-3 shadow-[0_4px_20px_rgba(0,0,0,0.22)] sm:rounded-[26px] sm:p-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] pb-3">
          <span
            className="cursor-help border-b border-dotted border-text-secondary/50 text-[12px] text-text-secondary"
            title={t('swap.slippage')}
          >
            {t('swap.slippageTolerance')}
          </span>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <span className="font-jetbrains text-[13px] font-bold text-plasma-cyan/85">
              {slippage.toFixed(2).replace(/\.?0+$/, '')}%
            </span>
            <div className="flex gap-1.5">
              {[0.5, 1, 2].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => onSlippageChange(s)}
                  className={`rounded-full px-3 py-1.5 text-[11px] font-jetbrains font-bold transition-colors ${
                    slippage === s
                      ? 'border border-plasma-cyan/45 bg-plasma-cyan/18 text-plasma-cyan'
                      : 'border border-white/10 bg-transparent text-text-secondary hover:border-plasma-cyan/25 hover:text-plasma-cyan/90'
                  }`}
                >
                  {s}%
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="pt-3">
          {!isConnected ? (
            <button
              type="button"
              disabled
              className="w-full cursor-not-allowed rounded-2xl border border-border-subtle bg-surface-2 py-4 text-[15px] font-bold text-text-secondary"
            >
              {t('swap.connectFirst')}
            </button>
          ) : fromId === toId ? (
            <p className="text-center text-[12px] text-text-secondary">{t('swap.pickDifferent')}</p>
          ) : rwaToUsdtBlocked ? (
            <button
              type="button"
              disabled
              className="w-full cursor-not-allowed rounded-2xl border border-border-subtle bg-surface-2 py-4 text-[15px] font-bold text-text-secondary"
            >
              {t('swap.comingSoonShort')}
            </button>
          ) : (
            <DexPairInner
              key={`${fromId}-${toId}`}
              fromMeta={fm}
              toMeta={tm}
              fromAmount={fromAmount}
              quote={quote}
              isLoadingQuote={quoteLoading}
              t={t}
              onRefetchBalances={refetchAll}
              locale={locale}
            />
          )}
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/[0.06] pt-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 shrink-0 text-plasma-cyan/50" aria-hidden />
              <span
                className="cursor-help border-b border-dotted border-text-secondary/45 text-[12px] text-text-secondary"
                title={t('swap.singleHopOnlyHint')}
              >
                {t('swap.autoQuoteRefresh')}
              </span>
            </div>
            <p className="mt-1 ps-6 text-[10px] leading-snug text-text-disabled">{t('swap.autoQuoteRefreshHint')}</p>
          </div>
          <QuoteRefreshToggle
            enabled={autoRefreshQuote}
            onChange={setAutoRefreshQuote}
            title={t('swap.autoQuoteRefreshHint')}
          />
        </div>
      </div>

      <TokenSelectSheet
        open={picker === 'from'}
        onClose={() => setPicker(null)}
        tokens={tokens}
        excludeId={toId}
        title={t('swap.selectToken')}
        onPick={(meta) => onPick('from', meta)}
      />
      <TokenSelectSheet
        open={picker === 'to'}
        onClose={() => setPicker(null)}
        tokens={tokens}
        excludeId={fromId}
        title={t('swap.selectToken')}
        onPick={(meta) => onPick('to', meta)}
      />
    </div>
  )
}
