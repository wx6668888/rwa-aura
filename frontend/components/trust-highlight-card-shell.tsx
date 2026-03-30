import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function TrustHighlightCardShell({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('relative flex min-h-0 w-full flex-col', className)}>
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-[#1f2733] bg-[#0f1622]/75 p-5 backdrop-blur-[5px] sm:p-6">
        <div className="pointer-events-none absolute -right-32 -top-32 h-64 w-64 rounded-full border border-[#00f5d4]/20 shadow-[0_0_60px_rgba(0,245,212,0.12)]" />
        <div className="pointer-events-none absolute -right-20 -top-20 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(0,245,212,0.16),rgba(0,245,212,0.02)_65%,transparent_70%)]" />
        <div className="relative z-10 flex min-h-0 flex-1 flex-col">{children}</div>
      </div>
    </div>
  )
}
