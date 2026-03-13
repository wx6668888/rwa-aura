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
    <div className="mt-6 rounded-2xl border border-[rgba(0,255,200,0.15)] bg-gradient-to-br from-[#0d0d14] to-[#13131e] p-5 shadow-[0_0_30px_rgba(0,255,200,0.08)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[rgba(0,255,200,0.15)] to-[rgba(0,212,170,0.1)] flex items-center justify-center">
            <Clock className="w-4 h-4 text-[#00ffc8]" />
          </div>
          <h3 className="text-[14px] font-[700] text-[#00ffc8] uppercase tracking-wider">
            锁仓订单
          </h3>
        </div>
        <div className="px-3 py-1 rounded-full bg-[rgba(0,255,200,0.08)] border border-[rgba(0,255,200,0.15)]">
          <span className="text-[11px] font-[600] text-[#00ffc8]" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
            {stakes.length} 笔
          </span>
        </div>
      </div>

      {/* 说明 */}
      <div className="mb-4 rounded-xl bg-[rgba(0,255,200,0.05)] border border-[rgba(0,255,200,0.1)] px-4 py-3">
        <p className="text-[11px] text-[rgba(238,242,255,0.7)] leading-relaxed">
          💡 锁仓订单到期后将自动转为灵活期，可随时提取。锁仓期间享受更高收益率。
        </p>
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
                  ? 'bg-gradient-to-br from-[rgba(0,255,200,0.08)] to-[rgba(0,212,170,0.05)] border-[rgba(0,255,200,0.25)] shadow-[0_0_15px_rgba(0,255,200,0.1)]'
                  : 'bg-[#0d0d14] border-[rgba(255,255,255,0.06)] hover:border-[rgba(0,255,200,0.15)]'
              }`}
            >
              <div className="flex items-center gap-3 p-4">
                {/* 序号 */}
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-[700] ${
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
                    <span className="text-[16px] font-[700] text-[#f1f5f9]" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
                      {stake.amount.toFixed(2)}
                    </span>
                    <span className="text-[13px] font-[600] text-[rgba(238,242,255,0.6)]">
                      {stake.isRWAStake ? 'RWA' : 'USDT'}
                    </span>
                  </div>

                  {/* 锁仓信息 */}
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="text-[rgba(238,242,255,0.52)]">
                      {stake.lockPeriod} 天锁仓
                    </span>
                    <span className="text-[rgba(238,242,255,0.26)]">•</span>
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
