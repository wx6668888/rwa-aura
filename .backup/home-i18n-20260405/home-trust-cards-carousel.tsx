'use client'

import { useLayoutEffect, useRef } from 'react'
import { KnowledgeHubCard } from '@/components/knowledge-hub-card'
import { WithdrawCtaCard } from '@/components/withdraw-cta-card'
import { SecurityTransparencyCard } from '@/components/security-transparency-card'

const SLIDE_CLASS =
  'flex h-[21rem] w-[min(92vw,42rem)] max-w-[42rem] shrink-0 snap-center max-lg:snap-always sm:h-[23rem] lg:h-[25rem] lg:w-full lg:max-w-none lg:flex-1 lg:min-w-0'

/**
 * 顺序：随时提现 → 安全可靠 → 知识库。
 * 窄屏横向滑动：默认对齐第二张「安全可靠」靠右（与原先双卡体验一致），向左滑提现、向右滑知识库。
 * 宽屏 lg+ 三列并排，同高。
 */
export function HomeTrustCardsCarousel() {
  const scrollerRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    const alignSecurityToRight = () => {
      const slides = Array.from(el.querySelectorAll<HTMLElement>(':scope > *'))
      if (slides.length >= 2) {
        const security = slides[1]
        el.scrollLeft = Math.max(0, security.offsetLeft + security.offsetWidth - el.clientWidth)
        return
      }
      el.scrollLeft = Math.max(0, el.scrollWidth - el.clientWidth)
    }
    alignSecurityToRight()
    window.addEventListener('resize', alignSecurityToRight)
    return () => window.removeEventListener('resize', alignSecurityToRight)
  }, [])

  return (
    <section className="mx-auto mt-2 w-full max-w-7xl px-4 pb-3 lg:px-8" aria-label="提现、安全与知识库">
      <div
        ref={scrollerRef}
        className="home-trust-cards-scroller flex items-stretch gap-2 overflow-x-auto scroll-smooth pb-1 [-ms-overflow-style:none] [scrollbar-width:thin] snap-x max-lg:snap-proximity sm:gap-3 lg:gap-4 lg:snap-none lg:overflow-x-visible lg:pb-0 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#1f2733]"
      >
        <WithdrawCtaCard className={SLIDE_CLASS} />
        <SecurityTransparencyCard className={SLIDE_CLASS} />
        <KnowledgeHubCard className={SLIDE_CLASS} />
      </div>
    </section>
  )
}
