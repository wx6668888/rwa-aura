'use client'

import { useState } from 'react'
import { useAccount } from 'wagmi'
import { useLocale } from '@/components/locale-provider'

const SYMBOLS = ['🍒', '🍋', '🍊', '🍇', '💎', '7️⃣']
const PAYOUTS: Record<string, number> = {
  '💎💎💎': 50,
  '7️⃣7️⃣7️⃣': 100,
  '🍒🍒🍒': 10,
  '🍋🍋🍋': 10,
}

export function SlotMachineClient() {
  const { isConnected } = useAccount()
  const { locale } = useLocale()
  
  const [reels, setReels] = useState(['🍒', '🍋', '🍊'])
  const [spinning, setSpinning] = useState(false)
  const [betAmount, setBetAmount] = useState('10')
  const [balance, setBalance] = useState(1000)
  const [lastWin, setLastWin] = useState(0)

  const spin = () => {
    if (spinning || balance < parseFloat(betAmount)) return
    
    setSpinning(true)
    setBalance(prev => prev - parseFloat(betAmount))
    setLastWin(0)
    
    const interval = setInterval(() => {
      setReels([
        SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
        SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
        SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
      ])
    }, 100)
    
    setTimeout(() => {
      clearInterval(interval)
      const result = [
        SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
        SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
        SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
      ]
      setReels(result)
      
      const key = result.join('')
      const payout = PAYOUTS[key]
      if (payout) {
        const winAmount = parseFloat(betAmount) * payout
        setLastWin(winAmount)
        setBalance(prev => prev + winAmount)
      }
      
      setSpinning(false)
    }, 2000)
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="text-center mb-8">
        <h1 className="text-5xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent mb-3">
          🎰 老虎机
        </h1>
        <p className="text-gray-400 text-lg">经典老虎机 · 简单有趣</p>
      </div>

      <div className="bg-gradient-to-br from-yellow-900/20 to-orange-900/20 rounded-3xl p-8 border-4 border-yellow-500/50">
        <div className="bg-black/50 rounded-2xl p-8 mb-6">
          <div className="flex justify-center gap-4 mb-6">
            {reels.map((symbol, i) => (
              <div key={i} className={`w-32 h-32 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center text-6xl border-4 border-yellow-300 ${spinning ? 'animate-spin' : ''}`}>
                {symbol}
              </div>
            ))}
          </div>
          {lastWin > 0 && (
            <div className="text-center">
              <div className="text-4xl font-bold text-yellow-400 mb-2">🎉 恭喜中奖！</div>
              <div className="text-3xl font-bold text-green-400">+{lastWin} USDT</div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-900 rounded-xl p-4">
            <div className="text-gray-400 text-sm mb-1">余额</div>
            <div className="text-white text-2xl font-bold">{balance} USDT</div>
          </div>
          <div className="bg-gray-900 rounded-xl p-4">
            <div className="text-gray-400 text-sm mb-1">下注</div>
            <input type="number" value={betAmount} onChange={(e) => setBetAmount(e.target.value)} disabled={spinning} className="w-full bg-transparent text-white text-2xl font-bold focus:outline-none" />
          </div>
        </div>

        <button onClick={spin} disabled={spinning || !isConnected} className="w-full bg-gradient-to-r from-yellow-500 to-orange-600 text-white py-6 rounded-2xl font-bold text-2xl hover:from-yellow-600 hover:to-orange-700 disabled:opacity-50">
          {spinning ? '🎰 旋转中...' : '🎰 开始旋转'}
        </button>

        <div className="mt-6 bg-gray-900/50 rounded-xl p-4">
          <h3 className="text-white font-bold mb-3">💰 赔率表</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex justify-between text-gray-400">
              <span>💎💎💎</span>
              <span className="text-yellow-400 font-bold">50x</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>7️⃣7️⃣7️⃣</span>
              <span className="text-yellow-400 font-bold">100x</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
