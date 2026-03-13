'use client'

import { useRouter } from 'next/navigation'
import { useAccount, usePublicClient } from 'wagmi'
import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'
import { useStakingContract } from '@/hooks/useStakingContract'
import { useStakesContext } from '@/contexts/StakesContext'
import { useReferralRewards } from '@/hooks/useReferralRewards'
import { useState, useEffect, useRef, useCallback } from 'react'
import { formatUnits } from 'viem'

interface StakeEarning {
  stakeId: string
  amount: number
  lockPeriod: string
  elapsedDays: number
  dailyRate: number
  rwaEarning: number
  timestamp: number
  isRWAStake?: boolean
}

export function EarningsCard() {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)
  const router = useRouter()
  const { isConnected, address } = useAccount()
  const publicClient = usePublicClient()
  const { userRewards, userStakeInfo, refetchRewards, rwaStakeInfo, refetchRWAStakeInfo, rwaFlexiblePrincipal, usdtFlexiblePrincipal } = useStakingContract()
  const { stakes, loading: stakesLoading, refetch: refetchStakes } = useStakesContext()
  const { rewards: referralRewards } = useReferralRewards()

  // 当用户质押数据变化时，自动刷新质押记录
  useEffect(() => {
    if (isConnected && address) {
      // 立即刷新一次
      refetchStakes()
      // 延迟再刷新一次，确保链上数据已更新
      const timer = setTimeout(() => {
        refetchStakes()
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [isConnected, address, userStakeInfo?.totalStaked, rwaStakeInfo?.totalStakedRWA, refetchStakes])
  
  // 页面加载时强制刷新一次
  useEffect(() => {
    if (isConnected && address) {
      const timer = setTimeout(() => {
        refetchStakes()
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [isConnected, address, refetchStakes])

  // RWA 价格（用于转换）
  const rwaPrice = 0.85 // 1 RWA ≈ 0.85 USDT

  // RWA 待领取（链上数据）：合并 USDT 和 RWA 质押的收益
  const usdtRwaPending = parseFloat(userRewards?.rwaPending || '0')
  const rwaRwaPending = parseFloat(rwaStakeInfo?.rwaPending || '0')
  const rwaPendingNum = usdtRwaPending + rwaRwaPending
  
  // 质押金额：合并 USDT 和 RWA 质押
  const usdtStaked = parseFloat(userStakeInfo?.totalStaked || '0')
  const rwaStaked = parseFloat(rwaStakeInfo?.totalStakedRWA || '0')
  const rwaStakedInUSDT = rwaStaked * rwaPrice // 转换为 USDT 等值
  const totalStakedNum = usdtStaked + rwaStakedInUSDT // 合并总质押（USDT 等值）
  
  // 质押开始时间（从合约读取）：优先使用 RWA 质押时间
  const firstStakeTime = rwaStakeInfo?.firstStakeTime || userStakeInfo?.firstStakeTime || 0
  
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
  
  const getLockPeriodLabel = (lockPeriod?: string): string => {
    switch (lockPeriod) {
      case 'flexible': return t('stake.lockPeriodFlexible')
      case '30': return t('stake.lockPeriod30')
      case '90': return t('stake.lockPeriod90')
      case '180': return t('stake.lockPeriod180')
      case '365': return t('stake.lockPeriod365')
      default: return t('stake.lockPeriodFlexible')
    }
  }
  
  // 计算每笔质押的收益
  const [stakeEarnings, setStakeEarnings] = useState<StakeEarning[]>([])
  const [totalRwaEarning, setTotalRwaEarning] = useState(0)
  const [unsettledEarning, setUnsettledEarning] = useState(0) // 未结算收益
  const lastUpdateTimeRef = useRef<number>(0)
  const lastRwaPendingRef = useRef<number>(rwaPendingNum)
  
  // 当链上数据更新时，记录更新时间
  useEffect(() => {
    if (rwaPendingNum !== lastRwaPendingRef.current) {
      lastUpdateTimeRef.current = Math.floor(Date.now() / 1000)
      lastRwaPendingRef.current = rwaPendingNum
    } else if (lastUpdateTimeRef.current === 0 && rwaPendingNum > 0) {
      lastUpdateTimeRef.current = Math.floor(Date.now() / 1000)
    }
  }, [rwaPendingNum])
  
  // 基于每笔质押分别计算实时收益（包括 USDT 和 RWA 质押）
  useEffect(() => {
    if (!isConnected || !address || totalStakedNum === 0) {
      setStakeEarnings([])
      setTotalRwaEarning(rwaPendingNum)
      return
    }
    
    // 如果还在加载中，等待加载完成
    if (stakesLoading) {
      return
    }
    
    // 计算每笔质押的收益
    const calculateEarnings = () => {
      const currentTime = Math.floor(Date.now() / 1000)
      const earnings: StakeEarning[] = []
      let total = 0
      
      // 已提现的灵活仓位不再显示：灵活 RWA 已提则 rwaFlexiblePrincipal 为 0，灵活 USDT 已提则 usdtFlexiblePrincipal 为 0
      const rwaFlexNum = parseFloat(rwaFlexiblePrincipal || '0')
      const usdtFlexNum = parseFloat(usdtFlexiblePrincipal || '0')
      
      console.log('🔍 FIFO Debug - Flexible principals:', { rwaFlexNum, usdtFlexNum })
      
      // Calculate total staked from all stakes
      const totalUSDTStaked = stakes.filter(s => {
        const isRWA = s.isRWAStake === true || (s.stakeId && s.stakeId.toUpperCase().startsWith('RWA_'))
        const isFlex = s.lockPeriod === 'flexible'
        return !isRWA && isFlex
      }).reduce((sum, s) => sum + parseFloat(s.amount) / 1e18, 0)
      
      const totalRWAStaked = stakes.filter(s => {
        const isRWA = s.isRWAStake === true || (s.stakeId && s.stakeId.toUpperCase().startsWith('RWA_'))
        const isFlex = s.lockPeriod === 'flexible'
        return isRWA && isFlex
      }).reduce((sum, s) => sum + parseFloat(s.amount) / 1e18, 0)
      
      console.log('🔍 FIFO Debug - Total flexible staked:', { totalUSDTStaked, totalRWAStaked })
      
      // Apply FIFO withdrawal logic for flexible stakes
      const sortedStakes = [...stakes].sort((a, b) => a.timestamp - b.timestamp)
      let remainingUSDTWithdrawn = totalUSDTStaked - usdtFlexNum
      let remainingRWAWithdrawn = totalRWAStaked - rwaFlexNum
      
      console.log('🔍 FIFO Debug - Withdrawn amounts:', { remainingUSDTWithdrawn, remainingRWAWithdrawn })
      
      let activeStakes = sortedStakes.map((s) => {
        const isRWA = s.isRWAStake === true || (s.stakeId && s.stakeId.toUpperCase().startsWith('RWA_'))
        const isFlex = s.lockPeriod === 'flexible'
        const originalAmount = parseFloat(s.amount) / 1e18
        let remainingAmount = originalAmount
        
        // Apply FIFO to flexible stakes only
        if (isFlex) {
          if (isRWA && remainingRWAWithdrawn > 0) {
            if (remainingRWAWithdrawn >= originalAmount) {
              remainingRWAWithdrawn -= originalAmount
              remainingAmount = 0
            } else {
              remainingAmount = originalAmount - remainingRWAWithdrawn
              remainingRWAWithdrawn = 0
            }
          } else if (!isRWA && remainingUSDTWithdrawn > 0) {
            if (remainingUSDTWithdrawn >= originalAmount) {
              remainingUSDTWithdrawn -= originalAmount
              remainingAmount = 0
            } else {
              remainingAmount = originalAmount - remainingUSDTWithdrawn
              remainingUSDTWithdrawn = 0
            }
          }
        }
        
        console.log('🔍 FIFO Debug - Stake:', s.stakeId, 'Original:', originalAmount, 'Remaining:', remainingAmount)
        
        return {
          ...s,
          amount: (remainingAmount * 1e18).toString(),
          remainingAmount
        }
      }).filter(s => s.remainingAmount > 0)
      
      console.log('🔍 FIFO Debug - Active stakes count:', activeStakes.length)
      
      // 如果 stakes 为空，从合约状态构造数据
      if (activeStakes.length === 0) {
        const fallbackStakes = []
        
        if (rwaStakeInfo?.totalStakedRWA && parseFloat(rwaStakeInfo.totalStakedRWA) > 0) {
          fallbackStakes.push({
            stakeId: `rwa_${rwaStakeInfo.firstStakeTime || Date.now() / 1000}`,
            amount: rwaStakeInfo.totalStakedRWA,
            timestamp: Number(rwaStakeInfo.firstStakeTime || Date.now() / 1000),
            lockPeriod: 'flexible' as const,
            isRWAStake: true,
            tokenDecimals: 18,
          })
        }
        
        if (userStakeInfo?.totalStaked && parseFloat(userStakeInfo.totalStaked) > 0) {
          fallbackStakes.push({
            stakeId: `usdt_${userStakeInfo.firstStakeTime || Date.now() / 1000}`,
            amount: userStakeInfo.totalStaked,
            timestamp: Number(userStakeInfo.firstStakeTime || Date.now() / 1000),
            lockPeriod: 'flexible' as const,
            isRWAStake: false,
            tokenDecimals: 18,
          })
        }
        
        activeStakes = fallbackStakes
      }

      // 计算所有质押的收益（包括 USDT 和 RWA 质押，分别处理）
      if (activeStakes.length > 0) {
        console.log('📊 开始计算质押收益，质押数量:', activeStakes.length)
        console.log('📊 所有质押记录:', activeStakes.map(s => ({
          stakeId: s.stakeId,
          isRWAStake: s.isRWAStake,
          amount: s.amount,
          tokenDecimals: s.tokenDecimals,
          timestamp: s.timestamp,
          lockPeriod: s.lockPeriod
        })))
        for (const stake of activeStakes) {
          // 确保正确识别 RWA 质押
          const isRWAStake = stake.isRWAStake === true || stake.stakeId?.startsWith('rwa_')
          // 合约统一使用 18 decimals
          const stakeAmount = parseFloat(formatUnits(BigInt(stake.amount), 18))
          const stakeTime = stake.timestamp
          const lockMultiplier = getLockPeriodMultiplier(stake.lockPeriod)
          
          console.log(`  💰 处理质押 #${stake.stakeId}:`, {
            stakeId: stake.stakeId,
            isRWAStake,
            isRWAStakeFlag: stake.isRWAStake,
            stakeIdStartsWithRwa: stake.stakeId.startsWith('rwa_'),
            stakeAmount,
            stakeTime: new Date(stakeTime * 1000).toLocaleString(),
            lockPeriod: stake.lockPeriod,
            lockMultiplier,
            rawAmount: stake.amount
          })
          
          // 计算该笔质押的收益
          const baseDailyRate = 0.008 // 0.8%
          const adjustedDailyRate = baseDailyRate * lockMultiplier
          
          if (isRWAStake) {
            // RWA 质押：直接基于 RWA 数量计算 RWA 收益
            const dailyRWAYield = stakeAmount * adjustedDailyRate
            const perSecondRWAYield = dailyRWAYield / 86400
            
            console.log(`    🕐 时间调试:`, {
              currentTime,
              stakeTime,
              rawElapsed: currentTime - stakeTime,
              currentTimeDate: (currentTime && !isNaN(currentTime)) ? new Date(currentTime * 1000).toISOString() : 'Invalid',
              stakeTimeDate: (stakeTime && !isNaN(stakeTime)) ? new Date(stakeTime * 1000).toISOString() : 'Invalid',
            })
            
            const elapsedSeconds = Math.max(0, currentTime - stakeTime)
            const elapsedDays = elapsedSeconds / 86400
            
            const stakeRWA = perSecondRWAYield * elapsedSeconds
            total += stakeRWA
            
            console.log(`    ✅ RWA 质押收益: ${stakeRWA.toFixed(6)} RWA (经过 ${elapsedDays.toFixed(2)} 天)`)
            
            earnings.push({
              stakeId: stake.stakeId,
              amount: stakeAmount, // RWA 数量
              lockPeriod: stake.lockPeriod || 'flexible',
              elapsedDays,
              dailyRate: adjustedDailyRate * 100,
              rwaEarning: stakeRWA,
              timestamp: stakeTime,
              isRWAStake: true, // RWA 质押
            })
          } else {
            // USDT 质押：基于 USDT 数量计算，然后转换为 RWA
            const dailyUSDTYield = stakeAmount * adjustedDailyRate
            const dailyRWAYield = dailyUSDTYield / rwaPrice
            const perSecondRWAYield = dailyRWAYield / 86400
            const elapsedSeconds = currentTime - stakeTime
            const elapsedDays = elapsedSeconds / 86400
            
            if (elapsedSeconds > 0 && elapsedSeconds <= 31536000) {
              const stakeRWA = perSecondRWAYield * elapsedSeconds
              total += stakeRWA
              
              console.log(`    ✅ USDT 质押收益: ${stakeRWA.toFixed(6)} RWA (来自 ${stakeAmount} USDT)`)
              
              earnings.push({
                stakeId: stake.stakeId,
                amount: stakeAmount, // USDT 数量
                lockPeriod: stake.lockPeriod || 'flexible',
                elapsedDays,
                dailyRate: adjustedDailyRate * 100,
                rwaEarning: stakeRWA,
                timestamp: stakeTime,
                isRWAStake: false, // USDT 质押
              })
            } else {
              console.log(`    ⚠️  USDT 质押时间异常: elapsedSeconds=${elapsedSeconds}`)
            }
        }
      }
      
        console.log('📊 计算完成，总收益:', total, 'RWA, 订单数量:', earnings.length)
        console.log('📋 每笔订单详情:', earnings.map((e, idx) => ({
          序号: idx + 1,
          stakeId: e.stakeId,
          amount: e.amount,
          rwaEarning: e.rwaEarning,
          timestamp: new Date(e.timestamp * 1000).toLocaleString(),
          lockPeriod: e.lockPeriod
        })))
      } else {
        // 如果没有查询到事件，使用链上汇总数据作为后备方案
        console.log('📊 未查询到事件，基于链上汇总数据计算实时收益')
        const baseDailyRate = 0.008 // 0.8%
        
        // USDT 质押
        if (usdtStaked > 0 && userStakeInfo?.firstStakeTime) {
          const usdtFirstStakeTime = Number(userStakeInfo.firstStakeTime)
          const dailyUSDTYield = usdtStaked * baseDailyRate
          const dailyRWAYield = dailyUSDTYield / rwaPrice
          const perSecondRWAYield = dailyRWAYield / 86400
          const elapsedSeconds = currentTime - usdtFirstStakeTime
          const elapsedDays = elapsedSeconds / 86400
          
          if (elapsedSeconds > 0) {
            const stakeRWA = perSecondRWAYield * elapsedSeconds
            total += stakeRWA
            
            earnings.push({
              stakeId: `usdt_fallback_${usdtFirstStakeTime}`,
              amount: usdtStaked,
              lockPeriod: 'flexible',
              elapsedDays,
              dailyRate: baseDailyRate * 100,
              rwaEarning: stakeRWA,
              timestamp: usdtFirstStakeTime,
            })
          }
        }
        
        // RWA 质押
        if (rwaStaked > 0 && rwaStakeInfo?.firstStakeTime) {
          const rwaFirstStakeTime = Number(rwaStakeInfo.firstStakeTime)
          const dailyRWAYield = rwaStaked * baseDailyRate
        const perSecondRWAYield = dailyRWAYield / 86400
          const elapsedSeconds = currentTime - rwaFirstStakeTime
          const elapsedDays = elapsedSeconds / 86400
          
          if (elapsedSeconds > 0) {
            const stakeRWA = perSecondRWAYield * elapsedSeconds
            total += stakeRWA
            
            earnings.push({
              stakeId: `rwa_fallback_${rwaFirstStakeTime}`,
              amount: rwaStaked,
              lockPeriod: 'flexible',
              elapsedDays,
              dailyRate: baseDailyRate * 100,
              rwaEarning: stakeRWA,
              timestamp: rwaFirstStakeTime,
            })
          }
        }
      }
      
      // 分离已结算和未结算收益
      // total = 实时计算的总收益
      // rwaPendingNum = 合约中已结算的收益
      const unsettled = Math.max(0, total - rwaPendingNum) // 未结算部分
      
      setStakeEarnings(earnings)
      setTotalRwaEarning(rwaPendingNum + unsettled) // 总收益 = 已结算 + 未结算
      setUnsettledEarning(unsettled) // 单独记录未结算部分
    }
    
    // 立即计算一次
    calculateEarnings()
    
    // 每秒更新一次实时收益
    const interval = setInterval(() => {
      calculateEarnings()
    }, 1000)
    
    // 每30秒刷新一次链上数据和质押记录
    const refetchInterval = setInterval(() => {
      if (isConnected && address) {
        refetchRewards()
        refetchRWAStakeInfo()
        refetchStakes()
      }
    }, 30000)
    
    return () => {
      clearInterval(interval)
      clearInterval(refetchInterval)
    }
  }, [isConnected, address, totalStakedNum, firstStakeTime, rwaPendingNum, refetchRewards, refetchRWAStakeInfo, refetchStakes, rwaStaked, usdtStaked, userStakeInfo?.firstStakeTime, rwaFlexiblePrincipal, usdtFlexiblePrincipal])
  
  const rwaUsdtValue = (totalRwaEarning * 0.85).toFixed(2)

  // USDT 推荐奖励（从后端获取）
  const usdtRewardsNum = referralRewards.matured

  return (
    <div
      className="rounded-2xl bg-gradient-to-br from-[#0d0d14] to-[#13131e] p-6 backdrop-blur-xl"
      style={{ border: '1px solid #00f5d420', boxShadow: '0 0 20px rgba(0,245,212,0.05)' }}
    >
      <div className="flex h-full flex-col gap-0 md:flex-row">
        {/* LEFT: RWA */}
        <div className="flex flex-1 flex-col">
          <p
            className="text-[11px] uppercase tracking-widest text-[#64748b]"
            style={{ fontVariant: 'small-caps' }}
          >
            {t('earnings.rwa')}
          </p>
          <div className="mt-1 flex items-baseline gap-2">
            <span 
              className="font-mono text-[40px] font-bold leading-none text-[#f1f5f9] transition-all"
              style={{ 
                animation: 'pulse 2s ease-in-out infinite',
                textShadow: '0 0 15px rgba(0,245,212,0.3)',
                minWidth: '280px',
                display: 'inline-block'
              }}
            >
              {isConnected ? totalRwaEarning.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 }) : '0.00'}
            </span>
            <span className="font-mono text-lg text-[#00f5d4]">{t('earnings.rwaCurrency')}</span>
          </div>
          <p className="mt-1 text-[13px] text-[#64748b]">
            {isConnected ? `≈ $${rwaUsdtValue} USDT` : t('earnings.usdtEquiv')}
          </p>
          {isConnected && (
            <div className="mt-2 flex flex-col gap-1 text-[11px]">
              <div className="flex items-center gap-2">
                <span className="text-[#64748b]">已结算:</span>
                <span className="font-mono text-[#00f5d4]">{rwaPendingNum.toFixed(6)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#64748b]">未结算:</span>
                <span className="font-mono text-[#fbbf24]">{unsettledEarning.toFixed(6)}</span>
              </div>
            </div>
          )}
          
          {/* 每笔质押明细 - 实时动态显示 */}
          {isConnected && (stakeEarnings.length > 0 || totalRwaEarning > 0) && (
            <div className="mt-4 rounded-xl border border-[#00f5d420] bg-gradient-to-br from-[#0a0a0f] to-[#0d0d14] p-4 shadow-[0_0_20px_rgba(0,245,212,0.05)]">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-semibold text-[#00f5d4] uppercase tracking-wider">
                  {t('earnings.stakeDetails') || '质押明细'}
                </p>
                <p className="text-xs text-[#64748b]">
                  {stakeEarnings.length} {t('earnings.stakes') || '笔'}
                </p>
              </div>
              {/* 说明：质押明细显示实时计算的预估收益 */}
              <div className="mb-3 rounded-lg bg-[#0d0d14] border border-[#00f5d420] px-3 py-2">
                <p className="text-[10px] text-[#64748b] leading-relaxed">
                  {t('earnings.estimatedYieldNote') || '💡 实时预估收益（每秒更新）。实际奖励每天 00:00 UTC 统一发放。上方"待提取RWA代币"显示链上实际奖励。'}
                </p>
              </div>
              <div className="space-y-2.5 max-h-[400px] overflow-y-auto scrollbar-hide">
                {stakeEarnings.length > 0 ? (
                  stakeEarnings.map((earning, index) => {
                    // 确保使用唯一的 key，避免 React 合并显示
                    const uniqueKey = `${earning.stakeId}-${earning.timestamp}-${index}`
                    // 计算每秒增长率（用于动画效果）
                    const isRWAStake = earning.isRWAStake === true
                    const baseDailyRate = 0.008
                    const lockMultiplier = getLockPeriodMultiplier(earning.lockPeriod)
                    const adjustedDailyRate = baseDailyRate * lockMultiplier
                    const dailyRWAYield = isRWAStake 
                      ? earning.amount * adjustedDailyRate
                      : (earning.amount * adjustedDailyRate) / rwaPrice
                    const perSecondRWAYield = dailyRWAYield / 86400
                    
                    return (
                      <div 
                        key={uniqueKey}
                        className="flex items-center justify-between rounded-lg bg-[#0d0d14] px-3 py-2.5 border border-[#ffffff08] hover:border-[#00f5d430] hover:bg-[#13131e] transition-all"
                  >
                        <div className="flex items-start gap-2.5 flex-1">
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#00f5d410] border border-[#00f5d420] flex-shrink-0 mt-0.5">
                            <span className="text-[9px] font-semibold text-[#00f5d4]">{index + 1}</span>
                      </div>
                          <div className="flex flex-col flex-1 min-w-0">
                            <span className="text-sm font-semibold text-[#f1f5f9] truncate">
                              {isRWAStake 
                            ? `${earning.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RWA`
                            : `${earning.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT`}
                        </span>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className="text-xs text-[#64748b] whitespace-nowrap">
                          {getLockPeriodLabel(earning.lockPeriod)}
                        </span>
                              <span className="text-[10px] text-[#64748b]">
                                • {earning.elapsedDays.toFixed(2)} 天
                              </span>
                              <span className="text-[10px] text-[#00f5d4] font-mono">
                                +{perSecondRWAYield.toFixed(8)} RWA/秒
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right ml-3 flex-shrink-0" style={{ width: '110px' }}>
                          <span 
                            className="font-mono text-sm font-semibold text-[#00f5d4] transition-all tabular-nums block"
                            style={{ 
                              animation: 'pulse 2s ease-in-out infinite',
                              textShadow: '0 0 8px rgba(0,245,212,0.3)',
                              fontVariantNumeric: 'tabular-nums',
                              fontSize: '13px'
                            }}
                          >
                            {earning.rwaEarning.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })} RWA
                          </span>
                          <p className="text-[10px] text-[#64748b] mt-0.5">
                            ≈ ${(earning.rwaEarning * rwaPrice).toFixed(4)} USDT
                          </p>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  // 如果没有明细，显示总计
                  <div className="rounded-lg bg-[#0d0d14] px-3 py-2.5 border border-[#ffffff05]">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[#64748b]">实时预估收益</span>
                      <span 
                        className="font-mono text-sm font-semibold text-[#00f5d4]"
                        style={{ 
                          animation: 'pulse 2s ease-in-out infinite',
                          textShadow: '0 0 8px rgba(0,245,212,0.3)'
                        }}
                      >
                        {totalRwaEarning.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })} RWA
                      </span>
                    </div>
                  </div>
                )}
              </div>
              <div className="mt-3 border-t border-[#ffffff0d] pt-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-[#f1f5f9]">
                  {t('earnings.total') || '总计'}
                </span>
                <div className="text-right">
                  <span 
                    className="font-mono text-base font-bold text-[#00f5d4] block"
                    style={{ 
                      animation: 'pulse 2s ease-in-out infinite',
                      textShadow: '0 0 10px rgba(0,245,212,0.4)'
                    }}
                  >
                  {totalRwaEarning.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })} RWA
                </span>
                  <span className="font-mono text-xs text-[#64748b] block mt-0.5">
                    ≈ ${(totalRwaEarning * rwaPrice).toFixed(2)} USDT
                  </span>
                </div>
              </div>
            </div>
          )}
          
          <button
            type="button"
            onClick={() => router.push('/withdraw')}
            disabled={!isConnected}
            className="mt-4 min-h-[44px] w-full rounded-full bg-[#00f5d4] font-[family-name:var(--font-space-grotesk)] text-sm font-semibold text-[#05050a] transition-all hover:brightness-110 shadow-[0_0_20px_rgba(0,245,212,0.3)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {!isConnected ? t('common.connectWalletFirst') : t('earnings.withdrawRwa')}
          </button>
        </div>

        {/* Vertical divider (desktop) / Horizontal (mobile) */}
        <div className="mx-6 hidden w-px bg-[#ffffff0d] md:block" />
        <div className="my-5 h-px bg-[#ffffff0d] md:hidden" />

        {/* RIGHT: USDT */}
        <div className="flex flex-1 flex-col">
          <p
            className="text-[11px] uppercase tracking-widest text-[#64748b]"
            style={{ fontVariant: 'small-caps' }}
          >
            {t('earnings.usdt')}
          </p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-mono text-[40px] font-bold leading-none text-[#f1f5f9]">
              {isConnected ? usdtRewardsNum.toFixed(2) : '0.00'}
            </span>
            <span className="font-mono text-lg text-[#00f5d4]">USDT</span>
          </div>
          <p className="mt-1 text-[13px] text-[#64748b]">{t('earnings.dynamic')}</p>
          <button
            type="button"
            onClick={() => router.push('/withdraw')}
            disabled={!isConnected}
            className="mt-4 min-h-[44px] w-full rounded-full border-2 border-[#00f5d4] bg-transparent font-[family-name:var(--font-space-grotesk)] text-sm font-semibold text-[#00f5d4] transition-all hover:bg-[#00f5d410] hover:shadow-[0_0_20px_rgba(0,245,212,0.2)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {!isConnected ? t('common.connectWalletFirst') : t('earnings.claimUsdt')}
          </button>
        </div>
      </div>
    </div>
  )
}
