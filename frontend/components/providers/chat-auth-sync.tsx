'use client'

import { useEffect, useRef } from 'react'
import { useAccount, useSignMessage } from 'wagmi'
import { readPersistedChatAuth } from '@/lib/chat-auth-storage'
import { ensureChatCredentials } from '@/lib/ensure-chat-credentials'

/**
 * 全站：用户已在主站连接钱包后，预取聊天签名并写入 localStorage。
 * 进入 /chat 时 ChatProvider 可直接恢复会话，无需再在聊天门页点一次「连接」。
 * 若用户拒绝签名，不写入；仍可进聊天页手动重试。
 */
export function ChatAuthSync() {
  const { address, isConnected, status } = useAccount()
  const { signMessageAsync } = useSignMessage()
  const ranForAddr = useRef<string | null>(null)

  useEffect(() => {
    if (!isConnected || !address || status !== 'connected') {
      if (!isConnected) ranForAddr.current = null
      return
    }
    if (address.toLowerCase().startsWith('guest_')) return

    const key = address.toLowerCase()
    const cached = readPersistedChatAuth()
    const hasCachedAuth =
      cached?.address?.toLowerCase() === key &&
      (cached.sessionToken?.length > 8 || cached.signature?.startsWith('0x'))
    if (hasCachedAuth) {
      ranForAddr.current = key
      return
    }
    if (ranForAddr.current === key) return

    let cancelled = false
    ;(async () => {
      const auth = await ensureChatCredentials(address, signMessageAsync)
      if (!cancelled && auth) ranForAddr.current = key
    })()

    return () => {
      cancelled = true
    }
  }, [isConnected, address, status, signMessageAsync])

  return null
}
