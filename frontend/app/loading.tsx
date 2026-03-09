'use client'

import { GlobalLoadingOverlay } from '@/components/global-loading-overlay'

/**
 * Next.js App Router 全局 loading：以悬浮层盖在当前页之上，不替换整页、不重新加载，
 * 仅在上层显示 loading 动画，当前页（含 layout）仍可见，减少等待时的空白感。
 */
export default function Loading() {
  return (
    <>
      {/* 占位保持布局，不撑开整页，避免跳动 */}
      <div className="min-h-[60vh] w-full" aria-hidden="true" />
      <GlobalLoadingOverlay />
    </>
  )
}
