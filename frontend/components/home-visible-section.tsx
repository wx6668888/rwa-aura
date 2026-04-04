'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

type Props = {
  /** 未激活时占位高度，减轻布局跳动 */
  minHeight: string
  /**
   * 视口预取：默认向下多判一段，便于用户即将滑到时再挂载子树。
   * 格式同 IntersectionObserver rootMargin。
   */
  rootMargin?: string
  children: ReactNode
  className?: string
}

/**
 * 首页性能：子树仅在接近视口时挂载，从而推迟该分支的 dynamic import / 子组件请求。
 */
export function HomeVisibleSection({ minHeight, rootMargin = '0px 0px 28% 0px', children, className }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el || active) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setActive(true)
          io.disconnect()
        }
      },
      { root: null, rootMargin, threshold: 0.01 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [active, rootMargin])

  return (
    <div ref={ref} className={className}>
      {active ? (
        children
      ) : (
        <div
          className="w-full animate-pulse rounded-2xl bg-white/[0.03]"
          style={{ minHeight }}
          aria-hidden
        />
      )}
    </div>
  )
}
