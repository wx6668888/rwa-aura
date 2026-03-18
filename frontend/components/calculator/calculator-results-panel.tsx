'use client';

import { useEffect, useState } from 'react';
import { useLocale } from '@/components/locale-provider';
import { useTranslation } from '@/lib/i18n';
import { useCalculator } from './calculator-context';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function CalculatorResultsPanel() {
  const { locale } = useLocale();
  const { t } = useTranslation(locale);
  const { state, results } = useCalculator();
  const [displayReturn, setDisplayReturn] = useState(0);

  // Count-up animation
  useEffect(() => {
    const duration = 300;
    const steps = 20;
    const increment = results.totalReturn / steps;
    let current = 0;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= results.totalReturn) {
        setDisplayReturn(results.totalReturn);
        clearInterval(timer);
      } else {
        setDisplayReturn(current);
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [results.totalReturn]);

  return (
    <div className="bg-surface-1 border-2 border-plasma-cyan rounded-2xl p-6 shadow-plasma-glow backdrop-blur-xl">
      {/* Header */}
      <div className="text-center">
        <div className="text-[11px] uppercase tracking-widest text-text-secondary">
          {t('calc.projectedReturn')}
        </div>
        
        <div className="text-[56px] font-[900] text-plasma-cyan font-space-grotesk font-jetbrains mt-2">
          +${displayReturn.toFixed(2)}
        </div>
        
        <div className="inline-block bg-surface-2 border border-border-active rounded-full px-4 py-1.5 mt-2">
          <span className="text-plasma-cyan text-[16px] font-jetbrains font-bold">
            +{results.roi.toFixed(1)}% ROI
          </span>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-border-subtle my-5"></div>

      {/* Breakdown Table */}
      <div className="space-y-3">
        {/* Static Yield */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-plasma-cyan"></div>
            <span className="text-[13px] text-text-secondary">{t('calc.staticYield')}</span>
          </div>
          <span className="font-jetbrains text-plasma-cyan text-[14px] font-bold">
            +${results.staticYield.toFixed(2)}
          </span>
        </div>

        {/* Referral Income */}
        {state.referralEnabled && (
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-void-purple"></div>
              <span className="text-[13px] text-text-secondary">{t('calc.referralIncome')}</span>
              {!results.referralEligible && (
                <span className="text-[10px] px-2 py-0.5 rounded-full border border-white/10 bg-white/[0.03] text-white/60">
                  {t('calc.referralNeedLock30')}
                </span>
              )}
            </div>
            <span className="font-jetbrains text-void-purple text-[14px] font-bold">
              +${results.referralIncome.toFixed(2)}
            </span>
          </div>
        )}

        {/* Team Retained */}
        {state.referralEnabled && (
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400"></div>
              <span className="text-[13px] text-text-secondary">{t('calc.teamRetained')}</span>
            </div>
            <span className="font-jetbrains text-green-400 text-[14px] font-bold">
              ${results.teamRetained.toFixed(2)}
              <span className="text-[11px] text-green-400/70 ml-2">
                ({results.teamRetainedRate.toFixed(1)}%)
              </span>
            </span>
          </div>
        )}

        {/* Reinvest Bonus */}
        {state.reinvestEnabled && results.reinvestBonus > 0 && (
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
              <span className="text-[13px] text-text-secondary">{t('calc.reinvestBonus')}</span>
            </div>
            <span className="font-jetbrains text-yellow-400 text-[14px] font-bold">
              +${results.reinvestBonus.toFixed(2)}
            </span>
          </div>
        )}

        {/* Estimated Dividend */}
        {results.estimatedDividend > 0 && (
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-purple-400"></div>
              <span className="text-[13px] text-text-secondary">{t('calc.estimatedDividend')}</span>
            </div>
            <span className="font-jetbrains text-purple-400 text-[14px] font-bold">
              +${results.estimatedDividend.toFixed(2)}
            </span>
          </div>
        )}

        {/* Principal */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-gold-node"></div>
            <span className="text-[13px] text-text-secondary">{t('calc.totalStaked')}</span>
          </div>
          <span className="font-jetbrains text-text-primary text-[14px]">
            ${state.amount.toLocaleString()}
          </span>
        </div>

        {/* Divider */}
        <div className="h-px bg-border-subtle"></div>

        {/* Total Value */}
        <div className="flex justify-between items-center">
          <span className="text-[14px] font-bold text-text-primary">{t('calc.totalValue')}</span>
          <span className="font-jetbrains text-text-primary text-[18px] font-bold">
            ${results.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Asset Structure (not included in total) */}
      <div className="mt-5 bg-surface-2 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div className="text-[11px] uppercase tracking-widest text-text-secondary">
            {t('calc.assetStructure')}
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full border border-white/10 bg-white/[0.03] text-white/60">
            {t('calc.notIncludedInTotal')}
          </span>
        </div>
        <div className="mt-3 space-y-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400"></div>
              <span className="text-[13px] text-text-secondary">{t('calc.stRWAValue')}</span>
            </div>
            <span className="font-jetbrains text-green-400 text-[14px] font-bold">
              ${results.stRWAValue.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-400"></div>
              <span className="text-[13px] text-text-secondary">{t('calc.investmentShares')}</span>
            </div>
            <span className="font-jetbrains text-blue-400 text-[14px] font-bold">
              ${results.investmentShares.toFixed(2)}
            </span>
          </div>
        </div>
        <p className="mt-3 text-[11px] text-text-disabled leading-relaxed">
          {t('calc.assetStructureNote')}
        </p>
      </div>

      {/* Break-Even Time */}
      {results.breakEvenDays !== Infinity && results.breakEvenDays > 0 && (
        <div className="mt-5 bg-gradient-to-r from-plasma-cyan/10 to-void-purple/10 border border-plasma-cyan/30 rounded-xl p-4">
          <div className="text-[11px] uppercase tracking-widest text-plasma-cyan mb-2">
            {t('calc.breakEvenTime') || 'Break-Even Time'}
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-jetbrains text-[24px] font-bold text-plasma-cyan">
              {results.breakEvenDays}
            </span>
            <span className="text-sm text-text-secondary">
              {t('calc.days') || 'days'}
            </span>
          </div>
          {results.breakEvenDate && (
            <p className="mt-2 text-[11px] text-text-secondary">
              {t('calc.breakEvenDate', { 
                date: results.breakEvenDate.toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                })
              }) || `Estimated break-even date: ${results.breakEvenDate.toLocaleDateString()}`}
            </p>
          )}
          <p className="mt-1 text-[10px] text-text-disabled">
            {t('calc.breakEvenDesc') || 'Time to recover your principal investment based on current yield rate.'}
          </p>
        </div>
      )}

      {/* Daily Breakdown */}
      <div className="mt-5 bg-surface-2 rounded-xl p-4">
        <div className="text-[11px] uppercase tracking-widest text-text-secondary mb-3">
          {t('calc.dailyBreakdown')}
        </div>
        
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-surface-3 rounded-lg p-3 text-center">
            <div className="font-jetbrains text-[16px] text-plasma-cyan font-bold">
              ${results.dailyYield.toFixed(2)}
            </div>
            <div className="text-[10px] text-text-secondary mt-1">{t('calc.perDay')}</div>
          </div>
          
          <div className="bg-surface-3 rounded-lg p-3 text-center">
            <div className="font-jetbrains text-[16px] text-plasma-cyan font-bold">
              ${results.weeklyYield.toFixed(2)}
            </div>
            <div className="text-[10px] text-text-secondary mt-1">{t('calc.perWeek')}</div>
          </div>
          
          <div className="bg-surface-3 rounded-lg p-3 text-center">
            <div className="font-jetbrains text-[16px] text-plasma-cyan font-bold">
              ${results.monthlyYield.toFixed(2)}
            </div>
            <div className="text-[10px] text-text-secondary mt-1">{t('calc.perMonth')}</div>
          </div>
        </div>
      </div>

      {/* Comparison Rows */}
      {(state.comparisons.bank || state.comparisons.stable || state.comparisons.eth) && (
        <div className="mt-5 space-y-2">
          {/* RWA Protocol (always first) */}
          <div className="bg-surface-3 border border-border-active rounded-xl p-3 flex justify-between items-center">
            <span className="text-[13px] text-plasma-cyan font-bold">RWA Protocol</span>
            <span className="font-jetbrains text-[13px] text-plasma-cyan font-bold">
              ${results.totalReturn.toFixed(2)}
            </span>
          </div>

          {/* Bank Deposit */}
          {state.comparisons.bank && (
            <ComparisonRow
              name={t('calc.bankDeposit')}
              amount={state.amount}
              days={state.days}
              rate={0.03}
            />
          )}

          {/* Stable Farm */}
          {state.comparisons.stable && (
            <ComparisonRow
              name={t('calc.stableFarm')}
              amount={state.amount}
              days={state.days}
              rate={0.08}
            />
          )}

          {/* ETH Staking */}
          {state.comparisons.eth && (
            <ComparisonRow
              name={t('calc.ethStaking')}
              amount={state.amount}
              days={state.days}
              rate={0.04}
            />
          )}
        </div>
      )}

      {/* CTA Button */}
      <Link href="/stake">
        <button className="w-full h-14 bg-plasma-cyan text-void-black font-bold rounded-full mt-6 hover:brightness-110 hover:scale-[1.02] transition-all flex items-center justify-center gap-2">
          {t('calc.stakeCta')}
          <ArrowRight className="w-5 h-5" />
        </button>
      </Link>

      {/* Disclaimer */}
      <p className="text-[11px] text-text-disabled text-center mt-4 leading-relaxed">
        {t('calc.disclaimer')}
      </p>
    </div>
  );
}

function ComparisonRow({ name, amount, days, rate }: { name: string; amount: number; days: number; rate: number }) {
  const yearlyReturn = amount * rate;
  const dailyReturn = yearlyReturn / 365;
  const totalReturn = dailyReturn * days;
  
  return (
    <div className="bg-surface-2 rounded-xl p-3 flex justify-between items-center">
      <span className="text-[13px] text-text-secondary">{name}</span>
      <span className="font-jetbrains text-[13px] text-text-secondary">
        ${totalReturn.toFixed(2)}
      </span>
    </div>
  );
}
