'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useChat } from './chat-context';
import { useLocale } from '@/components/locale-provider';
import { useTranslation } from '@/lib/i18n';

export default function RedWalletPanel({ onClose, compact = false }: { onClose?: () => void; compact?: boolean }) {
  const { locale } = useLocale();
  const { t } = useTranslation(locale);
  const { walletAddress, walletEscrow, walletWithdrawn, walletLoading, fetchWalletBalances, withdrawWallet } = useChat();

  const [currency, setCurrency] = useState<'USDT' | 'RWA'>('USDT');
  const [amount, setAmount] = useState<string>('10');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    void fetchWalletBalances();
  }, [fetchWalletBalances]);

  const available = useMemo(() => {
    return currency === 'USDT' ? walletEscrow.USDT : walletEscrow.RWA;
  }, [currency, walletEscrow]);

  const withdrawn = useMemo(() => {
    return currency === 'USDT' ? walletWithdrawn.USDT : walletWithdrawn.RWA;
  }, [currency, walletWithdrawn]);

  const canWithdraw = useMemo(() => {
    const n = Number(amount);
    return Number.isFinite(n) && n > 0 && n <= available;
  }, [amount, available]);

  const handleWithdraw = async () => {
    setErr(null);
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) {
      setErr(t('chat.redWalletInvalidAmount'));
      return;
    }
    if (n > available) {
      setErr(t('chat.redWalletInsufficient'));
      return;
    }

    try {
      setSubmitting(true);
      const res = await withdrawWallet(currency, n);
      setAmount('');
      setErr(null);
      // Give a small “loading” moment; panel will refresh balances after withdrawWallet()
      if (onClose) onClose();
      void res;
    } catch (e: any) {
      setErr(e?.message || t('chat.redWalletWithdrawFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="h-full min-h-0 flex flex-col">
      {!compact && (
        <div className="p-4 border-b border-border-subtle flex items-start justify-between gap-3">
          <div>
            <div className="text-[13px] font-heading font-semibold text-text-primary">{t('chat.redWalletTitle')}</div>
            <div className="text-[11px] text-text-secondary mt-1">
              {t('chat.redWalletAddress')}:{' '}
              <span className="font-mono">{walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : '-'}</span>
            </div>
          </div>
        </div>
      )}

      <div className={`p-4 space-y-4 overflow-auto ${compact ? 'pt-0' : ''}`}>
        <div className="rounded-lg border border-border-subtle bg-surface-2 p-3">
          <div className="flex items-center justify-between">
            <div className="text-[11px] text-text-secondary">{t('chat.redWalletAvailable')}</div>
            <div className="text-[12px] font-semibold text-text-primary font-mono">
              {currency === 'USDT' ? walletEscrow.USDT : walletEscrow.RWA} {currency}
            </div>
          </div>
          <div className="flex items-center justify-between mt-2">
            <div className="text-[11px] text-text-secondary">{t('chat.redWalletWithdrawnTotal')}</div>
            <div className="text-[12px] font-semibold text-text-primary font-mono">
              {currency === 'USDT' ? walletWithdrawn.USDT : walletWithdrawn.RWA} {currency}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-[11px] text-text-secondary font-medium">{t('chat.redWalletCurrency')}</div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setCurrency('USDT')}
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
              onClick={() => setCurrency('RWA')}
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

        <div className="space-y-2">
          <div className="text-[11px] text-text-secondary font-medium">{t('chat.redWalletWithdraw')}</div>
          <div className="flex items-center gap-2">
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
              className="chat-dapp-input h-10 flex-1 rounded-lg border border-border-subtle bg-surface-1 px-3 text-text-primary outline-none placeholder:text-text-disabled focus:border-border-active"
              placeholder="0"
            />
            <div className="text-[12px] text-text-secondary font-mono w-[52px] text-right">{currency}</div>
          </div>
          {err && <div className="text-[12px] text-danger">{err}</div>}
          <button
            type="button"
            onClick={handleWithdraw}
            disabled={!canWithdraw || submitting}
            className="h-10 w-full rounded-lg border border-white/15 bg-[#0d9488] text-white hover:bg-[#0f766e] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? t('chat.connecting') : t('chat.redWalletWithdrawBtn')}
          </button>
          <div className="text-[10px] text-text-disabled leading-[1.4]">
            {t('chat.redWalletWithdrawHint')}
          </div>
        </div>
      </div>
    </div>
  );
}

