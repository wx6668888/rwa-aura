'use client'

import { useEffect, useMemo, useState } from 'react'
import { Copy, CheckCircle2, Wallet, AlertTriangle, Loader2 } from 'lucide-react'
import { useAccount } from 'wagmi'
import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'

type TronTopupOrder = {
  id: number
  orderNo: string
  userWallet: string
  depositAddress: string
  status: string
  expiresAt: string
  paidAt: string | null
  confirmedAt: string | null
  releasedAt: string | null
  lastTxid: string | null
  lastPaidAmount: string | null
  remainingSeconds: number
  createdAt: string
  updatedAt: string
}

export function TronRechargeCard() {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)
  const { address, isConnected } = useAccount()
  const [usdtAmount, setUsdtAmount] = useState('')
  const [copied, setCopied] = useState(false)
  const [order, setOrder] = useState<TronTopupOrder | null>(null)
  const [orderLoading, setOrderLoading] = useState(false)
  const [orderError, setOrderError] = useState<string | null>(null)
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0)
  const [userMarkedPaid, setUserMarkedPaid] = useState(false)

  const formatEvmAddress = (v: string, head = 6, tail = 4) => {
    const s = String(v || '').trim()
    if (!s) return s
    if (s.length <= head + tail + 3) return s
    return `${s.slice(0, head)}...${s.slice(-tail)}`
  }

  const estimatedRwa = useMemo(() => {
    const n = Number(usdtAmount)
    if (!Number.isFinite(n) || n <= 0) return '0.00'
    return (n / 0.85).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }, [usdtAmount])

  useEffect(() => {
    setOrder(null)
    setOrderError(null)
    setRemainingSeconds(0)
    setCopied(false)
    setUserMarkedPaid(false)
  }, [address, isConnected])

  // Poll order status so we can disable copy/send after backend completes.
  useEffect(() => {
    if (!order?.id) return
    const st = order.status
    const shouldPoll = st === 'monitoring' || st === 'confirmed'
    if (!shouldPoll) return

    const it = window.setInterval(async () => {
      try {
        const resp = await fetch(`/api/tron-topup/order/${order.id}`)
        const json = await resp.json()
        if (!json?.success) return
        const next = json?.data
        if (next?.status && next?.depositAddress) setOrder(next)
      } catch {
        // ignore network polling errors
      }
    }, 8000)

    return () => window.clearInterval(it)
  }, [order?.id, order?.status])

  useEffect(() => {
    if (!order?.expiresAt) return
    const target = new Date(order.expiresAt).getTime()
    if (!Number.isFinite(target)) return
    setRemainingSeconds(Math.max(0, Math.ceil((target - Date.now()) / 1000)))

    const it = window.setInterval(() => {
      setRemainingSeconds(Math.max(0, Math.ceil((target - Date.now()) / 1000)))
    }, 1000)

    return () => window.clearInterval(it)
  }, [order?.expiresAt])

  const orderStatus = order?.status || ''
  const isActiveWindow = !!order?.depositAddress && orderStatus !== 'expired' && orderStatus !== 'cancelled' && remainingSeconds > 0
  const isCompleted = orderStatus === 'completed'
  const isExpired = orderStatus === 'expired' || orderStatus === 'cancelled'
  const isWaiting =
    !isCompleted &&
    !isExpired &&
    ['monitoring', 'paid_detected', 'confirmed'].includes(orderStatus)
  const showStep1 = !order?.depositAddress || isExpired
  const showStep2 = !!order?.depositAddress && isActiveWindow && !userMarkedPaid && !isCompleted
  const showStep3 = !!order?.depositAddress && (!showStep1 && !showStep2)

  const step = showStep1 ? 1 : showStep2 ? 2 : 3

  const countdownText = useMemo(() => {
    const s = Math.max(0, remainingSeconds || 0)
    const mm = String(Math.floor(s / 60)).padStart(2, '0')
    const ss = String(s % 60).padStart(2, '0')
    return `${mm}:${ss}`
  }, [remainingSeconds])

  const handleCopy = async () => {
    const toCopy = order?.depositAddress
    if (!toCopy) return
    try {
      await navigator.clipboard.writeText(toCopy)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // ignore copy failure
    }
  }

  const fetchLatestOrder = async () => {
    if (!order?.id) return
    try {
      const resp = await fetch(`/api/tron-topup/order/${order.id}`)
      const json = await resp.json()
      if (json?.success && json?.data) setOrder(json.data)
    } catch {
      // ignore
    }
  }

  const handleMarkedPaid = async () => {
    setUserMarkedPaid(true)
    // 立即刷新一次，减少用户等待
    await fetchLatestOrder()
  }

  const handleCreateOrder = async () => {
    if (!isConnected || !address) return
    setOrderLoading(true)
    setOrderError(null)
    setUserMarkedPaid(false)
    try {
      const resp = await fetch('/api/tron-topup/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userWallet: address, usdtAmount }),
      })
      const json = await resp.json()
      if (!json?.success) {
        throw new Error(json?.error || t('swap.tronOrderCreateFailed'))
      }
      const next = json?.data?.order as TronTopupOrder | undefined
      if (!next?.depositAddress) {
        throw new Error(t('swap.tronNoDepositAddress'))
      }
      setOrder(next)
      setCopied(false)
    } catch (e: any) {
      setOrderError(e?.message || t('swap.tronOrderCreateFailed'))
    } finally {
      setOrderLoading(false)
    }
  }

  const handleReset = () => {
    setOrder(null)
    setOrderError(null)
    setUserMarkedPaid(false)
    setRemainingSeconds(0)
    setCopied(false)
  }

  return (
    <div className="mx-auto w-full max-w-[480px] overflow-hidden rounded-[28px] border-2 border-plasma-cyan/25 bg-surface-1/95 shadow-[0_0_48px_rgba(0,245,212,0.12)] backdrop-blur-xl">
      <div className="space-y-4 p-5 sm:p-6">
        {/* Step Indicator */}
        <div className="flex items-center gap-2">
          {[1, 2, 3].map((i) => {
            const isActive = i === step
            const isDone = i < step
            return (
              <div key={i} className="flex items-center gap-2">
                <div
                  className={[
                    'flex h-7 w-7 items-center justify-center rounded-full border text-[12px] font-bold transition-all',
                    isDone
                      ? 'border-plasma-cyan/60 bg-plasma-cyan/15 text-plasma-cyan'
                      : isActive
                        ? 'border-plasma-cyan bg-plasma-cyan/30 text-plasma-cyan'
                        : 'border-border-subtle bg-surface-2 text-text-disabled',
                  ].join(' ')}
                >
                  {isDone ? <CheckCircle2 className="h-4 w-4" /> : i}
                </div>
                {i !== 3 ? (
                  <div className="h-[1px] w-10 bg-white/[0.08]" />
                ) : null}
              </div>
            )
          })}
        </div>

        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-plasma-cyan/80">
              {t('swap.tronRechargeKicker')}
            </p>
            <h3 className="text-lg font-bold text-text-primary">
              {t('swap.tronRechargeTitle')}
            </h3>
            <p className="text-[12px] leading-relaxed text-text-secondary">
              {t('swap.tronRechargeDesc')}
            </p>
          </div>

          {!showStep1 && !isCompleted && !isExpired ? (
            <div className="shrink-0 text-right">
              <div className="inline-flex items-center rounded-full border border-plasma-cyan/25 bg-plasma-cyan/10 px-3 py-1 text-[11px] font-semibold text-text-secondary">
                {t('swap.tronCountdown')} <span className="ml-1 font-mono text-plasma-cyan">{countdownText}</span>
              </div>
              <div className="mt-2 h-1.5 w-[148px] overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full bg-plasma-cyan/70 transition-[width]"
                  style={{
                    width: `${Math.min(100, Math.max(0, (remainingSeconds / 3600) * 100))}%`,
                  }}
                />
              </div>
            </div>
          ) : null}
        </div>

        {/* Step 2/3 card: address + QR + countdown */}
        {!showStep1 ? (
          <div className="rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#16161f] to-[#0c0c12] p-4">
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="text-[12px] text-text-secondary">
                {t('swap.tronDepositAddress')}
              </span>
              <button
                type="button"
                onClick={handleCopy}
                disabled={
                  !order?.depositAddress ||
                  remainingSeconds <= 0 ||
                  order?.status === 'completed' ||
                  order?.status === 'expired' ||
                  order?.status === 'cancelled'
                }
                className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border-subtle px-3 text-[11px] font-semibold text-plasma-cyan hover:border-plasma-cyan/40 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
              >
                {copied ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? t('swap.copyDone') : t('swap.copyAddress')}
              </button>
            </div>
            <div className="break-all rounded-xl border border-border-subtle bg-surface-2 px-4 py-3 font-mono text-[12px] text-text-primary">
              {order?.depositAddress
                ? isCompleted
                  ? t('swap.tronAddressReleased')
                  : isExpired
                    ? t('swap.tronOrderInvalid')
                    : remainingSeconds > 0
                      ? order.depositAddress
                      : t('swap.tronAddressExpired')
                : '—'}
            </div>

            {order?.orderNo && (
              <div className="mt-2 text-[10px] text-text-secondary/80">
                {t('swap.tronOrderNo')}：<span className="font-mono">{order.orderNo}</span>
                {remainingSeconds > 0 ? (
                  <>
                    {' '}
                    · {t('swap.tronValidityRemaining')} <span className="font-mono">{remainingSeconds}s</span>
                  </>
                ) : null}
              </div>
            )}
            {orderError ? <div className="mt-2 text-[11px] text-[#fb7185]">{orderError}</div> : null}
          </div>
        ) : null}

        {/* Step 1: amount input */}
        {showStep1 ? (
          <>
            <div className="rounded-2xl border border-white/[0.08] bg-[#12121a]/95 p-4">
              <div className="space-y-3">
                <label className="block">
                  <span className="mb-2 block text-[12px] text-text-secondary">
                    {t('swap.tronRechargeAmount')}
                  </span>
                  <div className="flex min-h-14 items-center gap-2 overflow-hidden rounded-2xl border border-border-subtle bg-surface-2 px-3 sm:px-4">
                    <input
                      type="number"
                      inputMode="decimal"
                      value={usdtAmount}
                      onChange={(e) => setUsdtAmount(e.target.value)}
                      placeholder="0.00"
                      className="h-14 min-w-0 flex-1 bg-transparent text-[22px] font-bold text-text-primary outline-none sm:text-[28px]"
                    />
                    <span className="shrink-0 select-none whitespace-nowrap text-[13px] font-bold text-plasma-cyan sm:text-base">
                      USDT
                    </span>
                  </div>
                </label>

                <div className="block">
                  <span className="mb-2 block text-[12px] text-text-secondary">
                    {t('swap.tronReceiveWallet')}
                  </span>
                  <div className="flex items-center gap-2 rounded-2xl border border-border-subtle bg-surface-2 px-4">
                    <Wallet className="h-4 w-4 shrink-0 text-text-secondary" />
                    <div className="flex min-h-12 flex-1 items-center py-3 text-[13px] text-text-primary">
                      {isConnected && address ? (
                        <span className="font-mono whitespace-nowrap">{formatEvmAddress(address)}</span>
                      ) : (
                        <span className="text-text-secondary">{t('swap.connectFirst')}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-plasma-cyan/15 bg-plasma-cyan/8 p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[12px] text-text-secondary">{t('swap.tronEstimatedReceive')}</span>
                <span className="font-mono text-[16px] font-bold text-plasma-cyan">{estimatedRwa} RWA</span>
              </div>
              <p className="mt-2 text-[10px] leading-relaxed text-text-disabled">
                {t('swap.tronEstimateFootnote')}
              </p>
            </div>
          </>
        ) : null}

        {/* Step 1 action */}
        {showStep1 ? (
          <button
            type="button"
            onClick={handleCreateOrder}
            disabled={!isConnected || orderLoading || !usdtAmount || Number(usdtAmount) <= 0}
            className="w-full rounded-2xl bg-plasma-cyan py-4 text-[15px] font-bold text-void-black transition-transform hover:scale-[1.01] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
          >
            {!isConnected
              ? t('swap.connectFirst')
              : orderLoading
                ? t('swap.tronGeneratingAddress')
                : t('swap.tronTopUpCta')}
          </button>
        ) : null}

        {/* Step 2 action */}
        {showStep2 ? (
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleMarkedPaid}
              disabled={!isConnected || remainingSeconds <= 0 || orderLoading || userMarkedPaid}
              className="w-full rounded-2xl bg-plasma-cyan py-4 text-[15px] font-bold text-void-black transition-transform hover:scale-[1.01] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
            >
              {userMarkedPaid ? t('swap.tronMarkedPaid') : t('swap.tronIHavePaid')}
            </button>

            <button
              type="button"
              onClick={fetchLatestOrder}
              disabled={orderLoading}
              className="w-full rounded-2xl border border-border-subtle bg-surface-2 py-4 text-[15px] font-bold text-text-primary transition-transform hover:scale-[1.01] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
            >
              {t('swap.tronRefreshStatus')}
            </button>

            <button
              type="button"
              onClick={handleReset}
              disabled={orderLoading}
              className="w-full rounded-2xl border border-border-subtle bg-surface-2/40 py-4 text-[14px] font-semibold text-text-secondary transition-transform hover:scale-[1.01] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
            >
              {t('swap.tronResetReenter')}
            </button>

            <p className="text-right text-[10px] text-text-disabled">
              {t('swap.tronMonitoringHint', { seconds: remainingSeconds })}
            </p>
          </div>
        ) : null}

        {/* Step 3 status + actions */}
        {showStep3 ? (
          <div className="space-y-3">
            <div className="rounded-2xl border border-border-subtle bg-surface-2 p-4">
              {isCompleted ? (
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-6 w-6 text-plasma-cyan" />
                  <div>
                    <div className="text-[14px] font-bold text-text-primary">{t('swap.tronPayoutSuccess')}</div>
                    <div className="mt-1 text-[12px] text-text-secondary/90">{t('swap.tronPayoutSentHint')}</div>
                  </div>
                </div>
              ) : isExpired ? (
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-6 w-6 text-[#fb7185]" />
                  <div>
                    <div className="text-[14px] font-bold text-text-primary">{t('swap.tronNotReceivedInTime')}</div>
                    <div className="mt-1 text-[12px] text-text-secondary/90">{t('swap.tronAddressRecycledHint')}</div>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-6 w-6 items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-plasma-cyan" />
                  </div>
                  <div>
                    <div className="text-[14px] font-bold text-text-primary">
                      {orderStatus === 'confirmed' || orderStatus === 'paid_detected'
                        ? t('swap.tronDetectedCrediting')
                        : t('swap.tronWaitingConfirm')}
                    </div>
                    <div className="mt-1 text-[12px] text-text-secondary/90">
                      {orderStatus === 'confirmed' || orderStatus === 'paid_detected'
                        ? t('swap.tronCreditingHint')
                        : t('swap.tronMonitoringNoRepeat')}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {isCompleted ? (
              <button
                type="button"
                onClick={handleReset}
                className="w-full rounded-2xl bg-plasma-cyan py-4 text-[15px] font-bold text-void-black transition-transform hover:scale-[1.01] hover:brightness-110"
              >
                {t('swap.tronAnotherTopUp')}
              </button>
            ) : isExpired ? (
              <button
                type="button"
                onClick={handleCreateOrder}
                disabled={!isConnected || orderLoading}
                className="w-full rounded-2xl bg-plasma-cyan py-4 text-[15px] font-bold text-void-black transition-transform hover:scale-[1.01] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
              >
                {t('swap.tronGetNewAddress')}
              </button>
            ) : (
              <button
                type="button"
                disabled
                className="w-full rounded-2xl bg-plasma-cyan/20 py-4 text-[15px] font-bold text-plasma-cyan transition-transform animate-pulse"
              >
                {t('swap.tronWaitingPayout')}
              </button>
            )}

            <button
              type="button"
              onClick={fetchLatestOrder}
              disabled={orderLoading}
              className="w-full rounded-2xl border border-border-subtle bg-surface-2 py-4 text-[15px] font-bold text-text-primary transition-transform hover:scale-[1.01] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
            >
              {t('swap.tronQueryOrderAgain')}
            </button>

            <button
              type="button"
              onClick={handleReset}
              disabled={orderLoading}
              className="w-full rounded-2xl border border-border-subtle bg-surface-2/40 py-4 text-[14px] font-semibold text-text-secondary transition-transform hover:scale-[1.01] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
            >
              {t('swap.tronResetStartOver')}
            </button>
          </div>
        ) : null}

      </div>
    </div>
  )
}
