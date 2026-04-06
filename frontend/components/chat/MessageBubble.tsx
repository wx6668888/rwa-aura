'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { UserAvatar } from './UserBadge';
import UserBadge from './UserBadge';
import { ChatMessage, useChat } from './chat-context';
import { useLocale } from '@/components/locale-provider';
import { useTranslation } from '@/lib/i18n';
import { resolveChatMediaUrl } from '@/lib/chat-api';

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
  onMentionUser?: (user: ChatMessage['user']) => void;
}

/** Grouped messages from same user within short timeframe */
export function MessageGroup({ messages, isOwn, onToast, onMentionUser }: MessageGroupProps) {
  const { locale } = useLocale();
  const { t } = useTranslation(locale);
  const { claimRedPacket, getRedPacketRecords, fetchWalletBalances } = useChat();
  const [recordsOpenFor, setRecordsOpenFor] = useState<string | null>(null);
  const [records, setRecords] = useState<Array<{ userId: string; nickname: string; amount: number; claimedAt: number }>>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  if (!messages.length) return null;
  const user = messages[0].user;

  const ownBubble =
    'rounded-2xl px-3 py-2 my-0.5 text-left inline-block max-w-full ' +
    'border border-white/20 bg-[#0f766e] text-white';

  return (
    <div
      className={`group flex w-full px-4 py-1.5 hover:bg-white/[0.02] transition-colors ${
        isOwn ? 'justify-end' : 'justify-start'
      }`}
    >
      <div
        className={`flex gap-2 max-w-[min(560px,92vw)] ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
      >
        <div className="w-10 flex-shrink-0 pt-0.5">
          <UserAvatar user={user} size={40} />
        </div>

        <div className={`flex-1 min-w-0 overflow-hidden ${isOwn ? 'text-right' : 'text-left'}`}>
          <div
            className={`flex items-center gap-2 mb-1 ${isOwn ? 'flex-row-reverse justify-end' : 'flex-row justify-start'}`}
          >
            <button
              type="button"
              onClick={() => !isOwn && onMentionUser?.(user)}
              className={`rounded-md ${isOwn ? 'cursor-default' : 'hover:bg-surface-2/70'} px-1 py-0.5`}
            >
              <UserBadge user={user} size="sm" />
            </button>
            <span className="text-[10px] text-text-secondary font-mono opacity-80">
              {formatTime(messages[0].timestamp)}
            </span>
          </div>

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`group/msg relative ${isOwn ? 'flex flex-col items-end' : 'flex flex-col items-start'}`}
          >
            {msg.type === 'system' ? (
              <div className="text-[11px] text-text-secondary italic py-0.5 w-full text-center">
                {msg.content}
              </div>
            ) : msg.type === 'chain-event' ? (
              <div
                className="my-0.5 inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] text-white"
                style={{ background: '#0d9488', border: '1px solid rgba(255,255,255,0.2)' }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
                {msg.content}
              </div>
            ) : msg.type === 'image' ? (
              <div className={`my-1 ${isOwn ? ownBubble + ' p-1' : ''}`}>
                <a
                  href={resolveChatMediaUrl(msg.content)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block rounded-xl overflow-hidden border border-border-subtle/80 bg-surface-2 shadow-sm"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={resolveChatMediaUrl(msg.content)}
                    alt=""
                    className="max-w-[min(280px,78vw)] max-h-[280px] w-auto h-auto object-contain block"
                    loading="lazy"
                  />
                </a>
              </div>
            ) : (
              msg.type === 'redpacket' ? (
                <div
                  className={`rounded-md px-3 py-2 my-1 border ${isOwn ? 'text-left' : ''}`}
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
              ) : msg.metadata?.quickLink?.path ? (
                <div
                  className={`my-0.5 inline-block max-w-full text-left rounded-2xl px-3 py-2 border ${
                    isOwn
                      ? ownBubble
                      : 'bg-surface-2/90 border-border-subtle text-text-primary'
                  }`}
                >
                  <div
                    className={`mb-1 font-mono text-[10px] ${isOwn ? 'text-white/60' : 'text-text-disabled'}`}
                  >
                    {t('chat.quickLinkCardHint')}
                  </div>
                  <Link
                    href={msg.metadata.quickLink.path}
                    className="break-words text-[13px] font-medium text-white hover:underline"
                  >
                    {msg.metadata.quickLink.label || msg.content}
                  </Link>
                  <div className="mt-1.5">
                    <Link
                      href={msg.metadata.quickLink.path}
                      className="inline-flex rounded-md border border-white/15 bg-[#0d9488] px-2 py-1 text-[11px] text-white hover:bg-[#0f766e]"
                    >
                      {t('chat.quickLinkOpen')} →
                    </Link>
                  </div>
                  {msg.edited && (
                    <span className={`ml-1 text-[9px] ${isOwn ? 'text-white/55' : 'text-text-disabled'}`}>
                      {t('chat.edited')}
                    </span>
                  )}
                </div>
              ) : (
                <div
                  className={`break-words py-[1px] text-[13px] leading-[1.45] ${
                    isOwn ? ownBubble : 'text-text-primary'
                  }`}
                >
                  {msg.content}
                  {msg.edited && (
                    <span className={`ml-1 text-[9px] ${isOwn ? 'text-white/55' : 'text-text-disabled'}`}>
                      {t('chat.edited')}
                    </span>
                  )}
                </div>
              )
            )}
            <span className={`mt-0.5 text-[10px] font-mono text-text-disabled ${isOwn ? 'pr-1' : 'pl-1'}`}>
              {formatTime(msg.timestamp)}
            </span>
          </div>
        ))}
        </div>
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
