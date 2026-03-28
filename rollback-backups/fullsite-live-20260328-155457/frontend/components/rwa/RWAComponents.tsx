import { useRWATokenInfo } from '@/hooks/useRWATokenInfo'
import { useStRWAExtended } from '@/hooks/useStRWAExtended'
import { AlertTriangle, Clock, CheckCircle } from 'lucide-react'

export function RWASellWarning({ sellAmount }: { sellAmount: string }) {
  const { isWhitelisted, canSellNow, nextSellDate, getSellTaxRate } = useRWATokenInfo()
  
  if (isWhitelisted) {
    return (
      <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-3">
        <CheckCircle className="inline h-4 w-4 text-green-500" />
        <span className="ml-2 text-sm text-green-500">白名单用户 - 免税且无限制</span>
      </div>
    )
  }

  const taxRate = getSellTaxRate(sellAmount)

  return (
    <div className="space-y-2">
      {!canSellNow && nextSellDate && (
        <div className="rounded-lg border border-orange-500/30 bg-orange-500/10 p-3">
          <Clock className="inline h-4 w-4 text-orange-500" />
          <span className="ml-2 text-sm text-orange-500">
            下次可卖出: {nextSellDate.toLocaleString()}
          </span>
        </div>
      )}
      
      {taxRate > 10 && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
          <AlertTriangle className="inline h-4 w-4 text-red-500" />
          <span className="ml-2 text-sm text-red-500">
            卖出税率: {taxRate}% (建议减少卖出量或延长持仓)
          </span>
        </div>
      )}
    </div>
  )
}

export function StRWALocksPanel() {
  const { locks, hasExpiredLocks, releaseExpiredLocks, isReady } = useStRWAExtended()

  if (!isReady) {
    return <div className="text-sm text-red-500">stRWA 合约未就绪</div>
  }

  return (
    <div className="space-y-3">
      {hasExpiredLocks && (
        <button
          onClick={() => releaseExpiredLocks()}
          className="rounded-lg bg-green-500 px-4 py-2 text-sm text-white"
        >
          释放到期锁仓
        </button>
      )}
      
      {locks.map((lock, i) => (
        <div key={i} className="rounded-lg border p-3">
          <div className="flex justify-between text-sm">
            <span>{lock.amount} stRWA</span>
            <span className={lock.released ? 'text-green-500' : 'text-gray-500'}>
              {lock.released ? '已释放' : lock.unlockTime.toLocaleDateString()}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
