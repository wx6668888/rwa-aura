'use client'

import { useMemo } from 'react'
import { MiniNodeHexIcon } from '@/components/nodes/node-hex-icon'
import { NODE_LEVELS, getNextLevelConfig } from '@/lib/node-levels'
import { DOC_LEVEL_NAME_EN } from '@/lib/network-page-doc'
import { ShimmerBlock } from './loading-skeleton'

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x))
}

type Props = {
  level: number
  address: string
  personalStakeUSDT: number
  teamVolume: number
  teamRetained: number
  directCount: number
  teamSize: number
  loading: boolean
  labels: {
    level: string
    myStake: string
    joined: string
    upgradeTo: string
    personal: string
    teamStake: string
    netRet: string
    directRefs: string
    teamSizeL: string
    myStakeS: string
    needMoreTeam: string
    needMoreRet: string
    needMorePersonal: string
    maxed: string
  }
}

export function MyNodeCard({
  level,
  address,
  personalStakeUSDT,
  teamVolume,
  teamRetained,
  directCount,
  teamSize,
  loading,
  labels,
}: Props) {
  const next = getNextLevelConfig(level)
  const docName = DOC_LEVEL_NAME_EN[level] || NODE_LEVELS[0].nameEn

  const progress = useMemo(() => {
    if (!next) {
      return { p: 1, t: 1, r: 1, gap: labels.maxed }
    }
    const p = next.personalStakeUSDT > 0 ? clamp01(personalStakeUSDT / next.personalStakeUSDT) : 1
    const t = next.teamVolumeUSDT > 0 ? clamp01(teamVolume / next.teamVolumeUSDT) : 1
    const r = next.teamRetainedUSDT > 0 ? clamp01(teamRetained / next.teamRetainedUSDT) : 1
    const needP = Math.max(0, next.personalStakeUSDT - personalStakeUSDT)
    const needT = Math.max(0, next.teamVolumeUSDT - teamVolume)
    const needR = Math.max(0, next.teamRetainedUSDT - teamRetained)
    let gap = ''
    if (p < t && p < r && needP > 0) gap = labels.needMorePersonal.replace('{n}', needP.toLocaleString())
    else if (t < r && needT > 0) gap = labels.needMoreTeam.replace('{n}', needT.toLocaleString())
    else if (needR > 0) gap = labels.needMoreRet.replace('{n}', needR.toLocaleString())
    else gap = labels.maxed
    return { p, t, r, gap, next }
  }, [next, personalStakeUSDT, teamVolume, teamRetained, labels])

  const shortAddr = address && address.length >= 12 ? `${address.slice(0, 6)}…${address.slice(-4)}` : '—'

  return (
    <section
      className="relative mx-5 mb-2 overflow-hidden rounded-[20px] border border-[#00f5d433] p-5 shadow-[0_0_40px_rgba(0,245,212,0.07),0_20px_50px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.05)]"
      style={{ background: 'linear-gradient(135deg, #13131e 0%, #0d0d14 100%)' }}
    >
      <div
        className="pointer-events-none absolute -right-[60px] -top-[60px] h-[180px] w-[180px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(0,245,212,0.08), transparent 70%)' }}
      />
      <div className="relative mb-[18px] flex justify-between gap-3">
        <div className="rounded-[14px] border border-[#00f5d42e] bg-[#00f5d41a] px-4 py-2.5 text-center">
          <p className="text-[9px] font-semibold uppercase tracking-wider text-[#475569]">{labels.level}</p>
          {loading ? (
            <ShimmerBlock className="mx-auto mt-1 h-8 w-16" />
          ) : (
            <p className="font-[family-name:var(--font-jetbrains-mono)] text-[28px] font-bold leading-none text-[#00f5d4]">
              L{level}
            </p>
          )}
          <p className="mt-1 text-[11px] text-[#94a3b8]">{docName}</p>
        </div>
        <div className="min-w-0 text-right">
          <p className="font-[family-name:var(--font-jetbrains-mono)] text-[11px] text-[#475569]">{shortAddr}</p>
          <p className="mt-1 text-[10px] text-[#475569]">{labels.joined}</p>
          <p className="mt-1 font-[family-name:var(--font-jetbrains-mono)] text-[13px] text-[#22c55e]">
            {labels.myStake}: {loading ? '…' : `${personalStakeUSDT.toLocaleString(undefined, { maximumFractionDigits: 0 })} USDT`}
          </p>
        </div>
      </div>

      <div className="relative mb-4">
        <div className="mb-2 flex items-start justify-between gap-2">
          <span className="text-[11px] text-[#475569]">
            {next ? labels.upgradeTo.replace('{lv}', `L${next.level}`) : labels.maxed}
          </span>
          <span className="max-w-[55%] text-right font-[family-name:var(--font-jetbrains-mono)] text-[11px] text-[#94a3b8]">
            {progress.gap}
          </span>
        </div>
        <DimBar
          label={labels.personal}
          cur={personalStakeUSDT}
          target={next?.personalStakeUSDT ?? 0}
          pct={progress.p}
          loading={loading}
        />
        <div className="h-2" />
        <DimBar
          label={labels.teamStake}
          cur={teamVolume}
          target={next?.teamVolumeUSDT ?? 0}
          pct={progress.t}
          loading={loading}
        />
        <div className="h-2" />
        <DimBar
          label={labels.netRet}
          cur={teamRetained}
          target={next?.teamRetainedUSDT ?? 0}
          pct={progress.r}
          loading={loading}
        />

        <div className="mt-3 flex justify-between gap-1">
          {NODE_LEVELS.map((cfg) => (
            <div key={cfg.code} className="flex flex-1 flex-col items-center gap-1">
              <div className={cfg.level > level ? 'opacity-25' : ''}>
                <MiniNodeHexIcon config={cfg} size={26} />
              </div>
              <span
                className={`h-1.5 w-1.5 rounded-full ${cfg.level < level ? 'bg-[#00f5d4] shadow-[0_0_8px_#00f5d4]' : ''} ${cfg.level === level ? 'animate-pulse bg-[#00f5d4] shadow-[0_0_10px_#00f5d4]' : ''} ${cfg.level > level ? 'border border-[#ffffff1a] bg-transparent' : ''}`}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        <QuickStat label={labels.directRefs} value={loading ? '…' : String(directCount)} color="#00f5d4" />
        <QuickStat label={labels.teamSizeL} value={loading ? '…' : String(teamSize)} color="#8b5cf6" />
        <QuickStat
          label={labels.myStakeS}
          value={loading ? '…' : personalStakeUSDT.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          color="#22c55e"
        />
      </div>
    </section>
  )
}

function DimBar({
  label,
  cur,
  target,
  pct,
  loading,
}: {
  label: string
  cur: number
  target: number
  pct: number
  loading: boolean
}) {
  const met = target <= 0 || pct >= 1
  return (
    <div>
      <div className="mb-1 flex justify-between">
        <span className="text-[9px] font-semibold uppercase tracking-wide text-[#475569]">{label}</span>
        <span className={`font-[family-name:var(--font-jetbrains-mono)] text-[10px] ${met ? 'text-[#22c55e]' : 'text-[#94a3b8]'}`}>
          {loading ? '…' : `${cur.toLocaleString(undefined, { maximumFractionDigits: 0 })} / ${target.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
        </span>
      </div>
      <div className="h-[5px] overflow-hidden rounded-[3px] bg-[#ffffff0d]">
        <div
          className="h-full rounded-[3px] transition-[width] duration-1000 ease-out"
          style={{
            width: loading ? '30%' : `${pct * 100}%`,
            background: met
              ? '#22c55e'
              : 'linear-gradient(90deg, #00f5d4, rgba(0,245,212,0.7))',
            boxShadow: met ? '0 0 8px rgba(34,197,94,0.4)' : '0 0 6px rgba(0,245,212,0.25)',
          }}
        />
      </div>
    </div>
  )
}

function QuickStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-[10px] border border-[#ffffff0d] bg-[#ffffff08] px-2 py-2.5 text-center">
      <p className="text-[9px] font-semibold uppercase tracking-wide text-[#475569]">{label}</p>
      <p className="mt-1 font-[family-name:var(--font-jetbrains-mono)] text-[15px] font-semibold" style={{ color }}>
        {value}
      </p>
    </div>
  )
}
