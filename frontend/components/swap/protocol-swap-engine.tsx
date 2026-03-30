'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAccount, usePublicClient } from 'wagmi'
import { parseUnits } from 'viem'
import { Loader2, AlertTriangle, RefreshCw, Settings2 } from 'lucide-react'
import { HollowSwapArrows } from '@/components/swap/hollow-swap-arrows'
import { erc20ABI } from '@/lib/contracts/erc20ABI'
import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'
import { useUSDT } from '@/hooks/useUSDT'
import { useRWAToken } from '@/hooks/useRWAToken'
import { useRwaPrice } from '@/hooks/useRwaPrice'
import { useUSDTRWASwap } from '@/hooks/useUSDTRWASwap'
import { CONTRACT_ADDRESSES } from '@/lib/contracts/addresses'
import { SwapTransactionOverlay } from '@/components/swap/swap-transaction-overlay'
import { SwapAmountRow } from '@/components/swap/swap-amount-row'
import { TokenSelectSheet } from '@/components/swap/token-select-sheet'
import { getDexTokens, getTokenById, isTradeableSwapToken, type SwapTokenId } from '@/lib/swap-tokens'
import SwapDetails from '@/components/swap/swap-details'
import { formatSwapError, isWalletUserRejected } from '@/lib/error-parser'

function fmt(n: number, d = 4) {
  if (!Number.isFinite(n)) return '0'
  return n.toLocaleString(undefined, { maximumFractionDigits: d })
}

