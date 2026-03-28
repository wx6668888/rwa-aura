'use client'

import { ChevronDown } from 'lucide-react'
import type { SwapTokenMeta } from '@/lib/swap-tokens'
import { TokenIcon } from '@/components/swap/token-icon'
import { cn } from '@/lib/utils'

type Props = {
  label: string
  value: string
  onChange: (v: string) => void
  token: SwapTokenMeta
  balanceDisplay: string
  onTokenClick: () => void
  showMaxHalf?: boolean
  onMax?: () => void
  onHalf?: () => void
  disabled?: boolean
  readOnly?: boolean
  usdHint?: string
  /** DEX 等场景：更小的内边距与字号 */
  compact?: boolean
  className?: string
  /** 嵌在大卡片内：内层小面板样式，不再单独成最外框卡片 */
  embedded?: boolean
}

export function SwapAmountRow({
  label,
  value,
  onChange,
  token,
  balanceDisplay,
  onTokenClick,
  showMaxHalf,
  onMax,
  onHalf,
  disabled,
  readOnly,
  usdHint,
  compact,
  className,
  embedded,
}: Props) {
  return (
    <div
      className={cn(
        'transition-colors',
        embedded
          ? 'rounded-xl border border-plasma-cyan/[0.08] bg-[#12121a]/95 hover:border-plasma-cyan/20'
          : 'rounded-2xl border border-border-active bg-surface-2/80 hover:border-plasma-cyan/35',
        compact ? 'p-2.5 sm:p-3' : 'p-4 sm:p-5',
        className,
      )}
    >
      <div className={`flex items-center justify-between gap-2 ${compact ? 'mb-1.5' : 'mb-3'}`}>
        <span className={`font-medium text-text-secondary ${compact ? 'text-[11px]' : 'text-[12px]'}`}>{label}</span>
        <div className="flex items-center gap-2 text-[11px] text-text-secondary font-jetbrains">
          <span>
            Bal: <span className="text-text-primary">{balanceDisplay}</span>
          </span>
          {showMaxHalf && onMax && onHalf && (
            <div className="flex gap-1">
              <button
                type="button"
                onClick={onHalf}
                className={
                  embedded
                    ? 'rounded-md border border-plasma-cyan/30 bg-transparent px-2 py-0.5 text-[10px] font-semibold text-plasma-cyan/90 hover:bg-plasma-cyan/10'
                    : 'rounded-md px-1.5 py-0.5 text-[10px] font-semibold text-plasma-cyan/90 hover:bg-plasma-cyan/10'
                }
              >
                HALF
              </button>
              <button
                type="button"
                onClick={onMax}
                className={
                  embedded
                    ? 'rounded-md border border-plasma-cyan/30 bg-transparent px-2 py-0.5 text-[10px] font-semibold text-plasma-cyan/90 hover:bg-plasma-cyan/10'
                    : 'rounded-md px-1.5 py-0.5 text-[10px] font-semibold text-plasma-cyan/90 hover:bg-plasma-cyan/10'
                }
              >
                MAX
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 min-w-0">
        <input
          type="text"
          inputMode="decimal"
          autoComplete="off"
          placeholder="0.0"
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/[^0-9.]/g, ''))}
          disabled={disabled || readOnly}
          className={`min-w-0 flex-1 bg-transparent font-jetbrains font-semibold leading-tight text-text-primary outline-none placeholder:text-text-disabled disabled:opacity-60 ${
            compact ? 'text-[20px] sm:text-xl' : 'text-[28px] sm:text-[32px]'
          }`}
        />
        <button
          type="button"
          onClick={onTokenClick}
          className={
            embedded
              ? `flex shrink-0 items-center gap-1.5 rounded-full border border-white/12 bg-[#14141c] transition-colors hover:border-plasma-cyan/35 hover:bg-[#181820] ${
                  compact ? 'py-1.5 pl-2 pr-1.5' : 'py-2 pl-2.5 pr-2'
                }`
              : `flex shrink-0 items-center gap-1.5 rounded-full border border-border-active bg-surface-1 transition-all hover:border-plasma-cyan/50 hover:bg-surface-3 ${
                  compact ? 'py-1.5 pl-2 pr-1.5' : 'py-2 pl-2.5 pr-2'
                }`
          }
        >
          <TokenIcon
            symbol={token.symbol}
            iconUrl={token.iconUrl}
            accent={token.accent}
            sizeClass={compact ? 'h-6 w-6 text-[10px]' : 'h-7 w-7 text-[11px]'}
          />
          <span className={`font-bold text-text-primary ${compact ? 'text-[13px]' : 'text-[14px]'}`}>{token.symbol}</span>
          <ChevronDown className={`text-text-secondary ${compact ? 'h-3.5 w-3.5' : 'h-4 w-4'}`} />
        </button>
      </div>
      {usdHint != null && (
        <div
          className={`px-0.5 font-jetbrains text-text-secondary leading-relaxed ${compact ? 'mt-1 text-[9px]' : 'mt-2.5 text-[11px]'}`}
        >
          {usdHint}
        </div>
      )}
    </div>
  )
}
