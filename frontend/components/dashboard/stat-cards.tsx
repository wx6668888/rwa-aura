'use client'

import { useAccount, useChainId, usePublicClient } from 'wagmi'
import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'
import { useStakingContract } from '@/hooks/useStakingContract'
import { useStakesContext } from '@/contexts/StakesContext'
import { useDirectReferrals } from '@/hooks/useDirectReferrals'
import { useLevelInfo } from '@/hooks/useLevelInfo'
import { useReferralRewards } from '@/hooks/useReferralRewards'
import { useState, useEffect } from 'react'
import { formatUnits } from 'viem'
import { ExternalLink, X } from 'lucide-react'

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
  const chainId = useChainId()
  const publicClient = usePublicClient()
  const { userStakeInfo, userRewards, refetchRewards, rwaStakeInfo, rwaFlexiblePrincipal, usdtFlexiblePrincipal } = useStakingContract()
  const { stakes, loading: stakesLoading } = useStakesContext()
  const { rewards: referralRewards } = useReferralRewards()

  const rwaFlexNum = parseFloat(rwaFlexiblePrincipal || '0')
  const usdtFlexNum = parseFloat(usdtFlexiblePrincipal || '0')
  const activeStakes = stakes.filter((s) => {
    const isRWA = s.isRWAStake === true || (s.stakeId && s.stakeId.toLowerCase().startsWith('rwa_'))
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
  
  // 锁仓期限倍数映射（与后端 LOCK_BONUS 一致：effectiveRate = 0.008 * multiplier）
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

  /** 当前 UTC 日 00:00（= 后端日结日界 北京时间 08:00）起的秒级 RWA 增量，与 PreciseYieldCalculator 分段思路一致 */
  function accrueTodayRwaWeiPerSecondModel(
    principal: number,
    stakeTimeSec: number,
    lockMultiplier: number,
    isRwaStake: boolean,
    nowSec: number
  ): number {
    const dayStart = Math.floor(nowSec / 86400) * 86400
    const start = Math.max(stakeTimeSec, dayStart)
    const elapsed = nowSec - start
    if (elapsed <= 0 || elapsed > 31536000) return 0
    const baseDailyRate = 0.008
    const adjustedDailyRate = baseDailyRate * lockMultiplier
    const dailyRwa = isRwaStake
      ? principal * adjustedDailyRate
      : (principal * adjustedDailyRate) / rwaPrice
    const perSec = dailyRwa / 86400
    return perSec * elapsed
  }
  
  // 实时计算 RWA 收益：链上已结算 rwaPending + 本日未结算（每秒递增，保持动画）
  const [totalRwaEarning, setTotalRwaEarning] = useState(0)
  
  // 基于每笔质押分别计算实时收益
  useEffect(() => {
    if (!isConnected || !address || totalStakedNum === 0 || stakesLoading) {
      setTotalRwaEarning(rwaPendingNum)
      return
    }
    
    const calculateEarnings = () => {
      const currentTime = Math.floor(Date.now() / 1000)
      let todayUnsettledRwa = 0
      
      if (activeStakes.length > 0) {
        for (const stake of activeStakes) {
          const isRWA =
            stake.isRWAStake === true ||
            (stake.stakeId && stake.stakeId.toLowerCase().startsWith('rwa_'))
          const stakeTime = stake.timestamp
          if (!stakeTime || stakeTime <= 0 || stakeTime > currentTime) continue
          const stakeAmount = parseFloat(formatUnits(BigInt(stake.amount), 18))
          const lockMultiplier = getLockPeriodMultiplier(stake.lockPeriod)
          todayUnsettledRwa += accrueTodayRwaWeiPerSecondModel(
            stakeAmount,
            stakeTime,
            lockMultiplier,
            isRWA,
            currentTime
          )
        }
      } else {
        // 无列表时：用链上汇总 + firstStakeTime，USDT/RWA 分路径（与后端公式一致）
        if (usdtStaked > 0 && userStakeInfo?.firstStakeTime) {
          const t0 = Number(userStakeInfo.firstStakeTime)
          todayUnsettledRwa += accrueTodayRwaWeiPerSecondModel(usdtStaked, t0, 1.0, false, currentTime)
        }
        if (rwaStaked > 0 && rwaStakeInfo?.firstStakeTime) {
          const t0 = Number(rwaStakeInfo.firstStakeTime)
          todayUnsettledRwa += accrueTodayRwaWeiPerSecondModel(rwaStaked, t0, 1.0, true, currentTime)
        }
      }
      
      // 已结算（链上 rwaPending）+ 本日未结算秒级预估（与 earnings-card 一致，不重复计历史）
      setTotalRwaEarning(rwaPendingNum + todayUnsettledRwa)
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
  }, [
    isConnected,
    address,
    totalStakedNum,
    rwaPendingNum,
    refetchRewards,
    stakes,
    stakesLoading,
    rwaFlexNum,
    usdtFlexNum,
    usdtStaked,
    rwaStaked,
    userStakeInfo?.firstStakeTime,
    rwaStakeInfo?.firstStakeTime,
  ])

  // 总收益 = 实时计算的 RWA 收益（USDT 等值）+ USDT 推荐奖励（从后端获取）
  const usdtRewards = referralRewards.matured
  const totalEarned = isConnected ? (totalRwaEarning * 0.85 + usdtRewards).toFixed(2) : '0.00'

  const [showStakeDetail, setShowStakeDetail] = useState(false)

  const explorerUrl =
    chainId === 56
      ? 'https://bscscan.com'
      : chainId === 97
        ? 'https://testnet.bscscan.com'
        : 'https://etherscan.io'

  const lockDays = (lp?: string): number | null => {
    switch (lp) {
      case '30':
        return 30
      case '90':
        return 90
      case '180':
        return 180
      case '365':
        return 365
      default:
        return null
    }
  }

  const formatMaturity = (timestamp: number, lp?: string) => {
    const days = lockDays(lp)
    if (days == null) return t('stats.stakeDetailNoMaturity')
    const endSec = timestamp + days * 86400
    return new Date(endSec * 1000).toLocaleString(locale)
  }

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
    <div className="scrollbar-hide flex gap-4 overflow-x-auto pb-1 md:grid md:grid-cols-3 md:overflow-visible md:pb-0">
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
        className="fixed inset-0 z-50 flex flex-col items-stretch justify-start bg-black/90 backdrop-blur-sm px-4 pt-[max(12px,env(safe-area-inset-top,24px))] pb-[max(12px,env(safe-area-inset-bottom,20px))] sm:flex-row sm:items-center sm:justify-center"
        style={{ minHeight: '100dvh' }}
        onClick={() => setShowStakeDetail(false)}
      >
        <div
          className="mx-auto flex max-h-[min(85vh,calc(100dvh-env(safe-area-inset-top,24px)-env(safe-area-inset-bottom,20px)-2.5rem))] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[#00f5d420] bg-gradient-to-br from-[#0d0d14] to-[#13131e] shadow-xl sm:max-h-[85vh] sm:my-auto"
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
              <>
                {/* Desktop table */}
                <div className="hidden md:block">
                  <table className="w-full text-left text-sm">
                    <thead className="sticky top-0 bg-[#0d0d14] border-b border-[#00f5d420]/20">
                      <tr>
                        <th className="px-4 py-3 font-medium text-[#64748b]">{t('stats.stakeDetailTime')}</th>
                        <th className="px-4 py-3 font-medium text-[#64748b]">{t('stats.stakeDetailType')}</th>
                        <th className="px-4 py-3 font-medium text-[#64748b]">{t('stats.stakeDetailAmount')}</th>
                        <th className="px-4 py-3 font-medium text-[#64748b]">{t('stats.stakeDetailLock')}</th>
                        <th className="px-4 py-3 font-medium text-[#64748b]">{t('stats.stakeDetailMaturity')}</th>
                        <th className="px-4 py-3 font-medium text-[#64748b]">{t('stats.stakeDetailBlock')}</th>
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
                          <td className="px-4 py-3 font-mono text-[13px] text-[#94a3b8]">
                            {formatMaturity(s.timestamp, s.lockPeriod)}
                          </td>
                          <td className="px-4 py-3">
                            {s.blockNumber != null && s.blockNumber > 0 ? (
                              <a
                                href={`${explorerUrl}/block/${s.blockNumber}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 font-mono text-[12px] text-[#00f5d4] hover:underline"
                                title={t('stats.stakeDetailViewBlock')}
                              >
                                #{s.blockNumber}
                                <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                              </a>
                            ) : (
                              <span className="text-[#64748b]">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile stacked cards (no horizontal scroll) */}
                <div className="md:hidden space-y-2 px-1 pb-2">
                  {sortedStakes.map((s) => (
                    <div key={s.stakeId} className="rounded-xl border border-[#00f5d420]/15 bg-[#0d0d14] p-3">
                      <div className="font-mono text-[12px] text-[#64748b]">
                        {new Date(s.timestamp * 1000).toLocaleString(locale)}
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-3">
                        <div className="text-[#f1f5f9] text-[13px] font-medium">
                          {s.isRWAStake ? t('stats.typeRWA') : t('stats.typeUSDT')}
                        </div>
                        <div className="font-mono text-[13px] font-semibold text-[#00f5d4]">
                          {parseFloat(formatUnits(BigInt(s.amount), 18)).toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {s.isRWAStake ? 'RWA' : 'USDT'}
                        </div>
                      </div>
                      <div className="mt-2 text-[12px] text-[#64748b]">
                        {t('stats.lock')}: {lockLabel(s.lockPeriod)}
                      </div>
                      <div className="mt-1 text-[12px] text-[#94a3b8]">
                        <span className="text-[#64748b]">{t('stats.stakeDetailMaturity')}: </span>
                        {formatMaturity(s.timestamp, s.lockPeriod)}
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[12px]">
                        <span className="text-[#64748b]">{t('stats.stakeDetailBlock')}: </span>
                        {s.blockNumber != null && s.blockNumber > 0 ? (
                          <a
                            href={`${explorerUrl}/block/${s.blockNumber}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-mono text-[#00f5d4]"
                          >
                            #{s.blockNumber}
                            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                          </a>
                        ) : (
                          <span className="text-[#64748b]">—</span>
                        )}
                      </div>
                      <div className="mt-1 text-[11px] text-[#64748b] font-mono truncate">
                        {s.stakeId}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    )}
    </>
  )
}
