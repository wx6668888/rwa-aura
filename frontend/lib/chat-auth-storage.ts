export const CHAT_AUTH_STORAGE_KEY = 'rwa_chat_auth_v1'

export type PersistedChatAuth = {
  address: string
  signature: string
}

export function readPersistedChatAuth(): PersistedChatAuth | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(CHAT_AUTH_STORAGE_KEY)
    if (!raw) return null
    const p = JSON.parse(raw) as PersistedChatAuth
    if (!p?.address || !p?.signature) return null
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
