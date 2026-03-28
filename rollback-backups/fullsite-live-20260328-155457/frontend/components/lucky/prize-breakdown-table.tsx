'use client';

import { useLocale } from '@/components/locale-provider';
import { useTranslation } from '@/lib/i18n';
import { useLottery } from '@/hooks/useLottery';

const PRIZE_TIERS = [
  { rank: 1, matchKey: 'lucky.match6', percentage: 48 },
  { rank: 2, matchKey: 'lucky.match5', percentage: 24 },
  { rank: 3, matchKey: 'lucky.match4', percentage: 14 },
  { rank: 4, matchKey: 'lucky.match3', percentage: 9 },
];

function PoolBreakdownBlock({
  title,
  titleIcon,
  poolAmount,
  colorClass,
  t,
}: {
  title: string;
  titleIcon: string;
  poolAmount: number;
  colorClass: string;
  t: (k: string) => string;
}) {
  const projectAmount = poolAmount * 0.05;
  const forWinners = poolAmount * 0.95;
  return (
    <div className="border border-border-subtle rounded-2xl p-6 backdrop-blur-xl bg-surface-1">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-[20px]">{titleIcon}</span>
        <h3 className={`text-[15px] font-700 ${colorClass}`}>{title}</h3>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between p-3 rounded-xl bg-surface-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-surface-3 flex items-center justify-center text-[13px] font-700 text-text-secondary">🏢</div>
            <div>
              <div className="text-[13px] text-text-primary font-600">{t('lucky.projectShare')}</div>
              <div className="text-[11px] text-text-disabled">5% {t('lucky.ofPool')}</div>
            </div>
          </div>
          <div className="text-[14px] font-jetbrains font-700 text-text-secondary">
            {Number(projectAmount.toFixed(0)).toLocaleString()} RWA
          </div>
        </div>
        {PRIZE_TIERS.map((p) => (
          <div key={p.rank} className="flex items-center justify-between p-3 rounded-xl bg-surface-2 hover:bg-surface-3 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-surface-3 flex items-center justify-center text-[13px] font-700 text-text-secondary">{p.rank}</div>
              <div>
                <div className="text-[13px] text-text-primary font-600">{t(p.matchKey)}</div>
                <div className="text-[11px] text-text-disabled">{p.percentage}% {t('lucky.ofPool')}</div>
              </div>
            </div>
            <div className={`text-[14px] font-jetbrains font-700 ${colorClass}`}>
              {Number((forWinners * p.percentage / 100).toFixed(0)).toLocaleString()} RWA
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PrizeBreakdownTable() {
  const { locale } = useLocale();
  const { t } = useTranslation(locale);
  const { realtimePool, weeklyPool, monthlyPool, annualPool } = useLottery();
  
  const realtimeAmt = parseFloat(realtimePool?.prizePool || '0');
  const weeklyAmt = parseFloat(weeklyPool?.prizePool || '0');
  const monthlyAmt = parseFloat(monthlyPool?.prizePool || '0');
  const annualAmt = parseFloat(annualPool?.prizePool || '0');

  return (
    <div className="mt-8">
      <h2 className="text-[18px] font-700 text-text-primary mb-4">
        {t('lucky.prizeBreakdown')}
      </h2>
      <p className="text-[13px] text-text-secondary mb-4">
        {t('lucky.projectShareDesc')}
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <PoolBreakdownBlock title={t('lucky.realtimePool')} titleIcon="⚡" poolAmount={realtimeAmt} colorClass="text-plasma-cyan" t={t} />
        <PoolBreakdownBlock title={t('lucky.weeklyPool')} titleIcon="🎯" poolAmount={weeklyAmt} colorClass="text-plasma-cyan" t={t} />
        <PoolBreakdownBlock title={t('lucky.monthlyPool')} titleIcon="🏆" poolAmount={monthlyAmt} colorClass="text-void-purple" t={t} />
        <PoolBreakdownBlock title={t('lucky.annualPool')} titleIcon="🌟" poolAmount={annualAmt} colorClass="text-gold-node" t={t} />
      </div>
    </div>
  );
}
