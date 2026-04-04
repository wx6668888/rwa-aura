'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useChat } from './chat-context';
import { RedPacketModal } from './RedPacketModal';
import { useLocale } from '@/components/locale-provider';
import { useTranslation } from '@/lib/i18n';

interface ChatInputProps {
  onToast?: (message: string, type: 'success' | 'error' | 'info') => void;
  channelName?: string;
}

export default function ChatInput({ onToast, channelName = '…' }: ChatInputProps) {
  const { sendMessage, createRedPacket, sendTyping, isAuthenticated, activeRoomId, lastActionError, clearActionError } = useChat();
  const { locale } = useLocale();
  const { t } = useTranslation(locale);
  const [input, setInput] = useState('');
  const [showRedPacket, setShowRedPacket] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const handleSubmit = useCallback(() => {
    if (!input.trim()) return;
    sendMessage(input);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = '40px';
    }
  }, [input, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleRedPacketConfirm = (totalAmount: number, totalCount: number, greeting: string, currency: 'USDT' | 'RWA') => {
    createRedPacket(totalAmount, totalCount, greeting, currency);
    onToast?.(t('chat.redPacketSentToast'), 'success');
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (lastActionError) clearActionError();

    // Auto-resize
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = '40px';
      ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
    }

    // Typing indicator
    if (!typingTimeout.current) {
      sendTyping();
      typingTimeout.current = setTimeout(() => {
        typingTimeout.current = undefined;
      }, 2000);
    }
  };

  /** 触屏设备不自动聚焦输入框，避免点菜单也弹出键盘 */
  useEffect(() => {
    if (typeof window === 'undefined' || !activeRoomId) return;
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    if (coarse) return;
    textareaRef.current?.focus();
  }, [activeRoomId]);

  if (!isAuthenticated) return null;

  return (
    <>
      <div className="px-4 pb-4 pt-1">
        <div className="relative bg-surface-2 rounded-xl border border-border-subtle focus-within:border-plasma-cyan/20 focus-within:ring-1 focus-within:ring-plasma-cyan/10 transition-all">
          {/* Toolbar */}
          <div className="flex items-center gap-1 px-2 pt-2 pb-1">
            <button type="button" className="w-7 h-7 rounded-lg hover:bg-surface-3 flex items-center justify-center text-text-disabled hover:text-text-secondary transition-colors" title={t('chat.imageSoon')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
            </button>
            <button type="button" className="w-7 h-7 rounded-lg hover:bg-surface-3 flex items-center justify-center text-text-disabled hover:text-text-secondary transition-colors" title={t('chat.fileSoon')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14,2 14,8 20,8"/></svg>
            </button>
            <button
              type="button"
              onClick={() => setShowRedPacket(true)}
              className="w-7 h-7 rounded-lg hover:bg-surface-3 flex items-center justify-center text-text-disabled hover:text-danger transition-colors"
              title={t('chat.redPacketSend')}
            >
              <span className="text-[13px] font-semibold">🧧</span>
            </button>
            <button type="button" className="w-7 h-7 rounded-lg hover:bg-surface-3 flex items-center justify-center text-text-disabled hover:text-text-secondary transition-colors text-lg" title={t('chat.mentionSoon')}>
              @
            </button>
          </div>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={t('chat.messagePlaceholder', { channel: channelName })}
            rows={1}
            className="w-full bg-transparent px-3 pb-2 text-[13px] text-text-primary placeholder-text-disabled
              focus:outline-none resize-none leading-[1.5] min-h-[40px] max-h-[120px]"
            style={{ height: '40px' }}
            maxLength={2000}
            autoComplete="off"
          />

          {/* Send button */}
          <div className="absolute bottom-2 right-2">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!input.trim()}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all
                ${input.trim()
                  ? 'bg-plasma-cyan/15 text-plasma-cyan hover:bg-plasma-cyan/25 border border-plasma-cyan/25'
                  : 'text-text-disabled cursor-not-allowed'
                }`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
              </svg>
            </button>
          </div>
        </div>
        {lastActionError && (
          <div className="mt-2 px-2 text-[11px] text-danger">{lastActionError}</div>
        )}
      </div>

      {showRedPacket && (
        <RedPacketModal
          onConfirm={handleRedPacketConfirm}
          onClose={() => setShowRedPacket(false)}
        />
      )}
    </>
  );
}
