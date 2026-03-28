'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

type Props = {
  symbol: string
  iconUrl?: string
  /** 无图或加载失败时的渐变字标 */
  accent: string
  sizeClass: string
  className?: string
}

/** 代币图标：优先远程 PNG，外层无底色（透明）；失败则回退为字标 */
export function TokenIcon({ symbol, iconUrl, accent, sizeClass, className }: Props) {
  const [failed, setFailed] = useState(false)
  const showImg = Boolean(iconUrl) && !failed

  if (!showImg) {
    return (
      <span
        className={cn(
          'flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-bold text-void-black',
          accent,
          sizeClass,
          className,
        )}
      >
        {symbol.slice(0, 2).toUpperCase()}
      </span>
    )
  }

  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-transparent',
        sizeClass,
        className,
      )}
    >
      <img
        src={iconUrl}
        alt=""
        className="h-full w-full object-contain"
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
      />
    </span>
  )
}
