'use client';

import { useState, useEffect } from 'react';
import { useLocale } from '@/components/locale-provider';
import { useTranslation } from '@/lib/i18n';
import { Info } from 'lucide-react';

interface SellTaxCalculatorProps {
  sellAmount: number;
  weightedHoldingDays?: number;
  currentStake?: number;
}

export function SellTaxCalculator({ 
  sellAmount, 
  weightedHoldingDays = 0,
  currentStake = 0 
}: SellTaxCalculatorProps) {
  const { locale } = useLocale();
  const { t } = useTranslation(locale);
  const [taxRate, setTaxRate] = useState(0);
  const [taxAmount, setTaxAmount] = useState(0);
  const [afterTax, setAfterTax] = useState(0);

  // 计算动态卖出税
  useEffect(() => {
    if (sellAmount <= 0) {
      setTaxRate(0);
      setTaxAmount(0);
      setAfterTax(0);
      return;
    }

    // 基础税率（基于加权平均持有期）
    // 如果没有持有期数据（weightedHoldingDays = 0），使用默认税率 20%
    let baseTaxRate = 20; // 默认20%（未质押或数据不可用）
    
    if (weightedHoldingDays > 0) {
      // 有持有期数据时，根据持有期计算税率
      if (weightedHoldingDays >= 180) {
        baseTaxRate = 10; // 180天+：10%
      } else if (weightedHoldingDays >= 90) {
        baseTaxRate = 20; // 90-180天：20%
      } else if (weightedHoldingDays >= 30) {
        baseTaxRate = 30; // 30-90天：30%
      } else {
        baseTaxRate = 50; // <30天：50%
      }
    }

    // 卖出比例调整（如果卖出金额 > 当前质押额度的50%，增加税率）
    let finalTaxRate = baseTaxRate;
    if (currentStake > 0) {
      const sellRatio = (sellAmount / currentStake) * 100;
      if (sellRatio > 50) {
        // 卖出金额超过质押额度的50%，税率增加
        const additionalTax = (sellRatio - 50) * 2; // 每1%增加2%税率
        finalTaxRate = baseTaxRate + additionalTax;
        
        // 最高税率限制为 80%
        if (finalTaxRate > 80) {
          finalTaxRate = 80;
        }
      }
    }

    const tax = (sellAmount * finalTaxRate) / 100;
    const after = sellAmount - tax;

    setTaxRate(finalTaxRate);
    setTaxAmount(tax);
    setAfterTax(after);
  }, [sellAmount, weightedHoldingDays, currentStake]);

  const getTaxRateColor = (rate: number) => {
    if (rate <= 20) return 'text-green-400';
    if (rate <= 40) return 'text-yellow-400';
    if (rate <= 60) return 'text-orange-400';
    return 'text-red-400';
  };

  return (
    <div className="bg-surface-2 border border-border-subtle rounded-xl p-4 animate-in slide-in-from-bottom-4">
      <div className="flex items-center gap-2 mb-3">
        <Info className="w-4 h-4 text-plasma-cyan" />
        <span className="text-[13px] font-semibold text-text-primary">
          {t('withdraw.sellTaxCalculator')}
        </span>
      </div>

      <div className="space-y-3">
        {/* Tax Rate Display */}
        <div className="flex justify-between items-center">
          <span className="text-[12px] text-text-secondary">
            {t('withdraw.taxRate')}
          </span>
          <span className={`font-jetbrains text-[14px] font-bold ${getTaxRateColor(taxRate)}`}>
            {taxRate.toFixed(1)}%
          </span>
        </div>

        {/* Holding Period Info */}
        {weightedHoldingDays > 0 ? (
          <div className="flex justify-between items-center">
            <span className="text-[12px] text-text-secondary">
              {t('withdraw.weightedHoldingDays')}
            </span>
            <span className="font-jetbrains text-[13px] text-text-primary">
              {Math.floor(weightedHoldingDays)} {t('withdraw.days')}
            </span>
          </div>
        ) : (
          <div className="flex justify-between items-center">
            <span className="text-[12px] text-text-secondary">
              {t('withdraw.holdingPeriod')}
            </span>
            <span className="font-jetbrains text-[13px] text-text-disabled">
              {t('withdraw.estimated')}
            </span>
          </div>
        )}

        {/* Sell Amount */}
        <div className="flex justify-between items-center">
          <span className="text-[12px] text-text-secondary">
            {t('withdraw.sellAmount')}
          </span>
          <span className="font-jetbrains text-[13px] text-text-primary">
            {sellAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RWA
          </span>
        </div>

        {/* Tax Amount */}
        <div className="flex justify-between items-center pt-2 border-t border-border-subtle">
          <span className="text-[12px] text-text-secondary">
            {t('withdraw.taxAmount')}
          </span>
          <span className="font-jetbrains text-[14px] font-bold text-red-400">
            -{taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RWA
          </span>
        </div>

        {/* After Tax */}
        <div className="flex justify-between items-center">
          <span className="text-[12px] text-text-secondary">
            {t('withdraw.afterTax')}
          </span>
          <span className="font-jetbrains text-[14px] font-bold text-green-400">
            {afterTax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RWA
          </span>
        </div>

        {/* Tax Breakdown */}
        <div className="mt-3 pt-3 border-t border-border-subtle">
          <p className="text-[11px] text-text-disabled leading-relaxed">
            {t('withdraw.taxBreakdown')}
          </p>
        </div>
      </div>
    </div>
  );
}
