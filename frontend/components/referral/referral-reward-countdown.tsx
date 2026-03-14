'use client'

import { useEffect, useState } from 'react'
import { useAccount } from 'wagmi'
import { Clock } from 'lucide-react'

interface ReferralRewardDetail {
  totalPending: string
  totalPendingRWA: string
  nextSettlement: string
  records: Array<{
    referee: string
    amount: string
    type: string
    rewardRWA: string
    rewardUSDT: string
    time: string
    status: string
  }>
}

export function ReferralRewardCountdown() {
  const { address } = useAccount()
  const [data, setData] = useState<ReferralRewardDetail | null>(null)
  const [countdown, setCountdown] = useState('')

  useEffect(() => {
    if (!address) return

    const fetchData = async () => {
      try {
        const res = await fetch(`http://localhost:3001/api/referral-rewards-detail/${address}`)
        const json = await res.json()
        if (json.success) setData(json.data)
      } catch (error) {
        console.error('Failed to fetch referral rewards:', error)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [address])

  useEffect(() => {
    if (!data?.nextSettlement) return

    const updateCountdown = () => {
      const now = new Date().getTime()
      const target = new Date(data.nextSettlement).getTime()
      const diff = target - now

      if (diff <= 0) {
        setCountdown('即将发放')
        return
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      
      setCountdown(`${days}天 ${hours}小时 ${minutes}分钟`)
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 60000)
    return () => clearInterval(interval)
  }, [data?.nextSettlement])

  if (!address || !data || parseFloat(data.totalPending) === 0) return null

  return (
    <div className="rounded-xl border border-[#10b98120] bg-[#10b98110] p-4 mt-4">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="h-4 w-4 text-[#10b981]" />
        <span className="text-sm font-medium text-[#f1f5f9]">下次发放倒计时</span>
      </div>
      
      <div className="text-2xl font-bold text-[#10b981] mb-3">{countdown}</div>
      
      <div className="space-y-1 mb-3">
        <div className="text-sm text-[#64748b]">
          待发放: <span className="text-[#f1f5f9] font-medium">{data.totalPending} USDT</span>
        </div>
        <div className="text-xs text-[#64748b]">
          (约 {data.totalPendingRWA} RWA)
        </div>
      </div>
      
      {data.records.length > 0 && (
        <div className="mt-3 pt-3 border-t border-[#10b98120]">
          <div className="text-xs text-[#64748b] mb-2">奖励来源 ({data.records.length}笔):</div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {data.records.map((r, i) => (
              <div key={i} className="text-xs bg-[#0d0d1480] rounded p-2">
                <div className="flex justify-between mb-1">
                  <span className="text-[#94a3b8]">{r.referee.slice(0, 6)}...{r.referee.slice(-4)}</span>
                  <span className="text-[#10b981] font-medium">+{r.rewardUSDT} USDT</span>
                </div>
                <div className="text-[#64748b]">
                  质押 {r.amount} {r.type} · {r.status === 'MATURED' ? '已到期' : '待到期'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
