export const CHAT_AUTH_STORAGE_KEY = 'rwa_chat_auth_v1'

export type PersistedChatAuth = {
  address: string
  /** 首次登录时的钱包签名；有 sessionToken 后可为空，但保留可在令牌过期时用于刷新 */
  signature?: string
  /** 服务端下发的会话令牌，有效期内免再次签名 */
  sessionToken?: string
}

export function readPersistedChatAuth(): PersistedChatAuth | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(CHAT_AUTH_STORAGE_KEY)
    if (!raw) return null
    const p = JSON.parse(raw) as PersistedChatAuth
    if (!p?.address) return null
    if (!p.sessionToken && !p.signature) return null
    return p
  } catch {
    return null
  }
}

export function writePersistedChatAuth(auth: PersistedChatAuth) {
  if (typeof window === 'undefined') return
  localStorage.setItem(CHAT_AUTH_STORAGE_KEY, JSON.stringify(auth))
}

export function clearPersistedChatAuth() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(CHAT_AUTH_STORAGE_KEY)
}

/** REST 请求头：优先会话令牌，否则回退签名 */
/** 是否具备聊天 REST 鉴权头（会话令牌或钱包签名二选一） */
export function chatAuthHeadersReady(headers: Record<string, string>): boolean {
  return !!(headers['x-wallet-address'] && (headers['x-chat-session'] || headers['x-wallet-signature']));
}

export function getChatAuthRequestHeaders(): Record<string, string> | null {
  const p = readPersistedChatAuth()
  if (!p?.address) return null
  const st = p.sessionToken?.trim()
  if (st && st.length > 8) {
    return {
      'x-wallet-address': p.address,
      'x-chat-session': st,
    }
  }
  const sig = p.signature?.trim()
  if (sig) {
    return {
      'x-wallet-address': p.address,
      'x-wallet-signature': sig,
    }
  }
  return null
}
