'use client'

interface MachineProps {
  reels: string[]
  spinning: boolean
  lastWin: number
}

export function Machine({ reels, spinning, lastWin }: MachineProps) {
  return (
    <div 
      className="mx-5 rounded-3xl overflow-hidden"
      style={{
        background: 'linear-gradient(160deg, #13131e 0%, rgba(10,10,20,0.95) 100%)',
        border: '1px solid rgba(0,245,212,0.2)',
        boxShadow: `
          0 0 0 1px rgba(0,245,212,0.06),
          0 0 60px rgba(0,245,212,0.10),
          0 40px 80px rgba(0,0,0,0.8),
          0 -1px 0 rgba(255,255,255,0.06) inset,
          0 1px 0 rgba(0,245,212,0.15) inset
        `,
        transformStyle: 'preserve-3d',
        perspective: '1000px'
      }}
    >
      {/* 顶部装饰条 */}
      <div className="flex justify-between items-center px-[18px] py-[14px] border-b border-[rgba(255,255,255,0.04)]">
        <div className="text-[12px] tracking-[0.15em] text-[#00f5d4] opacity-70 font-semibold">
          RWA SLOTS
        </div>
        <div className="text-right">
          <div className="text-[9px] uppercase tracking-wider text-[rgba(245,158,11,0.6)]">
            JACKPOT
          </div>
          <div 
            className="font-['JetBrains_Mono'] text-[14px] font-bold text-[#f59e0b]"
            style={{ textShadow: '0 0 20px rgba(245,158,11,0.5)' }}
          >
            50,000
          </div>
        </div>
      </div>

      {/* 待续第5部分 - 滚轴区 */}
      
      {/* 滚轴区 */}
      <div className="relative bg-[#040408] h-[200px] lg:h-[220px]">
        {/* 顶部和底部遮罩 */}
        <div 
          className="absolute inset-0 z-10 pointer-events-none"
          style={{
            background: `linear-gradient(180deg,
              #040408 0%,
              rgba(4,4,8,0.8) 15%,
              transparent 35%,
              transparent 65%,
              rgba(4,4,8,0.8) 85%,
              #040408 100%
            )`
          }}
        />

        {/* 中奖线 */}
        <div 
          className="absolute top-1/2 left-0 right-0 -translate-y-1/2 h-[66px] border-t border-b z-20 pointer-events-none"
          style={{ borderColor: 'rgba(0,245,212,0.35)' }}
        >
          {/* 左箭头 */}
          <div 
            className="absolute left-0 top-1/2 -translate-y-1/2"
            style={{
              width: 0,
              height: 0,
              borderTop: '8px solid transparent',
              borderBottom: '8px solid transparent',
              borderRight: '12px solid rgba(0,245,212,0.6)'
            }}
          />
          {/* 右箭头 */}
          <div 
            className="absolute right-0 top-1/2 -translate-y-1/2"
            style={{
              width: 0,
              height: 0,
              borderTop: '8px solid transparent',
              borderBottom: '8px solid transparent',
              borderLeft: '12px solid rgba(0,245,212,0.6)'
            }}
          />
        </div>

        {/* 待续第6部分 - 三列滚轴 */}
        
        {/* 三列滚轴 */}
        <div className="flex h-full">
          {reels.map((symbol, i) => (
            <div 
              key={i} 
              className="flex-1 overflow-hidden border-l border-[rgba(0,245,212,0.08)] first:border-l-0"
            >
              <div 
                className={`flex flex-col items-center justify-center h-full ${spinning ? 'animate-spin' : ''}`}
                style={{ transformStyle: 'preserve-3d' }}
              >
                <div 
                  className="text-[46px] flex items-center justify-center h-[68px]"
                  style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))' }}
                >
                  {symbol}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 中奖提示 */}
        {lastWin > 0 && (
          <div className="absolute inset-0 flex items-center justify-center z-30 bg-[rgba(0,0,0,0.88)] backdrop-blur-sm">
            <div className="text-center animate-bounce">
              <div className="text-[40px] font-bold text-[#f59e0b] mb-2">🎉 WIN!</div>
              <div className="font-['JetBrains_Mono'] text-[32px] font-bold text-[#22c55e]">
                +{lastWin}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
