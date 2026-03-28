'use client'

export function Paytable() {
  const payouts = [
    { symbols: '💎💎💎', multiplier: '× 50', color: '#f59e0b' },
    { symbols: '7️⃣7️⃣7️⃣', multiplier: '× 20', color: '#00f5d4' },
    { symbols: '⭐️⭐️⭐️', multiplier: '× 10', color: '#8b5cf6' },
    { symbols: '🔥🔥🔥', multiplier: '× 5', color: '#22c55e' },
    { symbols: 'Any 2', multiplier: '× 2', color: '#94a3b8' },
  ]

  return (
    <div className="mt-4 bg-[#0d0d14] border border-[rgba(255,255,255,0.06)] rounded-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-[rgba(255,255,255,0.03)]">
        <h3 className="text-[12px] font-bold text-[#94a3b8] uppercase tracking-wider">💰 Paytable</h3>
      </div>
      
      {payouts.map((payout, i) => (
        <div
          key={i}
          className="flex justify-between items-center px-4 py-3 border-b border-[rgba(255,255,255,0.03)] last:border-b-0 hover:bg-[rgba(255,255,255,0.02)] transition-colors"
        >
          <div className="text-[22px] tracking-[3px]">{payout.symbols}</div>
          <div className="font-mono text-[15px] font-bold" style={{ color: payout.color }}>
            {payout.multiplier}
          </div>
        </div>
      ))}
    </div>
  )
}
