'use client';

import { Calendar, Zap, Trophy } from 'lucide-react';
import { useLocale } from '@/components/locale-provider';
import { useTranslation } from '@/lib/i18n';
import { useLottery } from '@/hooks/useLottery';

export type LuckyPoolType = 'weekly' | 'monthly' | 'realtime' | 'annual';

interface PoolSwitcherProps {
  activePool: LuckyPoolType;
  onPoolChange: (pool: LuckyPoolType) => void;
}

export default function PoolSwitcher({ activePool, onPoolChange }: PoolSwitcherProps) {
  const { locale } = useLocale();
  const { t } = useTranslation(locale);
  const { weeklyPool, monthlyPool, realtimePool, annualPool } = useLottery();

  const pools: { type: LuckyPoolType; label: string; amount: string; ticketPrice: string; icon: typeof Calendar }[] = [
    { type: 'realtime', label: t('lucky.realtime'), amount: realtimePool?.prizePool ?? '0', ticketPrice: '2 RWA', icon: Zap },
    { type: 'weekly', label: t('lucky.weekly'), amount: weeklyPool?.prizePool ?? '0', ticketPrice: '10 RWA', icon: Calendar },
    { type: 'monthly', label: t('lucky.monthly'), amount: monthlyPool?.prizePool ?? '0', ticketPrice: '50 RWA', icon: Calendar },
    { type: 'annual', label: t('lucky.annual'), amount: annualPool?.prizePool ?? '0', ticketPrice: '200 RWA', icon: Trophy },
  ];

  const Icon = (p: { pool: typeof pools[0]; isActive: boolean }) => {
    const P = p.pool.icon;
    return <P className={`w-5 h-5 mx-auto ${p.isActive ? 'text-plasma-cyan' : 'text-text-secondary'}`} />;
  };

  return (
    <div className="mt-8 flex justify-center">
      <div className="w-full max-w-4xl flex flex-wrap gap-3 justify-center">
        {pools.map((pool) => {
          const isActive = activePool === pool.type;
          return (
            <button
              key={pool.type}
              onClick={() => onPoolChange(pool.type)}
              className={`
                min-w-[140px] flex-1 p-4 rounded-2xl text-center cursor-pointer transition-all duration-200
                ${isActive ? 'border-2 border-plasma-cyan bg-surface-1 shadow-plasma-glow' : 'border border-border-subtle bg-surface-1 hover:border-border-active'}
              `}
            >
              <Icon pool={pool} isActive={isActive} />
              <div className={`text-[14px] font-700 mt-1.5 ${isActive ? 'text-text-primary' : 'text-text-secondary'}`}>
                {pool.label}
              </div>
              <div className={`text-[18px] font-jetbrains font-700 mt-1 ${isActive ? 'text-gold-node' : 'text-text-disabled'}`}>
                {Number(pool.amount).toLocaleString()} RWA
              </div>
              <div className="text-[11px] text-text-secondary mt-0.5">
                {pool.ticketPrice} / {t('lucky.perTicket')}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
