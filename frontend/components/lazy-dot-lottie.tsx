'use client'

import { useEffect, useRef, useState } from 'react'
import { DotLottieAnimation } from '@/components/lottie-animation'

type Props = {
  src: string
  className?: string
  autoplay?: boolean
  loop?: boolean
  speed?: number
  /** 与 IntersectionObserver rootMargin 一致，略提前加载 */
  rootMargin?: string
}

/**
 * 进入视口后再挂载 DotLottie，避免首屏同时解码多路动画、拉取多个 .lottie。
 */
export function LazyDotLottieAnimation({
  src,
  className = '',
  autoplay = true,
  loop = true,
  speed = 1,
  rootMargin = '80px 0px 120px 0px',
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [show, setShow] = useState(false)

  useEffect(() => {
    const el = wrapRef.current
    if (!el || show) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShow(true)
          io.disconnect()
        }
      },
      { root: null, rootMargin, threshold: 0.01 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [show, rootMargin])

  return (
    <div ref={wrapRef} className={className}>
      {show ? (
        <DotLottieAnimation
          src={src}
          className="h-full min-h-0 w-full"
          autoplay={autoplay}
          loop={loop}
          speed={speed}
        />
      ) : (
        <div className="h-full min-h-[8rem] w-full bg-transparent" aria-hidden />
      )}
    </div>
  )
}
