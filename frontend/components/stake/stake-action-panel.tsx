'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, AlertTriangle, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { useAccount, usePublicClient } from 'wagmi'
import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'
import { useStakingContract } from '@/hooks/useStakingContract'
import { useUSDT } from '@/hooks/useUSDT'
import { useRWA } from '@/hooks/useRWA'
import { useUserStakes } from '@/hooks/useUserStakes'
import { useGaslessStake } from '@/hooks/useGaslessStake'
import { decodeEventLog } from 'viem'
import { stakingContractABI } from '@/lib/contracts/stakingContractABI'
import { CONTRACT_ADDRESSES } from '@/lib/contracts/addresses'
import { pollDashboardUntilTxIndexed } from '@/lib/dashboard-index-poll'

type StakeStatus = 'idle' | 'approving' | 'approved' | 'staking' | 'success' | 'error'

function getExplorerTxUrl(chainId: number | undefined, hash: string): string {
  if (chainId === 56) return `https://bscscan.com/tx/${hash}`
  return `https://bscscan.com/tx/${hash}`
}

type StakeActionPanelProps = {
  stakeMode: 'USDT' | 'RWA'
}

export function StakeActionPanel({ stakeMode }: StakeActionPanelProps) {
  const router = useRouter()
  const { locale } = useLocale()
  const { t } = useTranslation(locale)
  const { address, isConnected, chainId } = useAccount()
  const publicClient = usePublicClient()
  
  // Contract hooks
  const { stake, stakeRWA, userStakeInfo, rwaStakeInfo, refetchStakeInfo, isLoading: isLoadingStakeInfo, isLoadingRWAStakeInfo } = useStakingContract()
  const { balance: usdtBalance, approve, isApproved, refetchBalance, refetchAllowance } = useUSDT()
  const { balance: rwaBalance, approveStaking: approveRWA, isApproved: isRWAApproved, refetchBalance: refetchRWABalance, refetchAllowance: refetchRWAAllowance } = useRWA()
  const { refetch: refetchStakes } = useUserStakes()
  const { gaslessStake, gaslessStakeRWA } = useGaslessStake()

  const [amount, setAmount] = useState('')
  const [referral, setReferral] = useState('')
  
  // Use appropriate balance based on mode
  const balance = stakeMode === 'USDT' ? usdtBalance : rwaBalance
  
  // 检查用户是否已有推荐人：USDT 质押 (getUserStakeInfo) 或 RWA 质押 (rwaStakes) 任一有推荐人即视为已绑定
  const isValidReferrer = (r: string | undefined) =>
    typeof r === 'string' &&
    r.length > 0 &&
    r !== '0x0000000000000000000000000000000000000000' &&
    /^0x[a-fA-F0-9]{40}$/.test(r)
  const hasReferrer =
    !isLoadingStakeInfo &&
    !isLoadingRWAStakeInfo &&
    (isValidReferrer(userStakeInfo?.referrer) || isValidReferrer(rwaStakeInfo?.referrer))
  const displayReferrer =
    userStakeInfo?.referrer && isValidReferrer(userStakeInfo.referrer)
      ? userStakeInfo.referrer
      : rwaStakeInfo?.referrer && isValidReferrer(rwaStakeInfo.referrer)
        ? rwaStakeInfo.referrer
        : ''
  
  // 当用户“已绑定推荐人”（链上或 DB）后，清空本地输入的推荐人地址
  useEffect(() => {
    if (hasReferrer && referral.trim().length > 0) {
      setReferral('')
    }
  }, [hasReferrer, referral])
  
  // 当地址变化或连接状态变化时，重新获取用户信息（仅保留一个 effect，延迟 500ms 确保钱包就绪）
  useEffect(() => {
    if (!isConnected || !address) return
    const timer = setTimeout(() => {
      refetchStakeInfo()
    }, 500)
    return () => clearTimeout(timer)
  }, [isConnected, address, refetchStakeInfo])

  const [lockPeriod, setLockPeriod] = useState<'flexible' | '30' | '90' | '180' | '365'>('flexible')
  const [status, setStatus] = useState<StakeStatus>('idle')
  const [showAllocation, setShowAllocation] = useState(false)
  const [txHash, setTxHash] = useState('')
  const [pendingIngestTxHash, setPendingIngestTxHash] = useState<string | null>(null)
  const ingestRetryCountRef = useRef(0)
  const [errorMessage, setErrorMessage] = useState('')
  const prevStakeModeRef = useRef(stakeMode)

  // 仅在外层切换 USDT/RWA 时清空金额与交易状态（首屏不触发）
  useEffect(() => {
    if (prevStakeModeRef.current === stakeMode) return
    prevStakeModeRef.current = stakeMode
    setAmount('')
    setStatus('idle')
    setShowAllocation(false)
    setErrorMessage('')
    setTxHash('')
  }, [stakeMode])

  const numAmount = parseFloat(amount) || 0
  
  // Effective user threshold: 100 USDT
  const EFFECTIVE_USER_THRESHOLD = 100
  const RWA_REFERENCE_PRICE = 0.85
  const MIN_RWA_STAKE_ESTIMATE = EFFECTIVE_USER_THRESHOLD / RWA_REFERENCE_PRICE
  const isEffectiveUser = numAmount >= EFFECTIVE_USER_THRESHOLD
  const currentTotalStaked = parseFloat(userStakeInfo?.totalStaked || '0')
  const willBecomeEffective = !isEffectiveUser && (currentTotalStaked + numAmount) >= EFFECTIVE_USER_THRESHOLD
  const isRwaBelowEstimatedMinimum = stakeMode === 'RWA' && numAmount > 0 && numAmount < MIN_RWA_STAKE_ESTIMATE

  // Calculate daily yield and total yield based on lock period
  const getYieldMultiplier = () => {
    switch (lockPeriod) {
      case 'flexible': return 1.0
      case '30': return 1.3
      case '90': return 1.6
      case '180': return 2.0
      case '365': return 2.5
      default: return 1.0
    }
  }

  const yieldMultiplier = getYieldMultiplier()
  const baseDailyYield = 0.008 // 0.8% daily
  const dailyYieldRate = baseDailyYield * yieldMultiplier
  
  // Calculate daily yield in RWA based on stake mode
  const rwaPrice = 0.85
  let dailyYieldRWA = 0
  if (numAmount > 0) {
    if (stakeMode === 'USDT') {
      // USDT质押：计算USDT收益，然后转换为RWA
      const dailyYieldUSDT = numAmount * dailyYieldRate
      dailyYieldRWA = dailyYieldUSDT / rwaPrice
    } else {
      // RWA质押：直接计算RWA收益
      dailyYieldRWA = numAmount * dailyYieldRate
    }
  }
  
  const totalYield30Days = dailyYieldRWA * 30
  const totalYield90Days = dailyYieldRWA * 90
  const totalYield180Days = dailyYieldRWA * 180
  const totalYield365Days = dailyYieldRWA * 365

  useEffect(() => {
    if (numAmount > 0) {
      const timer = setTimeout(() => setShowAllocation(true), 50)
      return () => clearTimeout(timer)
    } else {
      setShowAllocation(false)
    }
  }, [numAmount])

  // Check if already approved
  useEffect(() => {
    const approved = stakeMode === 'USDT' ? isApproved(amount) : isRWAApproved
    if (numAmount > 0 && approved) {
      setStatus('approved')
    } else if (status === 'approved' && numAmount > 0 && !approved) {
      setStatus('idle')
    }
  }, [numAmount, amount, stakeMode, isApproved, isRWAApproved, status])

  const halfAmount = numAmount > 0 
    ? (numAmount / 2).toLocaleString('en-US') + (stakeMode === 'USDT' ? ' USDT' : ' RWA')
    : `0 ${stakeMode === 'USDT' ? 'USDT' : 'RWA'}`

  async function handleApprove() {
    const amountStr = amount != null ? String(amount).trim() : ''
    if (!amountStr || isNaN(parseFloat(amountStr))) {
      setErrorMessage(locale.startsWith('zh') ? '请输入有效的质押金额' : 'Please enter a valid amount')
      setStatus('error')
      return
    }
    // USDT staking: minimum 100 USDT
    if (stakeMode === 'USDT' && numAmount < 100) return
    if (stakeMode === 'RWA' && numAmount < MIN_RWA_STAKE_ESTIMATE) {
      setErrorMessage(
        locale.startsWith('zh')
          ? `当前按前端参考价格 1 RWA ≈ ${RWA_REFERENCE_PRICE} USDT 估算，RWA 质押至少需要 ${MIN_RWA_STAKE_ESTIMATE.toFixed(2)} RWA 才达到 100 USDT 等值。`
          : `At the current frontend reference price (1 RWA ≈ ${RWA_REFERENCE_PRICE} USDT), RWA staking needs at least ${MIN_RWA_STAKE_ESTIMATE.toFixed(2)} RWA to reach the 100 USDT equivalent minimum.`
      )
      setStatus('error')
      return
    }
    if (!isConnected) {
      setErrorMessage(t('common.connectWalletFirst'))
      setStatus('error')
      return
    }

    try {
      setStatus('approving')
      setErrorMessage('')
      
      const hash = stakeMode === 'USDT' 
        ? await approve(amount)
        : await approveRWA(amount)
      setTxHash(hash)
      
      // Wait for transaction confirmation
      await new Promise(resolve => setTimeout(resolve, 3000))
      if (stakeMode === 'USDT') {
        await refetchAllowance()
      } else {
        await refetchRWAAllowance()
      }
      
      setStatus('approved')
    } catch (error: any) {
      console.error('Approve error:', error)
      
      // Check if user rejected the transaction
      if (error.code === 4001 || error.code === 'ACTION_REJECTED' || 
          error.message?.includes('User rejected') || 
          error.message?.includes('user rejected') ||
          error.message?.includes('User denied')) {
        setErrorMessage(t('common.userRejected'))
      } else {
        setErrorMessage(error.message || t('common.approveFailed'))
      }
      
      setStatus('error')
    }
  }

  async function handleStake() {
    if (!isConnected) {
      setErrorMessage(t('common.connectWalletFirst'))
      setStatus('error')
      return
    }

    try {
      setStatus('staking')
      setErrorMessage('')

      const addrs = chainId ? CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES] : undefined
      const zero = '0x0000000000000000000000000000000000000000'
      const stakingAddr = addrs?.stakingContract
      const rwaAddr = addrs?.rwaToken
      const usdtAddr = addrs?.usdtToken
      // 生产环境统一使用 BSC 主网，避免 testnet 地址参与签名导致 Invalid signature
      if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && chainId !== 56) {
        setStatus('error')
        setErrorMessage(locale.startsWith('zh') ? '请先切换到 BSC 主网后再质押。' : 'Please switch to BSC Mainnet before staking.')
        return
      }
      if (!stakingAddr || stakingAddr === zero) {
        setStatus('error')
        setErrorMessage(locale.startsWith('zh') ? '未配置 Staking 合约地址，请确认已连接 BSC 主网' : 'Staking contract not configured. Please connect to BSC mainnet.')
        return
      }
      if (stakeMode === 'RWA' && (!rwaAddr || rwaAddr === zero)) {
        setStatus('error')
        setErrorMessage(locale.startsWith('zh') ? '未配置 RWA 合约地址' : 'RWA token contract not configured.')
        return
      }
      if (stakeMode === 'USDT' && (!usdtAddr || usdtAddr === zero)) {
        setStatus('error')
        setErrorMessage(locale.startsWith('zh') ? '未配置 USDT 合约地址' : 'USDT token contract not configured.')
        return
      }
      
      // 确保状态更新被渲染（至少显示200ms）
      await new Promise(resolve => setTimeout(resolve, 200))

      // 如果合约已在链上绑定推荐人，则不需要再传 referrer 参数（传 0x0）。
      // 否则使用用户输入的推荐人地址。
      const referrerAddress = hasReferrer ? zero : referral.trim()
      // Convert lockPeriod to number (flexible=0, 30, 90, 180, 365)，避免 NaN/undefined 导致 BigInt 报错
      const lockPeriodNum = lockPeriod === 'flexible' ? 0 : (parseInt(String(lockPeriod), 10) || 0)

      if (stakeMode === 'RWA' && numAmount < MIN_RWA_STAKE_ESTIMATE) {
        throw new Error(
          locale.startsWith('zh')
            ? `当前按前端参考价格 1 RWA ≈ ${RWA_REFERENCE_PRICE} USDT 估算，RWA 质押至少需要 ${MIN_RWA_STAKE_ESTIMATE.toFixed(2)} RWA 才达到 100 USDT 等值。`
            : `At the current frontend reference price (1 RWA ≈ ${RWA_REFERENCE_PRICE} USDT), RWA staking needs at least ${MIN_RWA_STAKE_ESTIMATE.toFixed(2)} RWA to reach the 100 USDT equivalent minimum.`
        )
      }
      
      // gaslessStake / gaslessStakeRWA 返回 { txHash, pending }，必须取 txHash 字符串再调 RPC
      const relayerResult =
        stakeMode === 'USDT'
          ? await gaslessStake(
              usdtAddr!,
              stakingAddr,
              amount,
              referrerAddress,
              lockPeriodNum
            )
          : await gaslessStakeRWA(
              rwaAddr!,
              stakingAddr,
              amount,
              referrerAddress,
              lockPeriodNum
            )
      const hash = relayerResult.txHash
      setTxHash(hash)
      
      // Wait for transaction confirmation using publicClient
      if (publicClient && hash) {
        try {
          const receipt = await publicClient.waitForTransactionReceipt({
            hash: hash as `0x${string}`,
            timeout: 60000, // 60 seconds timeout
            confirmations: 1, // Wait for 1 confirmation
          })
          
          // Check if transaction was successful
          if (receipt.status === 'success') {
            // 保存锁仓期限到 localStorage（用于后续计算收益）
            if (chainId && receipt.logs) {
              const stakingAddress = CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES]?.stakingContract
              if (stakingAddress) {
                // 从事件中获取 stakeId
                for (const log of receipt.logs) {
                  try {
                    const decoded = decodeEventLog({
                      abi: stakingContractABI,
                      data: log.data,
                      topics: log.topics,
                    })
                    
                    if ((decoded.eventName === 'StakeEvent' || decoded.eventName === 'RWAStakeEvent') && decoded.args) {
                      const stakeId = (decoded.args as any).stakeId?.toString()
                      if (stakeId) {
                        // 保存锁仓期限
                        const lockPeriodKey = `stake_${stakingAddress}_${stakeId}_lockPeriod`
                        localStorage.setItem(lockPeriodKey, lockPeriod)
                      }
                    }
                  } catch (e) {
                    // 忽略解码错误（可能是其他事件）
                  }
                }
              }
            }
            
            // Refetch data after confirmation
            if (stakeMode === 'USDT') {
              await refetchBalance()
            } else {
              await refetchRWABalance()
            }
            await refetchStakeInfo()
            // 刷新质押记录列表
            await refetchStakes()
            setStatus('success')

            // 质押成功后触发后端按 txHash 补账（停掉 EventMonitor 后必需）
            // 用状态+effect做一层兜底：避免钱包注入异常导致这次fetch未执行成功
            setPendingIngestTxHash(hash as `0x${string}`)
            ingestRetryCountRef.current = 0

            // 非阻塞：轮询 GET，等待后端把该 txHash 写入历史记录（最多 3 分钟）
            if (address && chainId) {
              void pollDashboardUntilTxIndexed({
                userAddress: address,
                chainId,
                txHash: hash as `0x${string}`,
                kind: 'stake',
              }).catch(() => {})
            }
          } else {
            throw new Error('Transaction failed')
          }
        } catch (waitError: any) {
          // Check if transaction was actually submitted
          // If we have a hash, the transaction was submitted, so check its status
          try {
            const receipt = await publicClient.getTransactionReceipt({
              hash: hash as `0x${string}`,
            })
            
            if (receipt && receipt.status === 'success') {
              await refetchBalance()
              await refetchStakeInfo()
              await refetchStakes()
              setStatus('success')
            } else {
              throw new Error('Transaction failed or not found')
            }
          } catch (checkError: any) {
            console.error('Could not check transaction status:', checkError)
            // If we can't check, show error
            setErrorMessage(waitError.message || t('common.stakeFailed'))
            setStatus('error')
          }
        }
      } else {
        // Fallback: wait 3 seconds if publicClient is not available
        console.warn('PublicClient not available, using fallback wait')
        await new Promise(resolve => setTimeout(resolve, 3000))
        await refetchBalance()
        await refetchStakeInfo()
        await refetchStakes()
        setStatus('success')

        // 非阻塞触发后端按 txHash 补账（兜底）
        setPendingIngestTxHash(hash as `0x${string}`)
        ingestRetryCountRef.current = 0

        if (address && chainId) {
          void pollDashboardUntilTxIndexed({
            userAddress: address,
            chainId,
            txHash: hash as `0x${string}`,
            kind: 'stake',
          }).catch(() => {})
        }
      }
    } catch (error: any) {
      console.error('Stake error:', error)
      
      // Check if user rejected the transaction
      if (error.code === 4001 || error.code === 'ACTION_REJECTED' || 
          error.message?.includes('User rejected') || 
          error.message?.includes('user rejected') ||
          error.message?.includes('User denied')) {
        setErrorMessage(t('common.userRejected'))
      } else {
        setErrorMessage(error.message || t('common.stakeFailed'))
      }
      
      setStatus('error')
    }
  }

  useEffect(() => {
    if (!pendingIngestTxHash) return

    let cancelled = false
    const attempt = async () => {
      if (cancelled) return
      try {
        const res = await fetch(`/api/ingest/tx/${pendingIngestTxHash}`, { method: 'POST' })
        const json = await res.json().catch(() => ({}))
        if (json?.success && json?.receiptFound) {
          setPendingIngestTxHash(null)
          ingestRetryCountRef.current = 0
          return
        }
      } catch (e) {
        // ignore and retry below
      }

      ingestRetryCountRef.current += 1
      if (ingestRetryCountRef.current <= 2) {
        setTimeout(() => {
          void attempt()
        }, 8000)
      }
    }

    void attempt()
    return () => {
      cancelled = true
    }
  }, [pendingIngestTxHash])

  function handleReset() {
    setAmount('')
    setReferral('')
    setStatus('idle')
    setShowAllocation(false)
    setTxHash('')
    setErrorMessage('')
  }

  // Set max balance
  function handleSetMax() {
    setAmount(balance)
  }

  // Validate referral address (must be a valid Ethereum address)
  // 如果已有推荐人，则不需要验证推荐人地址
  const normalizedReferral = referral.trim()
  const isSelfReferral =
    !!address &&
    normalizedReferral.length > 0 &&
    normalizedReferral.toLowerCase() === address.toLowerCase()
  const isValidReferral =
    hasReferrer ||
    (normalizedReferral.length > 0 &&
      /^0x[a-fA-F0-9]{40}$/.test(normalizedReferral) &&
      !isSelfReferral)

  // USDT staking: minimum 100 USDT; RWA staking uses frontend estimated 100 USDT equivalent minimum.
  const isApproveDisabled =
    (stakeMode === 'USDT' && numAmount < 100) ||
    (stakeMode === 'RWA' && numAmount < MIN_RWA_STAKE_ESTIMATE) ||
    status === 'approving' ||
    status === 'approved' ||
    status === 'staking' ||
    !isConnected ||
    (!hasReferrer && !isValidReferral)
  const isStakeDisabled =
    !isConnected ||
    (stakeMode === 'USDT' && numAmount < 100) ||
    (stakeMode === 'RWA' && numAmount < MIN_RWA_STAKE_ESTIMATE) ||
    (!hasReferrer && !isValidReferral) ||
    status === 'staking'
  
  // Check approval status based on mode
  const isApprovedForStake = stakeMode === 'USDT' 
    ? isApproved(amount)
    : isRWAApproved

  return (
    <div className="flex flex-col">
      {/* Wallet Connection Warning */}
      {!isConnected && (
        <div
          className="mb-4 flex items-start gap-2 rounded-lg border px-4 py-2.5"
          style={{
            background: 'rgba(251,146,60,0.10)',
            borderColor: 'rgba(251,146,60,0.30)',
          }}
        >
          <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0 text-[#fb923c]" />
          <p className="text-xs text-[#fb923c]">{t('common.connectWalletToStake')}</p>
        </div>
      )}

      {/* Effective User Hint (only for USDT mode) */}
      {isConnected && numAmount > 0 && stakeMode === 'USDT' && (
        <>
          {isEffectiveUser || willBecomeEffective ? (
            <div
              className="mb-4 flex items-start gap-2 rounded-lg border px-4 py-2.5"
              style={{
                background: 'rgba(0,245,212,0.10)',
                borderColor: 'rgba(0,245,212,0.30)',
              }}
            >
              <CheckCircle className="mt-px h-3.5 w-3.5 shrink-0 text-[#00f5d4]" />
              <div className="flex-1">
                <p className="text-xs font-medium text-[#00f5d4]">
                  {willBecomeEffective 
                    ? t('stake.willBecomeEffectiveUser') || `You will become an effective user after this stake (≥${EFFECTIVE_USER_THRESHOLD} USDT)`
                    : t('stake.effectiveUser') || `You are an effective user (≥${EFFECTIVE_USER_THRESHOLD} USDT)`}
                </p>
                <p className="mt-1 text-[11px] text-text-secondary">
                  {t('stake.effectiveUserDesc') || 'Effective users are eligible for referral rewards and team bonuses.'}
                </p>
              </div>
            </div>
          ) : numAmount > 0 && numAmount < EFFECTIVE_USER_THRESHOLD ? (
            <div
              className="mb-4 flex items-start gap-2 rounded-lg border px-4 py-2.5"
              style={{
                background: 'rgba(251,146,60,0.10)',
                borderColor: 'rgba(251,146,60,0.30)',
              }}
            >
              <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0 text-[#fb923c]" />
              <div className="flex-1">
                <p className="text-xs font-medium text-[#fb923c]">
                  {t('stake.notEffectiveUser') || `Stake at least ${EFFECTIVE_USER_THRESHOLD} USDT to become an effective user`}
                </p>
                <p className="mt-1 text-[11px] text-text-secondary">
                  {t('stake.notEffectiveUserDesc', {
                    amount: numAmount.toFixed(2),
                    remaining: (EFFECTIVE_USER_THRESHOLD - numAmount).toFixed(2)
                  }) || `Current: ${numAmount.toFixed(2)} USDT. Need ${(EFFECTIVE_USER_THRESHOLD - numAmount).toFixed(2)} more USDT.`}
                </p>
              </div>
            </div>
          ) : null}
        </>
      )}

      {isConnected && isRwaBelowEstimatedMinimum && (
        <div
          className="mb-4 flex items-start gap-2 rounded-lg border px-4 py-2.5"
          style={{
            background: 'rgba(251,146,60,0.10)',
            borderColor: 'rgba(251,146,60,0.30)',
          }}
        >
          <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0 text-[#fb923c]" />
          <div className="flex-1">
            <p className="text-xs font-medium text-[#fb923c]">
              {locale.startsWith('zh')
                ? `当前按前端参考价格 1 RWA ≈ ${RWA_REFERENCE_PRICE} USDT 估算，RWA 质押至少需要 ${MIN_RWA_STAKE_ESTIMATE.toFixed(2)} RWA。`
                : `At the current frontend reference price (1 RWA ≈ ${RWA_REFERENCE_PRICE} USDT), you need at least ${MIN_RWA_STAKE_ESTIMATE.toFixed(2)} RWA.`}
            </p>
            <p className="mt-1 text-[11px] text-text-secondary">
              {locale.startsWith('zh')
                ? '这是前端按当前参考价格估算的 100 USDT 等值门槛；实际价格波动请以当时页面价格为准。'
                : 'This is the frontend estimate for the 100 USDT equivalent minimum. Actual market price may change.'}
            </p>
          </div>
        </div>
      )}

      {/* Amount Input — 与 swap/tron-recharge-card 金额行一致 */}
      <div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[12px] text-text-secondary">{t('stake.amountLabel')}</span>
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate font-mono text-[12px] text-text-secondary">
              {t('stake.balance')}: {balance} {stakeMode === 'USDT' ? 'USDT' : 'RWA'}
            </span>
            <button
              type="button"
              onClick={async () => {
                if (stakeMode === 'USDT') {
                  await refetchBalance()
                  await refetchAllowance()
                } else {
                  await refetchRWABalance()
                  await refetchRWAAllowance()
                }
                await refetchStakeInfo()
              }}
              disabled={!isConnected}
              className="shrink-0 text-[12px] font-semibold text-plasma-cyan hover:underline disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t('stake.balanceRefresh')}
            </button>
          </div>
        </div>

        <div className="mt-2 flex min-h-14 items-center gap-2 overflow-hidden rounded-2xl border border-border-subtle bg-surface-2 px-3 sm:gap-4 sm:px-4">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={t('stake.amountPlaceholder')}
            disabled={!isConnected}
            className="min-h-14 min-w-0 flex-1 bg-transparent text-[22px] font-bold text-text-primary outline-none placeholder:text-text-disabled disabled:cursor-not-allowed disabled:opacity-50 sm:text-[28px] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            aria-label={t('stake.amountLabel')}
          />
          <button
            type="button"
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-border-subtle bg-surface-1 px-2 py-1.5 transition-colors hover:border-border-active sm:gap-2 sm:px-3"
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-plasma-cyan text-[10px] font-bold text-void-black">
              {stakeMode === 'USDT' ? 'U' : 'R'}
            </span>
            <span className="hidden text-sm font-semibold text-text-primary sm:inline">
              {stakeMode === 'USDT' ? 'USDT' : 'RWA'}
            </span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-text-secondary" />
          </button>
        </div>

        <div className="mt-2 flex items-center justify-between">
          <span className="text-[12px] text-text-secondary">{t('stake.minStake')}</span>
          <button
            type="button"
            onClick={handleSetMax}
            disabled={!isConnected}
            className="rounded-full border border-border-subtle px-3 py-1 text-[10px] font-semibold text-text-secondary transition-colors hover:border-plasma-cyan/40 hover:text-plasma-cyan disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t('stake.max')}
          </button>
        </div>
      </div>

      {/* Lock Period Selection */}
      <div className="mt-6">
        <div className="flex items-center gap-2">
          <span className="text-[11px] uppercase tracking-wider text-text-secondary" style={{ fontVariant: 'small-caps' }}>
            {t('stake.lockPeriod')}
          </span>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {(['flexible', '30', '90', '180'] as const).map((period) => (
            <button
              key={period}
              type="button"
              onClick={() => setLockPeriod(period)}
              disabled={!isConnected}
              className={`rounded-xl border px-3 py-2.5 text-xs font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                lockPeriod === period
                  ? 'border-plasma-cyan bg-plasma-cyan/15 text-plasma-cyan'
                  : 'border-border-subtle bg-surface-2 text-text-secondary hover:border-plasma-cyan/40'
              }`}
            >
              {period === 'flexible' && t('stake.lockPeriodFlexible')}
              {period === '30' && t('stake.lockPeriod30')}
              {period === '90' && t('stake.lockPeriod90')}
              {period === '180' && t('stake.lockPeriod180')}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setLockPeriod('365')}
            disabled={!isConnected}
            className={`col-span-2 rounded-xl border px-3 py-2.5 text-xs font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
              lockPeriod === '365'
                ? 'border-plasma-cyan bg-plasma-cyan/15 text-plasma-cyan'
                : 'border-border-subtle bg-surface-2 text-text-secondary hover:border-plasma-cyan/40'
            }`}
          >
            {t('stake.lockPeriod365')}
          </button>
        </div>
      </div>

      {/* Allocation Preview */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-out ${
          showAllocation ? 'mt-4 max-h-[560px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="overflow-y-auto rounded-2xl border border-white/[0.08] bg-[#12121a]/95 p-4">
          <p className="text-[11px] uppercase tracking-widest text-text-secondary" style={{ fontVariant: 'small-caps' }}>
            {t('stake.allocation')}
          </p>

          {/* 单列：两行占比 + 一条双色进度条 + 一句说明 */}
          <div className="mt-3 space-y-2.5">
            <div className="flex items-center justify-between gap-3 text-[13px]">
              <span className="min-w-0 text-text-secondary">{t('stake.allocationRowTreasury')}</span>
              <span className="shrink-0 font-[family-name:var(--font-jetbrains-mono)] text-[13px] text-text-secondary">
                {halfAmount}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 text-[13px]">
              <span className="min-w-0 text-text-primary">{t('stake.allocationRowPool')}</span>
              <span className="shrink-0 font-[family-name:var(--font-jetbrains-mono)] text-[13px] text-plasma-cyan">
                {halfAmount}
              </span>
            </div>
            <div className="flex h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full bg-text-secondary/60 transition-all duration-500 ease-out"
                style={{ width: showAllocation ? '50%' : '0%' }}
              />
              <div
                className="h-full bg-plasma-cyan/80 transition-all duration-500 ease-out"
                style={{
                  width: showAllocation ? '50%' : '0%',
                  boxShadow: '0 0 10px rgba(0,245,212,0.2)',
                }}
              />
            </div>
            <p className="text-[11px] leading-snug text-text-secondary">{t('stake.allocationNote')}</p>
          </div>

          {/* Daily Yield & Total Yield Display — 与 swap 预计获得信息块同系 */}
          {numAmount > 0 && (
            <div className="mt-4 space-y-3 rounded-2xl border border-plasma-cyan/15 bg-plasma-cyan/8 p-4">
              <p className="text-[11px] uppercase tracking-widest text-plasma-cyan" style={{ fontVariant: 'small-caps' }}>
                {t('stake.yieldPreview')}
              </p>

              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-text-secondary">{t('stake.dailyYield')}</span>
                  <div className="flex items-baseline gap-1">
                    <span className="font-[family-name:var(--font-jetbrains-mono)] text-lg font-bold text-plasma-cyan">
                      {dailyYieldRWA.toFixed(2)}
                    </span>
                    <span className="text-xs text-plasma-cyan">RWA</span>
                  </div>
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-[11px] text-text-secondary">
                    {lockPeriod === 'flexible' && t('stake.baseYieldRate')}
                    {lockPeriod === '30' && t('stake.yieldRate30')}
                    {lockPeriod === '90' && t('stake.yieldRate90')}
                    {lockPeriod === '180' && t('stake.yieldRate180')}
                    {lockPeriod === '365' && t('stake.yieldRate365')}
                  </span>
                  <span className="font-[family-name:var(--font-jetbrains-mono)] text-[11px] text-text-secondary">
                    ≈ {(dailyYieldRWA * rwaPrice).toFixed(2)} USDT
                  </span>
                </div>
              </div>

              <div className="mt-3 space-y-2 border-t border-plasma-cyan/20 pt-3">
                <p className="text-[11px] text-text-secondary">{t('stake.totalYieldAtMaturity')}</p>
                <div className="grid grid-cols-2 gap-2 font-[family-name:var(--font-jetbrains-mono)] text-xs">
                  <div className="flex items-center justify-between rounded-lg border border-border-subtle bg-surface-2 px-2 py-1.5">
                    <span className="text-text-secondary">{t('stake.days30')}</span>
                    <span className="text-plasma-cyan">{totalYield30Days.toFixed(0)} RWA</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-border-subtle bg-surface-2 px-2 py-1.5">
                    <span className="text-text-secondary">{t('stake.days90')}</span>
                    <span className="text-plasma-cyan">{totalYield90Days.toFixed(0)} RWA</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-border-subtle bg-surface-2 px-2 py-1.5">
                    <span className="text-text-secondary">{t('stake.days180')}</span>
                    <span className="text-plasma-cyan">{totalYield180Days.toFixed(0)} RWA</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-border-subtle bg-surface-2 px-2 py-1.5">
                    <span className="text-text-secondary">{t('stake.days365')}</span>
                    <span className="text-plasma-cyan">{totalYield365Days.toFixed(0)} RWA</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 推荐人：仅在用户已输入质押金额（>0）且未绑定推荐人时显示 */}
      {!hasReferrer && numAmount > 0 && (
        <div className="mt-6">
          <div className="flex items-center gap-2">
            <span className="text-[11px] uppercase tracking-wider text-text-secondary" style={{ fontVariant: 'small-caps' }}>
              {t('stake.referralLabel')}
            </span>
            <span className="rounded-full bg-[#f43f5e20] px-2 py-0.5 text-[11px] text-[#f43f5e]">
              {t('stake.referralRequired')}
            </span>
          </div>
          <div
            className={`mt-2 flex min-h-12 w-full items-center rounded-2xl border border-border-subtle bg-surface-2 px-4 transition-colors ${
              referral.trim().length > 0 && !isValidReferral
                ? 'border-danger'
                : isValidReferral
                  ? 'border-success'
                  : 'focus-within:border-border-active'
            }`}
          >
            <input
              type="text"
              value={referral}
              onChange={(e) => setReferral(e.target.value)}
              placeholder={t('stake.referralPlaceholderRequired')}
              disabled={!isConnected}
              className="min-h-12 w-full bg-transparent font-mono text-[13px] text-text-primary outline-none placeholder:text-text-disabled disabled:opacity-50"
              aria-label={t('stake.referralLabel')}
              required
            />
          </div>
          {/* Error message for invalid address */}
          {referral.trim().length > 0 && !isValidReferral && (
            <p className="mt-2 text-xs text-[#f43f5e]">
              {isSelfReferral
                ? (locale.startsWith('zh') ? '推荐人地址不能填写为自己的钱包地址。' : 'Referrer address cannot be your own wallet address.')
                : t('stake.referralInvalid')}
            </p>
          )}
          {/* Warning chip */}
          <div
            className="mt-2 flex items-start gap-2 rounded-lg border px-4 py-2.5"
            style={{
              background: 'rgba(244,63,94,0.10)',
              borderColor: 'rgba(244,63,94,0.35)',
            }}
          >
            <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0 text-[#f43f5e]" />
            <p className="text-xs text-[#f43f5e]">{t('stake.referralWarning')}</p>
          </div>
        </div>
      )}

      {/* Step Indicator */}
      <p className="mt-6 text-xs text-text-disabled">{t('stake.step')}</p>

      {/* Action Buttons / Result */}
      {status === 'success' ? (
        <div
          className="mt-3 rounded-xl border p-5"
          style={{ background: 'rgba(16,185,129,0.10)', borderColor: 'rgba(16,185,129,0.40)' }}
        >
          <div className="flex items-center gap-3">
            <CheckCircle className="h-6 w-6 text-[#10b981]" />
            <span className="font-[family-name:var(--font-space-grotesk)] text-lg font-bold text-[#10b981]">
              {t('stake.success')}
            </span>
          </div>
          <p className="mt-2 font-[family-name:var(--font-jetbrains-mono)] text-xs text-text-secondary">
            {t('stake.txLabel')}
          </p>
          <a
            href={getExplorerTxUrl(chainId, txHash)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-block text-xs text-plasma-cyan hover:underline"
          >
            {t('stake.viewBscscan')}
          </a>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="rounded-2xl bg-plasma-cyan px-4 py-3 text-sm font-bold text-void-black transition-transform hover:scale-[1.01] hover:brightness-110"
            >
              {t('common.goToDashboardNow')}
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="rounded-2xl border border-border-subtle bg-surface-2 px-4 py-3 text-sm font-semibold text-text-primary transition-transform hover:scale-[1.01] hover:brightness-110"
            >
              {t('stake.stakeAgain')}
            </button>
          </div>
        </div>
      ) : status === 'error' ? (
        <div
          className="mt-3 rounded-xl border p-5"
          style={{ background: 'rgba(244,63,94,0.10)', borderColor: 'rgba(244,63,94,0.40)' }}
        >
          <div className="flex items-center gap-3">
            <XCircle className="h-6 w-6 text-[#f43f5e]" />
            <span className="text-sm text-[#f43f5e]">{errorMessage || t('common.transactionFailed')}</span>
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="mt-3 rounded-full bg-[#00d4ff] px-5 py-2 text-sm font-bold text-[#05050a] transition-all hover:brightness-110"
          >
            {t('stake.retry')}
          </button>
        </div>
      ) : status === 'staking' ? (
        <div
          className="mt-3 rounded-xl border p-5"
          style={{ background: 'rgba(0,245,212,0.10)', borderColor: 'rgba(0,245,212,0.40)' }}
        >
          <div className="flex items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-[#00f5d4]" />
            <span className="font-[family-name:var(--font-space-grotesk)] text-lg font-bold text-[#00f5d4]">
              {t('stake.staking')}
            </span>
          </div>
          <p className="mt-2 text-sm text-text-secondary">
            {locale.startsWith('zh') ? '请稍候，交易正在处理中...' : 'Please wait, transaction is being processed...'}
          </p>
        </div>
      ) : (
        <div className="mt-3 flex flex-col gap-3">
          <button
            type="button"
            onClick={handleStake}
            disabled={isStakeDisabled}
            className={`flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-[15px] font-bold transition-transform
              ${isStakeDisabled
                ? 'cursor-not-allowed bg-surface-2 text-text-disabled opacity-60 disabled:hover:scale-100'
                : status === 'staking'
                  ? 'bg-plasma-cyan/40 text-void-black'
                  : 'bg-plasma-cyan text-void-black hover:scale-[1.01] hover:brightness-110'
              }`}
          >
            {status === 'staking' && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            {status === 'staking' ? t('stake.staking') : t('stake.stakeNow')}
          </button>
        </div>
      )}

      {/* 已绑定推荐人提示：置于表单最下方（Pancake 式布局） */}
      {hasReferrer && (
        <div className="mt-6 rounded-2xl border border-plasma-cyan/15 bg-plasma-cyan/8 p-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-plasma-cyan" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-plasma-cyan">{t('stake.referrerBound')}</p>
              <p className="mt-1.5 break-all font-mono text-[11px] text-text-secondary">
                {t('stake.referrerAddress')}: {displayReferrer}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
