'use client'

import Link from 'next/link'
import { ArrowLeft, RefreshCw } from 'lucide-react'

type Props = {
  title: string
  backLabel: string
  backHref: string
  refreshLabel: string
  onRefresh: () => void
  spinning: boolean
}

export function NetworkHeader({ title, backLabel, backHref, refreshLabel, onRefresh, spinning }: Props) {
  return (
    <header
      className="sticky top-[64px] z-[90] flex items-center justify-between border-b border-[#ffffff0f] px-5 py-4 backdrop-blur-[20px] lg:top-[72px]"
      style={{ background: 'rgba(5,5,10,0.88)' }}
    >
      <Link href={backHref} className="flex items-center gap-1.5 text-[#94a3b8] transition-colors hover:text-[#f1f5f9]">
        <ArrowLeft className="h-4 w-4" />
        <span className="text-[13px]">{backLabel}</span>
      </Link>
      <h1 className="font-[family-name:var(--font-space-grotesk)] text-[15px] font-bold text-[#f1f5f9]">{title}</h1>
      <button
        type="button"
        onClick={onRefresh}
        className="inline-flex items-center gap-1.5 rounded-lg border border-[#00f5d42e] bg-[#00f5d41a] px-3 py-1.5 text-[12px] font-medium text-[#00f5d4]"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${spinning ? 'animate-spin' : ''}`} />
        <span className="hidden sm:inline">{refreshLabel}</span>
      </button>
    </header>
  )
}
