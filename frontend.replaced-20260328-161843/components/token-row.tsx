'use client'

import { useBalance } from 'wagmi'
import { formatUnits } from 'viem'
import { TokenIcon } from '@/components/swap/token-icon'

type Props = {
  symbol: string
  name: string
  iconUrl: string
  accent: string
  balanceTarget: 'native' | `0x${string}`
  userAddress: `0x${string}`
  dexTradeable: boolean
  comingSoonLabel: string
  /** 可点击时用于钱包弹窗内展开该币种链上记录 */
  onRowClick?: () => void
}

export function TokenRow({
  symbol,
  name,
  iconUrl,
  accent,
  balanceTarget,
  userAddress,
  dexTradeable,
  comingSoonLabel,
  onRowClick,
}: Props) {
  const { data: balance } = useBalance({
    address: userAddress,
    token: balanceTarget === 'native' ? undefined : balanceTarget,
  })

  const wideToken = ['BNB', 'WBNB', 'ETH', 'BTCB'].includes(symbol)
  const formatted = balance
    ? parseFloat(formatUnits(balance.value, balance.decimals)).toFixed(wideToken ? 4 : 2)
    : '0.00'

  const rowClass =
    'flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left' +
    (onRowClick ? ' cursor-pointer transition-colors hover:bg-surface-2/50 active:bg-surface-2/70' : '')

  const inner = (
    <>
      <TokenIcon symbol={symbol} iconUrl={iconUrl} accent={accent} sizeClass="h-10 w-10 text-sm" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[15px] font-bold text-text-primary">{symbol}</span>
          {!dexTradeable && (
            <span className="rounded-md border border-border-subtle bg-surface-2 px-2 py-0.5 text-[10px] font-semibold text-text-secondary">
              {comingSoonLabel}
            </span>
          )}
        </div>
        <div className="truncate text-[11px] text-text-secondary">{name}</div>
      </div>
      <div className="shrink-0 font-mono text-[15px] font-semibold tabular-nums text-text-primary">
        {formatted}
      </div>
    </>
  )

  if (onRowClick) {
    return (
      <button type="button" onClick={onRowClick} className={rowClass}>
        {inner}
      </button>
    )
  }

  return <div className={rowClass}>{inner}</div>
}
