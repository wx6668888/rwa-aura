import { useState } from 'react'
import { useTeamDividendExtended } from '@/hooks/useTeamDividendExtended'
import { parseTeamDividendError } from '@/lib/team-dividend-error-parser'
import { AlertTriangle, Info } from 'lucide-react'

export function TeamDividendCard({ locale = 'en' }) {
  const { balance, dailyCount, maxPerDay, maxPerTx, withdraw, refetch } = useTeamDividendExtended()
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const fee = 8
  const netAmount = amount ? (parseFloat(amount) * (100 - fee) / 100).toFixed(2) : '0'
  const canWithdraw = dailyCount < maxPerDay

  async function handleWithdraw() {
    try {
      setLoading(true)
      setError('')
      await withdraw(amount)
      await refetch()
      setAmount('')
    } catch (e: any) {
      setError(parseTeamDividendError(e, locale))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-lg border p-4">
      <h3 className="text-lg font-bold">团队分红提现</h3>
      
      <div className="mt-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span>可提现:</span>
          <span className="font-mono">{balance} USDT</span>
        </div>
        
        <div className="flex justify-between text-xs text-gray-500">
          <span>今日次数:</span>
          <span>{dailyCount}/{maxPerDay}</span>
        </div>
      </div>

      {!canWithdraw && (
        <div className="mt-3 rounded-lg border border-orange-500/30 bg-orange-500/10 p-2">
          <AlertTriangle className="inline h-3 w-3 text-orange-500" />
          <span className="ml-2 text-xs text-orange-500">今日提现次数已达上限</span>
        </div>
      )}

      <div className="mt-3 rounded-lg border border-blue-500/30 bg-blue-500/10 p-2">
        <Info className="inline h-3 w-3 text-blue-500" />
        <span className="ml-2 text-xs text-blue-500">单笔最高 {maxPerTx} USDT</span>
      </div>

      <div className="mt-4">
        <input
          type="number"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          placeholder="提现金额"
          disabled={!canWithdraw}
          className="w-full rounded-lg border bg-gray-900 px-3 py-2 text-sm"
        />
        
        {amount && (
          <div className="mt-2 text-xs text-gray-500">
            实际到账: {netAmount} USDT (扣除 {fee}% 手续费)
          </div>
        )}
      </div>

      {error && <div className="mt-2 text-xs text-red-500">{error}</div>}

      <button
        onClick={handleWithdraw}
        disabled={!canWithdraw || !amount || loading}
        className="mt-4 w-full rounded-lg bg-blue-500 py-2 text-sm font-bold text-white disabled:opacity-50"
      >
        {loading ? '提现中...' : '提现'}
      </button>
    </div>
  )
}
