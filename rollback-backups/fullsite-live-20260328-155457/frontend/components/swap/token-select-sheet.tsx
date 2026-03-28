'use client'

import { X } from 'lucide-react'
import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'
import type { SwapTokenListItem } from '@/lib/swap-tokens'
import { isTradeableSwapToken } from '@/lib/swap-tokens'
import { TokenIcon } from '@/components/swap/token-icon'

const PREVIEW_ACCENT = 'from-slate-600 to-slate-800'

type Props = {
  open: boolean
  onClose: () => void
  tokens: SwapTokenListItem[]
  excludeId?: string
  title: string
  onPick: (t: SwapTokenListItem) => void
}

export function TokenSelectSheet({ open, onClose, tokens, excludeId, title, onPick }: Props) {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)

  if (!open) return null
  const list = excludeId ? tokens.filter((x) => x.id !== excludeId) : tokens

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[min(520px,85vh)] w-full max-w-md rounded-t-3xl border border-border-active bg-surface-1 shadow-[0_-8px_40px_rgba(0,245,212,0.08)] sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
          <h3 className="text-[15px] font-bold text-text-primary">{title}</h3>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-text-secondary hover:bg-surface-2 hover:text-text-primary">
            <X className="h-5 w-5" />
          </button>
        </div>
        <ul className="max-h-[420px] overflow-y-auto p-2">
          {list.map((row) => {
            const tradeable = isTradeableSwapToken(row)
            const accent = tradeable ? row.accent : PREVIEW_ACCENT

            if (!tradeable) {
              return (
                <li key={row.id}>
                  <div className="flex w-full cursor-not-allowed items-center gap-3 rounded-xl px-3 py-3 text-left opacity-70">
                    <TokenIcon symbol={row.symbol} iconUrl={row.iconUrl} accent={accent} sizeClass="h-10 w-10 text-sm" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[15px] font-bold text-text-primary">{row.symbol}</span>
                        <span className="rounded-md border border-border-subtle bg-surface-2 px-2 py-0.5 text-[10px] font-semibold text-text-secondary">
                          {t('swap.tokenComingSoon')}
                        </span>
                      </div>
                      <div className="truncate text-[11px] text-text-secondary">{row.name}</div>
                    </div>
                  </div>
                </li>
              )
            }

            return (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() => {
                    onPick(row)
                    onClose()
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-surface-2"
                >
                  <TokenIcon symbol={row.symbol} iconUrl={row.iconUrl} accent={accent} sizeClass="h-10 w-10 text-sm" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[15px] font-bold text-text-primary">{row.symbol}</div>
                    <div className="truncate text-[11px] text-text-secondary">{row.name}</div>
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
