'use client';

import React, { useState } from 'react';
import { useLocale } from '@/components/locale-provider';
import { useTranslation } from '@/lib/i18n';
import { EMOJI_CATEGORIES } from './emoji-data';

type Props = {
  open: boolean;
  onClose: () => void;
  onPick: (emoji: string) => void;
};

const CAT_LABEL: Record<string, { en: string; zh: string }> = {
  smile: { en: 'Smileys', zh: '笑脸' },
  gesture: { en: 'Hands', zh: '手势' },
  heart: { en: 'Hearts', zh: '爱心' },
  food: { en: 'Food', zh: '食物' },
  misc: { en: 'More', zh: '更多' },
};

export function EmojiPickerModal({ open, onClose, onPick }: Props) {
  const { locale } = useLocale();
  const { t } = useTranslation(locale);
  const [tab, setTab] = useState(EMOJI_CATEGORIES[0].id);

  if (!open) return null;

  const active = EMOJI_CATEGORIES.find((c) => c.id === tab) ?? EMOJI_CATEGORIES[0];
  const isZh = locale === 'zh';

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/70 p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="emoji-picker-title"
      onClick={onClose}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <div
        className="w-full sm:max-w-md max-h-[min(70dvh,420px)] rounded-t-2xl sm:rounded-2xl border border-border-subtle bg-surface-1 shadow-xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-3 py-2 border-b border-border-subtle">
          <h2 id="emoji-picker-title" className="text-sm font-semibold text-text-primary">
            {t('chat.emojiPickerTitle')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-[12px] text-text-secondary hover:text-text-primary px-2 py-1"
          >
            {t('chat.emojiPickerClose')}
          </button>
        </div>
        <div className="flex gap-1.5 px-2 pt-2 overflow-x-auto scrollbar-thin [scrollbar-gutter:stable]">
          {EMOJI_CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setTab(c.id)}
              className={`shrink-0 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium leading-none transition-colors ${
                tab === c.id
                  ? 'border border-white/20 bg-[#0d9488] text-white'
                  : 'text-text-disabled hover:bg-surface-2'
              }`}
            >
              {CAT_LABEL[c.id] ? (isZh ? CAT_LABEL[c.id].zh : CAT_LABEL[c.id].en) : c.id}
            </button>
          ))}
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto p-3 grid grid-cols-8 sm:grid-cols-9 gap-1">
          {active.emojis.map((em) => (
            <button
              key={em}
              type="button"
              className="w-9 h-9 sm:w-8 sm:h-8 text-xl leading-none rounded-lg hover:bg-surface-2 flex items-center justify-center"
              onClick={() => {
                onPick(em);
                onClose();
              }}
            >
              {em}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
