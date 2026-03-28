'use client'

import { useMemo, useState } from 'react'
import { formatUnits } from 'viem'
import type { DirectReferral } from '@/hooks/useDirectReferrals'
import { getNodeLevelConfig } from '@/lib/node-levels'
import { estimateLevelFromPersonalStakeUSDT } from '@/lib/referral-level-estimate'

const RWA_PRICE = 0.85

type Props = {
  me: string
  referrals: DirectReferral[]
  labels: {
    title: string
    expand: string
    collapse: string
    you: string
    deeper: string
    empty: string
  }
}

export function NetworkTreeTab({ me, referrals, labels }: Props) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const nodes = useMemo(() => {
    return referrals.map((r) => {
      const rwa = parseFloat(formatUnits(BigInt(r.totalStaked || '0'), 18))
      const u = rwa * RWA_PRICE
      const lv = estimateLevelFromPersonalStakeUSDT(u)
      const cfg = getNodeLevelConfig(lv) ?? getNodeLevelConfig(1)!
      return { ...r, usdt: u, cfg }
    })
  }, [referrals])

  const allOpen = () => {
    const n: Record<string, boolean> = {}
    nodes.forEach((x) => {
      n[x.address] = true
    })
    setExpanded(n)
  }
  const allClose = () => setExpanded({})

  const short = (a: string) => (a.length >= 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a)

  return (
    <div className="mx-5 mt-3 overflow-hidden rounded-2xl border border-[#ffffff0f] bg-[#0d0d14]">
      <div className="flex items-center justify-between border-b border-[#ffffff0f] px-4 py-3">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-[#475569]">{labels.title}</span>
        <div className="flex gap-2">
          <button type="button" onClick={allOpen} className="rounded-md border border-[#ffffff14] px-2 py-1 text-[10px] text-[#94a3b8]">
            {labels.expand}
          </button>
          <button type="button" onClick={allClose} className="rounded-md border border-[#ffffff14] px-2 py-1 text-[10px] text-[#94a3b8]">
            {labels.collapse}
          </button>
        </div>
      </div>
      <div className="min-h-[300px] overflow-x-auto p-5">
        {nodes.length === 0 ? (
          <p className="py-12 text-center text-[13px] text-[#64748b]">{labels.empty}</p>
        ) : (
          <div className="flex flex-col items-center gap-6">
            <div
              className="min-w-[130px] rounded-xl border border-[#00f5d440] px-4 py-2.5 text-center shadow-[0_0_20px_rgba(0,245,212,0.12)]"
              style={{ background: 'rgba(0,245,212,0.10)' }}
            >
              <p className="text-[10px] text-[#475569]">{labels.you}</p>
              <p className="font-[family-name:var(--font-jetbrains-mono)] text-[11px] text-[#00f5d4]">{short(me)}</p>
            </div>
            <div className="h-6 w-px bg-[#00f5d426]" />
            <div className="flex w-max gap-4 pb-2">
              {nodes.map((n) => {
                const isEx = expanded[n.address]
                return (
                  <div key={n.address} className="flex flex-col items-center">
                    <button
                      type="button"
                      onClick={() => setExpanded((s) => ({ ...s, [n.address]: !isEx }))}
                      className="min-w-[100px] rounded-[10px] border border-[#ffffff14] bg-[#13131e] px-3 py-2 text-center transition-colors hover:border-[#00f5d440]"
                    >
                      <p className="font-[family-name:var(--font-jetbrains-mono)] text-[10px] text-[#94a3b8]">{short(n.address)}</p>
                      <p className="text-[10px] text-[#f59e0b]">
                        {n.cfg.code} · {n.usdt.toFixed(0)} U
                      </p>
                    </button>
                    {isEx && (
                      <div className="mt-2 flex flex-col items-center">
                        <div className="h-4 w-px bg-[#00f5d426]" />
                        <div className="rounded-lg border border-dashed border-[#ffffff14] px-2 py-1 text-[10px] text-[#475569]">
                          {labels.deeper}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
