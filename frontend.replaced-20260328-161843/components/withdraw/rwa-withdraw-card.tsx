'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Clock, Loader2, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import { useAccount, useChainId, usePublicClient } from 'wagmi'
import { formatUnits } from 'viem'
import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'
import { useStakingContract } from '@/hooks/useStakingContract'
import { useUserStakes } from '@/hooks/useUserStakes'
import { useRwaPrice } from '@/hooks/useRwaPrice'
import { WithdrawModeSelector } from './withdraw-mode-selector'

type WithdrawStatus = 'idle' | 'pending' | 'success' | 'error'
type CooldownState = 'ready' | 'cooling'

const COOLDOWN_TOTAL = 24 * 3600
const MIN_WITHDRAW = 100
const IMMEDIATE_FEE = 0.08
const BUYBACK_BURN_FEE = 0.03
const TREASURY_FEE = 0.03
const COMMUNITY_FEE = 0.02

function formatCountdown(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':')
}

function getExplorerTxUrl(chainId: number, hash: string): string {
  if (chainId === 56) return `https://bscscan.com/tx/${hash}`
  if (chainId === 97) return `https://testnet.bscscan.com/tx/${hash}`
  return `https://testnet.bscscan.com/tx/${hash}`
}

interface Props {
  onPendingChange: (pending: boolean, txHash?: string | string[]) => void
}

