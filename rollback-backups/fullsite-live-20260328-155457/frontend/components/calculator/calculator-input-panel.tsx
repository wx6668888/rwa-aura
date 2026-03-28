'use client';

import { useState, useEffect, useRef } from 'react';
import { useLocale } from '@/components/locale-provider';
import { useTranslation } from '@/lib/i18n';
import { useCalculator } from './calculator-context';
import type { NodeLevel } from './calculator-context';
import { NODE_LEVELS } from '@/lib/node-levels';

export default function CalculatorInputPanel() {
  const { locale } = useLocale();
  const { t } = useTranslation(locale);
  const { state, updateAmount, updateDays, updateLockPeriod, updateNodeLevel, toggleReferral, updateDirectRefs, updateAvgStake, toggleReinvest, updateReinvestCount, toggleComparison } = useCalculator();
  
  const [amountInput, setAmountInput] = useState(state.amount.toLocaleString());

  /** 直推人数：用字符串受控，避免 number 输入在空串时被强制成 0 导致删不掉、打出 010 */
  const [directRefsInput, setDirectRefsInput] = useState('')
  const wasReferralEnabled = useRef(state.referralEnabled)
  useEffect(() => {
    if (state.referralEnabled && !wasReferralEnabled.current) {
      setDirectRefsInput(state.directRefs > 0 ? String(state.directRefs) : '')
    }
    wasReferralEnabled.current = state.referralEnabled
  }, [state.referralEnabled])

  /** 复投次数：同上 */
  const [reinvestCountInput, setReinvestCountInput] = useState('')
  const wasReinvestEnabled = useRef(state.reinvestEnabled)
  useEffect(() => {
    if (state.reinvestEnabled && !wasReinvestEnabled.current) {
      setReinvestCountInput(state.reinvestCount > 0 ? String(state.reinvestCount) : '')
    }
    wasReinvestEnabled.current = state.reinvestEnabled
  }, [state.reinvestEnabled])

  /** 仅数字串去掉前导 0，避免显示 010；单独一个 0 视为空（与 blur 时写回 0 一致） */
  const normalizeUnsignedDigits = (raw: string) => {
    if (raw === '') return '';
    const stripped = raw.replace(/^0+/, '');
    return stripped;
  };

  const handleAmountChange = (value: string) => {
    const numValue = Number(value.replace(/,/g, ''));
    if (!isNaN(numValue) && numValue >= 100 && numValue <= 10000000) {
      updateAmount(numValue);
      setAmountInput(numValue.toLocaleString());
    }
  };

  const quickAmounts = [100, 500, 1000, 5000, 10000, 50000];
  const quickPeriods = [
    { days: 30, label: t('calc.day30') },
    { days: 60, label: t('calc.day60') },
    { days: 90, label: t('calc.day90') },
    { days: 180, label: t('calc.day180') },
    { days: 365, label: t('calc.day365') },
  ];

  // 从全局节点配置派生出可选等级和对应奖励比例
  const nodeLevels: { level: NodeLevel; rate: string; color: string }[] = NODE_LEVELS.map((cfg) => ({
    level: cfg.code as NodeLevel,
    rate: `${cfg.rewardPercentage}%`,
    // 使用统一的文字颜色，当前选中状态会单独高亮
    color: 'text-text-secondary',
  }));

  return (
    <div className="bg-surface-1 border border-border-subtle rounded-2xl p-6 backdrop-blur-xl">
      {/* BLOCK 1 - Stake Amount */}
      <div>
        <label className="block text-[12px] text-text-secondary tracking-wider uppercase">
          {t('calc.amountLabel')}
        </label>
        
        <div className="mt-2 h-[72px] bg-surface-1 border border-border-active rounded-xl flex items-center px-3 sm:px-5 gap-2 sm:gap-4 overflow-hidden">
          <input
            type="text"
            value={amountInput}
            onChange={(e) => setAmountInput(e.target.value)}
            onBlur={(e) => handleAmountChange(e.target.value)}
            placeholder="1,000"
            className="flex-1 min-w-0 bg-transparent border-none outline-none text-[28px] sm:text-[36px] text-text-primary font-jetbrains placeholder:text-text-disabled"
          />
          <div className="bg-surface-2 border border-border-subtle rounded-full px-2 sm:px-3 py-1.5 flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            <div className="w-2 h-2 rounded-full bg-plasma-cyan"></div>
            <span className="text-[12px] sm:text-[14px] font-semibold">USDT</span>
          </div>
        </div>

        <div className="mt-3 flex gap-2 flex-wrap">
          {quickAmounts.map((amount) => (
            <button
              key={amount}
              onClick={() => handleAmountChange(amount.toString())}
              className={`bg-surface-2 border text-[13px] px-4 py-2 rounded-full transition-all ${
                state.amount === amount
                  ? 'border-plasma-cyan text-plasma-cyan bg-surface-3'
                  : 'border-border-subtle text-text-secondary hover:border-plasma-cyan hover:text-plasma-cyan'
              }`}
            >
              ${amount.toLocaleString()}
            </button>
          ))}
        </div>
      </div>

      {/* BLOCK 2 - Lock Period */}
      <div className="mt-6">
        <label className="block text-[12px] text-text-secondary tracking-wider uppercase">
          {t('calc.lockPeriodLabel')}
        </label>

        <div className="mt-3 flex gap-2 flex-wrap">
          {[
            { period: 'flexible' as const, label: t('calc.lockFlexible'), multiplier: '1.0x', days: null },
            { period: '30' as const, label: t('calc.lock30Days'), multiplier: '1.3x', days: 30 },
            { period: '90' as const, label: t('calc.lock90Days'), multiplier: '1.6x', days: 90 },
            { period: '180' as const, label: t('calc.lock180Days'), multiplier: '2.0x', days: 180 },
            { period: '365' as const, label: t('calc.lock365Days'), multiplier: '2.5x', days: 365 },
          ].map(({ period, label, multiplier, days }) => (
            <button
              key={period}
              onClick={() => {
                updateLockPeriod(period);
                if (days !== null) {
                  updateDays(days);
                }
              }}
              className={`bg-surface-2 border text-[13px] px-4 py-2 rounded-full transition-all ${
                state.lockPeriod === period
                  ? 'border-plasma-cyan text-plasma-cyan bg-surface-3'
                  : 'border-border-subtle text-text-secondary hover:border-plasma-cyan hover:text-plasma-cyan'
              }`}
            >
              <div className="flex items-center gap-2">
                <span>{label}</span>
                <span className="text-[11px] opacity-70">({multiplier})</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* BLOCK 2.5 - Holding Period (Days) - Only show when flexible lock period is selected */}
      {state.lockPeriod === 'flexible' && (
        <div className="mt-6">
          <label className="block text-[12px] text-text-secondary tracking-wider uppercase">
            {t('calc.periodLabel')}
          </label>

          <div className="mt-3 relative">
            <input
              type="range"
              min="1"
              max="365"
              value={state.days}
              onChange={(e) => updateDays(Number(e.target.value))}
              className="w-full h-1.5 bg-surface-3 rounded-full appearance-none cursor-pointer slider"
              style={{
                background: `linear-gradient(to right, #00f5d4 0%, #00f5d4 ${(state.days / 365) * 100}%, #1a1a2e ${(state.days / 365) * 100}%, #1a1a2e 100%)`
              }}
            />
            <div 
              className="absolute top-[-40px] bg-surface-2 border border-border-active rounded-full px-3 py-1 transform -translate-x-1/2"
              style={{ left: `${(state.days / 365) * 100}%` }}
            >
              <span className="font-jetbrains text-[14px] text-plasma-cyan font-bold">{state.days}</span>
              <span className="text-[12px] text-text-secondary ml-1">{t('calc.days')}</span>
            </div>
          </div>

          <div className="mt-8 flex gap-2 flex-wrap">
            {quickPeriods.map(({ days, label }) => (
              <button
                key={days}
                onClick={() => updateDays(days)}
                className={`bg-surface-2 border text-[13px] px-4 py-2 rounded-full transition-all ${
                  state.days === days
                    ? 'border-plasma-cyan text-plasma-cyan'
                    : 'border-border-subtle text-text-secondary hover:border-plasma-cyan hover:text-plasma-cyan'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* BLOCK 3 - Node Level */}
      <div className="mt-6">
        <label className="block text-[12px] text-text-secondary tracking-wider uppercase">
          {t('calc.levelLabel')}
        </label>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-2 -mx-2 px-2 sm:mx-0 sm:px-0">
          {nodeLevels.map(({ level, rate, color }) => (
            <button
              key={level}
              onClick={() => updateNodeLevel(level)}
              className={`flex-shrink-0 min-w-[80px] bg-surface-2 rounded-xl p-3 text-center cursor-pointer transition-all ${
                state.nodeLevel === level
                  ? 'border-2 border-plasma-cyan bg-surface-3 shadow-plasma-glow'
                  : 'border border-border-subtle hover:border-border-active'
              }`}
            >
              <div className={`text-[13px] font-bold ${state.nodeLevel === level ? 'text-plasma-cyan' : color}`}>
                {level}
              </div>
              <div className="text-[11px] text-text-secondary mt-1">{rate}</div>
            </button>
          ))}
        </div>
      </div>

      {/* BLOCK 4 - Referral Simulation */}
      <div className="mt-6">
        <div className="flex justify-between items-center">
          <label className="text-[12px] text-text-secondary tracking-wider uppercase">
            {t('calc.referralLabel')}
          </label>
          <button
            onClick={toggleReferral}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              state.referralEnabled ? 'bg-plasma-cyan' : 'bg-surface-3'
            }`}
          >
            <div
              className={`absolute top-1 w-4 h-4 bg-void-black rounded-full transition-transform ${
                state.referralEnabled ? 'translate-x-7' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {state.referralEnabled && (
          <div className="mt-3 grid grid-cols-2 gap-4 animate-in slide-in-from-top">
            <div>
              <label className="block text-[11px] text-text-secondary mb-1">
                {t('calc.directRefs')}
              </label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder=""
                value={directRefsInput}
                onChange={(e) => {
                  const digitsOnly = e.target.value.replace(/\D/g, '')
                  const raw = normalizeUnsignedDigits(digitsOnly)
                  setDirectRefsInput(raw)
                  const n = raw === '' ? 0 : Math.min(100, Math.max(0, parseInt(raw, 10) || 0))
                  updateDirectRefs(n)
                }}
                onBlur={() => {
                  const n =
                    directRefsInput === ''
                      ? 0
                      : Math.min(100, Math.max(0, parseInt(directRefsInput, 10) || 0))
                  updateDirectRefs(n)
                  setDirectRefsInput(n > 0 ? String(n) : '')
                }}
                className="w-full bg-surface-1 border border-border-subtle rounded-xl px-4 h-11 font-jetbrains text-text-primary outline-none focus:border-plasma-cyan"
              />
            </div>
            <div>
              <label className="block text-[11px] text-text-secondary mb-1">
                {t('calc.avgStake')}
              </label>
              <input
                type="number"
                min="100"
                value={state.avgStake}
                onChange={(e) => updateAvgStake(Number(e.target.value))}
                className="w-full bg-surface-1 border border-border-subtle rounded-xl px-4 h-11 font-jetbrains text-text-primary outline-none focus:border-plasma-cyan"
              />
            </div>
          </div>
        )}

        {state.referralEnabled && (
          <p className="text-[11px] text-text-disabled mt-2">
            {t('calc.referralNote')}
          </p>
        )}
      </div>

      {/* BLOCK 5 - Reinvest Toggle */}
      <div className="mt-6">
        <div className="flex justify-between items-center">
          <label className="text-[12px] text-text-secondary tracking-wider uppercase">
            {t('calc.reinvestLabel')}
          </label>
          <button
            onClick={toggleReinvest}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              state.reinvestEnabled ? 'bg-plasma-cyan' : 'bg-surface-3'
            }`}
          >
            <div
              className={`absolute top-1 w-4 h-4 bg-void-black rounded-full transition-transform ${
                state.reinvestEnabled ? 'translate-x-7' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {state.reinvestEnabled && (
          <div className="mt-3">
            <label className="block text-[11px] text-text-secondary mb-1">
              {t('calc.reinvestCount')}
            </label>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder=""
              value={reinvestCountInput}
              onChange={(e) => {
                const digitsOnly = e.target.value.replace(/\D/g, '')
                const raw = normalizeUnsignedDigits(digitsOnly)
                setReinvestCountInput(raw)
                const n = raw === '' ? 0 : Math.min(20, Math.max(0, parseInt(raw, 10) || 0))
                updateReinvestCount(n)
              }}
              onBlur={() => {
                const n =
                  reinvestCountInput === ''
                    ? 0
                    : Math.min(20, Math.max(0, parseInt(reinvestCountInput, 10) || 0))
                updateReinvestCount(n)
                setReinvestCountInput(n > 0 ? String(n) : '')
              }}
              className="w-full bg-surface-1 border border-border-subtle rounded-xl px-4 h-11 font-jetbrains text-text-primary outline-none focus:border-plasma-cyan"
            />
            <p className="text-[11px] text-text-disabled mt-2">
              {t('calc.reinvestNote')}
            </p>
          </div>
        )}
      </div>

      {/* BLOCK 6 - Comparison Toggle */}
      <div className="mt-6">
        <label className="block text-[12px] text-text-secondary tracking-wider uppercase mb-2">
          {t('calc.compareLabel')}
        </label>

        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => toggleComparison('bank')}
            className={`px-4 py-2 rounded-full text-[13px] border transition-all ${
              state.comparisons.bank
                ? 'border-plasma-cyan text-plasma-cyan bg-surface-2'
                : 'border-border-subtle text-text-secondary hover:border-border-active'
            }`}
          >
            {t('calc.bankDeposit')}
          </button>
          <button
            onClick={() => toggleComparison('stable')}
            className={`px-4 py-2 rounded-full text-[13px] border transition-all ${
              state.comparisons.stable
                ? 'border-plasma-cyan text-plasma-cyan bg-surface-2'
                : 'border-border-subtle text-text-secondary hover:border-border-active'
            }`}
          >
            {t('calc.stableFarm')}
          </button>
          <button
            onClick={() => toggleComparison('eth')}
            className={`px-4 py-2 rounded-full text-[13px] border transition-all ${
              state.comparisons.eth
                ? 'border-plasma-cyan text-plasma-cyan bg-surface-2'
                : 'border-border-subtle text-text-secondary hover:border-border-active'
            }`}
          >
            {t('calc.ethStaking')}
          </button>
        </div>
      </div>
    </div>
  );
}
