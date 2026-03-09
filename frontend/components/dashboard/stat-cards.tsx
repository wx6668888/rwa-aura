'use client'

import { useAccount, usePublicClient } from 'wagmi'
import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'
import { useStakingContract } from '@/hooks/useStakingContract'
import { useUserStakes } from '@/hooks/useUserStakes'
import { useDirectReferrals } from '@/hooks/useDirectReferrals'
import { useLevelInfo } from '@/hooks/useLevelInfo'
import { useState, useEffect, useRef } from 'react'
import { formatUnits } from 'viem'
import { X } from 'lucide-react'

interface StatCardProps {
  label: string
  value: string
  valueColor?: string
}

function StatCard({ label, value, valueColor = '#f1f5f9' }: StatCardProps) {
  return (
    <div
      className="flex min-w-[160px] flex-1 flex-col gap-2 rounded-2xl bg-gradient-to-br from-[#0d0d14] to-[#13131e] p-5 transition-all duration-200 hover:-translate-y-0.5"
      style={{ border: '1px solid #00f5d420' }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = '#00f5d440'
        ;(e.currentTarget as HTMLDivElement).style.boxShadow = '0 0 20px rgba(0,245,212,0.1)'
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = '#00f5d420'
        ;(e.currentTarget as HTMLDivElement).style.boxShadow = 'none'
      }}
    >
      <p
        className="text-[11px] uppercase tracking-widest text-[#64748b]"
        style={{ fontVariant: 'small-caps' }}
      >
        {label}
      </p>
      <p className="font-mono text-2xl font-bold" style={{ color: valueColor }}>
        {value}
      </p>
    </div>
  )
}

