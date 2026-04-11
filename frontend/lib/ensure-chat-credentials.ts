import { chatHttpUrl, fetchChatAuthSigningMessage } from '@/lib/chat-api'
import { fetchWithTimeout } from '@/lib/fetch-with-timeout'
import {
  readPersistedChatAuth,
  writePersistedChatAuth,
  clearPersistedChatAuth,
} from '@/lib/chat-auth-storage'

type SignMessageFn = (args: { message: string; account: `0x${string}` }) => Promise<`0x${string}`>

let inflight: Promise<import('@/lib/chat-auth-storage').PersistedChatAuth | null> | null = null
let inflightFor: string | null = null

/**
 * 保证当前钱包有可用的聊天凭证（会话令牌优先，免重复弹签）。
 * - 已有同地址 sessionToken：直接返回
 * - 仅有历史 signature：静默 POST /auth/login 换取 sessionToken（不弹钱包）
 * - 否则走 signMessage + login
 */
export async function ensureChatCredentials(
  address: string | undefined,
  signMessageAsync: SignMessageFn
): Promise<import('@/lib/chat-auth-storage').PersistedChatAuth | null> {
  if (!address || address.toLowerCase().startsWith('guest_')) return null

  const a = address.toLowerCase()
  const existing = readPersistedChatAuth()
  if (existing?.address?.toLowerCase() === a && existing.sessionToken && existing.sessionToken.length > 8) {
    return existing
  }

  if (existing?.address?.toLowerCase() === a && existing.signature?.startsWith('0x')) {
    try {
      const res = await fetchWithTimeout(chatHttpUrl('auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: existing.address, signature: existing.signature }),
        timeoutMs: 22000,
      })
      const data = (await res.json().catch(() => ({}))) as { sessionToken?: string }
      if (res.ok && typeof data.sessionToken === 'string' && data.sessionToken.length > 8) {
        const next: import('@/lib/chat-auth-storage').PersistedChatAuth = {
          address: existing.address,
          signature: existing.signature,
          sessionToken: data.sessionToken,
        }
        writePersistedChatAuth(next)
        return next
      }
    } catch {
      /* fall through to sign */
    }
  }

  if (inflight && inflightFor === a) return inflight

  inflightFor = a
  inflight = (async (): Promise<import('@/lib/chat-auth-storage').PersistedChatAuth | null> => {
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
      const data = (await res.json().catch(() => ({}))) as { sessionToken?: string }
      if (!res.ok) {
        clearPersistedChatAuth()
        return null
      }
      const auth: import('@/lib/chat-auth-storage').PersistedChatAuth = {
        address,
        signature,
        sessionToken: typeof data.sessionToken === 'string' ? data.sessionToken : undefined,
      }
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
