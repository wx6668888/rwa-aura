'use client';

import React from 'react';
import { useLocale } from '@/components/locale-provider';
import { useTranslation } from '@/lib/i18n';

export type QuickLinkItem = { path: string; labelKey: string };

/** 站内可分享页面（与 chat-server quick-link 白名单一致） */
export const CHAT_QUICK_LINKS: QuickLinkItem[] = [
  { path: '/stake', labelKey: 'chat.quickLinkStake' },
  { path: '/withdraw', labelKey: 'chat.quickLinkWithdraw' },
  { path: '/swap', labelKey: 'chat.quickLinkSwap' },
  { path: '/dashboard', labelKey: 'chat.quickLinkDashboard' },
  { path: '/lucky', labelKey: 'chat.quickLinkLucky' },
  { path: '/calculator', labelKey: 'chat.quickLinkCalculator' },
  { path: '/knowledge', labelKey: 'chat.quickLinkKnowledge' },
  { path: '/announcements', labelKey: 'chat.quickLinkAnnouncements' },
  { path: '/referral-network', labelKey: 'chat.quickLinkReferral' },
  { path: '/dividend', labelKey: 'chat.quickLinkDividend' },
  { path: '/nodes', labelKey: 'chat.quickLinkNodes' },
  { path: '/market', labelKey: 'chat.quickLinkMarket' },
  { path: '/governance', labelKey: 'chat.quickLinkGovernance' },
  { path: '/help', labelKey: 'chat.quickLinkHelp' },
];

type Props = {
  open: boolean;
  onClose: () => void;
  onSelect: (path: string, label: string) => void;
};

export function QuickLinksModal({ open, onClose, onSelect }: Props) {
  const { locale } = useLocale();
  const { t } = useTranslation(locale);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/70 p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-links-title"
      onClick={onClose}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <div
        className="w-full sm:max-w-sm max-h-[min(75dvh,480px)] rounded-t-2xl sm:rounded-2xl border border-border-subtle bg-surface-1 shadow-xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-3 py-2 border-b border-border-subtle">
          <h2 id="quick-links-title" className="text-sm font-semibold text-text-primary">
            {t('chat.quickLinksTitle')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-[12px] text-text-secondary hover:text-text-primary px-2 py-1"
          >
            {t('chat.emojiPickerClose')}
          </button>
        </div>
        <div className="overflow-y-auto p-2 space-y-1">
          {CHAT_QUICK_LINKS.map((item) => {
            const label = t(item.labelKey);
            return (
              <button
                key={item.path}
                type="button"
                onClick={() => {
                  onSelect(item.path, label);
                  onClose();
                }}
                className="w-full text-left px-3 py-2.5 rounded-xl text-[13px] text-text-primary hover:bg-surface-2 border border-transparent hover:border-border-subtle transition-colors flex items-center justify-between gap-2"
              >
                <span>{label}</span>
                <span className="text-[10px] font-mono text-text-disabled truncate max-w-[45%]">{item.path}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
