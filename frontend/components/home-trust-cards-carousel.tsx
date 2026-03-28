'use client'

import { useLayoutEffect, useRef } from 'react'
import { WithdrawCtaCard } from '@/components/withdraw-cta-card'
import { SecurityTransparencyCard } from '@/components/security-transparency-card'

const SLIDE_CLASS =
  'w-[min(92vw,42rem)] max-w-[42rem] shrink-0 snap-center max-lg:snap-always lg:w-full lg:max-w-none lg:flex-1 lg:min-w-0'

/**
 * 左：提现引导卡；右：安全可靠卡。
 * 窄屏横向滑动，默认滚到右侧优先展示「安全可靠」；向左滑可见提现卡。
 * 宽屏 lg+ 并排展示，无需滑动。
 */
export function HomeTrustCardsCarousel() {
  const scrollerRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    const goEnd = () => {
      el.scrollLeft = Math.max(0, el.scrollWidth - el.clientWidth)
    }
    goEnd()
    window.addEventListener('resize', goEnd)
    return () => window.removeEventListener('resize', goEnd)
  }, [])

  return (
    <section className="mx-auto mt-2 w-full max-w-7xl px-4 pb-3 lg:px-8" aria-label="安全与提现">
      <p className="mb-2 text-center text-[11px] text-[#64748b] lg:hidden" aria-hidden>
        ← 向左滑动，查看提现入口
      </p>
      <div
        ref={scrollerRef}
        className="flex touch-pan-x gap-4 overflow-x-auto scroll-smooth pb-1 [-ms-overflow-style:none] [scrollbar-width:thin] snap-x snap-mandatory lg:snap-none lg:overflow-x-visible lg:pb-0 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#1f2733]"
      >
        <WithdrawCtaCard className={SLIDE_CLASS} />
        <SecurityTransparencyCard className={SLIDE_CLASS} />
      </div>
    </section>
  )
}
