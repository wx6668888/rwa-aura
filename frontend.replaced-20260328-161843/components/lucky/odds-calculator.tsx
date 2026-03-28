'use client';

import { useLocale } from '@/components/locale-provider';
import { useTranslation } from '@/lib/i18n';
import type { LuckyPoolType } from './pool-switcher';
import { useEffect, useMemo, useState } from 'react'
import { useAccount } from 'wagmi'
import { useLottery } from '@/hooks/useLottery'

interface OddsCalculatorProps {
  poolType: LuckyPoolType;
}

const POOL_TO_NUM: Record<LuckyPoolType, 0 | 1 | 2 | 3> = { weekly: 0, monthly: 1, realtime: 2, annual: 3 };

export default function OddsCalculator({ poolType }: OddsCalculatorProps) {
  const { locale } = useLocale();
  const { t } = useTranslation(locale);
  const { isConnected } = useAccount()
  const { weeklyPool, monthlyPool, realtimePool, annualPool, getUserTicketsDetails } = useLottery()
  
  const currentPool = poolType === 'weekly' ? weeklyPool : poolType === 'monthly' ? monthlyPool : poolType === 'realtime' ? realtimePool : annualPool;
  const totalTickets = Math.max(0, Number(currentPool?.ticketsSold ?? 0))

  const [myTickets, setMyTickets] = useState(0)

  useEffect(() => {
    let cancelled = false
    async function run() {
      if (!isConnected) {
        setMyTickets(0)
        return
      }
      try {
        const details = await getUserTicketsDetails()
        if (cancelled) return
        const poolStr = poolType
        setMyTickets(details.filter((t) => t.poolType === poolStr).length)
      } catch {
        if (!cancelled) setMyTickets(0)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [isConnected, getUserTicketsDetails, poolType])

  const { firstPrizeOdds, anyPrizeOdds, visualPercentage } = useMemo(() => {
    if (!totalTickets || totalTickets <= 0 || myTickets <= 0) {
      return { firstPrizeOdds: '0.00', anyPrizeOdds: '0.00', visualPercentage: 0 }
    }
    const fp = (myTickets / totalTickets) * 100
    // 近似：任意奖 = 4 个奖档的概率上限（不承诺精确概率）
    const ap = Math.min(100, fp * 4)
    return {
      firstPrizeOdds: fp.toFixed(2),
      anyPrizeOdds: ap.toFixed(2),
      visualPercentage: fp,
    }
  }, [myTickets, totalTickets])

  return (
    <div className="border border-border-subtle rounded-2xl p-5 backdrop-blur-xl bg-surface-1">
      {/* Header */}
      <h3 className="text-[13px] font-700 text-text-primary">
        {t('lucky.oddsCalc')}
      </h3>

      {/* Stats */}
      <div className="mt-3 space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-[12px] text-text-secondary">
            {t('lucky.yourTickets')}
          </span>
          <span className="text-[14px] font-jetbrains text-plasma-cyan font-700">
            {myTickets} {t('lucky.tickets')}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-[12px] text-text-secondary">
            {t('lucky.totalTicketsSold')}
          </span>
          <span className="text-[14px] font-jetbrains text-text-secondary">
            {totalTickets.toLocaleString()} {t('lucky.tickets')}
          </span>
        </div>
        
        <div className="h-px bg-border-subtle" />
        
        <div className="flex justify-between items-center">
          <span className="text-[12px] text-text-secondary">
            {t('lucky.firstPrizeOdds')}
          </span>
          <span className="text-[14px] font-jetbrains text-gold-node font-700">
            {firstPrizeOdds}%
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-[12px] text-text-secondary">
            {t('lucky.anyPrizeOdds')}
          </span>
          <span className="text-[14px] font-jetbrains text-plasma-cyan font-700">
            {t('lucky.about')} {anyPrizeOdds}%
          </span>
        </div>
      </div>

      {/* Visual Probability Bar */}
      <div className="mt-3">
        <div className="h-2 bg-surface-3 rounded-full overflow-hidden">
          <div 
            className="h-full bg-plasma-cyan"
            style={{ width: `${Math.max(visualPercentage, 2)}%` }}
          />
        </div>
        <div className="text-[11px] text-text-disabled mt-1 text-center">
          {t('lucky.yourTicketsIn').replace('{total}', totalTickets.toString()).replace('{yours}', myTickets.toString())}
        </div>
      </div>

      {/* Info Box */}
      <div className="mt-3 bg-surface-2 rounded-lg p-3">
        <div className="text-[11px] text-text-secondary leading-relaxed">
          💡 {t('lucky.oddsInfo')}
        </div>
      </div>
    </div>
  );
}
