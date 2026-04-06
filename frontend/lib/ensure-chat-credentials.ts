import { chatHttpUrl, fetchChatAuthSigningMessage } from '@/lib/chat-api'
import { fetchWithTimeout } from '@/lib/fetch-with-timeout'
import {
  readPersistedChatAuth,
  writePersistedChatAuth,
  clearPersistedChatAuth,
} from '@/lib/chat-auth-storage'

type SignMessageFn = (args: { message: string; account: `0x${string}` }) => Promise<`0x${string}`>

let inflight: Promise<PersistedChatAuth | null> | null = null
let inflightFor: string | null = null

/**
 * 保证当前钱包在本地已有可用的聊天签名凭证（与 chat-server 校验 message 一致）。
 * - 已缓存且地址一致：直接返回，不再弹签。
 * - 多组件同时调用：共享同一 in-flight，避免重复 signMessage。
 */
export async function ensureChatCredentials(
  address: string | undefined,
  signMessageAsync: SignMessageFn
): Promise<PersistedChatAuth | null> {
  if (!address || address.toLowerCase().startsWith('guest_')) return null

  const a = address.toLowerCase()
  const existing = readPersistedChatAuth()
  if (existing?.address?.toLowerCase() === a && existing.signature?.startsWith('0x')) {
    return existing
  }

  if (inflight && inflightFor === a) return inflight

  inflightFor = a
  inflight = (async (): Promise<PersistedChatAuth | null> => {
    try {
      const message = await fetchChatAuthSigningMessage()
      const signature = await signMessageAsync({ message, account: address as `0x${string}` })
      if (typeof signature !== 'string' || !signature.startsWith('0x')) {
        return null
      }
      const res = await fetchWithTimeout(chatHttpUrl('auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, signature }),
        timeoutMs: 22000,
      })
      if (!res.ok) {
        clearPersistedChatAuth()
        return null
      }
      const auth: PersistedChatAuth = { address, signature }
      writePersistedChatAuth(auth)
      return auth
    } catch {
      return null
    } finally {
      inflight = null
      inflightFor = null
    }
  })()

  return inflight
}
