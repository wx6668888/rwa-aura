'use client'

import { useMemo, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { parseUnits, formatUnits } from 'viem'
import { AlertTriangle, CheckCircle2, Loader2, X } from 'lucide-react'
import { useAccount, useReadContract } from 'wagmi'
import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'
import { useStakingContract } from '@/hooks/useStakingContract'
import { useRwaPrice } from '@/hooks/useRwaPrice'
import { CONTRACT_ADDRESSES } from '@/lib/contracts/addresses'
import { WithdrawModeSelector } from './withdraw-mode-selector'

const ERC20_BALANCE_ABI = [
  { type: 'function', name: 'balanceOf', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }] },
] as const

interface Props {
  onPendingChange: (pending: boolean, txHash?: string) => void
}

const MIN_WITHDRAW = 100
const WITHDRAW_FEE_RATE = 0.08

function formatCountdown(lockEndTimeSeconds: number, isZh: boolean): string {
  const now = Math.floor(Date.now() / 1000)
  const remaining = Math.max(0, lockEndTimeSeconds - now)
  if (remaining <= 0) return isZh ? '可提取' : 'Available'
  const days = Math.floor(remaining / 86400)
  const hours = Math.floor((remaining % 86400) / 3600)
  const mins = Math.floor((remaining % 3600) / 60)
  const parts: string[] = []
  if (days > 0) parts.push(isZh ? `${days} 天` : `${days}d`)
  if (hours > 0) parts.push(isZh ? `${hours} 小时` : `${hours}h`)
  parts.push(isZh ? `${mins} 分` : `${mins}m`)
  return isZh ? `${parts.join(' ')} 后可提取` : `In ${parts.join(' ')}`
}

function LockCountdown({ lockEndTime, isZh }: { lockEndTime: number; isZh: boolean }) {
  const [text, setText] = useState(() => formatCountdown(lockEndTime, isZh))
  useEffect(() => {
    const tick = () => setText(formatCountdown(lockEndTime, isZh))
    tick()
    const id = setInterval(tick, 60_000)
    return () => clearInterval(id)
  }, [lockEndTime, isZh])
  return <span className="text-[13px] text-[#94a3b8]">{text}</span>
}

