'use client';

import React, { useState } from 'react';
import { useLocale } from '@/components/locale-provider';
import { getTranslation, useTranslation, type Locale } from '@/lib/i18n';

interface RedPacketModalProps {
  onConfirm: (totalAmount: number, totalCount: number, greeting: string, currency: 'USDT' | 'RWA') => void;
  onClose: () => void;
}

export function RedPacketModal({ onConfirm, onClose }: RedPacketModalProps) {
  const { locale } = useLocale();
  const { t } = useTranslation(locale);
  const [amount, setAmount] = useState('10');
  const [count, setCount] = useState('5');
  const [greeting, setGreeting] = useState('');
  const [error, setError] = useState('');
  const [currency, setCurrency] = useState<'USDT' | 'RWA'>('USDT');

  React.useEffect(() => {
    setGreeting(getTranslation(locale as Locale, 'chat.redPacketGreetingDF'));
  }, [locale]);

  const handleConfirm = () => {
    const totalAmount = Number(amount);
    const totalCount = Number(count);
    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      setError(t('chat.redPacketErrAmount'));
      return;
    }
    if (!Number.isInteger(totalCount) || totalCount <= 0 || totalCount > 100) {
      setError(t('chat.redPacketErrCount'));
      return;
    }
    if (totalAmount * 100 < totalCount) {
      setError(t('chat.redPacketErrMin'));
      return;
    }
    onConfirm(totalAmount, totalCount, greeting || t('chat.redPacketGreetingDF'), currency);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overscroll-contain">
      <div className="w-full max-w-sm rounded-2xl border border-border-subtle bg-surface-1 overflow-hidden shadow-2xl max-h-[90dvh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle"
          style={{ background: 'linear-gradient(135deg, #dc262615, #dc262608)' }}>
          <div className="flex items-center gap-2">
            <span className="text-xl">🧧</span>
            <span className="text-[15px] font-semibold text-text-primary">{t('chat.redPacketSend')}</span>
          </div>
          <button type="button" onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-text-disabled hover:text-text-secondary hover:bg-surface-2 transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-[11px] text-text-secondary mb-1.5 font-medium uppercase tracking-wider">
              {currency === 'USDT' ? 'USDT' : 'RWA'}
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setCurrency('USDT');
                  setError('');
                }}
                className={`flex-1 py-2 rounded-lg text-[12px] font-medium transition-all border ${
                  currency === 'USDT'
                    ? 'border border-white/20 bg-[#0d9488] text-white'
                    : 'border border-border-subtle bg-surface-2 text-text-secondary hover:border-border-active'
                }`}
              >
                USDT
              </button>
              <button
                type="button"
                onClick={() => {
                  setCurrency('RWA');
                  setError('');
                }}
                className={`flex-1 py-2 rounded-lg text-[12px] font-medium transition-all border ${
                  currency === 'RWA'
                    ? 'border border-white/20 bg-[#0d9488] text-white'
                    : 'border border-border-subtle bg-surface-2 text-text-secondary hover:border-border-active'
                }`}
              >
                RWA
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[11px] text-text-secondary mb-1.5 font-medium uppercase tracking-wider">{t('chat.redPacketTotal')}</label>
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={(e) => { setAmount(e.target.value); setError(''); }}
                min="0.01"
                step="0.01"
                className="w-full bg-surface-2 border border-border-subtle rounded-xl px-4 py-2.5 text-[14px] text-text-primary placeholder-text-disabled focus:outline-none focus:border-danger/40 transition-all pr-16"
                placeholder="10"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[12px] text-text-disabled font-mono">USDT</span>
            </div>
          </div>

          <div>
            <label className="block text-[11px] text-text-secondary mb-1.5 font-medium uppercase tracking-wider">{t('chat.redPacketCount')}</label>
            <div className="flex gap-2">
              {[1, 3, 5, 10, 20].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => { setCount(String(n)); setError(''); }}
                  className={`flex-1 py-2 rounded-lg text-[12px] font-medium transition-all border ${
                    count === String(n)
                      ? 'bg-danger/15 text-danger border-danger/40'
                      : 'bg-surface-2 text-text-secondary border-border-subtle hover:border-border-active'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <input
              type="number"
              value={count}
              onChange={(e) => { setCount(e.target.value); setError(''); }}
              min="1"
              max="100"
              className="mt-2 w-full bg-surface-2 border border-border-subtle rounded-xl px-4 py-2 text-[13px] text-text-primary focus:outline-none focus:border-danger/40 transition-all"
              placeholder={t('chat.redPacketCustomCount')}
            />
          </div>

          <div>
            <label className="block text-[11px] text-text-secondary mb-1.5 font-medium uppercase tracking-wider">{t('chat.redPacketGreeting')}</label>
            <input
              type="text"
              value={greeting}
              onChange={(e) => setGreeting(e.target.value)}
              className="w-full bg-surface-2 border border-border-subtle rounded-xl px-4 py-2.5 text-[13px] text-text-primary focus:outline-none focus:border-danger/40 transition-all"
            />
          </div>

          {error && <p className="text-[12px] text-danger">{error}</p>}

          <button
            type="button"
            onClick={handleConfirm}
            className="w-full py-3 rounded-xl font-semibold text-[14px] transition-all"
            style={{ background: 'linear-gradient(135deg, #dc262620, #dc262610)', color: '#f87171', border: '1px solid #dc262640' }}
          >
            {t('chat.redPacketConfirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
