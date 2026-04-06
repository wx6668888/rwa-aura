'use client'

import { useLayoutEffect, type ReactNode } from 'react'

/**
 * TP / MetaMask / 各类 DApp WebView 里 100dvh 往往按「整屏」算，不含底部浏览器栏，
 * 导致 flex 列过高，聊天输入框被顶到可视区域外。用 visualViewport.height 同步外壳高度。
 */
export function ChatViewportShell({ children }: { children: ReactNode }) {
  useLayoutEffect(() => {
    const root = document.documentElement
    const apply = () => {
      const vv = window.visualViewport
      const h = vv?.height ?? window.innerHeight
      root.style.setProperty('--chat-shell-h', `${Math.max(0, Math.round(h))}px`)
    }
    apply()
    const vv = window.visualViewport
    vv?.addEventListener('resize', apply)
    vv?.addEventListener('scroll', apply)
    window.addEventListener('resize', apply)
    return () => {
      vv?.removeEventListener('resize', apply)
      vv?.removeEventListener('scroll', apply)
      window.removeEventListener('resize', apply)
      root.style.removeProperty('--chat-shell-h')
    }
  }, [])

  return (
    <div
      className="flex min-h-0 w-full flex-col overflow-hidden overscroll-none bg-void-black"
      style={{
        height: 'var(--chat-shell-h, 100svh)',
        maxHeight: 'var(--chat-shell-h, 100svh)',
      }}
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
    </div>
  )
}
