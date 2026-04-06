'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useChat } from './chat-context';
import { RedPacketModal } from './RedPacketModal';
import { EmojiPickerModal } from './EmojiPickerModal';
import { QuickLinksModal } from './QuickLinksModal';
import { useLocale } from '@/components/locale-provider';
import { useTranslation } from '@/lib/i18n';

interface ChatInputProps {
  onToast?: (message: string, type: 'success' | 'error' | 'info') => void;
  channelName?: string;
  mentionText?: string;
  onMentionConsumed?: () => void;
}

export default function ChatInput({ onToast, channelName = '…', mentionText, onMentionConsumed }: ChatInputProps) {
  const { sendMessage, sendQuickLink, uploadChatImage, createRedPacket, sendTyping, isAuthenticated, activeRoomId, lastActionError, clearActionError, currentUser, updateMyNickname } =
    useChat();
  const { locale } = useLocale();
  const { t } = useTranslation(locale);
  const [input, setInput] = useState('');
  const [showRedPacket, setShowRedPacket] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showQuickLinks, setShowQuickLinks] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const appendEmoji = useCallback(
    (ch: string) => {
      setInput((v) => v + ch);
      if (lastActionError) clearActionError();
      setTimeout(() => textareaRef.current?.focus(), 0);
    },
    [lastActionError, clearActionError]
  );

  const openImagePicker = useCallback(() => {
    if (imageUploading) return;
    clearActionError();
    imageInputRef.current?.click();
  }, [imageUploading, clearActionError]);

  const handleImageSelected = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file || !file.type.startsWith('image/')) {
        if (file) onToast?.(t('chat.imageUrlPrompt'), 'info');
        return;
      }
      setImageUploading(true);
      try {
        const url = await uploadChatImage(file);
        if (url) sendMessage(url, undefined, 'image');
      } finally {
        setImageUploading(false);
      }
    },
    [uploadChatImage, sendMessage, onToast, t]
  );

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

    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = '40px';
      ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
    }

    if (!typingTimeout.current) {
      sendTyping();
      typingTimeout.current = setTimeout(() => {
        typingTimeout.current = undefined;
      }, 2000);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined' || !activeRoomId) return;
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    if (coarse) return;
    textareaRef.current?.focus();
  }, [activeRoomId]);

  useEffect(() => {
    if (!mentionText) return;
    setInput((prev) => {
      const txt = mentionText.trim();
      if (!txt) return prev;
      if (prev.includes(txt)) return prev;
      return `${prev}${prev ? ' ' : ''}${txt} `;
    });
    onMentionConsumed?.();
    setTimeout(() => textareaRef.current?.focus(), 0);
  }, [mentionText, onMentionConsumed]);

  if (!isAuthenticated) return null;

  return (
    <>
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        aria-hidden
        onChange={handleImageSelected}
      />

      <EmojiPickerModal open={showEmojiPicker} onClose={() => setShowEmojiPicker(false)} onPick={appendEmoji} />

      <QuickLinksModal
        open={showQuickLinks}
        onClose={() => setShowQuickLinks(false)}
        onSelect={(path, label) => sendQuickLink(path, label)}
      />

      <div className="flex-shrink-0 px-4 pt-1 pb-[max(1rem,env(safe-area-inset-bottom,12px))]">
        <div className="relative bg-surface-2 rounded-xl border border-border-subtle focus-within:border-plasma-cyan/20 focus-within:ring-1 focus-within:ring-plasma-cyan/10 transition-all">
          <div className="flex items-center gap-1 px-2 pt-2 pb-1 flex-wrap">
            <button
              type="button"
              onClick={async () => {
                const raw = window.prompt(t('chat.nicknamePrompt') || '输入昵称（最多32字）', currentUser?.nickname || '');
                if (raw == null) return;
                const next = raw.trim();
                if (!next) return;
                try {
                  await updateMyNickname(next);
                  onToast?.(t('chat.nicknameUpdated') || '昵称已更新', 'success');
                } catch (e) {
                  onToast?.((e as Error)?.message || (t('chat.nicknameUpdateFail') || '昵称更新失败'), 'error');
                }
              }}
              className="h-7 rounded-lg px-2 hover:bg-surface-3 flex items-center justify-center text-text-disabled hover:text-text-secondary transition-colors text-[11px] font-mono"
              title={t('chat.editNickname') || '修改昵称'}
              aria-label={t('chat.editNickname') || '修改昵称'}
            >
              昵称
            </button>
            <button
              type="button"
              onClick={openImagePicker}
              disabled={imageUploading}
              className="w-7 h-7 rounded-lg hover:bg-surface-3 flex items-center justify-center text-text-disabled hover:text-text-secondary transition-colors disabled:opacity-40"
              title={t('chat.imageFromGallery')}
              aria-label={t('chat.imageFromGallery')}
            >
              {imageUploading ? (
                <span className="w-3.5 h-3.5 border-2 border-plasma-cyan/30 border-t-plasma-cyan rounded-full animate-spin" />
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="m21 15-5-5L5 21" />
                </svg>
              )}
            </button>
            <button
              type="button"
              onClick={() => setShowEmojiPicker(true)}
              className="w-7 h-7 rounded-lg hover:bg-surface-3 flex items-center justify-center text-text-disabled hover:text-text-secondary transition-colors text-[16px] leading-none"
              title={t('chat.emojiPickerTitle')}
              aria-label={t('chat.emojiPickerTitle')}
            >
              😀
            </button>
            <button
              type="button"
              onClick={() => setShowQuickLinks(true)}
              className="w-7 h-7 rounded-lg hover:bg-surface-3 flex items-center justify-center text-text-disabled hover:text-plasma-cyan transition-colors"
              title={t('chat.quickLinksTitle')}
              aria-label={t('chat.quickLinksTitle')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setShowRedPacket(true)}
              className="w-7 h-7 rounded-lg hover:bg-surface-3 flex items-center justify-center text-text-disabled hover:text-danger transition-colors"
              title={t('chat.redPacketSend')}
            >
              <span className="text-[13px] font-semibold">🧧</span>
            </button>
          </div>

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

          <div className="absolute bottom-2 right-2">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!input.trim()}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all
                ${
                  input.trim()
                    ? 'border border-white/20 bg-[#0d9488] text-white hover:bg-[#0f766e]'
                    : 'cursor-not-allowed text-text-disabled'
                }`}
              aria-label="Send"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          </div>
        </div>
        {imageUploading && (
          <p className="mt-2 px-2 text-[10px] text-text-disabled font-mono">{t('chat.imageUploading')}</p>
        )}
        {lastActionError && !imageUploading && (
          <div className="mt-2 px-2 text-[11px] text-danger">
            {lastActionError === 'OFF_PLATFORM_CONTACT' ? t('chat.contactSolicitationBlocked') : lastActionError}
          </div>
        )}
      </div>

      {showRedPacket && (
        <RedPacketModal onConfirm={handleRedPacketConfirm} onClose={() => setShowRedPacket(false)} />
      )}
    </>
  );
}
