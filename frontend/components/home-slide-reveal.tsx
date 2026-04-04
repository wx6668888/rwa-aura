'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'

type Props = {
  children: ReactNode
  /** 从左侧或右侧滑入视口 */
  from: 'left' | 'right'
  className?: string
}

/** 首页「最新质押」以下区块：依次左右滑入，较慢过渡（尊重系统减少动效） */
export function HomeSlideReveal({ children, from, className }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [on, setOn] = useState(false)
  const reduced = usePrefersReducedMotion()

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          requestAnimationFrame(() => requestAnimationFrame(() => setOn(true)))
          io.disconnect()
        }
      },
      { threshold: 0.06, rootMargin: '0px 0px 14% 0px' }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const hidden = from === 'left' ? '-translate-x-16 sm:-translate-x-28' : 'translate-x-16 sm:translate-x-28'
  const cls =
    reduced || on ? 'translate-x-0 opacity-100' : `${hidden} opacity-0`

  return (
    <div
      ref={ref}
      className={`transition-[transform,opacity] ease-out ${
        reduced ? 'duration-0' : 'duration-[2000ms]'
      } ${cls} ${className ?? ''}`}
    >
      {children}
    </div>
  )
}
