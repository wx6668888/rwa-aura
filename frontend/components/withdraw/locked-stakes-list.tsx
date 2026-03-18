'use client'

import { useEffect, useState } from 'react'
import { Clock, CheckCircle2 } from 'lucide-react'

interface LockedStake {
  stakeId: string
  amount: number
  lockPeriod: string
  lockEndTime: number
  isRWAStake: boolean
  timestamp: number
}

interface Props {
  stakes: LockedStake[]
}

export function LockedStakesList({ stakes }: Props) {
  const [now, setNow] = useState(Math.floor(Date.now() / 1000))

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Math.floor(Date.now() / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  if (stakes.length === 0) {
    return null
  }

  return (
    <div className="mt-4 rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl p-4 shadow-[0_0_20px_rgba(15,23,42,0.5)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-[#00f5d41a] flex items-center justify-center">
            <Clock className="w-3 h-3 text-[#00f5d4]" />
          </div>
          <h3 className="text-[13px] font-[600] text-[#e2e8f0]">
            锁仓订单倒计时
          </h3>
        </div>
        <div className="px-3 py-1 rounded-full bg-[#00f5d41a] border border-[#00f5d433]">
          <span className="text-[11px] font-[600] text-[#00f5d4]" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
            {stakes.length} 笔
          </span>
        </div>
      </div>

      {/* 订单列表 */}
      <div className="space-y-3 max-h-[500px] overflow-y-auto scrollbar-thin scrollbar-thumb-[rgba(0,255,200,0.2)] scrollbar-track-transparent">
        {stakes.map((stake, index) => {
          const timeLeft = stake.lockEndTime - now
          const isExpired = timeLeft <= 0
          const days = Math.floor(Math.abs(timeLeft) / 86400)
          const hours = Math.floor((Math.abs(timeLeft) % 86400) / 3600)
          const minutes = Math.floor((Math.abs(timeLeft) % 3600) / 60)
          const seconds = Math.abs(timeLeft) % 60

          return (
            <div
              key={`${stake.stakeId}-${index}`}
              className={`group relative overflow-hidden rounded-xl border transition-all duration-300 ${
                isExpired
                  ? 'bg-white/[0.06] border-[#00f5d450] shadow-[0_0_12px_rgba(0,245,212,0.3)]'
                  : 'bg-white/[0.02] border-white/[0.06] hover:border-[#00f5d440]'
              }`}
            >
              <div className="flex items-center gap-3 p-3">
                {/* 序号 */}
                <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-[700] ${
                  isExpired
                    ? 'bg-gradient-to-br from-[#00ffc8] to-[#00d4aa] text-[#0a0a0f]'
                    : 'bg-[rgba(0,255,200,0.1)] border border-[rgba(0,255,200,0.2)] text-[#00ffc8]'
                }`}>
                  {isExpired ? <CheckCircle2 className="w-4 h-4" /> : index + 1}
                </div>

                {/* 内容 */}
                <div className="flex-1 min-w-0">
                  {/* 金额 */}
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-[15px] font-[700] text-[#f1f5f9]" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
                      {stake.amount.toFixed(2)}
                    </span>
                    <span className="text-[13px] font-[600] text-[rgba(238,242,255,0.6)]">
                      {stake.isRWAStake ? 'RWA' : 'USDT'}
                    </span>
                  </div>

                  {/* 锁仓信息 + 倒计时 */}
                  <div className="flex flex-col gap-1 text-[11px]">
                    <div className="flex items-center gap-2 text-[rgba(238,242,255,0.52)]">
                      <span>{stake.lockPeriod} 天锁仓</span>
                      <span className="text-[rgba(238,242,255,0.26)]">•</span>
                      <span className="truncate">
                        到期时间：{new Date(stake.lockEndTime * 1000).toLocaleString()}
                      </span>
                    </div>
                    {!isExpired ? (
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-[#fbbf24]" />
                        <span className="font-[600] text-[#fbbf24]" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
                          {days > 0 && `${days}d `}
                          {hours}h {minutes}m {seconds}s
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3 h-3 text-[#00ffc8]" />
                        <span className="font-[600] text-[#00ffc8]">
                          已到期，可提取
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 到期高亮效果 */}
              {isExpired && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[rgba(0,255,200,0.05)] to-transparent opacity-50 animate-pulse" />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
