'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import {
  LayoutDashboard,
  ArrowUpCircle,
  Network,
  Share2,
  Coins,
  Gift,
  Calculator,
  BarChart3,
  FileText,
  Megaphone,
  CircleHelp,
  Link2,
  type LucideIcon,
} from 'lucide-react';
import { useLocale } from '@/components/locale-provider';
import { useTranslation } from '@/lib/i18n';

export type QuickLinkItem = { path: string; labelKey: string };

/**
 * 与主站导航分组一致；已去掉质押 / 兑换 / 行情 / 治理（对应原「质押讨论、交易、VIP 休息室」等频道向入口）
 */
export const CHAT_QUICK_LINK_GROUPS: { labelKey: string; items: QuickLinkItem[] }[] = [
  {
    labelKey: 'nav.group.mine',
    items: [
      { path: '/dashboard', labelKey: 'chat.quickLinkDashboard' },
      { path: '/withdraw', labelKey: 'chat.quickLinkWithdraw' },
      { path: '/nodes', labelKey: 'chat.quickLinkNodes' },
      { path: '/referral-network', labelKey: 'chat.quickLinkReferral' },
      { path: '/dividend', labelKey: 'chat.quickLinkDividend' },
    ],
  },
  {
    labelKey: 'nav.group.trade',
    items: [{ path: '/lucky', labelKey: 'chat.quickLinkLucky' }],
  },
  {
    labelKey: 'nav.group.analytics',
    items: [
      { path: '/calculator', labelKey: 'chat.quickLinkCalculator' },
      { path: '/analytics', labelKey: 'nav.analytics' },
    ],
  },
  {
    labelKey: 'nav.group.info',
    items: [
      { path: '/knowledge', labelKey: 'chat.quickLinkKnowledge' },
      { path: '/announcements', labelKey: 'chat.quickLinkAnnouncements' },
      { path: '/help', labelKey: 'chat.quickLinkHelp' },
    ],
  },
];

export const CHAT_QUICK_LINKS: QuickLinkItem[] = CHAT_QUICK_LINK_GROUPS.flatMap((g) => g.items);

const QUICK_LINK_ICONS: Record<string, LucideIcon> = {
  '/dashboard': LayoutDashboard,
  '/withdraw': ArrowUpCircle,
  '/nodes': Network,
  '/referral-network': Share2,
  '/dividend': Coins,
  '/lucky': Gift,
  '/calculator': Calculator,
  '/analytics': BarChart3,
  '/knowledge': FileText,
  '/announcements': Megaphone,
  '/help': CircleHelp,
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSelect: (path: string, label: string) => void;
};

export function QuickLinksModal({ open, onClose, onSelect }: Props) {
  const { locale } = useLocale();
  const { t } = useTranslation(locale);

  if (!open) return null;

  const panel = (
    <div
      className="fixed inset-0 z-[220] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-links-title"
      onClick={onClose}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <div
        className="flex max-h-[min(82dvh,560px)] w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-[#64748b]/30 bg-[#334155]/60 shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-3xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[#ffffff0d] px-4 py-3">
          <h2 id="quick-links-title" className="text-base font-semibold text-[#e2e8f0]">
            {t('chat.quickLinksTitle')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-[12px] text-[#94a3b8] transition-colors hover:bg-[#13131e] hover:text-[#e2e8f0]"
          >
            {t('chat.emojiPickerClose')}
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-3 py-3 [touch-action:pan-y]">
          {CHAT_QUICK_LINK_GROUPS.map((group) => (
            <div key={group.labelKey}>
              <div className="mb-1.5 px-1 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[#64748b]">
                {t(group.labelKey)}
              </div>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const label = t(item.labelKey);
                  const Icon = QUICK_LINK_ICONS[item.path] || Link2;
                  return (
                    <button
                      key={item.path}
                      type="button"
                      onClick={() => {
                        onSelect(item.path, label);
                        onClose();
                      }}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-[#94a3b8] transition-all hover:bg-[#13131e] hover:text-[#e2e8f0]"
                    >
                      <Icon className="h-4 w-4 shrink-0 opacity-90" />
                      <span className="min-w-0 flex-1">{label}</span>
                      <span className="shrink-0 font-mono text-[10px] text-[#64748b]">{item.path}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(panel, document.body) : null;
}
