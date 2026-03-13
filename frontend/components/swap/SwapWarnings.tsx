import { useSwapContractFixed } from '@/hooks/useSwapContractFixed'
import { AlertTriangle, Info } from 'lucide-react'

export function SwapLimitWarning() {
  const { swapEnabled, userDailyRemaining, poolStatus } = useSwapContractFixed()

  if (!swapEnabled) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
        <AlertTriangle className="inline h-4 w-4 text-red-500" />
        <span className="ml-2 text-sm text-red-500">互换功能已暂停</span>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-3">
        <Info className="inline h-4 w-4 text-blue-500" />
        <span className="ml-2 text-sm text-blue-500">
          今日剩余额度: {parseFloat(userDailyRemaining).toFixed(2)}
        </span>
      </div>
      
      {poolStatus && (
        <div className="text-xs text-gray-500">
          池子: {parseFloat(poolStatus.rwaBalance).toFixed(2)} RWA / {parseFloat(poolStatus.stRwaBalance).toFixed(2)} stRWA
        </div>
      )}
    </div>
  )
}
