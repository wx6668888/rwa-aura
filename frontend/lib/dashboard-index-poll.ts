export type DashboardPollKind = 'stake' | 'withdraw' | 'both'

export type DashboardPollOptions = {
  userAddress: string
  chainId: number
  txHash: string
  kind: DashboardPollKind
  intervalMs?: number // default 5000
  durationMs?: number // default 180000 (3 minutes)
  historyLimit?: number // default 20
}

type HistoryRow = {
  type: string
  tx_hash?: string
}

const inflight = new Map<string, Promise<boolean>>()

function normalizeAddress(a: string) {
  return a?.toLowerCase?.() ?? ''
}

function normalizeTxHash(h: string) {
  return h?.toLowerCase?.() ?? ''
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

/**
 * Only does GET polling and stops when the txHash appears in /api/history for the user.
 * This avoids duplicate ingest writes (no POST) and prevents concurrent duplicate polls per txHash.
 */
export async function pollDashboardUntilTxIndexed(options: DashboardPollOptions): Promise<boolean> {
  const intervalMs = options.intervalMs ?? 5000
  const durationMs = options.durationMs ?? 180000
  const historyLimit = options.historyLimit ?? 20

  const userAddr = normalizeAddress(options.userAddress)
  const tx = normalizeTxHash(options.txHash)

  if (!userAddr || !tx) return false

  const key = `${userAddr}:${tx}:${options.kind}`
  const existing = inflight.get(key)
  if (existing) return existing

  const promise = (async () => {
    const startedAt = Date.now()
    while (Date.now() - startedAt < durationMs) {
      const res = await fetch(`/api/history/${userAddr}?limit=${historyLimit}`).catch(() => null)
      if (res?.ok) {
        const json = await res.json().catch(() => null) as any
        const history: HistoryRow[] = json?.data?.history ?? []

        const matchedRow = history.find((r) => {
          const rowTx = normalizeTxHash(String((r as any)?.tx_hash ?? ''))
          if (!rowTx || rowTx !== tx) return false

          if (options.kind === 'both') return true
          if (options.kind === 'stake') return (r as any).type === 'stake'
          if (options.kind === 'withdraw') return (r as any).type === 'withdrawal'
          return true
        })

        if (matchedRow) {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('dashboard:tx-indexed', {
                detail: { userAddress: userAddr, txHash: tx, kind: options.kind, chainId: options.chainId },
              })
            )
          }
          return true
        }
      }

      await sleep(intervalMs)
    }

    return false
  })()

  inflight.set(key, promise)
  try {
    return await promise
  } finally {
    inflight.delete(key)
  }
}

