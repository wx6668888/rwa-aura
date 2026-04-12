'use client'

import type { ReactNode } from 'react'
import { ChatProvider } from '@/components/chat/chat-context'
import { ChatSheetProvider } from '@/components/providers/chat-sheet-context'

/** 全站单一 Chat 上下文：顶栏群聊抽屉 + /chat 全屏页共用；须包在 WagmiProvider 内（ChatProvider 使用 useAccount） */
export function AppChatLayer({ children }: { children: ReactNode }) {
  return (
    <ChatProvider>
      <ChatSheetProvider>{children}</ChatSheetProvider>
    </ChatProvider>
  )
}
