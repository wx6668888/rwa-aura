'use client'

import { useState, useEffect, useRef } from 'react'
import { useAccount } from 'wagmi'

type GamePhase = 'waiting' | 'flying' | 'crashed'

export function CrashGameClient() {
  const { address, isConnected } = useAccount()
  
  const [phase, setPhase] = useState<GamePhase>('waiting')
  const [multiplier, setMultiplier] = useState(1.00)
  const [crashPoint, setCrashPoint] = useState(0)
  const [countdown, setCountdown] = useState(5)
  const [betAmount, setBetAmount] = useState(10)
  const [balance, setBalance] = useState(10000)
  const [myBet, setMyBet] = useState<any>(null)
  const [history, setHistory] = useState<number[]>([2.34, 1.52, 3.67, 1.08, 5.23])
  
  const startTimeRef = useRef<number>(0)

  // 游戏循环逻辑
  useEffect(() => {
    if (phase === 'waiting') {
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            startGame()
            return 5
          }
          return prev - 1
        })
      }, 1000)
      return () => clearInterval(timer)
    }
    
    if (phase === 'flying') {
      startTimeRef.current = Date.now()
      const interval = setInterval(() => {
        const elapsed = (Date.now() - startTimeRef.current) / 1000
        const newMultiplier = Math.pow(1.08, elapsed)
        
        if (newMultiplier >= crashPoint) {
          setMultiplier(crashPoint)
          setPhase('crashed')
          setTimeout(() => {
            setPhase('waiting')
            setCountdown(5)
            setMyBet(null)
          }, 3000)
        } else {
          setMultiplier(newMultiplier)
        }
      }, 50)
      
      return () => clearInterval(interval)
    }
  }, [phase, crashPoint])

  const startGame = () => {
    const crash = Math.random() < 0.5 ? 1 + Math.random() * 1.5 : 1.5 + Math.random() * 8
    setCrashPoint(crash)
    setMultiplier(1.00)
    setPhase('flying')
  }

  const placeBet = () => {
    if (!isConnected || phase !== 'waiting') return
    setMyBet({ amount: betAmount })
    setBalance(prev => prev - betAmount)
  }

  const cashout = () => {
    if (!myBet || myBet.cashedOut) return
    const profit = myBet.amount * multiplier
    setBalance(prev => prev + profit)
    setMyBet({ ...myBet, cashedOut: true, cashoutAt: multiplier })
  }

  return (
    <div className="container mx-auto px-5 py-6 max-w-[480px] lg:max-w-[1200px]">
      {/* 历史倍数标签 */}
      <div className="flex gap-2 overflow-x-auto mb-4 pb-2">
        {history.map((mult, i) => (
          <div
            key={i}
            className={`font-mono text-[11px] font-bold px-3 py-1 rounded-lg min-w-[46px] text-center ${
              mult >= 10
                ? 'bg-[rgba(245,158,11,0.12)] text-[#f59e0b] border border-[rgba(245,158,11,0.2)]'
                : mult >= 2
                ? 'bg-[rgba(34,197,94,0.12)] text-[#22c55e] border border-[rgba(34,197,94,0.2)]'
                : 'bg-[rgba(244,63,94,0.10)] text-[#f43f5e] border border-[rgba(244,63,94,0.18)]'
            }`}
          >
            {mult.toFixed(2)}×
          </div>
        ))}
      </div>

      {/* 图表区域 */}
      <div className="bg-[#0d0d14] border border-[rgba(0,245,212,0.18)] rounded-3xl overflow-hidden mb-4"
        style={{
          boxShadow: '0 0 60px rgba(0,245,212,0.08), 0 30px 60px rgba(0,0,0,0.6)'
        }}
      >
        <div className="relative bg-[#040408] h-[260px] lg:h-[420px] flex items-center justify-center">
          {/* 倍数显示 */}
          <div className="text-center z-10">
            {phase === 'waiting' && (
              <div>
                <div className="font-mono text-[56px] font-bold text-[#00f5d4] mb-2">{countdown}</div>
                <div className="text-[11px] uppercase tracking-wider text-[rgba(0,245,212,0.6)]">NEXT ROUND IN</div>
              </div>
            )}
            
            {phase === 'flying' && (
              <div>
                <div className="font-mono text-[80px] lg:text-[96px] font-bold text-[#00f5d4]"
                  style={{ textShadow: '0 0 40px rgba(0,245,212,0.4)' }}
                >
                  {multiplier.toFixed(2)}×
                </div>
                <div className="text-[11px] uppercase tracking-wider text-[rgba(0,245,212,0.6)]">AND RISING...</div>
              </div>
            )}
            
            {phase === 'crashed' && (
              <div>
                <div className="font-mono text-[80px] lg:text-[96px] font-bold text-[#f43f5e]"
                  style={{ textShadow: '0 0 60px rgba(244,63,94,0.6)' }}
                >
                  💥 {crashPoint.toFixed(2)}×
                </div>
                <div className="text-[11px] uppercase tracking-wider text-[rgba(244,63,94,0.8)]">CRASHED</div>
              </div>
            )}
          </div>
        </div>
        
        <div className="px-4 py-3 border-t border-[rgba(255,255,255,0.05)] flex justify-between text-[10px]">
          <span className="text-[#475569]">Round #1,247</span>
          <span className="font-mono text-[11px] text-[#94a3b8]">24 players · 8,420 RWA</span>
        </div>
      </div>

      {/* 待续第4部分... */}
      
      {/* 下注面板 */}
      <div className="bg-[#0d0d14] border border-[rgba(255,255,255,0.06)] rounded-3xl p-5 mb-4">
        <div className="mb-4">
          <div className="text-[10px] uppercase text-[#475569] mb-2 tracking-wider">BET AMOUNT</div>
          <div className="flex gap-2 items-center bg-[#1a1a2a] border border-[rgba(255,255,255,0.06)] rounded-xl p-1">
            <input
              type="number"
              value={betAmount}
              onChange={(e) => setBetAmount(Number(e.target.value))}
              className="flex-1 bg-transparent border-none outline-none font-mono text-[22px] font-semibold text-[#f1f5f9] px-3"
            />
            <button onClick={() => setBetAmount(betAmount / 2)} className="h-[38px] px-3 bg-[#20202e] border border-[rgba(255,255,255,0.06)] rounded-lg text-[12px] font-semibold text-[#94a3b8]">½</button>
            <button onClick={() => setBetAmount(betAmount * 2)} className="h-[38px] px-3 bg-[#20202e] border border-[rgba(255,255,255,0.06)] rounded-lg text-[12px] font-semibold text-[#94a3b8]">2×</button>
            <button onClick={() => setBetAmount(balance)} className="h-[38px] px-3 bg-[#20202e] border border-[rgba(0,245,212,0.15)] rounded-lg text-[12px] font-semibold text-[#00f5d4]">MAX</button>
          </div>
        </div>

        {/* 操作按钮 */}
        {phase === 'waiting' && !myBet && (
          <button onClick={placeBet} disabled={!isConnected} className="w-full h-[56px] rounded-xl bg-[#00f5d4] text-[#05050a] text-[16px] font-bold disabled:opacity-50"
            style={{ boxShadow: '0 0 28px rgba(0,245,212,0.28)' }}
          >
            {isConnected ? 'PLACE BET' : '🔗 CONNECT WALLET'}
          </button>
        )}

        {phase === 'flying' && myBet && !myBet.cashedOut && (
          <button onClick={cashout} className="w-full h-[64px] rounded-xl bg-gradient-to-br from-[#22c55e] to-[#16a34a] text-white font-bold"
            style={{ boxShadow: '0 0 20px rgba(34,197,94,0.3)' }}
          >
            <div className="text-[16px]">CASH OUT</div>
            <div className="font-mono text-[11px]">{multiplier.toFixed(2)}× = {(myBet.amount * multiplier).toFixed(2)} RWA</div>
          </button>
        )}

        {phase === 'flying' && !myBet && (
          <button disabled className="w-full h-[56px] rounded-xl bg-[#13131e] text-[#475569] border border-[rgba(255,255,255,0.05)] cursor-not-allowed">
            WAIT FOR NEXT ROUND
          </button>
        )}
      </div>
    </div>
  )
}
