'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useAccount, useReadContract, useWriteContract } from 'wagmi';
import { bsc } from 'wagmi/chains';
import { parseUnits, maxUint256, type Address } from 'viem';
import { useLocale } from '@/components/locale-provider';
import { getTranslation, useTranslation, type Locale } from '@/lib/i18n';
import { chatHttpUrl } from '@/lib/chat-api';
import { fetchWithTimeout } from '@/lib/fetch-with-timeout';
import { CONTRACT_ADDRESSES, bscscanAddressUrl } from '@/lib/contracts/addresses';

const ERC20_ABI = [
  {
    inputs: [
      { internalType: 'address', name: 'owner', type: 'address' },
      { internalType: 'address', name: 'spender', type: 'address' },
    ],
    name: 'allowance',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'spender', type: 'address' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

interface RedPacketModalProps {
  onConfirm: (totalAmount: number, totalCount: number, greeting: string, currency: 'USDT' | 'RWA') => void;
  onClose: () => void;
}

type RedPacketCfg = {
  spender: string;
  chainId: number;
  usdt: { address: string; decimals: number } | null;
  rwa: { address: string; decimals: number } | null;
};

function fallbackRedPacketConfig(): RedPacketCfg | null {
  const spender = CONTRACT_ADDRESSES[bsc.id].redPacketSpender;
  if (!spender?.startsWith('0x')) return null;
  const c = CONTRACT_ADDRESSES[bsc.id];
  return {
    spender: spender.toLowerCase(),
    chainId: bsc.id,
    usdt: { address: String(c.usdtToken).toLowerCase(), decimals: 6 },
    rwa: { address: String(c.rwaToken).toLowerCase(), decimals: 18 },
  };
}

export function RedPacketModal({ onConfirm, onClose }: RedPacketModalProps) {
  const { locale } = useLocale();
  const { t } = useTranslation(locale);
  const { address, chainId: walletChainId, isConnected } = useAccount();
  const { writeContractAsync, isPending: approving } = useWriteContract();

  const [amount, setAmount] = useState('10');
  const [count, setCount] = useState('5');
  const [greeting, setGreeting] = useState('');
  const [error, setError] = useState('');
  const [currency, setCurrency] = useState<'USDT' | 'RWA'>('USDT');
  const [cfg, setCfg] = useState<RedPacketCfg | null>(null);
  const [cfgLoading, setCfgLoading] = useState(true);
  const [cfgErr, setCfgErr] = useState(false);
  const [approveError, setApproveError] = useState('');
  const [approveJustDone, setApproveJustDone] = useState(false);

  React.useEffect(() => {
    setGreeting(getTranslation(locale as Locale, 'chat.redPacketGreetingDF'));
  }, [locale]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setCfgLoading(true);
      setCfgErr(false);
      try {
        const res = await fetchWithTimeout(chatHttpUrl('config/redpacket'), { timeoutMs: 12_000 });
        const data = (await res.json().catch(() => null)) as RedPacketCfg | null;
        if (!res.ok || !data?.spender) throw new Error('fetch');
        if (!cancelled) setCfg(data);
      } catch {
        const fb = fallbackRedPacketConfig();
        if (!cancelled) {
          if (fb) setCfg(fb);
          else {
            setCfg(null);
            setCfgErr(true);
          }
        }
      } finally {
        if (!cancelled) setCfgLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!cfg) return;
    if (currency === 'RWA' && !cfg.rwa && cfg.usdt) setCurrency('USDT');
    if (currency === 'USDT' && !cfg.usdt && cfg.rwa) setCurrency('RWA');
  }, [cfg, currency]);

  const tokenMeta = useMemo(() => {
    if (!cfg) return null;
    return currency === 'USDT' ? cfg.usdt : cfg.rwa;
  }, [cfg, currency]);

  const amountWei = useMemo(() => {
    try {
      if (!tokenMeta) return 0n;
      const n = Number(amount);
      if (!Number.isFinite(n) || n <= 0) return 0n;
      return parseUnits(amount, tokenMeta.decimals);
    } catch {
      return 0n;
    }
  }, [amount, tokenMeta]);

  const wrongChain = isConnected && walletChainId !== undefined && walletChainId !== bsc.id;

  const allowanceEnabled = Boolean(
    isConnected && address && cfg?.spender && tokenMeta?.address && !wrongChain
  );

  const {
    data: allowance,
    refetch: refetchAllowance,
    isFetching: allowanceLoading,
  } = useReadContract({
    chainId: bsc.id,
    address: (tokenMeta?.address || '0x0000000000000000000000000000000000000000') as Address,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address && cfg?.spender ? [address, cfg.spender as Address] : undefined,
    query: {
      enabled: allowanceEnabled,
      staleTime: 5000,
    },
  });

  const needsApprove =
    allowanceEnabled &&
    amountWei > 0n &&
    allowance !== undefined &&
    !allowanceLoading &&
    allowance < amountWei;

  const sendBlockedByAllowance =
    allowanceEnabled &&
    amountWei > 0n &&
    (allowance === undefined || allowanceLoading || allowance < amountWei);

  const handleApprove = useCallback(async () => {
    if (!tokenMeta || !cfg?.spender || !address) return;
    setApproveError('');
    try {
      await writeContractAsync({
        chainId: bsc.id,
        address: tokenMeta.address as Address,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [cfg.spender as Address, maxUint256],
      });
      await refetchAllowance();
      setApproveJustDone(true);
      window.setTimeout(() => setApproveJustDone(false), 4000);
    } catch (e: unknown) {
      const msg = e as { shortMessage?: string; message?: string };
      setApproveError(msg?.shortMessage || msg?.message || 'Approve failed');
    }
  }, [tokenMeta, cfg?.spender, address, writeContractAsync, refetchAllowance]);

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
    if (wrongChain) {
      setError(t('chat.redPacketWrongChain'));
      return;
    }
    if (sendBlockedByAllowance) {
      setError(t('chat.redPacketSendNeedsApprove', { symbol: currency }));
      return;
    }
    onConfirm(totalAmount, totalCount, greeting || t('chat.redPacketGreetingDF'), currency);
    onClose();
  };

  const sendDisabled =
    cfgLoading || cfgErr || !cfg || !tokenMeta || wrongChain || sendBlockedByAllowance;

  return createPortal(
    <div
      className="fixed inset-0 z-[220] flex items-end justify-center bg-black/60 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-sm sm:items-center sm:pb-4 overscroll-contain"
      role="dialog"
      aria-modal
      aria-labelledby="red-packet-modal-title"
    >
      <div className="flex max-h-[min(92dvh,calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-2rem))] w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-border-subtle bg-surface-1 shadow-2xl">
        <div
          className="flex shrink-0 items-center justify-between border-b border-border-subtle px-5 py-4"
          style={{ background: 'linear-gradient(135deg, #dc262615, #dc262608)' }}
        >
          <div className="flex items-center gap-2">
            <span className="text-xl">🧧</span>
            <span id="red-packet-modal-title" className="text-[15px] font-semibold text-text-primary">
              {t('chat.redPacketSend')}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-text-disabled transition-colors hover:bg-surface-2 hover:text-text-secondary"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-4">
          {cfgLoading ? (
            <p className="text-center font-mono text-[11px] text-text-disabled">…</p>
          ) : null}

          {cfgErr ? (
            <p className="rounded-lg border border-danger/25 bg-danger/10 px-3 py-2 text-[12px] text-danger">
              {t('chat.redPacketConfigLoadError')}
            </p>
          ) : null}

          {wrongChain ? (
            <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[12px] text-amber-200">
              {t('chat.redPacketWrongChain')}
            </p>
          ) : null}

          {cfg && tokenMeta && !wrongChain && (needsApprove || approveJustDone) ? (
            <div className="space-y-2 rounded-xl border border-[#0d9488]/35 bg-[#0d9488]/10 px-3 py-3">
              <p className="text-[11px] leading-relaxed text-[#a7f3d0]">
                {t('chat.redPacketApproveHint', { symbol: currency })}
              </p>
              {cfg.spender ? (
                <a
                  href={bscscanAddressUrl(cfg.spender)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block font-mono text-[10px] text-plasma-cyan/90 underline-offset-2 hover:underline"
                >
                  {cfg.spender.slice(0, 10)}…{cfg.spender.slice(-8)}
                </a>
              ) : null}
              {needsApprove ? (
                <button
                  type="button"
                  disabled={approving || !isConnected}
                  onClick={() => void handleApprove()}
                  className="w-full rounded-lg border border-white/20 bg-[#0d9488] py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-[#0f766e] disabled:opacity-50"
                >
                  {approving ? t('chat.redPacketApproving') : t('chat.redPacketApproveBtn', { symbol: currency })}
                </button>
              ) : null}
              {approveJustDone && !needsApprove ? (
                <p className="text-[11px] text-success">{t('chat.redPacketApproveDone')}</p>
              ) : null}
              {approveError ? <p className="text-[11px] text-danger">{approveError}</p> : null}
            </div>
          ) : null}

          <div>
            <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-text-secondary">
              {currency === 'USDT' ? 'USDT' : 'RWA'}
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={!cfg?.usdt}
                onClick={() => {
                  setCurrency('USDT');
                  setError('');
                }}
                className={`flex-1 rounded-lg border py-2 text-[12px] font-medium transition-all ${
                  currency === 'USDT'
                    ? 'border border-white/20 bg-[#0d9488] text-white'
                    : 'border border-border-subtle bg-surface-2 text-text-secondary hover:border-border-active disabled:opacity-40'
                }`}
              >
                USDT
              </button>
              <button
                type="button"
                disabled={!cfg?.rwa}
                onClick={() => {
                  setCurrency('RWA');
                  setError('');
                }}
                className={`flex-1 rounded-lg border py-2 text-[12px] font-medium transition-all ${
                  currency === 'RWA'
                    ? 'border border-white/20 bg-[#0d9488] text-white'
                    : 'border border-border-subtle bg-surface-2 text-text-secondary hover:border-border-active disabled:opacity-40'
                }`}
              >
                RWA
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-text-secondary">
              {t('chat.redPacketTotal')}
            </label>
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setError('');
                }}
                min="0.01"
                step="0.01"
                className="chat-dapp-input w-full rounded-xl border border-border-subtle bg-surface-2 px-4 py-2.5 pr-16 text-text-primary placeholder-text-disabled transition-all focus:border-danger/40 focus:outline-none"
                placeholder="10"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 font-mono text-[12px] text-text-disabled">
                {currency}
              </span>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-text-secondary">
              {t('chat.redPacketCount')}
            </label>
            <div className="flex gap-2">
              {[1, 3, 5, 10, 20].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => {
                    setCount(String(n));
                    setError('');
                  }}
                  className={`flex-1 rounded-lg border py-2 text-[12px] font-medium transition-all ${
                    count === String(n)
                      ? 'border-danger/40 bg-danger/15 text-danger'
                      : 'border border-border-subtle bg-surface-2 text-text-secondary hover:border-border-active'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <input
              type="number"
              value={count}
              onChange={(e) => {
                setCount(e.target.value);
                setError('');
              }}
              min="1"
              max="100"
              className="chat-dapp-input mt-2 w-full rounded-xl border border-border-subtle bg-surface-2 px-4 py-2 text-text-primary transition-all focus:border-danger/40 focus:outline-none"
              placeholder={t('chat.redPacketCustomCount')}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-text-secondary">
              {t('chat.redPacketGreeting')}
            </label>
            <input
              type="text"
              value={greeting}
              onChange={(e) => setGreeting(e.target.value)}
              className="chat-dapp-input w-full rounded-xl border border-border-subtle bg-surface-2 px-4 py-2.5 text-text-primary transition-all focus:border-danger/40 focus:outline-none"
            />
          </div>

          {error ? <p className="text-[12px] text-danger">{error}</p> : null}

          <button
            type="button"
            disabled={sendDisabled}
            onClick={handleConfirm}
            className="w-full rounded-xl py-3 text-[14px] font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-45"
            style={{
              background: 'linear-gradient(135deg, #dc262620, #dc262610)',
              color: '#f87171',
              border: '1px solid #dc262640',
            }}
          >
            {t('chat.redPacketConfirm')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
