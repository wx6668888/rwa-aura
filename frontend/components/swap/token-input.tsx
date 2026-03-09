'use client';

import { ChevronDown } from 'lucide-react';
import { useLocale } from '@/components/locale-provider';
import { useTranslation } from '@/lib/i18n';

interface TokenInputProps {
  label: string;
  token: string;
  amount: string;
  onAmountChange: (value: string) => void;
  onTokenChange: (token: string) => void;
  balance: string;
  showMax?: boolean;
  isOutput?: boolean;
}

export default function TokenInput({
  label,
  token,
  amount,
  onAmountChange,
  onTokenChange,
  balance,
  showMax = false,
  isOutput = false,
}: TokenInputProps) {
  const { locale } = useLocale();
  const { t } = useTranslation(locale);

  const handleMaxClick = () => {
    onAmountChange(balance.replace(/,/g, ''));
  };

  const handleHalfClick = () => {
    const half = parseFloat(balance.replace(/,/g, '')) / 2;
    onAmountChange(half.toString());
  };

  return (
    <div>
      {/* Label Row - 货币标签直接跟在后面 */}
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[12px] text-text-secondary">{label}</span>
          <span className="text-[13px] font-bold text-text-primary">{token}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[12px] text-text-secondary font-jetbrains">
            {t('swap.balance')}: {balance}
          </span>
          {showMax && (
            <button
              onClick={handleMaxClick}
              className="text-[10px] px-2 py-0.5 rounded-full border border-border-subtle text-text-secondary hover:text-plasma-cyan hover:border-plasma-cyan transition-colors"
            >
              {t('swap.max')}
            </button>
          )}
        </div>
      </div>

      {/* Input Container - 减小高度避免边框穿过底部文字 */}
      <div className="relative rounded-xl p-4 border-2 border-plasma-cyan bg-surface-1">
        {/* Top Row */}
        <div className="flex justify-between items-center">
          {/* Amount Input */}
          <input
            type="text"
            value={amount}
            onChange={(e) => onAmountChange(e.target.value)}
            placeholder="0.00"
            disabled={isOutput}
            className={`flex-1 bg-transparent border-none outline-none text-[36px] font-jetbrains ${
              isOutput ? 'text-plasma-cyan' : 'text-text-primary'
            } placeholder:text-text-disabled`}
          />

          {/* Token Icon Removed */}
        </div>

        {/* Bottom Row - 移到边框外 */}
      </div>
      
      {/* 价格和操作按钮 - 放在边框外避免被穿过 */}
      <div className="mt-2 flex justify-between items-center px-2">
          <span className="text-[13px] text-text-secondary font-jetbrains">
            ≈ $0.00
          </span>
          {showMax && (
            <button
              onClick={handleHalfClick}
              className="text-[10px] text-text-secondary hover:text-plasma-cyan transition-colors"
            >
              {t('swap.half')}
            </button>
          )}
      </div>
    </div>
  );
}
