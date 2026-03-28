'use client'

interface Spin {
  id: number
  result: string[]
  amount: number
  win: number
  time: string
}

interface RecentSpinsProps {
  history: Spin[]
}

export function RecentSpins({ history }: RecentSpinsProps) {
  return (
    <div className="mt-4 bg-[#0d0d14] border border-[rgba(255,255,255,0.06)] rounded-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-[rgba(255,255,255,0.03)]">
        <h3 className="text-[12px] font-bold text-[#94a3b8] uppercase tracking-wider">📜 Recent Spins</h3>
      </div>
      
      <div className="max-h-[300px] overflow-y-auto">
        {history.length === 0 ? (
          <div className="px-4 py-8 text-center text-[#475569] text-[13px]">
            No spins yet. Start playing!
          </div>
        ) : (
          history.map((spin) => (
            <div
              key={spin.id}
              className="flex justify-between items-center px-4 py-3 border-b border-[rgba(255,255,255,0.03)] last:border-b-0 hover:bg-[rgba(255,255,255,0.02)] transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={`w-[36px] h-[36px] rounded-[10px] flex items-center justify-center text-[10px] font-bold ${
                  spin.win > 0
                    ? 'bg-[rgba(34,197,94,0.12)] text-[#22c55e] border border-[rgba(34,197,94,0.2)]'
                    : 'bg-[rgba(244,63,94,0.08)] text-[#f43f5e] border border-[rgba(244,63,94,0.15)]'
                }`}>
                  {spin.win > 0 ? 'WIN' : 'LOSE'}
                </div>
                <div>
                  <div className="text-[16px]">{spin.result.join('')}</div>
                  <div className="text-[10px] text-[#475569]">{spin.amount} RWA · {spin.time}</div>
                </div>
              </div>
              <div className={`font-mono text-[13px] font-semibold ${
                spin.win > 0 ? 'text-[#22c55e]' : 'text-[#475569]'
              }`}>
                {spin.win > 0 ? `+${spin.win}` : `−${spin.amount}`}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
