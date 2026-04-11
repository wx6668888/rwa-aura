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
        className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center p-0 sm:p-4"
        onClick={() => setShowStakeDetail(false)}
      >
        <div
          className="relative z-[10000] flex w-full max-w-[420px] flex-col self-end overflow-hidden rounded-t-3xl border border-[#00f5d420] bg-gradient-to-b from-[#0d0d14] via-[#0a0a10] to-[#0d0d14] shadow-[0_-12px_60px_rgba(0,0,0,0.55),0_0_0_1px_rgba(0,245,212,0.06)_inset] transition-[height,max-height] duration-300 ease-out sm:self-auto sm:rounded-3xl sm:h-[min(75dvh,75vh)] sm:max-h-[min(75dvh,75vh)]"
          style={{ height: 'min(75dvh,75vh)', maxHeight: 'min(75dvh,75vh)' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="relative shrink-0 border-b border-[#00f5d420]/15 px-5 py-4">
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#00f5d4]/35 to-transparent"
              aria-hidden
            />
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <div className="mt-0.5 h-8 w-0.5 shrink-0 rounded-full bg-gradient-to-b from-plasma-cyan to-plasma-cyan/20" aria-hidden />
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-plasma-cyan/75">Staking</div>
                  <h3 className="mt-0.5 text-[17px] font-bold tracking-tight text-text-primary">{t('stats.stakeDetailTitle')}</h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowStakeDetail(false)}
                className="shrink-0 rounded-full p-2 text-text-secondary transition-colors hover:bg-white/[0.06] hover:text-text-primary"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto bg-[#05050a]/35 p-4 [overscroll-behavior:contain]">
            {stakesLoading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#00f5d4]/30 border-t-[#00f5d4]" />
                <p className="text-[13px] text-text-secondary">{t('fundActivity.loading')}</p>
              </div>
            ) : sortedStakes.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#00f5d420]/20 bg-[#0d0d14]/35 px-4 py-8 text-center text-[13px] text-text-secondary">
                {t('fundActivity.noRecords')}
              </div>
            ) : (
              <div className="space-y-2">
                {sortedStakes.map((s) => (
                  <div
                    key={s.stakeId}
                    className="rounded-2xl border border-[#00f5d420]/12 bg-gradient-to-r from-[#0d0d14]/90 to-[#13131e]/60 px-4 py-3 transition-colors hover:border-[#00f5d420]/25 hover:bg-[#13131e]/80"
                  >
                    <div className="font-mono text-[12px] text-text-secondary">
                      {new Date(s.timestamp * 1000).toLocaleString(locale)}
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <span className="rounded-full bg-plasma-cyan/15 px-2.5 py-0.5 text-[12px] font-semibold text-plasma-cyan ring-1 ring-plasma-cyan/25">
                        {s.isRWAStake ? t('stats.typeRWA') : t('stats.typeUSDT')}
                      </span>
                      <div className="font-mono text-[13px] font-semibold tabular-nums text-plasma-cyan">
                        {parseFloat(formatUnits(BigInt(s.amount), 18)).toLocaleString(locale, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{' '}
                        {s.isRWAStake ? 'RWA' : 'USDT'}
                      </div>
                    </div>
                    <div className="mt-2 space-y-1 text-[12px]">
                      <div className="text-text-secondary">
                        <span className="text-text-secondary/80">{t('stats.lock')}: </span>
                        <span className="text-text-primary">{lockLabel(s.lockPeriod)}</span>
                      </div>
                      <div className="text-text-secondary">
                        <span className="text-text-secondary/80">{t('stats.stakeDetailMaturity')}: </span>
                        <span className="font-mono text-[13px] text-[#94a3b8]">{formatMaturity(s.timestamp, s.lockPeriod)}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-text-secondary/80">{t('stats.stakeDetailBlock')}: </span>
                        {s.blockNumber != null && s.blockNumber > 0 ? (
                          <a
                            href={`${explorerUrl}/block/${s.blockNumber}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-mono text-[12px] text-plasma-cyan hover:underline"
                            title={t('stats.stakeDetailViewBlock')}
                          >
                            #{s.blockNumber}
                            <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                          </a>
                        ) : (
                          <span className="text-text-secondary">—</span>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 truncate font-mono text-[10px] text-text-secondary/70" title={s.stakeId}>
                      ID: {s.stakeId}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )}
    </>
  )
}
