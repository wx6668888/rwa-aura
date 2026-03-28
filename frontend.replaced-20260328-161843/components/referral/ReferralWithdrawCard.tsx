import { useState } from 'react'
import { useReferralRewardPoolExtended } from '@/hooks/useReferralRewardPoolExtended'
import { parseReferralError } from '@/lib/referral-error-parser'
import { AlertTriangle, Clock } from 'lucide-react'

export function ReferralWithdrawCard({ locale = 'en' }) {
  const { withdrawable, minWithdrawal, fee, lastSettlement, withdraw, refetch } = useReferralRewardPoolExtended()
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const canWithdraw = parseFloat(withdrawable) >= parseFloat(minWithdrawal)
  const netAmount = amount ? (parseFloat(amount) * (100 - fee) / 100).toFixed(2) : '0'

  async function handleWithdraw() {
    try {
      setLoading(true)
      setError('')
      await withdraw(amount)
      await refetch()
      setAmount('')
    } catch (e: any) {
      setError(parseReferralError(e, locale))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-lg border p-4">
      <h3 className="text-lg font-bold">推荐奖励提现</h3>
      
      <div className="mt-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span>可提现:</span>
          <span className="font-mono">{withdrawable} USDT</span>
        </div>
        
        {lastSettlement && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Clock className="h-3 w-3" />
            <span>上次结算: {lastSettlement.toLocaleDateString()}</span>
          </div>
        )}
      </div>

      {!canWithdraw && (
        <div className="mt-3 rounded-lg border border-orange-500/30 bg-orange-500/10 p-2">
          <AlertTriangle className="inline h-3 w-3 text-orange-500" />
          <span className="ml-2 text-xs text-orange-500">
            最低提现 {minWithdrawal} USDT
          </span>
        </div>
      )}

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

      {error && (
        <div className="mt-2 text-xs text-red-500">{error}</div>
      )}

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