export function ProtocolSwapEngine() {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)
  const { isConnected, chainId, address } = useAccount()
  const publicClient = usePublicClient()
  const { price: rwaPrice } = useRwaPrice()
  const { balance: usdtBal, approveMax: approveUSDTMax, refetchBalance: refetchUsdt } = useUSDT()
  const { balanceFormatted: rwaBal, approveMax: approveRWAMax, refetchBalance: refetchRwa } = useRWAToken()
  const { swapUSDTToRWA, swapRWAToUSDT, swapAddress: internalSwapAddress } = useUSDTRWASwap()

  const p = rwaPrice > 0 ? rwaPrice : 0.85
  const protocolTokens = useMemo(
    () =>
      getDexTokens(chainId)
        .filter(isTradeableSwapToken)
        .filter((x) => x.id === 'USDT' || x.id === 'RWA'),
    [chainId],
  )

  const [fromId, setFromId] = useState<SwapTokenId>('USDT')
  const [toId, setToId] = useState<SwapTokenId>('RWA')
  const [fromAmount, setFromAmount] = useState('')
  const [slippage, setSlippage] = useState(0.5)
  const [picker, setPicker] = useState<'from' | 'to' | null>(null)
  const [showSettings, setShowSettings] = useState(false)

  const [showOverlay, setShowOverlay] = useState(false)
  const [overlayStatus, setOverlayStatus] = useState<'waiting' | 'pending' | 'success' | 'error'>('waiting')
  const [txHash, setTxHash] = useState<string | null>(null)
  const [swapErr, setSwapErr] = useState<string | null>(null)
  const [needsApproval, setNeedsApproval] = useState(false)
  const [busy, setBusy] = useState(false)

  const fm = getTokenById(chainId, fromId)!
  const tm = getTokenById(chainId, toId)!

  const internalSwapAvailable =
    typeof internalSwapAddress === 'string' &&
    /^0x[a-fA-F0-9]{40}$/.test(internalSwapAddress) &&
    internalSwapAddress !== '0x0000000000000000000000000000000000000000'

  const swapSpender = internalSwapAddress as `0x${string}` | undefined
  const usdtAddr = chainId ? (CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES]?.usdtToken as `0x${string}`) : undefined
  const rwaAddr = chainId ? (CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES]?.rwaToken as `0x${string}`) : undefined

  const toAmount = useMemo(() => {
    const a = parseFloat(fromAmount || '0')
    if (a <= 0) return ''
    if (fromId === 'USDT' && toId === 'RWA') return (a / p).toFixed(6)
    if (fromId === 'RWA' && toId === 'USDT') return (a * p).toFixed(6)
    return ''
  }, [fromAmount, fromId, toId, p])

  const displayQuote =
    fromAmount && parseFloat(fromAmount) > 0 && toAmount
      ? {
          outputAmount: toAmount,
          executionPrice: fromId === 'USDT' ? (1 / p).toFixed(6) : p.toFixed(6),
          priceImpact: 0,
          minOutputAmount: (parseFloat(toAmount) * (1 - slippage / 100)).toFixed(6),
          gasEstimate: '0',
        }
      : null

  const fromBalStr = fromId === 'USDT' ? usdtBal : rwaBal
  const toBalStr = toId === 'USDT' ? usdtBal : rwaBal

  useEffect(() => {
    let cancel = false
    const amt = parseFloat(fromAmount || '0')
    if (!isConnected || !hasAmt(amt) || !internalSwapAvailable || !swapSpender || !publicClient || !address) {
      setNeedsApproval(false)
      return
    }
    ;(async () => {
      try {
        if (fromId === 'USDT' && usdtAddr) {
          const w = parseUnits(fromAmount, 18)
          const al = await publicClient.readContract({
            address: usdtAddr,
            abi: erc20ABI,
            functionName: 'allowance',
            args: [address, swapSpender],
          })
          if (!cancel) setNeedsApproval(al < w)
        } else if (fromId === 'RWA' && rwaAddr) {
          const w = parseUnits(fromAmount, 18)
          const al = await publicClient.readContract({
            address: rwaAddr,
            abi: erc20ABI,
            functionName: 'allowance',
            args: [address, swapSpender],
          })
          if (!cancel) setNeedsApproval(al < w)
        } else if (!cancel) setNeedsApproval(false)
      } catch {
        if (!cancel) setNeedsApproval(true)
      }
    })()
    return () => {
      cancel = true
    }
  }, [
    isConnected,
    fromAmount,
    fromId,
    internalSwapAvailable,
    swapSpender,
    publicClient,
    address,
    usdtAddr,
    rwaAddr,
  ])

  function hasAmt(v: number) {
    return v > 0
  }

  const flip = () => {
    setFromId(toId)
    setToId(fromId)
    setFromAmount('')
  }

  const onPick = (side: 'from' | 'to', id: SwapTokenId) => {
    if (side === 'from') {
      if (id === toId) flip()
      else {
        setFromId(id)
        setToId(id === 'USDT' ? 'RWA' : 'USDT')
      }
    } else {
      if (id === fromId) flip()
      else {
        setToId(id)
        setFromId(id === 'USDT' ? 'RWA' : 'USDT')
      }
    }
  }

  const refetchBals = useCallback(() => {
    void refetchUsdt()
    void refetchRwa()
  }, [refetchUsdt, refetchRwa])

  const handleApprove = useCallback(async () => {
    if (!swapSpender) return
    setBusy(true)
    setSwapErr(null)
    try {
      if (fromId === 'USDT') await approveUSDTMax(swapSpender)
      else await approveRWAMax(swapSpender)
      setNeedsApproval(false)
    } catch (e: unknown) {
      setSwapErr(formatSwapError(e, locale))
    } finally {
      setBusy(false)
    }
  }, [swapSpender, fromId, approveUSDTMax, approveRWAMax, locale])

  const handleSwap = useCallback(async () => {
    if (!internalSwapAvailable) return
    if (fromId === 'RWA' && toId === 'USDT') return
    setSwapErr(null)
    setShowOverlay(true)
    setOverlayStatus('waiting')
    setTxHash(null)
    setBusy(true)
    try {
      let hash: string | null = null
      if (fromId === 'USDT') hash = await swapUSDTToRWA(fromAmount)
      else hash = await swapRWAToUSDT(fromAmount)
      await new Promise((r) => setTimeout(r, 800))
      setTxHash(hash)
      setOverlayStatus('pending')
      await new Promise((r) => setTimeout(r, 1800))
      setOverlayStatus('success')
      refetchBals()
    } catch (e: unknown) {
      const friendly = formatSwapError(e, locale)
      if (isWalletUserRejected(e)) {
        setShowOverlay(false)
        setSwapErr(friendly)
      } else {
        setSwapErr(friendly)
        setOverlayStatus('error')
      }
    } finally {
      setBusy(false)
    }
  }, [internalSwapAvailable, fromId, fromAmount, swapUSDTToRWA, swapRWAToUSDT, refetchBals, locale])

  const amtNum = parseFloat(fromAmount || '0')
  const rwaToUsdtComingSoon = fromId === 'RWA' && toId === 'USDT'
  const canSwap =
    isConnected &&
    amtNum > 0 &&
    fromId !== toId &&
    internalSwapAvailable &&
    !rwaToUsdtComingSoon

  return (
    <div className="space-y-3">
      <SwapTransactionOverlay
        show={showOverlay}
        status={overlayStatus}
        txHash={txHash}
        fromAmount={fromAmount}
        toAmount={toAmount}
        fromToken={fm.symbol}
        toToken={tm.symbol}
        error={swapErr}
        onClose={() => {
          setShowOverlay(false)
          window.location.reload()
        }}
      />

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => refetchBals()}
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border-subtle text-text-secondary hover:border-plasma-cyan/40 hover:text-plasma-cyan"
          aria-label="Refresh"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setShowSettings((s) => !s)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border-subtle text-text-secondary hover:border-plasma-cyan/40 hover:text-plasma-cyan"
          aria-label="Settings"
        >
          <Settings2 className="h-4 w-4" />
        </button>
      </div>

      {showSettings && (
        <div className="rounded-xl border border-border-active bg-surface-2/90 p-3 text-[12px]">
          <div className="mb-2 font-semibold text-text-primary">{t('swap.slippageTitle')}</div>
          <div className="flex flex-wrap gap-2">
            {[0.1, 0.5, 1.0].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSlippage(s)}
                className={`rounded-lg px-3 py-1.5 font-jetbrains font-semibold ${
                  slippage === s ? 'bg-plasma-cyan text-void-black' : 'bg-surface-1 text-text-secondary hover:text-text-primary'
                }`}
              >
                {s}%
              </button>
            ))}
          </div>
        </div>
      )}

      {!internalSwapAvailable && (
        <div className="flex items-start gap-2 rounded-xl border border-[#fbbf2440] bg-[#fbbf2412] p-3 text-[11px] text-[#fbbf24]">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{t('swap.protocolPaused')}</span>
        </div>
      )}

      {rwaToUsdtComingSoon && (
        <div className="flex items-start gap-2 rounded-xl border border-plasma-cyan/20 bg-plasma-cyan/8 p-3 text-[11px] text-text-secondary">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-plasma-cyan/80" />
          <span>{t('swap.rwaToUsdtComingSoon')}</span>
        </div>
      )}

      <SwapAmountRow
        label={t('swap.from')}
        value={fromAmount}
        onChange={setFromAmount}
        token={fm}
        balanceDisplay={isConnected ? fmt(parseFloat(fromBalStr || '0'), 6) : '0'}
        onTokenClick={() => setPicker('from')}
        showMaxHalf={isConnected}
        onMax={() => setFromAmount(fromBalStr.replace(/,/g, ''))}
        onHalf={() => setFromAmount(String(parseFloat(fromBalStr.replace(/,/g, '') || '0') / 2))}
        disabled={!isConnected}
        usdHint={`1 RWA ≈ $${p.toFixed(4)} · ${t('swap.routeProtocol')}`}
      />

      {/* 与 PancakeSwap 一致：分割线上的圆钮内，左 ↑ 右 ↓ 并列 */}
      <div className="relative flex min-h-[2.35rem] items-center">
        <div
          className="pointer-events-none absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border-active/40"
          aria-hidden
        />
        <div className="relative z-[1] mx-auto flex w-full justify-center">
          <button
            type="button"
            onClick={flip}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-surface-1 bg-surface-2 text-plasma-cyan shadow-lg ring-4 ring-[#0d0d14] hover:bg-surface-3"
            aria-label={t('swap.flipAria')}
            title={t('swap.flipAria')}
          >
            <HollowSwapArrows className="text-plasma-cyan" />
          </button>
        </div>
      </div>

      <SwapAmountRow
        label={t('swap.to')}
        value={toAmount}
        onChange={() => {}}
        token={tm}
        balanceDisplay={isConnected ? fmt(parseFloat(toBalStr || '0'), 6) : '0'}
        onTokenClick={() => setPicker('to')}
        readOnly
        disabled={!isConnected}
      />

      {fromAmount && displayQuote && !rwaToUsdtComingSoon && (
        <SwapDetails
          fromToken={fm.symbol}
          toToken={tm.symbol}
          fromAmount={fromAmount}
          quote={displayQuote}
          slippage={slippage}
          onSlippageChange={setSlippage}
        />
      )}

      {swapErr && !showOverlay && (
        <div className="flex items-start gap-2 rounded-xl border border-[#f43f5e40] bg-[#f43f5e10] p-3 text-[11px] text-[#f43f5e]">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{swapErr}</span>
        </div>
      )}

      {!isConnected ? (
        <button type="button" disabled className="w-full rounded-full bg-surface-2 py-4 text-[15px] font-bold text-text-secondary">
          {t('swap.connectFirst')}
        </button>
      ) : rwaToUsdtComingSoon ? (
        <button type="button" disabled className="w-full cursor-not-allowed rounded-full border border-border-subtle bg-surface-2 py-4 text-[15px] font-bold text-text-secondary">
          {t('swap.comingSoonShort')}
        </button>
      ) : !hasAmt(amtNum) ? (
        <button type="button" disabled className="w-full rounded-full bg-surface-2 py-4 text-[15px] font-bold text-text-disabled">
          {t('swap.enterAmount')}
        </button>
      ) : needsApproval ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => void handleApprove()}
          className="w-full rounded-full border border-border-active bg-surface-2 py-4 text-[15px] font-bold text-text-primary hover:bg-surface-3 disabled:opacity-50"
        >
          {busy ? (
            <span className="inline-flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              {t('swap.approving')}
            </span>
          ) : (
            t('swap.approveSpend', { token: fm.symbol })
          )}
        </button>
      ) : (
        <button
          type="button"
          disabled={!canSwap || busy}
          onClick={() => void handleSwap()}
          className="w-full rounded-full bg-plasma-cyan py-4 text-[15px] font-bold text-void-black transition-transform hover:scale-[1.01] hover:brightness-110 disabled:opacity-50"
        >
          {busy ? (
            <span className="inline-flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              {t('swap.swapping')}
            </span>
          ) : (
            t('swap.swapNow')
          )}
        </button>
      )}

      <p className="text-right text-[10px] text-text-disabled">{t('swap.poweredByProtocol')}</p>

      <TokenSelectSheet
        open={picker === 'from'}
        onClose={() => setPicker(null)}
        tokens={protocolTokens}
        excludeId={toId}
        title={t('swap.selectToken')}
        onPick={(meta) => {
          onPick('from', meta.id as SwapTokenId)
        }}
      />
      <TokenSelectSheet
        open={picker === 'to'}
        onClose={() => setPicker(null)}
        tokens={protocolTokens}
        excludeId={fromId}
        title={t('swap.selectToken')}
        onPick={(meta) => {
          onPick('to', meta.id as SwapTokenId)
        }}
      />
    </div>
  )
}
