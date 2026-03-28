'use client'

import { useState, useEffect, useRef } from 'react'
import { useAccount } from 'wagmi'
import { useLocale } from '@/components/locale-provider'

type GamePhase = 'waiting' | 'running' | 'crashed'

interface Player {
  address: string
  amount: number
  cashoutAt?: number
  profit?: number
}

export function CrashGameClient() {
  const { address, isConnected } = useAccount()
  const { locale } = useLocale()
  
  const [phase, setPhase] = useState<GamePhase>('waiting')
  const [multiplier, setMultiplier] = useState(1.00)
  const [crashPoint, setCrashPoint] = useState(0)
  const [betAmount, setBetAmount] = useState('10')
  const [autoCashout, setAutoCashout] = useState('2.00')
  const [countdown, setCountdown] = useState(10)
  const [myBet, setMyBet] = useState<Player | null>(null)
  const [history] = useState<number[]>([2.34, 1.52, 3.67, 1.08, 5.23])
  
  const gameLoopRef = useRef<NodeJS.Timeout>()
  const startTimeRef = useRef<number>(0)

  useEffect(() => {
    if (phase === 'waiting') {
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            startGame()
            return 10
          }
          return prev - 1
        })
      }, 1000)
      return () => clearInterval(timer)
    }
    
    if (phase === 'running') {
      startTimeRef.current = Date.now()
      gameLoopRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTimeRef.current) / 1000
        const newMultiplier = Math.pow(1.08, elapsed)
        
        if (newMultiplier >= crashPoint) {
          setMultiplier(crashPoint)
          setPhase('crashed')
          setTimeout(() => {
            setPhase('waiting')
            setCountdown(10)
            setMyBet(null)
          }, 3000)
        } else {
          setMultiplier(newMultiplier)
          if (myBet && !myBet.cashoutAt && autoCashout && newMultiplier >= parseFloat(autoCashout)) {
            cashout()
          }
        }
      }, 50)
      
      return () => {
        if (gameLoopRef.current) clearInterval(gameLoopRef.current)
      }
    }
  }, [phase, crashPoint, myBet, autoCashout])

  const startGame = () => {
    const crash = Math.random() < 0.5 ? 1 + Math.random() * 1.5 : 1.5 + Math.random() * 8
    setCrashPoint(crash)
    setMultiplier(1.00)
    setPhase('running')
  }

  const placeBet = () => {
    if (!isConnected || phase !== 'waiting') return
    setMyBet({ address: address!, amount: parseFloat(betAmount) })
  }

  const cashout = () => {
    if (!myBet || myBet.cashoutAt) return
    const profit = myBet.amount * (multiplier - 1)
    setMyBet({ ...myBet, cashoutAt: multiplier, profit })
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="text-center mb-8">
        <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 bg-clip-text text-transparent mb-3">
          🚀 崩盘游戏
        </h1>
        <p className="text-gray-400 text-lg">实时多人对战 · 刺激有趣</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 rounded-3xl p-8 border-2 border-purple-500/30">
            {/* 倍数显示 */}
            <div className="text-center mb-8 min-h-[200px] flex items-center justify-center">
              {phase === 'waiting' && (
                <div>
                  <div className="text-7xl font-bold text-gray-400 mb-4">{countdown}s</div>
                  <div className="text-xl text-gray-500">准备中...</div>
                </div>
              )}
              {phase === 'running' && (
                <div>
                  <div className="text-9xl font-bold text-green-400">{multiplier.toFixed(2)}x</div>
                  <div className="text-xl text-green-400 mt-2">🚀 上涨中...</div>
                </div>
              )}
              {phase === 'crashed' && (
                <div>
                  <div className="text-9xl font-bold text-red-500">💥 {crashPoint.toFixed(2)}x</div>
                  <div className="text-xl text-red-400 mt-2">崩盘了！</div>
                </div>
              )}
            </div>

            {/* 我的下注 */}
            {myBet && (
              <div className="bg-gray-900/50 rounded-xl p-6 mb-4">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-400">下注金额</span>
                  <span className="text-white font-bold">{myBet.amount} USDT</span>
                </div>
                <div className="flex justify-between mb-4">
                  <span className="text-gray-400">当前价值</span>
                  <span className="text-green-400 font-bold">{(myBet.amount * multiplier).toFixed(2)} USDT</span>
                </div>
                {myBet.cashoutAt ? (
                  <div className="text-center text-green-400 text-xl">
                    ✅ 已提现 @ {myBet.cashoutAt.toFixed(2)}x (+{myBet.profit?.toFixed(2)} USDT)
                  </div>
                ) : phase === 'running' && (
                  <button onClick={cashout} className="w-full bg-green-500 hover:bg-green-600 text-white py-4 rounded-xl font-bold text-lg">
                    💰 立即提现 {(myBet.amount * multiplier).toFixed(2)} USDT
                  </button>
                )}
              </div>
            )}

            {/* 历史 */}
            <div className="flex gap-2 justify-center flex-wrap">
              {history.map((h, i) => (
                <div key={i} className={`px-3 py-1 rounded-lg text-sm font-bold ${h >= 2 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                  {h.toFixed(2)}x
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 侧边栏 - 待续 */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 rounded-3xl p-6 border-2 border-purple-500/30">
            <h3 className="text-xl font-bold text-purple-400 mb-4">💎 下注</h3>
            <div className="mb-4">
              <label className="text-sm text-gray-400 mb-2 block">下注金额 (USDT)</label>
              <input
                type="number"
                value={betAmount}
                onChange={(e) => setBetAmount(e.target.value)}
                disabled={phase !== 'waiting' || !!myBet}
                className="w-full bg-gray-900 border border-purple-500/30 rounded-xl px-4 py-3 text-white focus:outline-none disabled:opacity-50"
              />
              <div className="flex gap-2 mt-2">
                {[10, 50, 100, 500].map(v => (
                  <button key={v} onClick={() => setBetAmount(v.toString())} disabled={phase !== 'waiting' || !!myBet} className="flex-1 bg-gray-800 hover:bg-purple-600 text-white py-2 rounded-lg text-sm disabled:opacity-50">
                    {v}
                  </button>
                ))}
              </div>
            </div>
            <div className="mb-4">
              <label className="text-sm text-gray-400 mb-2 block">自动提现倍数</label>
              <input
                type="number"
                step="0.1"
                value={autoCashout}
                onChange={(e) => setAutoCashout(e.target.value)}
                className="w-full bg-gray-900 border border-purple-500/30 rounded-xl px-4 py-3 text-white focus:outline-none"
              />
            </div>
            <button onClick={placeBet} disabled={!isConnected || phase !== 'waiting' || !!myBet} className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 rounded-xl font-bold text-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50">
              {!isConnected ? '🔗 连接钱包' : myBet ? '✅ 已下注' : '🚀 下注'}
            </button>
          </div>

          <div className="bg-gradient-to-br from-blue-900/20 to-cyan-900/20 rounded-3xl p-6 border-2 border-blue-500/30">
            <h3 className="text-xl font-bold text-blue-400 mb-4">📊 统计</h3>
            <div className="space-y-2">
              <div className="flex justify-between p-2 bg-gray-900/50 rounded-lg">
                <span className="text-gray-400">在线玩家</span>
                <span className="text-white font-bold">1,234</span>
              </div>
              <div className="flex justify-between p-2 bg-gray-900/50 rounded-lg">
                <span className="text-gray-400">奖池</span>
                <span className="text-green-400 font-bold">50,000 USDT</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
