export type DataRefreshKind = 'stake' | 'withdraw' | 'swap' | 'other'

type RefreshDetail = {
  kind: DataRefreshKind
  txHash?: string
  address?: string
  at: number
}

const EVENT_NAME = 'rwa:data-refresh'
const LS_PREFIX = 'rwa:data-refresh:last:'

function safeNow() {
  return Date.now()
}

function safeLower(s?: string) {
  return typeof s === 'string' ? s.toLowerCase() : ''
}

function canUseDom() {
  return typeof window !== 'undefined' && typeof window.dispatchEvent === 'function'
}

export function emitDataRefresh(detail: Omit<RefreshDetail, 'at'>) {
  const d: RefreshDetail = { ...detail, at: safeNow() }

  if (canUseDom()) {
    try {
      // Persist a marker so navigations/late mounts can still refresh once.
      const addr = safeLower(d.address)
      if (addr && addr.startsWith('0x') && addr.length === 42) {
        window.localStorage.setItem(`${LS_PREFIX}${addr}`, JSON.stringify(d))
      }
    } catch {
      // ignore
    }

    try {
      window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: d }))
    } catch {
      // ignore
    }
  }
}

export function subscribeDataRefresh(handler: (d: RefreshDetail) => void) {
  if (!canUseDom()) return () => {}
  const fn = (e: Event) => {
    const ce = e as CustomEvent<RefreshDetail>
    if (ce?.detail) handler(ce.detail)
  }
  window.addEventListener(EVENT_NAME, fn as EventListener)
  return () => window.removeEventListener(EVENT_NAME, fn as EventListener)
}

/** For components that mount after the tx completes (e.g. navigation to /dashboard). */
export function consumeLastDataRefresh(address?: string, maxAgeMs: number = 10 * 60 * 1000): RefreshDetail | null {
  if (!canUseDom()) return null
  const addr = safeLower(address)
  if (!addr || !addr.startsWith('0x') || addr.length !== 42) return null
  const key = `${LS_PREFIX}${addr}`
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return null
    const d = JSON.parse(raw) as RefreshDetail
    if (!d?.at || typeof d.at !== 'number') return null
    if (safeNow() - d.at > maxAgeMs) {
      window.localStorage.removeItem(key)
      return null
    }
    // consume once
    window.localStorage.removeItem(key)
    return d
  } catch {
    return null
  }
}

