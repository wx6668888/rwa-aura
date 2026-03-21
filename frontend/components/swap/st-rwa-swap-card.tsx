'use client'

import { useState, useEffect, useCallback } from 'react'
import { ArrowUpDown, Loader2, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import { useAccount, useReadContract } from 'wagmi'
import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'
import { useSwapContract } from '@/hooks/useSwapContract'
import { useStRWA } from '@/hooks/useStRWA'
import { useStakingContract } from '@/hooks/useStakingContract'
import { useRWAToken } from '@/hooks/useRWAToken'
import { parseUnits } from 'viem'
import { erc20ABI } from '@/lib/contracts/erc20ABI'
import { CONTRACT_ADDRESSES } from '@/lib/contracts/addresses'

type SwapDirection = 'stRWAtoRWA' | 'RWAToStRWA'

export function StRWASwapCard() {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)
  const { address, isConnected, chainId } = useAccount()
  const { swapRate, rwaPoolBalance, stRwaPoolBalance, getSwapQuote, swapStRWAToRWA, swapRWAToStRWA, refetchSwapRate, swapContractAddress } = useSwapContract()
  const { stRWABalance, approveStRWAMax, isApproved: isStRWAApproved, refetchBalance: refetchStRWABalance, refetchAllowance: refetchStRWAAllowance } = useStRWA()
  const { userRewards } = useStakingContract()
  const { approveMax: approveRWAMax, rwaAddress } = useRWAToken()

  const contractAddresses = chainId ? CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES] : undefined

  const [direction, setDirection] = useState<SwapDirection>('stRWAtoRWA')

  // 读取 RWA 对 SwapContract 的授权额度
  const { data: rwaAllowance, refetch: refetchRWAAllowance } = useReadContract({
    address: rwaAddress as `0x${string}`,
    abi: erc20ABI,
    functionName: 'allowance',
    args: address && swapContractAddress ? [address, swapContractAddress] : undefined,
    query: {
      enabled: !!address && !!rwaAddress && !!swapContractAddress,
    },
  })
  const [amount, setAmount] = useState('')
  const [outputAmount, setOutputAmount] = useState('')
  const [status, setStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [txHash, setTxHash] = useState('')
  const [isCalculating, setIsCalculating] = useState(false)
  const [isApprovingStRWA, setIsApprovingStRWA] = useState(false)
  const [isApprovingRWA, setIsApprovingRWA] = useState(false)

  // 获取余额
  const stRWABalanceNum = parseFloat(stRWABalance || '0')
  const rwaBalance = userRewards?.rwaPending || '0'
  const rwaBalanceNum = parseFloat(rwaBalance)

  // 检查 stRWA 授权（stRWA → RWA 方向）
  const needsStRWAApproval =
    direction === 'stRWAtoRWA' &&
    amount &&
    parseFloat(amount) > 0 &&
    !isStRWAApproved(amount)

  // 检查 RWA 授权（RWA → stRWA 方向）
  const needsRWAApproval =
    direction === 'RWAToStRWA' &&
    amount &&
    parseFloat(amount) > 0 &&
    rwaAllowance !== undefined &&
    rwaAllowance < parseUnits(amount, 18)

  // 计算输出金额
  useEffect(() => {
    const calculateOutput = async () => {
      if (!amount || parseFloat(amount) <= 0) {
        setOutputAmount('')
        return
      }

      setIsCalculating(true)
      try {
        const quote = await getSwapQuote(amount, direction === 'stRWAtoRWA')
        if (quote) {
          setOutputAmount(quote)
        } else {
          // Fallback: 使用简单比例计算
          const inputNum = parseFloat(amount)
          const output = direction === 'stRWAtoRWA'
            ? (inputNum * swapRate).toFixed(6)
            : (inputNum / swapRate).toFixed(6)
          setOutputAmount(output)
        }
      } catch (error) {
        console.error('Calculate output error:', error)
        setOutputAmount('')
      } finally {
        setIsCalculating(false)
      }
    }

    const timer = setTimeout(calculateOutput, 500) // 防抖
    return () => clearTimeout(timer)
  }, [amount, direction, swapRate, getSwapQuote])

  const handleSwapDirection = () => {
    setDirection(direction === 'stRWAtoRWA' ? 'RWAToStRWA' : 'stRWAtoRWA')
    setAmount('')
    setOutputAmount('')
    // 切换方向时刷新授权状态
    if (direction === 'stRWAtoRWA') {
      refetchRWAAllowance()
    } else {
      refetchStRWAAllowance()
    }
  }

  const handleSetMax = () => {
    if (direction === 'stRWAtoRWA') {
      setAmount(stRWABalanceNum.toString())
    } else {
      setAmount(rwaBalanceNum.toString())
    }
  }

  const handleApproveStRWA = useCallback(async () => {
    if (!isConnected || !address) {
      setErrorMsg(t('common.connectWalletFirst'))
      return
    }

    if (!needsStRWAApproval || isApprovingStRWA || status === 'pending') return

    try {
      setIsApprovingStRWA(true)
      setErrorMsg('')
      await approveStRWAMax()

      setTimeout(() => {
        refetchStRWAAllowance()
      }, 1500)
    } catch (error: any) {
      console.error('Approve stRWA error:', error)
      setErrorMsg(error?.message || t('swap.approveFailed'))
    } finally {
      setIsApprovingStRWA(false)
    }
  }, [isConnected, address, needsStRWAApproval, isApprovingStRWA, status, approveStRWAMax, refetchStRWAAllowance, t])

  const handleApproveRWA = useCallback(async () => {
    if (!isConnected || !address) {
      setErrorMsg(t('common.connectWalletFirst'))
      return
    }

    if (!swapContractAddress || !needsRWAApproval || isApprovingRWA || status === 'pending') return

    try {
      setIsApprovingRWA(true)
      setErrorMsg('')
      await approveRWAMax(swapContractAddress)

      setTimeout(() => {
        refetchRWAAllowance()
      }, 1500)
    } catch (error: any) {
      console.error('Approve RWA error:', error)
      setErrorMsg(error?.message || t('swap.approveFailed'))
    } finally {
      setIsApprovingRWA(false)
    }
  }, [isConnected, address, swapContractAddress, needsRWAApproval, isApprovingRWA, status, approveRWAMax, refetchRWAAllowance, t])

  const handleSwap = useCallback(async () => {
    if (!isConnected || !address) {
      setErrorMsg(t('common.connectWalletFirst'))
      return
    }

    const numAmount = parseFloat(amount)
    if (numAmount <= 0) {
      setErrorMsg(t('swap.enterAmount'))
      return
    }

    if (direction === 'stRWAtoRWA' && numAmount > stRWABalanceNum) {
      setErrorMsg(t('swap.insufficient'))
      return
    }

    if (direction === 'RWAToStRWA' && numAmount > rwaBalanceNum) {
      setErrorMsg(t('swap.insufficient'))
      return
    }

    if (status === 'pending' || isApprovingStRWA || isApprovingRWA) return

    if (direction === 'stRWAtoRWA' && needsStRWAApproval) {
      setErrorMsg(t('swap.approveFirst'))
      return
    }

    if (direction === 'RWAToStRWA' && needsRWAApproval) {
      setErrorMsg(t('swap.approveFirst'))
      return
    }

    try {
      setStatus('pending')
      setErrorMsg('')

      const hash = direction === 'stRWAtoRWA'
        ? await swapStRWAToRWA(amount)
        : await swapRWAToStRWA(amount)

      if (hash) {
        setTxHash(hash)
        setStatus('success')

        // 刷新数据
        setTimeout(() => {
          refetchStRWABalance()
          refetchSwapRate()
        }, 2000)

        // 3秒后重置状态
        setTimeout(() => {
          setStatus('idle')
          setAmount('')
          setOutputAmount('')
          setTxHash('')
        }, 3000)
      }
    } catch (error: any) {
      console.error('Swap error:', error)
      setStatus('error')
      setErrorMsg(error?.message || t('swap.swapFailed'))
      
      setTimeout(() => {
        setStatus('idle')
        setErrorMsg('')
      }, 5000)
    }
  }, [isConnected, address, amount, direction, stRWABalanceNum, rwaBalanceNum, status, isApprovingStRWA, isApprovingRWA, needsStRWAApproval, needsRWAApproval, swapStRWAToRWA, swapRWAToStRWA, refetchStRWABalance, refetchSwapRate, t])

  const fromToken = direction === 'stRWAtoRWA' ? 'stRWA' : 'RWA'
  const toToken = direction === 'stRWAtoRWA' ? 'RWA' : 'stRWA'
  const fromBalance = direction === 'stRWAtoRWA' ? stRWABalanceNum : rwaBalanceNum

  return (
    <div className="bg-surface-1 border-2 border-plasma-cyan rounded-2xl p-4 sm:p-6 shadow-plasma-glow backdrop-blur-xl max-w-[480px] mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[14px] font-bold text-text-primary">
          {t('swap.stRWASwapTitle')}
        </h2>
        <div className="flex items-center gap-1.5 bg-surface-2 border border-border-subtle rounded-full px-3 py-1">
          <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse"></div>
          <span className="text-[11px] font-jetbrains text-text-secondary">
            1 stRWA = {swapRate.toFixed(4)} RWA
          </span>
        </div>
      </div>

      {/* From Token Input */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-1.5">
            <span className="text-[12px] text-text-secondary">{t('swap.from')}</span>
            <span className="text-[13px] font-bold text-text-primary">{fromToken}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[12px] text-text-secondary font-jetbrains">
              {t('swap.balance')}: {fromBalance.toFixed(2)}
            </span>
            <button
              onClick={handleSetMax}
              disabled={!isConnected || fromBalance === 0}
              className="text-[10px] px-2 py-0.5 rounded-full border border-border-subtle text-text-secondary hover:text-plasma-cyan hover:border-plasma-cyan transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t('swap.max')}
            </button>
          </div>
        </div>
        <div className="relative rounded-xl p-4 border-2 border-plasma-cyan bg-surface-1">
          <input
            type="text"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            disabled={!isConnected}
            className="w-full bg-transparent border-none outline-none text-[36px] font-jetbrains text-text-primary placeholder:text-text-disabled disabled:opacity-50"
          />
        </div>
      </div>

      {/* Swap Direction Button */}
      <div className="my-2 flex justify-center">
        <button
          onClick={handleSwapDirection}
          disabled={!isConnected}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-surface-2 border border-border-active text-text-secondary hover:bg-surface-3 hover:text-plasma-cyan transition-all duration-300 hover:rotate-180 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ArrowUpDown className="w-4 h-4" />
        </button>
      </div>

      {/* To Token Input */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-1.5">
            <span className="text-[12px] text-text-secondary">{t('swap.to')}</span>
            <span className="text-[13px] font-bold text-text-primary">{toToken}</span>
          </div>
        </div>
        <div className="relative rounded-xl p-4 border-2 border-plasma-cyan bg-surface-1">
          {isCalculating ? (
            <div className="flex items-center gap-2 text-[36px] font-jetbrains text-plasma-cyan">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span>{t('swap.calculating')}</span>
            </div>
          ) : (
            <input
              type="text"
              value={outputAmount}
              readOnly
              placeholder="0.00"
              className="w-full bg-transparent border-none outline-none text-[36px] font-jetbrains text-plasma-cyan placeholder:text-text-disabled"
            />
          )}
        </div>
      </div>

      {/* Pool Info */}
      {rwaPoolBalance && stRwaPoolBalance && (
        <div className="mt-3 bg-surface-2 rounded-xl p-3">
          <div className="flex justify-between items-center text-[11px] text-text-secondary">
            <span>{t('swap.poolInfo')}</span>
            <span className="font-jetbrains">
              {t('swap.poolBalanceFormat', { rwa: parseFloat(rwaPoolBalance).toFixed(2), strwa: parseFloat(stRwaPoolBalance).toFixed(2) })}
            </span>
          </div>
        </div>
      )}

      {/* Error Message */}
      {errorMsg && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-[#f43f5e40] bg-[#f43f5e10] p-3">
          <XCircle className="h-4 w-4 shrink-0 text-[#f43f5e]" />
          <p className="text-sm text-[#f43f5e]">{errorMsg}</p>
        </div>
      )}

      {/* Success Message */}
      {status === 'success' && txHash && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-[#10b98140] bg-[#10b98110] p-3">
          <CheckCircle className="h-4 w-4 shrink-0 text-[#10b981]" />
          <div className="flex-1">
            <p className="text-sm text-[#10b981]">{t('swap.success')}</p>
            <a
              href={`https://bscscan.com/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[#64748b] hover:text-[#00f5d4] underline"
            >
              {t('withdraw.viewTx')}
            </a>
          </div>
        </div>
      )}

      {/* Info Notice */}
      <div className="mt-3 flex items-start gap-2 rounded-lg border border-[#00f5d420] bg-[#00f5d410] p-2">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#00f5d4]" />
        <p className="text-[11px] leading-relaxed text-[#64748b]">
          {t('swap.stRWASwapDesc')}
        </p>
      </div>

      {/* Swap / Approve Button */}
      {needsStRWAApproval || needsRWAApproval ? (
        <button
          type="button"
          onClick={direction === 'stRWAtoRWA' ? handleApproveStRWA : handleApproveRWA}
          disabled={!isConnected || isApprovingStRWA || isApprovingRWA || status === 'pending' || parseFloat(amount) <= 0 || parseFloat(amount) > fromBalance}
          className="mt-4 w-full h-14 flex items-center justify-center rounded-full font-[family-name:var(--font-space-grotesk)] text-sm font-bold transition-all disabled:cursor-not-allowed disabled:opacity-50"
          style={
            !isConnected || isApprovingStRWA || isApprovingRWA || status === 'pending' || parseFloat(amount) <= 0 || parseFloat(amount) > fromBalance
              ? { background: '#13131e', color: '#334155' }
              : { background: '#00f5d4', color: '#05050a', boxShadow: '0 0 20px rgba(0,245,212,0.3)' }
          }
        >
          {isApprovingStRWA || isApprovingRWA ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('swap.approving')}
            </span>
          ) : (
            t('swap.approveToken')
          )}
        </button>
      ) : (
        <button
          type="button"
          onClick={handleSwap}
          disabled={!isConnected || isApprovingStRWA || isApprovingRWA || status === 'pending' || parseFloat(amount) <= 0 || parseFloat(amount) > fromBalance}
          className="mt-4 w-full h-14 flex items-center justify-center rounded-full font-[family-name:var(--font-space-grotesk)] text-sm font-bold transition-all disabled:cursor-not-allowed disabled:opacity-50"
          style={
            !isConnected || isApprovingStRWA || isApprovingRWA || status === 'pending' || parseFloat(amount) <= 0 || parseFloat(amount) > fromBalance
              ? { background: '#13131e', color: '#334155' }
              : status === 'pending'
              ? { background: '#00f5d4cc', color: '#05050a' }
              : { background: '#00f5d4', color: '#05050a', boxShadow: '0 0 20px rgba(0,245,212,0.3)' }
          }
        >
          {status === 'pending' ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('swap.swapping')}
            </span>
          ) : !isConnected ? (
            t('common.connectWalletFirst')
          ) : (
            t('swap.swapNow')
          )}
        </button>
      )}
    </div>
  )
}
