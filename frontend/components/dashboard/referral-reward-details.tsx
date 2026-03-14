'use client'

import { useEffect, useState } from 'react'
import { useAccount } from 'wagmi'

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
    blockNumber: number
  }>
}

export function ReferralRewardDetails() {
  const { address } = useAccount()
  const [data, setData] = useState<ReferralRewardDetail | null>(null)

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

  if (!address || !data || parseFloat(data.totalPending) === 0) return null

  return (
    <div className="mt-3 rounded-xl border border-[#00f5d420] bg-[#0a0a0f] p-3">
      <div className="text-xs text-[#64748b] mb-2">推荐奖励来源 ({data.records.length}笔):</div>
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {data.records.map((r, i) => (
          <div key={i} className="text-xs bg-[#0d0d14] rounded p-2 border border-[#ffffff08]">
            <div className="flex justify-between mb-1">
              <span className="text-[#94a3b8]">{r.referee.slice(0, 6)}...{r.referee.slice(-4)}</span>
              <span className="text-[#00f5d4] font-medium">+{r.rewardUSDT} USDT</span>
            </div>
            <div className="text-[#64748b] text-[10px]">
              质押 {r.amount} {r.type} · {r.status === 'SETTLED' ? '已发放' : '待发放'}
            </div>
            <div className="flex justify-between items-center mt-0.5">
              <div className="text-[#64748b] text-[10px]">
                {new Date(r.time).toLocaleString('zh-CN', { 
                  month: '2-digit', 
                  day: '2-digit', 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </div>
              {r.blockNumber && (
                <a
                  href={`https://testnet.bscscan.com/block/${r.blockNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#00f5d4] text-[10px] hover:underline"
                >
                  #{r.blockNumber}
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
