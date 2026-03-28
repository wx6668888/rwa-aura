'use client'

import { useState, useEffect, useCallback } from 'react'
import { Clock, Loader2, AlertTriangle, CheckCircle, XCircle, Unlock } from 'lucide-react'
import { useAccount } from 'wagmi'
import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'
import { useStRWA } from '@/hooks/useStRWA'
import { useStakingContract } from '@/hooks/useStakingContract'
import { useSwapContract } from '@/hooks/useSwapContract'
import { useRWAToken } from '@/hooks/useRWAToken'
import { CONTRACT_ADDRESSES } from '@/lib/contracts/addresses'
import { SellTaxCalculator } from './sell-tax-calculator'

type UnlockStatus = 'idle' | 'unlocking' | 'success' | 'error'

export function StRWAUnlockCard() {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)
  const { address, isConnected, chainId } = useAccount()
  const { stRWABalance, stRWALockedBalance, approveStRWAMax, isApproved, refetchBalance, refetchAllowance } = useStRWA()
  const { userStakeInfo, userData } = useStakingContract()
  const { swapStRWAToRWA, swapContractAddress, rwaPoolBalance, refetchRwaPool } = useSwapContract()
  const { balanceFormatted: rwaBalance, refetchBalance: refetchRwaBalance } = useRWAToken()
  
  const addresses = chainId ? CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES] : undefined

  const [amount, setAmount] = useState('')
  const [status, setStatus] = useState<UnlockStatus>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [txHash, setTxHash] = useState('')
  const [isApprovingStRWA, setIsApprovingStRWA] = useState(false)

  const balanceNum = parseFloat(stRWABalance || '0')
  const lockedNum = parseFloat(stRWALockedBalance || '0')
  const unlockedNum = Math.max(0, balanceNum - lockedNum)
  const rwaPoolBalanceNum = parseFloat(rwaPoolBalance || '0')
  
  // 检查是否需要授权 stRWA 给 SwapContract
  const needsStRWAApproval = amount && parseFloat(amount) > 0 && !isApproved(amount)

  const handleUnlock = useCallback(async () => {
    if (!isConnected || !address) {
      setErrorMsg(t('common.connectWalletFirst'))
      return
    }

    // 严格验证金额
    const numAmount = parseFloat(amount || '0')
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      setErrorMsg(t('withdraw.pleaseEnterUnlockAmount') || '请输入解锁数量')
      return
    }

    // 检查用户余额
    if (numAmount > balanceNum) {
      setErrorMsg(t('withdraw.insufficientBalance') || `余额不足，当前余额：${balanceNum.toFixed(2)} stRWA`)
      return
    }

    // 检查 SwapContract 池子余额（关键！）
    if (numAmount > rwaPoolBalanceNum) {
      setErrorMsg(t('withdraw.insufficientPoolBalance'))
      return
    }

    if (status === 'unlocking' || isApprovingStRWA) return

    try {
      setStatus('unlocking')
      setErrorMsg('')

      // 检查并授权 stRWA 给 SwapContract（如果需要）
      if (needsStRWAApproval) {
        setIsApprovingStRWA(true)
        try {
          await approveStRWAMax()
          // 等待授权确认
          await new Promise(resolve => setTimeout(resolve, 2000))
          refetchAllowance()
        } catch (approveError: any) {
          setIsApprovingStRWA(false)
          throw new Error(`授权失败: ${approveError?.message || '请先授权 stRWA 给 SwapContract'}`)
        }
        setIsApprovingStRWA(false)
      }

      // 再次验证金额（防止在授权过程中金额被修改）
      const finalAmount = parseFloat(amount || '0')
      if (finalAmount <= 0 || finalAmount > balanceNum || finalAmount > rwaPoolBalanceNum) {
        throw new Error('金额验证失败，请重新输入')
      }

      // 使用 SwapContract 的 swapStRWAToRWA 来解锁 stRWA
      const hash = await swapStRWAToRWA(amount)
      
      if (hash) {
        setTxHash(hash)
        setStatus('success')

        // 刷新余额（stRWA 和 RWA）
        setTimeout(() => {
          refetchBalance() // 刷新 stRWA 余额
          refetchRwaBalance() // 刷新 RWA 余额
          refetchRwaPool() // 刷新池子余额
        }, 2000)

        // 3秒后重置状态，但保留成功消息更长时间
        setTimeout(() => {
          setStatus('idle')
          setAmount('')
          // 不立即清除 txHash，让用户有时间查看
        }, 5000)
      }
    } catch (error: any) {
      console.error('Unlock error:', error)
      setStatus('error')
      
      // 提供更友好的错误提示
      let errorMessage = t('withdraw.unlockFailed') || '解锁失败'
      const errorMsgStr = error?.message || error?.toString() || ''
      
      if (errorMsgStr.includes('Amount must be greater than zero') || errorMsgStr.includes('金额验证失败')) {
        errorMessage = '请输入有效的解锁数量（必须大于 0）'
      } else if (errorMsgStr.includes('Insufficient RWA pool') || errorMsgStr.includes('池子 RWA 余额不足')) {
        errorMessage = t('withdraw.insufficientPoolBalance')
      } else if (errorMsgStr.includes('insufficient') || errorMsgStr.includes('Insufficient')) {
        if (errorMsgStr.includes('balance') || errorMsgStr.includes('余额')) {
          errorMessage = `余额不足，当前余额：${balanceNum.toFixed(2)} stRWA`
        } else {
          errorMessage = t('withdraw.insufficientBalance') || '余额不足'
        }
      } else if (errorMsgStr.includes('allowance') || errorMsgStr.includes('Allowance') || errorMsgStr.includes('授权')) {
        errorMessage = t('withdraw.approveFirst') || '请先授权 stRWA 给 SwapContract'
      } else if (errorMsgStr.includes('user rejected') || errorMsgStr.includes('User rejected')) {
        errorMessage = '您已取消交易'
      } else if (errorMsgStr) {
        // 提取合约错误信息中的关键部分
        const match = errorMsgStr.match(/reverted with reason string '([^']+)'/)
        errorMessage = match ? match[1] : errorMsgStr
      }
      
      setErrorMsg(errorMessage)
      
      setTimeout(() => {
        setStatus('idle')
        setErrorMsg('')
      }, 5000)
    }
  }, [isConnected, address, amount, balanceNum, rwaPoolBalanceNum, status, isApprovingStRWA, swapStRWAToRWA, refetchBalance, refetchAllowance, refetchRwaPool, approveStRWAMax, isApproved, needsStRWAApproval, t])

  return (
    <div
      className="rounded-2xl border p-6"
      style={{
        background: '#0d0d14',
        borderColor: '#f59e0b',
        boxShadow: '0 0 0 1px #f59e0b40, 0 8px 32px #f59e0b15',
      }}
    >
      {/* Header */}
      <div className="flex flex-col gap-1">
        <span className="text-sm font-semibold text-[#f1f5f9]">{t('withdraw.stRWATitle')}</span>
        <p className="text-[11px] text-[#64748b]">
          {locale.startsWith('zh') ? '提取 stRWA 的资产在此显示；锁仓部分 30 天后可在此解锁为 RWA。' : 'Withdrawn stRWA appears here; locked portion can be unlocked to RWA after 30 days.'}
        </p>
      </div>

      {/* Wallet not connected */}
      {!isConnected && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-[#fb923c40] bg-[#fb923c10] p-3">
          <AlertTriangle className="h-4 w-4 shrink-0 text-[#fb923c]" />
          <p className="text-sm text-[#fb923c]">{t('common.connectWalletFirst')}</p>
        </div>
      )}

      {/* Balance display：总余额 + 锁定/可解锁 */}
      <div className="mt-4">
        <p className="text-xs text-[#64748b]">{t('withdraw.stRWABalance')}</p>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="font-[family-name:var(--font-jetbrains-mono)] text-[44px] font-bold leading-none text-[#f1f5f9]">
            {isConnected ? balanceNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
          </span>
          <span className="font-[family-name:var(--font-jetbrains-mono)] text-xl font-semibold text-[#f59e0b]">
            stRWA
          </span>
        </div>
        {isConnected && balanceNum > 0 && (
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[#94a3b8]">
            {lockedNum > 0 && (
              <span>
                {locale.startsWith('zh') ? `锁定中（30 天）：${lockedNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} stRWA` : `Locked (30d): ${lockedNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} stRWA`}
              </span>
            )}
            {unlockedNum > 0 && (
              <span>
                {locale.startsWith('zh') ? `可解锁：${unlockedNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} stRWA` : `Unlockable: ${unlockedNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} stRWA`}
              </span>
            )}
          </div>
        )}
        {isConnected && balanceNum === 0 && (
          <p className="mt-2 text-[11px] text-[#64748b]">{t('withdraw.stRWAZeroBalanceHint')}</p>
        )}
      </div>

      {/* Pool balance info */}
      {isConnected && rwaPoolBalanceNum > 0 && (
        <div className="mt-4 flex items-center justify-between rounded-lg border border-[#00f5d420] bg-[#00f5d410] p-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-[#00f5d4]" />
            <p className="text-xs text-[#64748b]">
              {t('withdraw.stRWASwapDesc') || '解锁 stRWA 将转换为 RWA 代币。需要先授权 stRWA 给 SwapContract。'}
            </p>
          </div>
        </div>
      )}

      {/* Pool balance display */}
      {isConnected && (
        <div className="mt-3 flex items-center justify-between rounded-lg border border-[#ffffff0d] bg-[#0a0a0f] p-2">
          <span className="text-xs text-[#64748b]">{t('withdraw.poolBalanceLabel')}</span>
          <span className="font-[family-name:var(--font-jetbrains-mono)] text-xs font-semibold text-[#00f5d4]">
            {rwaPoolBalanceNum.toFixed(2)} RWA
          </span>
        </div>
      )}

      {/* Amount input */}
      {isConnected && (
        <div className="mt-5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#64748b]">{t('withdraw.unlockAmountLabel')}</span>
            <button
              type="button"
              onClick={() => {
                // MAX 按钮应该设置为用户余额和池子余额中的较小值
                const maxAmount = Math.min(balanceNum, rwaPoolBalanceNum)
                setAmount(maxAmount > 0 ? maxAmount.toString() : '0')
              }}
              disabled={!isConnected || balanceNum === 0 || rwaPoolBalanceNum === 0}
              className="rounded-full border border-[#f59e0b40] px-2 py-1 text-[10px] font-semibold text-[#f59e0b] transition-colors hover:bg-[#f59e0b10] disabled:cursor-not-allowed disabled:opacity-50"
            >
              MAX
            </button>
          </div>
          <div className="mt-2 flex h-16 items-center gap-2 overflow-hidden rounded-xl border border-[#ffffff1a] bg-[#13131e] px-3 sm:px-5">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              disabled={!isConnected}
              className="min-w-0 flex-1 bg-transparent font-[family-name:var(--font-jetbrains-mono)] text-xl text-[#f1f5f9] outline-none placeholder:text-[#334155] disabled:opacity-50 sm:text-2xl"
            />
            <span className="flex items-center gap-1 rounded-full border border-[#ffffff0d] bg-[#1a1a2e] px-2 py-1.5">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#f59e0b] text-[9px] font-bold text-[#05050a]">S</span>
              <span className="hidden text-xs font-semibold text-[#f1f5f9] sm:inline sm:text-sm">stRWA</span>
            </span>
          </div>
        </div>
      )}

      {/* Error message */}
      {errorMsg && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-[#f43f5e40] bg-[#f43f5e10] p-3">
          <XCircle className="h-4 w-4 shrink-0 text-[#f43f5e]" />
          <p className="text-sm text-[#f43f5e]">{errorMsg}</p>
        </div>
      )}

      {/* Success message with unlock details */}
      {status === 'success' && txHash && (
        <div className="mt-4 space-y-3 rounded-lg border border-[#10b98140] bg-[#10b98110] p-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 shrink-0 text-[#10b981]" />
            <p className="text-sm font-semibold text-[#10b981]">{t('withdraw.unlockSuccess')}</p>
          </div>
          
          {/* Unlock result details */}
          <div className="space-y-2 rounded-lg border border-[#10b98120] bg-[#10b98105] p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#64748b]">{t('withdraw.receivedRWA', { amount: parseFloat(amount || '0').toFixed(2) })}</span>
              <span className="font-[family-name:var(--font-jetbrains-mono)] text-xs font-semibold text-[#10b981]">
                +{parseFloat(amount || '0').toFixed(2)} RWA
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#64748b]">{t('withdraw.stRWATransferred', { amount: parseFloat(amount || '0').toFixed(2) })}</span>
              <span className="font-[family-name:var(--font-jetbrains-mono)] text-xs font-semibold text-[#f59e0b]">
                -{parseFloat(amount || '0').toFixed(2)} stRWA
              </span>
            </div>
            <p className="text-[10px] text-[#64748b] mt-2 leading-relaxed">
              {t('withdraw.stRWATransferredDesc')}
            </p>
            <p className="text-[10px] text-[#64748b] mt-1">
              {t('withdraw.checkRwaBalance')}
            </p>
          </div>
          
          {/* Transaction link */}
          <a
            href={`https://bscscan.com/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs text-[#10b981] hover:text-[#10b981cc] underline transition-colors"
          >
            {t('withdraw.viewTx')} →
          </a>
        </div>
      )}

      {/* Pool balance warning */}
      {isConnected && parseFloat(amount || '0') > 0 && parseFloat(amount || '0') > rwaPoolBalanceNum && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-[#f43f5e40] bg-[#f43f5e10] p-3">
          <AlertTriangle className="h-4 w-4 shrink-0 text-[#f43f5e]" />
          <div className="flex-1">
            <p className="text-xs font-semibold text-[#f43f5e]">{t('withdraw.poolBalanceInsufficient')}</p>
            <p className="text-xs text-[#f43f5e] mt-1">
              {t('withdraw.poolBalanceInsufficientDesc', { balance: rwaPoolBalanceNum.toFixed(2) })}
            </p>
            <p className="text-xs text-[#f43f5e] mt-1">
              {t('withdraw.maxUnlockable', { amount: Math.min(balanceNum, rwaPoolBalanceNum).toFixed(2) })}
            </p>
          </div>
        </div>
      )}

      {/* Dynamic Sell Tax Calculator - Show when amount is entered */}
      {isConnected && parseFloat(amount || '0') > 0 && (
        <div className="mt-4">
          <SellTaxCalculator
            sellAmount={parseFloat(amount)}
            weightedHoldingDays={(() => {
              // Calculate holding days from firstStakeTime (as estimation)
              // Note: This is an estimation based on first stake time
              // Real weighted average requires contract support for calculateWeightedAverageTime
              if (userStakeInfo?.firstStakeTime && userStakeInfo.firstStakeTime > 0) {
                const now = Math.floor(Date.now() / 1000)
                const holdingSeconds = now - userStakeInfo.firstStakeTime
                return holdingSeconds / 86400 // Convert to days
              }
              return 0 // No data available, will use default 20% rate
            })()}
            currentStake={userStakeInfo?.totalStaked ? parseFloat(userStakeInfo.totalStaked) : 0}
          />
        </div>
      )}

      {/* Unlock button */}
      {isConnected && (
        <button
          type="button"
          onClick={handleUnlock}
          disabled={
            status === 'unlocking' || 
            isApprovingStRWA || 
            !amount || 
            parseFloat(amount || '0') <= 0 || 
            parseFloat(amount || '0') > balanceNum ||
            parseFloat(amount || '0') > rwaPoolBalanceNum
          }
          className="mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-full font-[family-name:var(--font-space-grotesk)] text-sm font-bold transition-all disabled:cursor-not-allowed disabled:opacity-50"
          style={
            status === 'unlocking'
              ? { background: '#f59e0bcc', color: '#05050a' }
              : { background: '#f59e0b', color: '#05050a' }
          }
        >
          {status === 'unlocking' ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('withdraw.stRWAUnlocking')}
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Unlock className="h-4 w-4" />
              {t('withdraw.stRWAUnlock')}
            </span>
          )}
        </button>
      )}

      {/* Info notice */}
      <div className="mt-4 flex items-start gap-2 rounded-lg border border-[#00f5d420] bg-[#00f5d410] p-3">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#00f5d4]" />
        <p className="text-[11px] leading-relaxed text-[#64748b]">{t('withdraw.stRWAUnlockDesc')}</p>
      </div>
    </div>
  )
}
