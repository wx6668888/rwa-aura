'use client'

import { NODE_LEVELS, getNextLevelConfig } from '@/lib/node-levels'
import { estimatedDailyDividendPercent, fmtUsdtCompact } from '@/lib/network-page-doc'

type Props = {
  currentLevel: number
  personalStake: number
  teamVolume: number
  teamRetained: number
  labels: {
    colLevel: string
    colPersonal: string
    colTeam: string
    colRet: string
    colRate: string
    done: string
    now: string
    lock: string
    gapPrefix: string
    supreme: string
  }
}

export function LevelTableTab({ currentLevel, personalStake, teamVolume, teamRetained, labels }: Props) {
  const next = getNextLevelConfig(currentLevel)

  return (
    <div className="mx-5 mt-3 overflow-hidden rounded-2xl border border-[#ffffff0f] bg-[#0d0d14]">
      <div className="flex border-b border-[#ffffff0f] bg-[#ffffff05] px-3.5 py-2.5 text-[9px] font-semibold uppercase tracking-wide text-[#475569]">
        <span className="w-12 shrink-0">{labels.colLevel}</span>
        <span className="min-w-0 flex-1 text-center">{labels.colPersonal}</span>
        <span className="min-w-0 flex-1 text-center">{labels.colTeam}</span>
        <span className="min-w-0 flex-1 text-center">{labels.colRet}</span>
        <span className="w-14 shrink-0 text-end">{labels.colRate}</span>
      </div>
      {NODE_LEVELS.map((lv) => {
        const isDone = currentLevel > lv.level
        const isNow = currentLevel === lv.level
        const rate = estimatedDailyDividendPercent(lv.level, lv.dividendWeight)
        const rateStr = rate > 0 ? `${rate.toFixed(2)}%` : '—'
        const color =
          lv.level <= 2 ? '#94a3b8' : lv.level <= 4 ? '#00f5d4' : lv.level <= 6 ? '#8b5cf6' : '#f59e0b'

        let gapLine = ''
        if (isNow && next) {
          const pts: string[] = []
          if (personalStake < next.personalStakeUSDT)
            pts.push(`+${fmtUsdtCompact(next.personalStakeUSDT - personalStake)} P`)
          if (teamVolume < next.teamVolumeUSDT) pts.push(`+${fmtUsdtCompact(next.teamVolumeUSDT - teamVolume)} T`)
          if (teamRetained < (next.teamRetainedUSDT || 0))
            pts.push(`+${fmtUsdtCompact((next.teamRetainedUSDT || 0) - teamRetained)} R`)
          if (pts.length) gapLine = `${labels.gapPrefix} L${next.level}: ${pts.join(', ')}`
        }

        return (
          <div key={lv.code} className={`border-b border-[#ffffff08] ${lv.level === 9 ? 'bg-gradient-to-r from-[#f59e0b08] to-transparent' : ''}`}>
            <div
              className={`flex items-center px-3.5 py-3 text-[11px] ${isNow ? 'border-l-2 border-l-[#00f5d4] bg-[#00f5d40a]' : ''}`}
            >
              <span className="w-12 shrink-0 font-[family-name:var(--font-jetbrains-mono)] font-bold" style={{ color }}>
                {lv.code}
                {lv.level === 9 ? ' 👑' : ''}
              </span>
              <span className="min-w-0 flex-1 text-center font-[family-name:var(--font-jetbrains-mono)] text-[#94a3b8]">
                {fmtUsdtCompact(lv.personalStakeUSDT)}
              </span>
              <span className="min-w-0 flex-1 text-center font-[family-name:var(--font-jetbrains-mono)] text-[#94a3b8]">
                {fmtUsdtCompact(lv.teamVolumeUSDT)}
              </span>
              <span className="min-w-0 flex-1 text-center font-[family-name:var(--font-jetbrains-mono)] text-[#94a3b8]">
                {fmtUsdtCompact(lv.teamRetainedUSDT || 0)}
              </span>
              <div className="flex w-14 shrink-0 flex-col items-end gap-1">
                <span className="font-[family-name:var(--font-jetbrains-mono)] font-semibold text-[#f59e0b]">{rateStr}</span>
                {isDone && (
                  <span className="rounded-md bg-[#22c55e]/15 px-1 py-0.5 text-[8px] font-bold text-[#22c55e]">{labels.done}</span>
                )}
                {isNow && (
                  <span className="rounded-md border border-[#00f5d440] bg-[#00f5d41a] px-1 py-0.5 text-[8px] font-bold text-[#00f5d4]">
                    ★{labels.now}
                  </span>
                )}
                {!isDone && !isNow && <span className="text-[9px] text-[#475569]">{labels.lock}</span>}
              </div>
            </div>
            {lv.level === 9 && (
              <div className="px-3.5 pb-2 text-end text-[9px] font-bold text-[#f59e0b]">{labels.supreme}</div>
            )}
            {gapLine ? <div className="border-t border-[#ffffff06] bg-[#00f5d408] px-3.5 py-2 text-[11px] text-[#94a3b8]">{gapLine}</div> : null}
          </div>
        )
      })}
    </div>
  )
}
