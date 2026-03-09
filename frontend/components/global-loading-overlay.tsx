'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { DotLottieAnimation } from '@/components/lottie-animation'

const LOADING_LOTTIE_SRC = '/动画/loading animation.lottie'

/**
 * 全局路由加载动画：以悬浮层形式盖在当前页之上，不替换整页，避免“重新加载”的慢体验。
 * 使用 Portal 挂到 body，半透明背景，当前页（含 layout）仍可见。
 */
export function GlobalLoadingOverlay() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const overlay = (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0a0a0f]/50 backdrop-blur-[2px]"
      aria-live="polite"
      aria-busy="true"
      role="status"
    >
      <div className="h-[160px] w-[160px] sm:h-[200px] sm:w-[200px]">
        <DotLottieAnimation
          src={LOADING_LOTTIE_SRC}
          className="h-full w-full"
          autoplay
          loop
          speed={1}
        />
      </div>
      <p className="mt-3 text-xs font-medium uppercase tracking-widest text-[#64748b]">
        Loading
      </p>
    </div>
  )

  if (typeof document === 'undefined' || !mounted) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#0a0a0f]/50">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-[#00f5d4] border-t-transparent" />
      </div>
    )
  }

  return createPortal(overlay, document.body)
}