export function RwaWithdrawCard({ onPendingChange }: Props) {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const publicClient = usePublicClient()
  const {
    userStakeInfo,
    userRewards,
    rwaStakeInfo,
    withdraw,
    withdrawRWARewards,
    refetchStakeInfo,
    refetchRewards,
    refetchRWAStakeInfo,
  } = useStakingContract()
  const { stakes, loading: stakesLoading } = useUserStakes()
  const { price: rwaPrice } = useRwaPrice()

  const [amount, setAmount] = useState('')
  const [withdrawMode, setWithdrawMode] = useState<'withdrawU' | 'holdRWA'>('withdrawU')
  const [status, setStatus] = useState<WithdrawStatus>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [txHash, setTxHash] = useState<string | string[]>([])

  // USDT 质押结算收益（链上 rwaPending）
  const usdtRwaPending = userRewards?.rwaPending || '0'
  const usdtRwaPendingNum = parseFloat(usdtRwaPending)
  // RWA 质押结算收益（链上 rwaPending）
  const rwaStakeRwaPending = rwaStakeInfo?.rwaPending || '0'
  const rwaStakeRwaPendingNum = parseFloat(rwaStakeRwaPending)
  const rewardsTotalNum = usdtRwaPendingNum + rwaStakeRwaPendingNum
  // 奖励提现卡只处理已结算的 RWA 奖励；本金提取在独立动作区处理
  const totalRwaPendingNum = rewardsTotalNum

  // 冷却时间：USDT 与 RWA 各自独立，取两者中剩余更长的用于展示
  const lastWithdrawTimeUSDT = userStakeInfo?.lastWithdrawTime ? Number(userStakeInfo.lastWithdrawTime) : 0
  const lastWithdrawTimeRWA = rwaStakeInfo?.lastWithdrawTime ? Number(rwaStakeInfo.lastWithdrawTime) : 0
  const now = Math.floor(Date.now() / 1000)
  const cooldownEndUSDT = lastWithdrawTimeUSDT + COOLDOWN_TOTAL
  const cooldownEndRWA = lastWithdrawTimeRWA + COOLDOWN_TOTAL
  const remainingUSDT = Math.max(0, cooldownEndUSDT - now)
  const remainingRWA = Math.max(0, cooldownEndRWA - now)
  const remainingSeconds = Math.max(remainingUSDT, remainingRWA)
  const cooldown: CooldownState = remainingSeconds > 0 ? 'cooling' : 'ready'
  const [countdown, setCountdown] = useState(remainingSeconds)
  const cooldownEnd = Math.max(cooldownEndUSDT, cooldownEndRWA)

  // 质押金额（仅用于展示）
  const totalStaked = userStakeInfo?.totalStaked || '0'
  const totalStakedNum = parseFloat(totalStaked)
  
  // 锁仓期限倍数映射
  const getLockPeriodMultiplier = (lockPeriod?: string): number => {
    switch (lockPeriod) {
      case 'flexible': return 1.0
      case '30': return 1.3
      case '90': return 1.6
      case '180': return 2.0
      case '365': return 2.5
      default: return 1.0
    }
  }

  // 可提现 RWA = USDT 质押结算收益 + RWA 质押结算收益
  const availableRWA = totalRwaPendingNum.toFixed(6)
  const availableNum = parseFloat(availableRWA)
  const onChainAvailable = totalRwaPendingNum



  // Countdown tick
  useEffect(() => {
    if (cooldown !== 'cooling') return
    const id = setInterval(() => {
      const newRemaining = Math.max(0, cooldownEnd - Math.floor(Date.now() / 1000))
      setCountdown(newRemaining)
    }, 1000)
    return () => clearInterval(id)
  }, [cooldown, cooldownEnd])

  const numAmount = parseFloat(amount) || 0
  
  // Calculate amounts based on mode
  const buybackBurnAmount = withdrawMode === 'withdrawU' ? numAmount * BUYBACK_BURN_FEE : 0
  const treasuryFeeAmount = withdrawMode === 'withdrawU' ? numAmount * TREASURY_FEE : 0
  const communityFeeAmount = withdrawMode === 'withdrawU' ? numAmount * COMMUNITY_FEE : 0
  const protocolFeeAmount = withdrawMode === 'withdrawU' ? numAmount * IMMEDIATE_FEE : 0
  const receiveAmount = withdrawMode === 'withdrawU'
    ? Math.max(0, numAmount - protocolFeeAmount)
    : numAmount * 1.2
  const usdValue = receiveAmount * rwaPrice
  const requiresMultipleSignatures =
    (numAmount > usdtRwaPendingNum && numAmount <= rewardsTotalNum) ||
    numAmount > rewardsTotalNum

  const handleWithdraw = useCallback(async () => {
    if (!isConnected || !address) {
      setErrorMsg(t('common.connectWalletFirst'))
      return
    }

    if (numAmount < MIN_WITHDRAW) {
      setErrorMsg(t('withdraw.minWithdraw', { min: MIN_WITHDRAW }))
      return
    }

    if (numAmount > onChainAvailable) {
      setErrorMsg(t('withdraw.insufficientBalance') || `Insufficient balance. Only ${onChainAvailable.toFixed(2)} RWA available. Rewards are distributed daily at 00:00 UTC.`)
      return
    }

    const chooseStRWA = withdrawMode === 'holdRWA'
    const needFromUSDT = usdtRwaPendingNum > 0 && numAmount > 0
    const needFromRWA = rwaStakeRwaPendingNum > 0 && numAmount > usdtRwaPendingNum
    if (needFromUSDT && remainingUSDT > 0) {
      setErrorMsg(t('withdraw.cooldownNotEnded'))
      return
    }
    if (needFromRWA && remainingRWA > 0) {
      setErrorMsg(t('withdraw.cooldownNotEnded'))
      return
    }

    if (status === 'pending') return

    const needTwoTxs = numAmount > usdtRwaPendingNum && numAmount <= rewardsTotalNum

    try {
      setStatus('pending')
      setErrorMsg('')
      onPendingChange(true)

      let hash: string | undefined
      let hash2: string | undefined
      if (numAmount <= usdtRwaPendingNum) {
        hash = await withdraw(amount, chooseStRWA)
        onPendingChange(true, hash)
      } else if (numAmount <= rwaStakeRwaPendingNum) {
        hash = await withdrawRWARewards(amount, chooseStRWA)
        onPendingChange(true, hash)
      } else if (numAmount <= rewardsTotalNum) {
        const usdtPart = usdtRwaPendingNum.toFixed(6)
        const rwaPart = (numAmount - usdtRwaPendingNum).toFixed(6)
        hash = await withdraw(usdtPart, chooseStRWA)
        try {
          hash2 = await withdrawRWARewards(rwaPart, chooseStRWA)
        } catch (secondErr: any) {
          await Promise.all([refetchStakeInfo(), refetchRewards(), refetchRWAStakeInfo()])
          setStatus('error')
          setErrorMsg(
            locale.startsWith('zh')
              ? '第一笔交易已成功，第二笔失败。请刷新后重试提取剩余 RWA。'
              : 'First transaction succeeded; second failed. Please refresh and retry withdrawing the remaining RWA.'
          )
          onPendingChange(false)
          return
        }
      }

      if (hash != null) setTxHash(hash2 != null ? [hash, hash2] : hash)
      setStatus('success')
      if (hash2 != null) onPendingChange(true, [hash, hash2])
      else if (hash != null) onPendingChange(true, hash)

      setTimeout(() => {
        refetchStakeInfo()
        refetchRewards()
        refetchRWAStakeInfo()
      }, 2000)
      setTimeout(() => {
        onPendingChange(false)
        setStatus('idle')
        setAmount('')
        setTxHash([])
      }, 3000)
    } catch (error: any) {
      console.error('Withdraw error:', error)
      setStatus('error')
      setErrorMsg(error?.message || t('withdraw.withdrawFailed'))
      onPendingChange(false)
      if (needTwoTxs) {
        refetchStakeInfo()
        refetchRewards()
        refetchRWAStakeInfo()
      }
      setTimeout(() => {
        setStatus('idle')
        setErrorMsg('')
      }, 5000)
    }
  }, [
    isConnected,
    address,
    numAmount,
    onChainAvailable,
    rewardsTotalNum,
    withdrawMode,
    usdtRwaPendingNum,
    rwaStakeRwaPendingNum,
    remainingUSDT,
    remainingRWA,
    status,
    amount,
    withdraw,
    withdrawRWARewards,
    refetchStakeInfo,
    refetchRewards,
    refetchRWAStakeInfo,
    onPendingChange,
    t,
    locale,
  ])

  const progressPct = Math.round(((COOLDOWN_TOTAL - countdown) / COOLDOWN_TOTAL) * 100)

  return (
    <div
      className="rounded-xl border p-5"
      style={{
        background: '#0d0d14',
        borderColor: 'rgba(255,255,255,0.08)',
        boxShadow: '0 1px 0 0 rgba(255,255,255,0.04)',
      }}
    >
      {/* Header row */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-[#f1f5f9]">{t('withdraw.rwaTitle')}</span>
        {cooldown === 'ready' ? (
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 animate-pulse rounded-full bg-[#10b981]" />
            <span className="text-xs font-medium text-[#10b981]">{t('withdraw.ready')}</span>
          </span>
        ) : (
          <span className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-[#fb923c]" />
            <span className="font-[family-name:var(--font-jetbrains-mono)] text-xs font-medium text-[#fb923c]">
              {t('withdraw.nextIn')} {formatCountdown(countdown)}
            </span>
          </span>
        )}
      </div>

      {/* 钱包未连接提示 */}
      {!isConnected && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-[#fb923c40] bg-[#fb923c10] p-3">
          <AlertTriangle className="h-4 w-4 shrink-0 text-[#fb923c]" />
          <p className="text-sm text-[#fb923c]">{t('common.connectWalletFirst')}</p>
        </div>
      )}

      {/* Balance display */}
      <div className="mt-4">
        <p className="text-xs text-[#64748b]">{t('withdraw.available')}</p>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="font-[family-name:var(--font-jetbrains-mono)] text-[44px] font-bold leading-none text-[#f1f5f9]">
            {isConnected ? parseFloat(availableRWA).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
          </span>
          <span className="font-[family-name:var(--font-jetbrains-mono)] text-xl font-semibold text-[#00f5d4]">
            RWA
          </span>
        </div>
        <p className="mt-1 font-[family-name:var(--font-jetbrains-mono)] text-sm text-[#64748b]">
          {t('withdraw.usdEquiv', { amount: isConnected ? (availableNum * 0.85).toFixed(2) : '0.00' })}
        </p>
        {isConnected && (
          <p className="mt-1.5 text-[11px] text-[#64748b]">
            {locale.startsWith('zh')
              ? '每日 00:00 UTC 发放；本金请在下方「本金提取」操作。'
              : 'Distributed daily 00:00 UTC. Principal: use section below.'}
          </p>
        )}
      </div>

      {/* Withdraw Mode Selector */}
      {numAmount > 0 && (
        <div className="mt-4">
          <WithdrawModeSelector
            mode={withdrawMode}
            onModeChange={setWithdrawMode}
            amount={amount}
          />
        </div>
      )}

      {/* Amount input */}
      <div className="mt-5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-[#64748b]">{t('withdraw.amountLabel')}</span>
          <span className="font-[family-name:var(--font-jetbrains-mono)] text-xs text-[#64748b]">
            {t('withdraw.balance')}
          </span>
        </div>
        <div className="mt-2 flex h-16 items-center gap-2 overflow-hidden rounded-xl border border-[#ffffff1a] bg-[#13131e] px-3 transition-colors focus-within:border-[#00f5d440] sm:gap-3 sm:px-5">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="min-w-0 flex-1 bg-transparent font-[family-name:var(--font-jetbrains-mono)] text-xl text-[#f1f5f9] outline-none placeholder:text-[#334155] sm:text-2xl [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            aria-label={t('withdraw.amountLabel')}
          />
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <span className="flex items-center gap-1 rounded-full border border-[#ffffff0d] bg-[#1a1a2e] px-2 py-1 sm:gap-1.5 sm:px-3 sm:py-1.5">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#00f5d4] text-[9px] font-bold text-[#05050a] sm:h-5 sm:w-5 sm:text-[10px]">R</span>
              <span className="hidden text-xs font-semibold text-[#f1f5f9] sm:inline sm:text-sm">RWA</span>
            </span>
            <button
              type="button"
              onClick={() => setAmount(availableRWA)}
              disabled={!isConnected || availableNum === 0}
              className="rounded-full border border-[#00f5d440] px-2 py-1 text-[10px] font-semibold text-[#00f5d4] transition-colors hover:bg-[#00f5d410] disabled:cursor-not-allowed disabled:opacity-50 sm:px-3 sm:text-xs"
            >
              {t('withdraw.max')}
            </button>
          </div>
        </div>
      </div>

      {/* Cooldown progress bar */}
      {cooldown === 'cooling' && (
        <div className="mt-4">
          <div className="flex items-center justify-between">
            <span className="font-[family-name:var(--font-jetbrains-mono)] text-[11px] text-[#64748b]">
              {t('withdraw.cooldownLabel')}
            </span>
            <span className="font-[family-name:var(--font-jetbrains-mono)] text-[11px] text-[#64748b]">
              {formatCountdown(countdown)}
            </span>
          </div>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-[#1a1a2e]">
            <div
              className="h-full rounded-full bg-[#fb923c] transition-all duration-1000"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      {/* 错误提示 */}
      {errorMsg && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-[#f43f5e40] bg-[#f43f5e10] p-3">
          <XCircle className="h-4 w-4 shrink-0 text-[#f43f5e]" />
          <p className="text-sm text-[#f43f5e]">{errorMsg}</p>
        </div>
      )}

      {/* 成功提示 */}
      {status === 'success' && (Array.isArray(txHash) ? txHash.length > 0 : txHash) && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-[#10b98140] bg-[#10b98110] p-3">
          <CheckCircle className="h-4 w-4 shrink-0 text-[#10b981]" />
          <div className="flex-1">
            <p className="text-sm text-[#10b981]">{t('withdraw.success')}</p>
            {Array.isArray(txHash) ? (
              txHash.map((h, i) => (
                <a
                  key={i}
                  href={getExplorerTxUrl(chainId, h)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mr-2 text-xs text-[#64748b] hover:text-[#00f5d4] underline"
                >
                  {t('withdraw.viewTx')} {txHash.length > 1 ? i + 1 : ''}
                </a>
              ))
            ) : (
              <a
                href={getExplorerTxUrl(chainId, txHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[#64748b] hover:text-[#00f5d4] underline"
              >
                {t('withdraw.viewTx')}
              </a>
            )}
          </div>
        </div>
      )}

      {/* Withdraw button */}
      <button
        type="button"
        onClick={handleWithdraw}
        disabled={!isConnected || cooldown === 'cooling' || status === 'pending' || numAmount < MIN_WITHDRAW || numAmount > onChainAvailable}
        className="mt-5 flex h-14 w-full items-center justify-center rounded-full font-[family-name:var(--font-space-grotesk)] text-sm font-bold transition-all disabled:cursor-not-allowed disabled:opacity-50"
        style={
          cooldown === 'cooling' || !isConnected
            ? { background: '#13131e', color: '#334155' }
            : status === 'pending'
            ? { background: '#00f5d4cc', color: '#05050a' }
            : { background: '#00f5d4', color: '#05050a' }
        }
      >
        {status === 'pending' ? (
          <span className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t('withdraw.pending')}
          </span>
        ) : !isConnected ? (
          t('common.connectWalletFirst')
        ) : cooldown === 'cooling' ? (
          t('withdraw.cooling')
        ) : (
          t('withdraw.button')
        )}
      </button>
    </div>
  )
}
