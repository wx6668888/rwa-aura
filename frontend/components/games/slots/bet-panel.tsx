'use client'

interface BetPanelProps {
  betAmount: number
  setBetAmount: (amount: number) => void
  balance: number
  spinning: boolean
  onSpin: () => void
  isConnected: boolean
}

export function BetPanel({ betAmount, setBetAmount, balance, spinning, onSpin, isConnected }: BetPanelProps) {
  return (
    <div className="mx-5 mt-0">
      {/* 下注标签 */}
      <div className="text-[10px] uppercase text-[#475569] mb-3 tracking-wider font-semibold">
        BET AMOUNT
      </div>

      {/* 快捷金额按钮 */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {[10, 50, 100, 500].map(amount => (
          <button
            key={amount}
            onClick={() => setBetAmount(amount)}
            disabled={spinning}
            className={`h-[40px] rounded-[10px] font-['JetBrains_Mono'] text-[13px] font-semibold transition-all duration-150 ${
              betAmount === amount
                ? 'bg-[rgba(0,245,212,0.10)] border border-[rgba(0,245,212,0.2)] text-[#00f5d4]'
                : 'bg-[#1a1a2a] border border-[rgba(255,255,255,0.06)] text-[#94a3b8] hover:border-[rgba(0,245,212,0.1)]'
            } disabled:opacity-50 active:scale-[0.94] active:translate-y-[1px]`}
            style={betAmount === amount ? { boxShadow: '0 0 12px rgba(0,245,212,0.15)' } : {}}
          >
            {amount}
          </button>
        ))}
      </div>

      {/* 待续第10部分 */}
      
      {/* 自定义金额输入 */}
      <div className="flex gap-2 items-center bg-[#1a1a2a] border border-[rgba(255,255,255,0.06)] rounded-xl p-1 mb-4 focus-within:border-[rgba(0,245,212,0.2)] transition-colors">
        <input
          type="number"
          value={betAmount}
          onChange={(e) => setBetAmount(Number(e.target.value))}
          disabled={spinning}
          className="flex-1 bg-transparent border-none outline-none font-['JetBrains_Mono'] text-[16px] text-[#f1f5f9] px-3 disabled:opacity-50"
          placeholder="Custom"
        />
        <button
          onClick={() => setBetAmount(balance)}
          disabled={spinning}
          className="bg-[rgba(0,245,212,0.10)] text-[#00f5d4] border border-[rgba(0,245,212,0.15)] rounded-lg px-4 py-2 text-[11px] font-bold tracking-wider hover:bg-[rgba(0,245,212,0.15)] transition-all disabled:opacity-50"
        >
          MAX
        </button>
      </div>

      {/* SPIN按钮 */}
      <button
        onClick={onSpin}
        disabled={!isConnected || spinning || balance < betAmount}
        className="relative w-full h-[58px] rounded-[14px] bg-[#00f5d4] text-[#05050a] text-[17px] font-bold tracking-wider overflow-hidden transition-all duration-250 disabled:opacity-50 disabled:cursor-not-allowed hover:translate-y-[-2px] active:translate-y-[1px] active:scale-[0.99]"
        style={{
          boxShadow: spinning ? 'none' : `
            0 0 0 1px rgba(0,245,212,0.4),
            0 0 30px rgba(0,245,212,0.28),
            0 8px 24px rgba(0,0,0,0.5),
            0 1px 0 rgba(255,255,255,0.3) inset
          `
        }}
      >
        <span className="relative z-10">
          {!isConnected ? '🔗 CONNECT WALLET' : spinning ? 'SPINNING...' : '🎰 SPIN'}
        </span>
        {!spinning && (
          <div className="absolute inset-0 bg-gradient-to-br from-[rgba(255,255,255,0.2)] via-transparent to-transparent opacity-50" />
        )}
      </button>
    </div>
  )
}