export function StatCards() {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)
  const { isConnected, address } = useAccount()
  const publicClient = usePublicClient()
  const { userStakeInfo, userRewards, refetchRewards, rwaStakeInfo, rwaFlexiblePrincipal, usdtFlexiblePrincipal } = useStakingContract()
  const { stakes, loading: stakesLoading } = useUserStakes()

  const rwaFlexNum = parseFloat(rwaFlexiblePrincipal || '0')
  const usdtFlexNum = parseFloat(usdtFlexiblePrincipal || '0')
  const activeStakes = stakes.filter((s) => {
    const isRWA = s.isRWAStake === true || s.stakeId.startsWith('rwa_')
    const isFlex = s.lockPeriod === 'flexible'
    if (isRWA && isFlex) return rwaFlexNum > 0
    if (!isRWA && isFlex) return usdtFlexNum > 0
    return true
  })
  const { referrals, loading: referralsLoading, count: directRefsCount } = useDirectReferrals()
  
  // 从后端 API 获取团队数据(使用 useLevelInfo,与 portfolio-card 保持一致)
  const { levelInfo, loading: levelInfoLoading } = useLevelInfo()

  // RWA 价格（用于转换）
  const rwaPrice = 0.85 // 1 RWA ≈ 0.85 USDT

  // 个人总质押 = USDT 质押 + RWA 质押（转换为 USDT 等值）
  // 始终使用链上实时数据,确保准确性
  const usdtStaked = parseFloat(userStakeInfo?.totalStaked || '0')
  const rwaStaked = parseFloat(rwaStakeInfo?.totalStakedRWA || '0')
  const rwaStakedInUSDT = rwaStaked * rwaPrice
  const personalTotalStaked = usdtStaked + rwaStakedInUSDT

  // 团队总质押 = 个人质押(链上) + 团队下级质押(后端)
  // 优先使用链上个人数据 + 后端团队数据,避免数据库不同步问题
  const teamVolumeOnly = levelInfo.teamVolumeUsdt  // 后端:团队下级质押(不含个人)
  const teamTotalStaked = personalTotalStaked + teamVolumeOnly  // 链上个人 + 后端团队
  
  // 显示值:个人始终用链上,团队用链上个人+后端团队
  const displayPersonal = personalTotalStaked  // 链上实时数据
  const displayTeamTotal = teamTotalStaked  // 链上个人 + 后端团队

  // 直推人数（从事件查询）
  const directRefs = isConnected && !referralsLoading ? String(directRefsCount) : '0'

  // RWA 待领取（链上数据）：合并 USDT 和 RWA 质押的收益
  const usdtRwaPending = parseFloat(userRewards?.rwaPending || '0')
  const rwaRwaPending = parseFloat(rwaStakeInfo?.rwaPending || '0')
  const rwaPendingNum = usdtRwaPending + rwaRwaPending
  
  // 质押金额（已在上方计算）
  const totalStakedNum = personalTotalStaked
  
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
  
  // 实时计算 RWA 收益（与 earnings-card.tsx 相同的逻辑）
  const [totalRwaEarning, setTotalRwaEarning] = useState(0)
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
  
  // 基于每笔质押分别计算实时收益
  useEffect(() => {
    if (!isConnected || !address || totalStakedNum === 0 || stakesLoading) {
      setTotalRwaEarning(rwaPendingNum)
      return
    }
    
    const calculateEarnings = () => {
      const currentTime = Math.floor(Date.now() / 1000)
      let total = 0
      
      if (activeStakes.length > 0) {
        for (const stake of activeStakes) {
          const stakeAmount = parseFloat(formatUnits(BigInt(stake.amount), 18))
          const stakeTime = stake.timestamp
          const lockMultiplier = getLockPeriodMultiplier(stake.lockPeriod)
          
          // 计算该笔质押的收益
          const baseDailyRate = 0.008 // 0.8%
          const adjustedDailyRate = baseDailyRate * lockMultiplier // 根据锁仓期限调整
          const dailyUSDTYield = stakeAmount * adjustedDailyRate
          const dailyRWAYield = dailyUSDTYield / rwaPrice
          const perSecondRWAYield = dailyRWAYield / 86400
          
          // 计算从质押时间到现在的收益
          const elapsedSeconds = currentTime - stakeTime
          
          if (elapsedSeconds > 0 && elapsedSeconds <= 31536000) {
            const stakeRWA = perSecondRWAYield * elapsedSeconds
            total += stakeRWA
          }
        }
        
        // 确保总收益不小于链上数据
        total = Math.max(rwaPendingNum, total)
      } else {
        // 如果没有质押记录，基于当前链上数据 + 实时增量
        if (lastUpdateTimeRef.current === 0) {
          setTotalRwaEarning(rwaPendingNum)
          return
        }
        
        // 使用平均收益率（假设所有质押都是灵活锁仓）
        const baseDailyRate = 0.008
        const dailyUSDTYield = totalStakedNum * baseDailyRate
        const dailyRWAYield = dailyUSDTYield / rwaPrice
        const perSecondRWAYield = dailyRWAYield / 86400
        
        const elapsedSeconds = currentTime - lastUpdateTimeRef.current
        const incrementalRWA = perSecondRWAYield * elapsedSeconds
        
        total = rwaPendingNum + incrementalRWA
      }
      
      // 确保总收益不小于链上数据
      total = Math.max(rwaPendingNum, total)
      
      setTotalRwaEarning(total)
    }
    
    // 立即计算一次
    calculateEarnings()
    
    // 每秒更新一次实时收益
    const interval = setInterval(() => {
      calculateEarnings()
    }, 1000)
    
    // 每30秒刷新一次链上数据
    const refetchInterval = setInterval(() => {
      if (isConnected && address) {
        refetchRewards()
      }
    }, 30000)
    
    return () => {
      clearInterval(interval)
      clearInterval(refetchInterval)
    }
  }, [isConnected, address, totalStakedNum, rwaPendingNum, refetchRewards, stakes, stakesLoading, rwaFlexNum, usdtFlexNum])

  // 总收益 = 实时计算的 RWA 收益（USDT 等值）+ USDT 奖励
  const usdtRewards = parseFloat(userStakeInfo?.usdtRewards || '0')
  const totalEarned = isConnected ? (totalRwaEarning * 0.85 + usdtRewards).toFixed(2) : '0.00'

  const [showStakeDetail, setShowStakeDetail] = useState(false)
  const lockLabel = (lp?: string) => {
    if (!lp) return t('stats.lockFlexible')
    switch (lp) {
      case '30': return t('stats.lock30')
      case '90': return t('stats.lock90')
      case '180': return t('stats.lock180')
      case '365': return t('stats.lock365')
      default: return t('stats.lockFlexible')
    }
  }
  const sortedStakes = [...stakes].sort((a, b) => b.timestamp - a.timestamp)

  return (
    <>
    <div className="flex gap-4 overflow-x-auto pb-1 md:grid md:grid-cols-3 md:overflow-visible md:pb-0">
      <div
        className="flex min-w-[160px] flex-1 flex-col gap-2 rounded-2xl bg-gradient-to-br from-[#0d0d14] to-[#13131e] p-5 transition-all duration-200 hover:-translate-y-0.5"
        style={{ border: '1px solid #00f5d420' }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.borderColor = '#00f5d440'
          ;(e.currentTarget as HTMLDivElement).style.boxShadow = '0 0 20px rgba(0,245,212,0.1)'
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.borderColor = '#00f5d420'
          ;(e.currentTarget as HTMLDivElement).style.boxShadow = 'none'
        }}
      >
        <p className="text-[11px] uppercase tracking-widest text-[#64748b]" style={{ fontVariant: 'small-caps' }}>
          {t('stats.stakeRecords')}
        </p>
        <p className="font-mono text-2xl font-bold" style={{ color: '#00f5d4' }}>
          {stakesLoading ? '...' : `${stakes.length}${t('stats.stakeRecordsCount')}`}
        </p>
        <button
          type="button"
          onClick={() => setShowStakeDetail(true)}
          className="mt-1 self-start text-xs text-[#64748b] hover:text-[#00f5d4] transition-colors"
        >
          {t('stats.viewDetails')}
        </button>
      </div>
      <StatCard
        label={t('stats.directRefs')}
        value={directRefs}
        valueColor="#f1f5f9"
      />
      <StatCard
        label={t('stats.totalEarned')}
        value={`$${totalEarned}`}
        valueColor="#00f5d4"
      />
    </div>

    {showStakeDetail && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
        style={{ height: '100dvh' }}
        onClick={() => setShowStakeDetail(false)}
      >
        <div
          className="flex flex-col w-full max-w-2xl max-h-[85vh] rounded-2xl border border-[#00f5d420] bg-gradient-to-br from-[#0d0d14] to-[#13131e] shadow-xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#00f5d420]/30">
            <h3 className="text-lg font-semibold text-[#f1f5f9]">{t('stats.stakeDetailTitle')}</h3>
            <button
              type="button"
              onClick={() => setShowStakeDetail(false)}
              className="p-2 text-[#64748b] hover:text-[#f1f5f9] rounded-lg"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="overflow-auto flex-1 min-h-0">
            {stakesLoading ? (
              <p className="p-6 text-[#64748b]">{t('fundActivity.loading')}</p>
            ) : sortedStakes.length === 0 ? (
              <p className="p-6 text-[#64748b]">{t('fundActivity.noRecords')}</p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-[#0d0d14] border-b border-[#00f5d420]/20">
                  <tr>
                    <th className="px-4 py-3 font-medium text-[#64748b]">{t('stats.stakeDetailTime')}</th>
                    <th className="px-4 py-3 font-medium text-[#64748b]">{t('stats.stakeDetailType')}</th>
                    <th className="px-4 py-3 font-medium text-[#64748b]">{t('stats.stakeDetailAmount')}</th>
                    <th className="px-4 py-3 font-medium text-[#64748b]">{t('stats.stakeDetailLock')}</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedStakes.map((s) => (
                    <tr key={s.stakeId} className="border-b border-[#00f5d420]/10">
                      <td className="px-4 py-3 font-mono text-[#64748b]">
                        {new Date(s.timestamp * 1000).toLocaleString(locale)}
                      </td>
                      <td className="px-4 py-3 text-[#f1f5f9]">
                        {s.isRWAStake ? t('stats.typeRWA') : t('stats.typeUSDT')}
                      </td>
                      <td className="px-4 py-3 font-mono text-[#00f5d4]">
                        {parseFloat(formatUnits(BigInt(s.amount), 18)).toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {s.isRWAStake ? 'RWA' : 'USDT'}
                      </td>
                      <td className="px-4 py-3 text-[#64748b]">{lockLabel(s.lockPeriod)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    )}
    </>
  )
}
