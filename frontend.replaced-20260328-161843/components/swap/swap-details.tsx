'use client';

import { useState } from 'react';
import { Info } from 'lucide-react';
import { useLocale } from '@/components/locale-provider';
import { useTranslation } from '@/lib/i18n';
import type { SwapQuote } from '@/hooks/useSwap';

interface SwapDetailsProps {
  fromToken: string;
  toToken: string;
  fromAmount: string;
  quote: SwapQuote;
  slippage: number;
  onSlippageChange?: (slippage: number) => void;
}

export default function SwapDetails({ fromToken, toToken, fromAmount, quote, slippage, onSlippageChange }: SwapDetailsProps) {
  const { locale } = useLocale();
  const { t } = useTranslation(locale);
  const [isEditingSlippage, setIsEditingSlippage] = useState(false);
  const [customSlippage, setCustomSlippage] = useState(slippage.toString());

  const handleSlippageChange = (value: number) => {
    if (onSlippageChange) {
      onSlippageChange(value);
    }
    setIsEditingSlippage(false);
  };

  const presetSlippages = [0.1, 0.5, 1.0];

  return (
    <div className="mt-3 bg-surface-2 rounded-xl p-4 space-y-3 animate-in slide-in-from-top">
      {/* Rate - 使用真实报价 */}
      <div className="flex justify-between items-center">
        <span className="text-[12px] text-text-secondary">{t('swap.rate')}</span>
        <span className="text-[12px] font-jetbrains text-text-primary">
          1 {fromToken} = {quote.executionPrice} {toToken}
        </span>
      </div>

      {/* Price Impact - 使用真实数据 */}
      <div className="flex justify-between items-center">
        <span className="text-[12px] text-text-secondary">{t('swap.priceImpact')}</span>
        <span className={`text-[12px] font-jetbrains ${
          quote.priceImpact < 1 ? 'text-success' : quote.priceImpact < 3 ? 'text-warning' : 'text-danger'
        }`}>
          {quote.priceImpact < 0.1 ? '< 0.1%' : `${quote.priceImpact.toFixed(2)}%`}
        </span>
      </div>

      {/* Slippage */}
      <div className="flex justify-between items-center">
        <span className="text-[12px] text-text-secondary">{t('swap.slippage')}</span>
        <div className="flex items-center gap-2">
          {!isEditingSlippage ? (
            <>
              <span className="text-[12px] text-text-secondary">{slippage}%</span>
              <button 
                onClick={() => setIsEditingSlippage(true)}
                className="text-[10px] text-plasma-cyan hover:underline"
              >
                {t('swap.edit')}
              </button>
            </>
          ) : (
            <div className="flex items-center gap-1">
              {presetSlippages.map((preset) => (
                <button
                  key={preset}
                  onClick={() => handleSlippageChange(preset)}
                  className={`text-[10px] px-2 py-1 rounded ${
                    slippage === preset
                      ? 'bg-plasma-cyan text-void-black'
                      : 'bg-surface-3 text-text-secondary hover:bg-surface-4'
                  }`}
                >
                  {preset}%
                </button>
              ))}
              <input
                type="number"
                value={customSlippage}
                onChange={(e) => setCustomSlippage(e.target.value)}
                onBlur={() => {
                  const value = parseFloat(customSlippage);
                  if (!isNaN(value) && value > 0 && value <= 50) {
                    handleSlippageChange(value);
                  } else {
                    setCustomSlippage(slippage.toString());
                    setIsEditingSlippage(false);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const value = parseFloat(customSlippage);
                    if (!isNaN(value) && value > 0 && value <= 50) {
                      handleSlippageChange(value);
                    }
                  } else if (e.key === 'Escape') {
                    setCustomSlippage(slippage.toString());
                    setIsEditingSlippage(false);
                  }
                }}
                className="w-12 text-[10px] px-1 py-1 bg-surface-3 border border-border-subtle rounded text-center font-jetbrains text-text-primary focus:outline-none focus:border-plasma-cyan"
                placeholder={t('swap.custom')}
              />
              <span className="text-[10px] text-text-secondary">%</span>
            </div>
          )}
        </div>
      </div>

      {/* Minimum Received - 使用真实数据 */}
      <div className="flex justify-between items-center">
        <span className="text-[12px] text-text-secondary">{t('swap.minReceived')}</span>
        <span className="text-[12px] font-jetbrains text-text-primary">
          {parseFloat(quote.minOutputAmount).toFixed(4)} {toToken}
        </span>
      </div>

      {/* LP Fee */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-1">
          <span className="text-[12px] text-text-secondary">{t('swap.lpFee')}</span>
          <Info className="w-3 h-3 text-text-disabled" />
        </div>
        <span className="text-[12px] text-text-secondary">0.25%</span>
      </div>

      {/* Sell Tax Warning - Removed */}

      {/* Route */}
      <div className="pt-2 border-t border-border-subtle">
        <div className="text-[11px] text-text-disabled mb-1">{t('swap.route')}</div>
        <div className="text-[11px] font-jetbrains text-text-disabled">
          {fromToken} → {fromToken}/{toToken} Pool → {toToken}
        </div>
        <div className="text-[10px] text-text-disabled mt-1">
          {t('swap.poweredBy')}
        </div>
      </div>
    </div>
  );
}
