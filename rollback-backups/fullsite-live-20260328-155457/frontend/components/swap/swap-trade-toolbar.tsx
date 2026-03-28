'use client'

import Link from 'next/link'
import { BarChart3, Bell } from 'lucide-react'
import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'

export type SwapModeTab = 'protocol' | 'tron' | 'dex'

type Props = {
  tab: SwapModeTab
  onTabChange: (t: SwapModeTab) => void
}

const iconBtn =
  'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#ffffff0d] bg-[#0d0d14]/90 text-[#94a3b8] transition-colors hover:border-plasma-cyan/25 hover:bg-[#13131e] hover:text-plasma-cyan'

export function SwapTradeToolbar({ tab, onTabChange }: Props) {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)

  const tabs: { id: SwapModeTab; label: string }[] = [
    { id: 'protocol', label: (t('swap.tabProtocol') || '协议').trim() || '协议' },
    { id: 'tron', label: (t('swap.tabTron') || 'TRON充值').trim() || 'TRON充值' },
    { id: 'dex', label: (t('swap.tabDex') || 'DEX').trim() || 'DEX' },
  ]

  return (
    <div
      className="fixed left-0 right-0 z-[95] border-b border-[#ffffff0d] bg-[#05050a]/92 backdrop-blur-xl"
      style={{ top: 'calc(var(--app-safe-top, 0px) + 4rem)' }}
    >
      <div className="mx-auto flex max-w-lg items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-4">
        {/* Pancake 式：深色槽 + 选中项为内部高亮胶囊 */}
        <div className="min-w-0 flex flex-1 justify-center sm:justify-start">
          <div
            className="scrollbar-hide flex w-full max-w-[min(100%,400px)] items-center gap-0.5 overflow-x-auto rounded-full bg-[#0a0a10] p-1 ring-1 ring-[#ffffff08]"
            role="tablist"
            aria-label={t('swap.toolbarMode')}
          >
            {tabs.map((x) => {
              const on = tab === x.id
              return (
                <button
                  key={x.id}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => onTabChange(x.id)}
                  className={`relative min-h-[36px] min-w-0 flex-1 whitespace-nowrap rounded-full px-3 py-2 text-center text-[11px] font-bold transition-all sm:min-h-[38px] sm:px-3.5 sm:text-[12px] ${
                    on
                      ? 'bg-[#1c1c28] text-plasma-cyan shadow-[inset_0_0_0_1px_rgba(0,245,212,0.22)]'
                      : 'text-[#64748b] hover:text-[#cbd5e1]'
                  }`}
                >
                  {x.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
          <Link
            href="/analytics"
            className={iconBtn}
            title={t('swap.toolbarChart')}
            aria-label={t('swap.toolbarChart')}
          >
            <BarChart3 className="h-4 w-4" />
          </Link>
          <Link
            href="/announcements"
            className={iconBtn}
            title={t('swap.toolbarAnnouncements')}
            aria-label={t('swap.toolbarAnnouncements')}
          >
            <Bell className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}
