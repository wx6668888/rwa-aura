'use client'

import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { fmtTimeAgo } from '@/lib/network-page-doc'

type Props = {
  lastRefreshMs: number
  lastLabel: string
  refreshLabel: string
  localeBcp47: string
  onRefresh: () => void
  spinning: boolean
}

export function NetworkRefreshRow({ lastRefreshMs, lastLabel, refreshLabel, localeBcp47, onRefresh, spinning }: Props) {
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((x) => x + 1), 1000)
    return () => clearInterval(id)
  }, [])
  const ago = fmtTimeAgo(Date.now() - lastRefreshMs, localeBcp47)

  return (
    <div
      className="flex items-center justify-between gap-3 border-b border-[#00f5d40f] px-5 py-1.5"
      style={{ background: 'rgba(0,245,212,0.03)' }}
    >
      <button
        type="button"
        onClick={onRefresh}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-[#00f5d424] bg-[#00f5d412] px-2.5 py-1.5 text-[11px] font-semibold text-[#00f5d4] transition-colors hover:bg-[#00f5d41c]"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${spinning ? 'animate-spin' : ''}`} />
        {refreshLabel}
      </button>
      <span className="min-w-0 flex-1 text-right text-[9px] font-medium leading-snug tracking-wide text-[#475569]">
        {lastLabel}
        <span className="ml-1 inline font-[family-name:var(--font-jetbrains-mono)] font-normal text-[#00f5d4]/90">
          {ago}
        </span>
      </span>
    </div>
  )
}
