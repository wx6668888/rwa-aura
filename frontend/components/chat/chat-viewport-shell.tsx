'use client'

import { useLayoutEffect, useRef, type ReactNode } from 'react'

/**
 * DApp WebView / 100dvh：高度常按整屏算，输入栏被挤出可视区。
 * iOS Safari / PWA：仅把外壳高度设为 visualViewport.height 仍会与「布局视口」错位，
 * 键盘弹出时须同步 visualViewport 的 offsetTop/offsetLeft + width/height，
 * 用 fixed 框住真正的可见矩形，输入栏才能贴在键盘上方。
 */
export function ChatViewportShell({ children }: { children: ReactNode }) {
  const shellRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const el = shellRef.current
    if (!el) return

    const apply = () => {
      const vv = window.visualViewport
      if (!vv) {
        el.style.position = 'fixed'
        el.style.top = '0'
        el.style.left = '0'
        el.style.right = '0'
        el.style.bottom = '0'
        el.style.width = ''
        el.style.height = ''
        return
      }

      el.style.position = 'fixed'
      el.style.top = `${vv.offsetTop}px`
      el.style.left = `${vv.offsetLeft}px`
      el.style.right = 'auto'
      el.style.bottom = 'auto'
      el.style.width = `${Math.max(0, Math.round(vv.width))}px`
      el.style.height = `${Math.max(0, Math.round(vv.height))}px`
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
      el.style.position = ''
      el.style.top = ''
      el.style.left = ''
      el.style.right = ''
      el.style.bottom = ''
      el.style.width = ''
      el.style.height = ''
    }
  }, [])

  return (
    <div
      ref={shellRef}
      className="fixed inset-0 z-[1] flex min-h-0 min-w-0 flex-col overflow-hidden overscroll-none bg-void-black"
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
    </div>
  )
}
