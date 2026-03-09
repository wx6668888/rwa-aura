'use client';

import { useLocale } from '@/components/locale-provider';
import { useTranslation } from '@/lib/i18n';
import type { LuckyPoolType } from './pool-switcher';

interface OddsCalculatorProps {
  poolType: LuckyPoolType;
}

export default function OddsCalculator({ poolType }: OddsCalculatorProps) {
  const { locale } = useLocale();
  const { t } = useTranslation(locale);
  
  // Mock data - TODO: 从合约获取
  const myTickets = 5;
  const totalTickets = 2450;
  const firstPrizeOdds = (myTickets / totalTickets * 100).toFixed(2);
  const anyPrizeOdds = (myTickets / totalTickets * 100 * 5).toFixed(2); // 假设5倍机会中任意奖
  const visualPercentage = (myTickets / totalTickets * 100);

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
