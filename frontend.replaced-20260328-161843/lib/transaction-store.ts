/**
 * Transaction State Persistence
 * 持久化交易状态，防止刷新丢失
 */

export interface TransactionState {
  hash: string
  type: 'stake' | 'withdraw' | 'approve'
  status: 'pending' | 'success' | 'failed'
  amount: string
  token: 'USDT' | 'RWA'
  timestamp: number
  lockPeriod?: string
  stakeId?: string
}

const STORAGE_KEY = 'rwa_pending_transactions'
const MAX_AGE = 24 * 60 * 60 * 1000 // 24 hours

export class TransactionStore {
  static save(tx: TransactionState) {
    const stored = this.getAll()
    stored.push(tx)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
  }

  static update(hash: string, updates: Partial<TransactionState>) {
    const stored = this.getAll()
    const index = stored.findIndex(tx => tx.hash === hash)
    if (index !== -1) {
      stored[index] = { ...stored[index], ...updates }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
    }
  }

  static getAll(): TransactionState[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY)
      if (!data) return []
      const txs = JSON.parse(data) as TransactionState[]
      // 清理过期交易
      const now = Date.now()
      const valid = txs.filter(tx => now - tx.timestamp < MAX_AGE)
      if (valid.length !== txs.length) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(valid))
      }
      return valid
    } catch {
      return []
    }
  }

  static getPending(): TransactionState[] {
    return this.getAll().filter(tx => tx.status === 'pending')
  }

  static clear() {
    localStorage.removeItem(STORAGE_KEY)
  }
}
