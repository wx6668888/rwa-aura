'use client'

import { useEffect, useState } from 'react'
import { fmtTimeAgo } from '@/lib/network-page-doc'

type Props = {
  autoText: string
  lastLabel: string
  lastRefreshMs: number
  localeBcp47: string
}

export function AutoRefreshBar({ autoText, lastLabel, lastRefreshMs, localeBcp47 }: Props) {
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((x) => x + 1), 1000)
    return () => clearInterval(id)
  }, [])
  const ago = fmtTimeAgo(Date.now() - lastRefreshMs, localeBcp47)

  return (
    <div
      className="flex items-center justify-between border-b border-[#00f5d414] px-5 py-[7px]"
      style={{ background: 'rgba(0,245,212,0.04)' }}
    >
      <div className="flex items-center gap-2">
        <span
          className="h-1.5 w-1.5 rounded-full bg-[#22c55e]"
          style={{ animation: 'blink 2s infinite' }}
        />
        <span className="text-[11px] text-[#475569]">{autoText}</span>
      </div>
      <span className="text-[11px] text-[#475569]">
        {lastLabel}{' '}
        <span className="font-[family-name:var(--font-jetbrains-mono)] text-[#00f5d4]">{ago}</span>
      </span>
    </div>
  )
}
