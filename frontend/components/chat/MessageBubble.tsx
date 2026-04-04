'use client';

import React, { useState } from 'react';
import { UserAvatar } from './UserBadge';
import UserBadge from './UserBadge';
import { ChatMessage, useChat } from './chat-context';
import { useLocale } from '@/components/locale-provider';
import { useTranslation } from '@/lib/i18n';

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(ts: number, t: (key: string) => string): string {
  const d = new Date(ts);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return t('chat.today');
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return t('chat.yesterday');
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

interface MessageGroupProps {
  messages: ChatMessage[];
  isOwn: boolean;
  onToast?: (message: string, type: 'success' | 'error' | 'info') => void;
}

/** Grouped messages from same user within short timeframe */
export function MessageGroup({ messages, isOwn, onToast }: MessageGroupProps) {
  const { locale } = useLocale();
  const { t } = useTranslation(locale);
  const { claimRedPacket, getRedPacketRecords, fetchWalletBalances } = useChat();
  const [recordsOpenFor, setRecordsOpenFor] = useState<string | null>(null);
  const [records, setRecords] = useState<Array<{ userId: string; nickname: string; amount: number; claimedAt: number }>>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  if (!messages.length) return null;
  const user = messages[0].user;

  return (
    <div className={`group flex gap-3 px-4 py-1 hover:bg-white/[0.02] transition-colors ${isOwn ? '' : ''}`}>
      {/* Avatar - only show for first message */}
      <div className="w-10 flex-shrink-0 pt-0.5">
        <UserAvatar user={user} size={40} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Header: name + badge + time */}
        <div className="flex items-center gap-2 mb-1">
          <UserBadge user={user} size="sm" />
          <span className="text-[10px] text-text-secondary font-mono opacity-0 group-hover:opacity-100 transition-opacity">
            {formatTime(messages[0].timestamp)}
          </span>
        </div>

        {/* Messages */}
        {messages.map((msg) => (
          <div key={msg.id} className="group/msg relative">
            {msg.type === 'system' ? (
              <div className="text-[11px] text-text-secondary italic py-0.5">{msg.content}</div>
            ) : msg.type === 'chain-event' ? (
              <div className="inline-flex items-center gap-1.5 text-[11px] py-1 px-2.5 my-0.5 rounded-md"
                style={{ background: '#00f5d410', color: '#00f5d4', border: '1px solid #00f5d420' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
                {msg.content}
              </div>
            ) : (
              msg.type === 'redpacket' ? (
                <div
                  className="rounded-md px-3 py-2 my-1 border"
                  style={{ background: '#dc262615', borderColor: '#dc262640' }}
                >
                  <div className="text-[12px] text-danger font-semibold mb-1">🧧 {t('chat.redPacketTitle')}</div>
                  <div className="text-[11px] text-text-secondary mb-1">{msg.metadata?.greeting || t('chat.redPacketGreetingDF')}</div>
                  <div className="text-[10px] text-text-disabled mb-2">
                    {t('chat.redPacketTotalShort')} {msg.metadata?.totalAmount ?? 0}{' '}
                    {(msg.metadata?.currency === 'RWA' || msg.metadata?.currency === 'USDT') ? msg.metadata?.currency : 'USDT'} · {t('chat.redPacketRemain')}{' '}
                    {msg.metadata?.remainingAmount ?? 0} / {msg.metadata?.remainingCount ?? 0}
                  </div>
                  <div className="text-[10px] text-text-disabled mb-2">
                    {msg.metadata?.status === 'active'
                      ? `${t('chat.redPacketExpire')}: ${new Date(msg.metadata?.expiresAt || 0).toLocaleString()}`
                      : msg.metadata?.status === 'refunded'
                        ? t('chat.redPacketRefunded', {
                            amount: String(msg.metadata?.refundedAmount ?? 0),
                            currency:
                              msg.metadata?.currency === 'RWA' || msg.metadata?.currency === 'USDT'
                                ? msg.metadata?.currency
                                : 'USDT',
                          })
                        : msg.metadata?.status === 'expired'
                          ? t('chat.redPacketExpired')
                          : t('chat.redPacketAllClaimed')}
                  </div>
                  <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={msg.metadata?.status !== 'active' || !msg.metadata?.redPacketId}
                    onClick={async () => {
                      if (!msg.metadata?.redPacketId) return;
                      const amount = await claimRedPacket(msg.metadata.redPacketId);
                      if (amount !== null && amount > 0) {
                        onToast?.(
                          `🧧 ${t('chat.redPacketClaimOk', {
                            amount: String(amount),
                            currency:
                              msg.metadata?.currency === 'RWA' || msg.metadata?.currency === 'USDT'
                                ? msg.metadata?.currency
                                : 'USDT',
                          })}`,
                          'success'
                        );
                        void fetchWalletBalances();
                      } else if (amount === null) {
                        onToast?.(t('chat.redPacketClaimFail'), 'error');
                      }
                    }}
                    className="text-[11px] px-2 py-1 rounded border border-danger/40 text-danger disabled:opacity-50"
                  >
                    {msg.metadata?.status === 'active' ? t('chat.redPacketClaim') : t('chat.redPacketDone')}
                  </button>
                    <button
                      type="button"
                      disabled={!msg.metadata?.redPacketId}
                      onClick={async () => {
                        if (!msg.metadata?.redPacketId) return;
                        setLoadingRecords(true);
                        setRecordsOpenFor(msg.metadata.redPacketId);
                        const list = await getRedPacketRecords(msg.metadata.redPacketId);
                        setRecords(list);
                        setLoadingRecords(false);
                      }}
                      className="text-[11px] px-2 py-1 rounded border border-border-subtle text-text-secondary"
                    >
                      {t('chat.redPacketRecords')}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-[13px] text-text-primary leading-[1.45] py-[1px] break-words">
                  {msg.content}
                  {msg.edited && <span className="text-[9px] text-text-disabled ml-1">{t('chat.edited')}</span>}
                </div>
              )
            )}
          </div>
        ))}
      </div>
      {recordsOpenFor && (
        <div className="fixed inset-0 z-40 bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-lg border border-border-subtle bg-surface-1 p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-text-primary">{t('chat.redPacketRecordsTitle')}</h4>
              <button
                type="button"
                onClick={() => setRecordsOpenFor(null)}
                className="text-xs text-text-secondary"
              >
                {t('chat.redPacketRecordsClose')}
              </button>
            </div>
            {loadingRecords ? (
              <div className="text-xs text-text-secondary">{t('chat.redPacketRecordsLoading')}</div>
            ) : records.length === 0 ? (
              <div className="text-xs text-text-secondary">{t('chat.redPacketRecordsEmpty')}</div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {records.map((r) => (
                  <div key={`${r.userId}-${r.claimedAt}`} className="flex items-center justify-between text-xs">
                    <div className="text-text-primary">{r.nickname}</div>
                    <div className="text-text-secondary">{r.amount} USDT</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** Date separator */
export function DateSeparator({ timestamp }: { timestamp: number }) {
  const { locale } = useLocale();
  const { t } = useTranslation(locale);
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="flex-1 h-[1px] bg-border-subtle" />
      <span className="text-[10px] font-mono text-text-disabled uppercase tracking-wider">{formatDate(timestamp, t)}</span>
      <div className="flex-1 h-[1px] bg-border-subtle" />
    </div>
  );
}