export function PrincipalWithdrawActions({ onPendingChange }: Props) {
  const { locale } = useLocale()
  const { isConnected, chainId } = useAccount()
  const {
    rwaFlexiblePrincipal,
    usdtFlexiblePrincipal,
    rwaLockedPrincipals,
    usdtLockedPrincipals,
    withdrawFlexibleRWAPrincipal,
    withdrawFlexibleUSDTPrincipal,
    withdrawUSDTPrincipal,
    withdrawRWALockedPrincipal,
    refetchStakeInfo,
    refetchRewards,
    refetchRWAStakeInfo,
    refetchRwaFlexiblePrincipal,
    refetchUsdtFlexiblePrincipal,
    refetchUSDTLockedPrincipals,
    refetchRWALockedPrincipals,
    stakingAddress,
  } = useStakingContract()

  const rwaTokenAddress = chainId ? (CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES] as { rwaToken?: string } | undefined)?.rwaToken : undefined
  const { data: contractRwaBalanceWei } = useReadContract({
    address: rwaTokenAddress as `0x${string}` | undefined,
    abi: ERC20_BALANCE_ABI,
    functionName: 'balanceOf',
    args: stakingAddress ? [stakingAddress as `0x${string}`] : undefined,
    query: { enabled: !!rwaTokenAddress && !!stakingAddress },
  })

  const [pendingKey, setPendingKey] = useState<string | null>(null)
  const [successKey, setSuccessKey] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [confirmModal, setConfirmModal] = useState<{ type: 'usdt' | 'rwa'; amount: string; netAmount: string; withdrawAmount: string } | null>(null)
  const [principalSource, setPrincipalSource] = useState<'usdt' | 'rwa'>('rwa')
  const [principalAmount, setPrincipalAmount] = useState('')
  const [principalMode, setPrincipalMode] = useState<'withdrawU' | 'holdRWA'>('withdrawU')
  const { t } = useTranslation(locale)
  const { price: rwaPrice } = useRwaPrice()

  const isZh = locale.startsWith('zh')
  const rwaFlexibleNum = parseFloat(rwaFlexiblePrincipal || '0')
  const usdtFlexibleNum = parseFloat(usdtFlexiblePrincipal || '0')

  const allUsdtLocks = useMemo(() => {
    if (!usdtLockedPrincipals) return []
    return usdtLockedPrincipals.stakeIds.map((stakeId, index) => ({
      key: `usdt-lock-${index}`,
      index,
      stakeId,
      amount: parseFloat(usdtLockedPrincipals.amounts[index] || '0'),
      lockEndTime: usdtLockedPrincipals.lockEndTimes[index] ?? 0,
      canWithdraw: Boolean(usdtLockedPrincipals.canWithdraw[index]),
      withdrawn: Boolean(usdtLockedPrincipals.isWithdrawn[index]),
    }))
  }, [usdtLockedPrincipals])

  const allRwaLocks = useMemo(() => {
    if (!rwaLockedPrincipals) return []
    return rwaLockedPrincipals.stakeIds.map((stakeId, index) => ({
      key: `rwa-lock-${index}`,
      index,
      stakeId,
      amount: parseFloat(rwaLockedPrincipals.amounts[index] || '0'),
      lockEndTime: rwaLockedPrincipals.lockEndTimes[index] ?? 0,
      canWithdraw: Boolean(rwaLockedPrincipals.canWithdraw[index]),
      withdrawn: Boolean(rwaLockedPrincipals.isWithdrawn[index]),
    }))
  }, [rwaLockedPrincipals])

  const maturedUsdtLocks = useMemo(() => allUsdtLocks.filter((item) => item.canWithdraw && !item.withdrawn && item.amount >= MIN_WITHDRAW), [allUsdtLocks])
  const maturedRwaLocks = useMemo(() => allRwaLocks.filter((item) => item.canWithdraw && !item.withdrawn && item.amount >= MIN_WITHDRAW), [allRwaLocks])

  const hasActionablePrincipal =
    rwaFlexibleNum >= MIN_WITHDRAW ||
    usdtFlexibleNum >= MIN_WITHDRAW ||
    maturedUsdtLocks.length > 0 ||
    maturedRwaLocks.length > 0

  const hasFlexiblePrincipal = usdtFlexibleNum >= MIN_WITHDRAW || rwaFlexibleNum >= MIN_WITHDRAW
  const hasBothFlexible = usdtFlexibleNum >= MIN_WITHDRAW && rwaFlexibleNum >= MIN_WITHDRAW
  const effectiveSource = hasBothFlexible ? principalSource : (usdtFlexibleNum >= MIN_WITHDRAW ? 'usdt' : 'rwa')
  const flexibleMax = effectiveSource === 'usdt' ? usdtFlexibleNum : rwaFlexibleNum
  const principalAmountNum = parseFloat((principalAmount || '').replace(/,/g, '')) || 0
  const showPrincipalModeSelector = hasFlexiblePrincipal && principalAmountNum >= MIN_WITHDRAW
  const canPrincipalStRwa = effectiveSource === 'rwa'

  async function refreshAll() {
    await Promise.all([
      refetchStakeInfo(),
      refetchRewards(),
      refetchRWAStakeInfo(),
      refetchRwaFlexiblePrincipal(),
      refetchUsdtFlexiblePrincipal(),
      refetchUSDTLockedPrincipals(),
      refetchRWALockedPrincipals(),
    ])
  }

  async function runAction(key: string, action: () => Promise<string>) {
    if (pendingKey) return
    try {
      setPendingKey(key)
      setSuccessKey(null)
      setErrorMsg('')
      onPendingChange(true)
      const hash = await action()
      await refreshAll()
      setSuccessKey(key)
      onPendingChange(true, hash)
      setTimeout(() => {
        setSuccessKey(null)
        onPendingChange(false)
      }, 2500)
    } catch (error: any) {
      const msg = error?.message ?? error?.shortMessage ?? ''
      const isInsufficientRwa = typeof msg === 'string' && (msg.includes('ERC20InsufficientBalance') || msg.includes('InsufficientBalance') || msg.includes('insufficient'))
      setErrorMsg(
        isInsufficientRwa
          ? isZh
            ? '提现失败：Staking 合约当前 RWA 余额不足，无法支付本次到账金额。请稍后重试，或联系管理员从国库向 Staking 合约转入 RWA 后再提现。'
            : 'Withdrawal failed: Staking contract has insufficient RWA balance. Please try again later or ask admin to transfer RWA from Treasury to the Staking contract.'
          : msg || (isZh ? '本金提取失败，请重试。' : 'Principal withdrawal failed.')
      )
      onPendingChange(false)
    } finally {
      setPendingKey(null)
    }
  }

  async function confirmFlexibleWithdraw() {
    if (!confirmModal) return
    const { type, withdrawAmount } = confirmModal
    setConfirmModal(null)
    try {
      if (type === 'usdt') await runAction('usdt-flexible', () => withdrawFlexibleUSDTPrincipal(withdrawAmount))
      else await runAction('rwa-flexible', () => withdrawFlexibleRWAPrincipal(withdrawAmount))
    } catch {
      // runAction sets errorMsg
    }
  }

  function formatAmount(amount: number, symbol: 'RWA' | 'USDT') {
    return `${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${symbol}`
  }

  function renderActionRow(
    key: string,
    title: string,
    amountLabel: string,
    buttonLabel: string,
    onClick: () => Promise<string>
  ) {
    const isPending = pendingKey === key
    const isSuccess = successKey === key
    return (
      <div key={key} className="rounded-xl border border-white/[0.06] bg-[#13131e] p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-[#f1f5f9]">{title}</p>
            <p className="mt-1 font-[family-name:var(--font-jetbrains-mono)] text-xs text-[#94a3b8]">{amountLabel}</p>
          </div>
          <button
            type="button"
            onClick={() => void runAction(key, onClick)}
            disabled={!isConnected || isPending}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#00f5d4]/40 bg-[#00f5d4]/10 px-4 py-2 text-sm font-medium text-[#00f5d4] transition hover:bg-[#00f5d4]/15 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : isSuccess ? <CheckCircle2 className="h-4 w-4" /> : null}
            <span>{isPending ? (isZh ? '处理中...' : 'Processing...') : isSuccess ? (isZh ? '已提交' : 'Submitted') : buttonLabel}</span>
          </button>
        </div>
      </div>
    )
  }

  const modalEl =
    typeof document !== 'undefined' && confirmModal
      ? createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setConfirmModal(null)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-withdraw-title"
          >
            <div
              className="mx-4 w-full max-w-md rounded-2xl border border-[#00f5d4]/20 bg-[#0d0d14] p-6 shadow-[0_0_40px_rgba(0,245,212,0.08)]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h2 id="confirm-withdraw-title" className="font-semibold text-[#f1f5f9]">
                  {isZh ? '确认提现' : 'Confirm Withdrawal'}
                </h2>
                <button type="button" onClick={() => setConfirmModal(null)} className="rounded p-1 text-[#94a3b8] hover:bg-white/10 hover:text-[#f1f5f9]">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="mt-4 space-y-2 text-sm">
                <p className="text-[#94a3b8]">
                  {isZh ? '提现金额' : 'Withdraw amount'}: <span className="font-mono text-[#f1f5f9]">{confirmModal.amount}</span>
                </p>
                <p className="text-[#94a3b8]">
                  {isZh ? '实际到账（已扣 8% 手续费）' : 'Actual arrival (8% fee deducted)'}:{' '}
                  <span className="font-mono font-medium text-[#00f5d4]">{confirmModal.netAmount}</span> {confirmModal.type === 'usdt' ? 'USDT' : 'RWA'}
                </p>
                <p className="text-[#94a3b8]">
                  {isZh ? '同时销毁' : 'Will burn'}{' '}
                  <span className="font-mono text-[#f43f5e]">
                    {(parseFloat(confirmModal.withdrawAmount) * 0.5).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>{' '}
                  stRWA
                </p>
                {confirmModal.type === 'rwa' &&
                  contractRwaBalanceWei != null && (
                    (() => {
                      try {
                        const requiredWei = parseUnits(confirmModal.netAmount.replace(/,/g, ''), 18)
                        const insufficient = contractRwaBalanceWei < requiredWei
                        if (!insufficient) return null
                        const balanceStr = formatUnits(contractRwaBalanceWei, 18)
                        return (
                          <div className="mt-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-[13px] text-amber-200">
                            <p className="font-medium">
                              {isZh ? '合约 RWA 余额不足' : 'Insufficient contract RWA balance'}
                            </p>
                            <p className="mt-1 text-amber-200/90">
                              {isZh
                                ? `合约当前约 ${Number(balanceStr).toLocaleString('en-US', { maximumFractionDigits: 2 })} RWA，本次需支付约 ${confirmModal.netAmount} RWA。请稍后重试或联系管理员从国库转入 RWA 后再提现。`
                                : `Contract has ~${Number(balanceStr).toLocaleString('en-US', { maximumFractionDigits: 2 })} RWA; this withdrawal needs ~${confirmModal.netAmount} RWA. Try again later or ask admin to transfer RWA from Treasury.`}
                            </p>
                          </div>
                        )
                      } catch {
                        return null
                      }
                    })()
                  )}
              </div>
              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmModal(null)}
                  className="flex-1 rounded-lg border border-white/20 bg-white/5 py-2.5 text-sm font-medium text-[#94a3b8] hover:bg-white/10"
                >
                  {isZh ? '取消' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={() => void confirmFlexibleWithdraw()}
                  className="flex-1 rounded-lg border border-[#00f5d4]/40 bg-[#00f5d4]/15 py-2.5 text-sm font-medium text-[#00f5d4] hover:bg-[#00f5d4]/25"
                >
                  {isZh ? '确认提现' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )
      : null

  const effectivePrincipalAmount = Math.min(Math.max(principalAmountNum, 0), flexibleMax)
  const principalNetAmount = effectivePrincipalAmount * (1 - WITHDRAW_FEE_RATE)
  const principalRwaUsdEquiv = effectiveSource === 'rwa' ? effectivePrincipalAmount * rwaPrice : effectivePrincipalAmount

  const handlePrincipalWithdrawClick = () => {
    if (!hasFlexiblePrincipal || effectivePrincipalAmount < MIN_WITHDRAW) return
    setConfirmModal({
      type: effectiveSource,
      amount: effectiveSource === 'usdt' ? formatAmount(effectivePrincipalAmount, 'USDT') : formatAmount(effectivePrincipalAmount, 'RWA'),
      netAmount: principalNetAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      withdrawAmount: String(effectivePrincipalAmount),
    })
  }

  return (
    <>
      <div
        className="rounded-2xl border p-6"
        style={{
          background: '#0d0d14',
          borderColor: '#00f5d4',
          boxShadow: '0 0 0 1px #00f5d440, 0 8px 32px #00f5d415',
        }}
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-[#f1f5f9]">{t('withdraw.principalTitle')}</span>
        </div>

        {/* 每笔订单本金 */}
        <div className="mt-4">
          <p className="text-xs text-[#64748b]">{t('withdraw.principalOrders')}</p>
          <div className="mt-2 space-y-2">
            {usdtFlexibleNum > 0 && (
              <div className="flex items-center justify-between rounded-lg border border-[#ffffff0a] bg-[#0f0f14] px-3 py-2 font-[family-name:var(--font-jetbrains-mono)] text-[12px]">
                <span className="text-[#94a3b8]">{isZh ? '灵活 USDT' : 'Flexible USDT'}</span>
                <span className="text-[#f1f5f9]">{formatAmount(usdtFlexibleNum, 'USDT')}</span>
              </div>
            )}
            {rwaFlexibleNum > 0 && (
              <div className="flex items-center justify-between rounded-lg border border-[#ffffff0a] bg-[#0f0f14] px-3 py-2 font-[family-name:var(--font-jetbrains-mono)] text-[12px]">
                <span className="text-[#94a3b8]">{isZh ? '灵活 RWA' : 'Flexible RWA'}</span>
                <span className="text-[#f1f5f9]">{formatAmount(rwaFlexibleNum, 'RWA')}</span>
              </div>
            )}
            {allUsdtLocks.filter((l) => !l.withdrawn).map((lock) => (
              <div key={lock.key} className="flex flex-col gap-2 rounded-xl border border-[#ffffff0d] bg-[#13131e] px-3 py-2 font-[family-name:var(--font-jetbrains-mono)] text-[13px]">
                <div className="flex items-center justify-between">
                  <span className="text-[#94a3b8]">{isZh ? `锁仓 USDT #${lock.index}` : `Locked USDT #${lock.index}`}</span>
                  <span className="text-[#f1f5f9]">{formatAmount(lock.amount, 'USDT')}</span>
                </div>
                <LockCountdown lockEndTime={lock.lockEndTime} isZh={isZh} />
                {lock.canWithdraw && lock.amount >= MIN_WITHDRAW && (
                  <button
                    type="button"
                    onClick={() => void runAction(lock.key, () => withdrawUSDTPrincipal(lock.index))}
                    disabled={!isConnected || !!pendingKey}
                    className="self-end rounded-lg border border-[#00f5d4]/40 bg-[#00f5d4]/10 px-3 py-1.5 text-xs font-medium text-[#00f5d4] transition hover:bg-[#00f5d4]/15 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {pendingKey === lock.key ? <Loader2 className="inline h-3 w-3 animate-spin" /> : null}
                    {isZh ? '提取到期 USDT 本金' : 'Withdraw matured USDT principal'}
                  </button>
                )}
              </div>
            ))}
            {allRwaLocks.filter((l) => !l.withdrawn).map((lock) => (
              <div key={lock.key} className="flex flex-col gap-1.5 rounded-lg border border-[#ffffff0a] bg-[#0f0f14] px-3 py-2 font-[family-name:var(--font-jetbrains-mono)] text-[12px]">
                <div className="flex items-center justify-between">
                  <span className="text-[#94a3b8]">{isZh ? `锁仓 RWA #${lock.index}` : `Locked RWA #${lock.index}`}</span>
                  <span className="text-[#f1f5f9]">{formatAmount(lock.amount, 'RWA')}</span>
                </div>
                <LockCountdown lockEndTime={lock.lockEndTime} isZh={isZh} />
                {lock.canWithdraw && lock.amount >= MIN_WITHDRAW && (
                  <div className="flex flex-wrap gap-2 self-end">
                    <button
                      type="button"
                      onClick={() => void runAction(`${lock.key}-immediate`, () => withdrawRWALockedPrincipal(lock.index, false))}
                      disabled={!isConnected || !!pendingKey}
                      className="rounded-lg border border-[#00f5d4]/40 bg-[#00f5d4]/10 px-3 py-1.5 text-xs font-medium text-[#00f5d4] transition hover:bg-[#00f5d4]/15 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {pendingKey === `${lock.key}-immediate` ? <Loader2 className="inline h-3 w-3 animate-spin" /> : null}
                      {isZh ? '立即提取' : 'Immediate'}
                    </button>
                    <button
                      type="button"
                      onClick={() => void runAction(`${lock.key}-strwa`, () => withdrawRWALockedPrincipal(lock.index, true))}
                      disabled={!isConnected || !!pendingKey}
                      className="rounded-lg border border-[#00f5d4]/40 bg-[#00f5d4]/10 px-3 py-1.5 text-xs font-medium text-[#00f5d4] transition hover:bg-[#00f5d4]/15 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {pendingKey === `${lock.key}-strwa` ? <Loader2 className="inline h-3 w-3 animate-spin" /> : null}
                      {isZh ? '按 stRWA 提取' : 'As stRWA'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 灵活本金：来源选择 + 输入框（与上方 RWA 收益卡片一致） */}
        {hasFlexiblePrincipal && (
          <>
            {hasBothFlexible && (
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => { setPrincipalSource('usdt'); setPrincipalAmount('') }}
                  className={`rounded-xl border px-3 py-2 text-xs font-medium transition ${effectiveSource === 'usdt' ? 'border-[#00f5d4] bg-[#00f5d410] text-[#00f5d4]' : 'border-[#ffffff0d] bg-[#13131e] text-[#94a3b8] hover:border-[#ffffff1a]'}`}
                >
                  {isZh ? '灵活 USDT' : 'Flexible USDT'}
                </button>
                <button
                  type="button"
                  onClick={() => { setPrincipalSource('rwa'); setPrincipalAmount('') }}
                  className={`rounded-xl border px-3 py-2 text-xs font-medium transition ${effectiveSource === 'rwa' ? 'border-[#00f5d4] bg-[#00f5d410] text-[#00f5d4]' : 'border-[#ffffff0d] bg-[#13131e] text-[#94a3b8] hover:border-[#ffffff1a]'}`}
                >
                  {isZh ? '灵活 RWA' : 'Flexible RWA'}
                </button>
              </div>
            )}

            <div className="mt-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#64748b]">{t('withdraw.amountLabel')}</span>
                <span className="font-[family-name:var(--font-jetbrains-mono)] text-xs text-[#64748b]">{t('withdraw.balance')}</span>
              </div>
              <div className="mt-2 flex h-16 items-center gap-2 overflow-hidden rounded-xl border border-[#ffffff1a] bg-[#13131e] px-3 transition-colors focus-within:border-[#00f5d440] sm:gap-3 sm:px-5">
                <input
                  type="text"
                  inputMode="decimal"
                  value={principalAmount}
                  onChange={(e) => setPrincipalAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                  placeholder="0.00"
                  className="min-w-0 flex-1 bg-transparent font-[family-name:var(--font-jetbrains-mono)] text-xl text-[#f1f5f9] outline-none placeholder:text-[#334155] sm:text-2xl"
                  aria-label={t('withdraw.amountLabel')}
                />
                <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
                  <span className="flex items-center gap-1 rounded-full border border-[#ffffff0d] bg-[#1a1a2e] px-2 py-1 sm:gap-1.5 sm:px-3 sm:py-1.5">
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#00f5d4] text-[9px] font-bold text-[#05050a] sm:h-5 sm:w-5 sm:text-[10px]">
                      {effectiveSource === 'usdt' ? 'U' : 'R'}
                    </span>
                    <span className="hidden text-xs font-semibold text-[#f1f5f9] sm:inline sm:text-sm">{effectiveSource === 'usdt' ? 'USDT' : 'RWA'}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setPrincipalAmount(flexibleMax.toLocaleString('en-US', { maximumFractionDigits: 6, useGrouping: false }))}
                    disabled={!isConnected || flexibleMax === 0}
                    className="rounded-full border border-[#00f5d440] px-2 py-1 text-[10px] font-semibold text-[#00f5d4] transition-colors hover:bg-[#00f5d410] disabled:cursor-not-allowed disabled:opacity-50 sm:px-3 sm:text-xs"
                  >
                    {t('withdraw.max')}
                  </button>
                </div>
              </div>
              {principalAmountNum > 0 && (
                <p className="mt-1 font-[family-name:var(--font-jetbrains-mono)] text-sm text-[#64748b]">
                  {effectiveSource === 'rwa'
                    ? `${effectivePrincipalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RWA ${t('withdraw.usdEquiv', { amount: principalRwaUsdEquiv.toFixed(2) })}`
                    : `${effectivePrincipalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT ≈ ${effectivePrincipalAmount.toFixed(2)} USDT`}
                </p>
              )}
            </div>

            {/* 输入金额后自动出现两种模式选择与解释 */}
            {showPrincipalModeSelector && (
              <div className="mt-4">
                <WithdrawModeSelector
                  mode={canPrincipalStRwa ? principalMode : 'withdrawU'}
                  onModeChange={(m) => canPrincipalStRwa && setPrincipalMode(m)}
                  amount={String(effectivePrincipalAmount)}
                  principalAsset={effectiveSource}
                  allowStRWA={canPrincipalStRwa}
                />
                {!canPrincipalStRwa && (
                  <p className="mt-2 text-[11px] text-[#64748b]">{t('withdraw.principalStRwaOnlyRwa')}</p>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={handlePrincipalWithdrawClick}
              disabled={!isConnected || principalAmountNum < MIN_WITHDRAW || principalAmountNum > flexibleMax || !!pendingKey}
              className="mt-5 flex h-14 w-full items-center justify-center rounded-full font-[family-name:var(--font-space-grotesk)] text-sm font-bold transition-all disabled:cursor-not-allowed disabled:opacity-50"
              style={
                !isConnected || principalAmountNum < MIN_WITHDRAW || principalAmountNum > flexibleMax
                  ? { background: '#13131e', color: '#334155' }
                  : pendingKey
                    ? { background: '#00f5d4cc', color: '#05050a' }
                    : { background: '#00f5d4', color: '#05050a' }
              }
            >
              {pendingKey ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('withdraw.pending')}
                </span>
              ) : (
                t('withdraw.button')
              )}
            </button>
          </>
        )}

        {!hasActionablePrincipal && allUsdtLocks.every((l) => l.withdrawn) && allRwaLocks.every((l) => l.withdrawn) && (
          <div className="mt-4 rounded-xl border border-white/[0.06] bg-[#13131e] p-4 text-sm text-[#94a3b8]">
            {isZh ? '当前没有可提取的本金仓位，或可提金额尚未达到 100。' : 'No principal position is currently withdrawable, or the available amount has not reached 100 yet.'}
          </div>
        )}

        {errorMsg && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-[#f43f5e]/30 bg-[#f43f5e]/10 p-3 text-sm text-[#fda4af]">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>
      {modalEl}
    </>
  )
}
