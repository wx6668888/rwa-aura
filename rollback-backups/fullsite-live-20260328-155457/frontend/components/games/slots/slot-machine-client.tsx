'use client'

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { useLocale } from '@/components/locale-provider'
import { Machine } from './machine'
import { BetPanel } from './bet-panel'

const SYMBOLS = ['💎', '7️⃣', '⭐️', '🔥', '🌊']

export function SlotMachineClient() {
  const { address, isConnected } = useAccount()
  const { locale } = useLocale()
  
  const [balance, setBalance] = useState(10000)
  const [betAmount, setBetAmount] = useState(10)
  const [spinning, setSpinning] = useState(false)
  const [reels, setReels] = useState(['💎', '7️⃣', '⭐️'])
  const [lastWin, setLastWin] = useState(0)
  const [showWinOverlay, setShowWinOverlay] = useState(false)

  const handleSpin = () => {
    if (spinning || balance < betAmount || !isConnected) return
    
    setSpinning(true)
    setBalance(prev => prev - betAmount)
    setLastWin(0)
    
    // 模拟旋转2秒
    setTimeout(() => {
      const result = [
        SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
        SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
        SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
      ]
      setReels(result)
      
      // 检查中奖
      if (result[0] === result[1] && result[1] === result[2]) {
        const multiplier = result[0] === '💎' ? 50 : result[0] === '7️⃣' ? 20 : 10
        const winAmount = betAmount * multiplier
        setLastWin(winAmount)
        setBalance(prev => prev + winAmount)
        setShowWinOverlay(true)
        setTimeout(() => setShowWinOverlay(false), 3000)
      }
      
      setSpinning(false)
    }, 2000)
  }

  return (
    <div className="container mx-auto px-5 py-6 max-w-[480px] lg:max-w-[1200px]">
      {/* 游戏标签切换栏 */}
      <div className="flex gap-2 overflow-x-auto scrollbar-none px-0 py-3.5 mb-0">
        {['Lottery', 'Slots', 'Crash', 'Dice'].map((game) => (
          <button
            key={game}
            className={`px-4 py-2.5 rounded-lg text-[13px] font-semibold whitespace-nowrap transition-all ${
              game === 'Slots'
                ? 'bg-[rgba(0,245,212,0.10)] border border-[rgba(0,245,212,0.18)] text-[#00f5d4]'
                : 'bg-transparent border border-transparent text-[#475569] hover:text-[#94a3b8]'
            }`}
          >
            {game === 'Slots' ? 'Slots★' : game}
          </button>
        ))}
      </div>

      {/* 奖池横幅 */}
      <div 
        className="mx-5 mb-4 rounded-2xl p-3.5 flex justify-between items-center transition-all duration-300 hover:-translate-y-0.5"
        style={{
          background: 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(245,158,11,0.04))',
          border: '1px solid rgba(245,158,11,0.22)',
          boxShadow: '0 8px 32px rgba(245,158,11,0.12), 0 2px 0 rgba(245,158,11,0.2) inset',
          transformStyle: 'preserve-3d'
        }}
      >
        <div>
          <div className="text-[9px] uppercase tracking-wider mb-1" style={{ color: 'rgba(245,158,11,0.6)' }}>
            JACKPOT POOL
          </div>
          <div className="font-['JetBrains_Mono'] text-[22px] font-bold text-[#f59e0b] leading-none mb-1">
            50,000
          </div>
          <div className="text-[10px]" style={{ color: 'rgba(245,158,11,0.5)' }}>
            RWA · Updates live
          </div>
        </div>
        <div className="text-[32px] opacity-60">💎</div>
      </div>

      {/* 待续第4部分... */}
      
      {/* 老虎机主体 */}
      <Machine reels={reels} spinning={spinning} lastWin={lastWin} />
      
      {/* 待续第9部分 - 下注面板 */}
      
      {/* 下注面板 */}
      <BetPanel
        betAmount={betAmount}
        setBetAmount={setBetAmount}
        balance={balance}
        spinning={spinning}
        onSpin={handleSpin}
        isConnected={isConnected}
      />
    </div>
  )
}
