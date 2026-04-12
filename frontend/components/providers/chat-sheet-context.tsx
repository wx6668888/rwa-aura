'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { ChatErrorBoundary } from '@/components/chat/chat-error-boundary'
import { ChatAppShell } from '@/components/chat/chat-app-shell'

type ChatSheetContextValue = {
  openChatSheet: () => void
  closeChatSheet: () => void
  isChatSheetOpen: boolean
}

const ChatSheetContext = createContext<ChatSheetContextValue | null>(null)

const MIN_SHEET_PX = 300

export function useChatSheet(): ChatSheetContextValue {
  const ctx = useContext(ChatSheetContext)
  if (!ctx) {
    throw new Error('useChatSheet must be used within ChatSheetProvider')
  }
  return ctx
}

export function ChatSheetProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [entered, setEntered] = useState(false)
  const [sheetHeightPx, setSheetHeightPx] = useState<number | null>(null)
  const closeRef = useRef(() => {})

  const closeChatSheet = useCallback(() => setOpen(false), [])
  closeRef.current = closeChatSheet

  const openChatSheet = useCallback(() => setOpen(true), [])

  const handleOpenFullPage = useCallback(() => {
    closeChatSheet()
    router.push('/chat')
  }, [closeChatSheet, router])

  useEffect(() => {
    if (!open) return
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current()
    }
    window.addEventListener('keydown', onEsc)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onEsc)
      document.body.style.overflow = prev
    }
  }, [open])

  useEffect(() => {
    if (!open) {
      setEntered(false)
      setSheetHeightPx(null)
      return
    }
    const applyHeight = () => {
      const avail = window.visualViewport?.height ?? window.innerHeight
      const cap = Math.max(MIN_SHEET_PX, Math.min(720, Math.floor(avail * 0.9)))
      setSheetHeightPx(cap)
    }
    applyHeight()
    const vv = window.visualViewport
    const onResize = () => {
      setSheetHeightPx((prev) => {
        const cap = Math.max(MIN_SHEET_PX, Math.min(720, Math.floor((window.visualViewport?.height ?? window.innerHeight) * 0.9)))
        if (prev == null) return cap
        return Math.max(MIN_SHEET_PX, Math.min(prev, cap))
      })
    }
    vv?.addEventListener('resize', onResize)
    vv?.addEventListener('scroll', onResize)
    window.addEventListener('resize', onResize)
    const id = requestAnimationFrame(() => setEntered(true))
    return () => {
      cancelAnimationFrame(id)
      vv?.removeEventListener('resize', onResize)
      vv?.removeEventListener('scroll', onResize)
      window.removeEventListener('resize', onResize)
    }
  }, [open])

  return (
    <ChatSheetContext.Provider
      value={{ openChatSheet, closeChatSheet, isChatSheetOpen: open }}
    >
      {children}
      {open ? (
        <div
          className="fixed inset-0 z-[155] flex items-end justify-center overflow-x-hidden bg-black/65 backdrop-blur-sm sm:items-center"
          role="dialog"
          aria-modal
          onClick={() => closeChatSheet()}
        >
          <div
            className={`relative z-[156] flex w-full min-w-0 max-w-lg flex-col overflow-hidden rounded-t-3xl border border-[#00f5d420] bg-gradient-to-b from-[#0d0d14] via-[#0a0a10] to-[#0d0d14] shadow-[0_-16px_64px_rgba(0,0,0,0.55),0_0_0_1px_rgba(0,245,212,0.06)_inset] transition-transform duration-300 ease-out will-change-transform sm:rounded-3xl ${
              entered ? 'translate-y-0' : 'translate-y-full'
            }`}
            style={
              sheetHeightPx != null
                ? { height: sheetHeightPx, maxHeight: sheetHeightPx }
                : { maxHeight: 'min(86vh, 720px)' }
            }
            onClick={(ev) => ev.stopPropagation()}
          >
            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
              <ChatErrorBoundary>
                <ChatAppShell
                  variant="sheet"
                  onRequestClose={closeChatSheet}
                  onOpenFullPage={handleOpenFullPage}
                />
              </ChatErrorBoundary>
            </div>
          </div>
        </div>
      ) : null}
    </ChatSheetContext.Provider>
  )
}
