'use client'

import { useState } from 'react'
import { formatUnits } from 'viem'
import { ChevronRight } from 'lucide-react'
import type { DirectReferral } from '@/hooks/useDirectReferrals'
import { getNodeLevelConfig } from '@/lib/node-levels'
import { estimateLevelFromPersonalStakeUSDT } from '@/lib/referral-level-estimate'

const RWA_PRICE = 0.85

function levelBadgeClass(lv: number) {
  if (lv <= 1) return 'bg-[#94a3b8]/20 text-[#94a3b8] border-[#94a3b8]/30'
  if (lv === 2) return 'bg-[#22c55e]/15 text-[#22c55e] border-[#22c55e]/30'
  if (lv <= 4) return 'bg-[#00f5d4]/12 text-[#00f5d4] border-[#00f5d4]/30'
  if (lv <= 6) return 'bg-[#8b5cf6]/15 text-[#8b5cf6] border-[#8b5cf6]/30'
  return 'bg-[#f59e0b]/15 text-[#f59e0b] border-[#f59e0b]/30'
}

type Props = {
  referrals: DirectReferral[]
  loading: boolean
  labels: {
    emptyTitle: string
    emptySub: string
    cta: string
    teamSize: string
    stake: string
    joined: string
    expandStake: string
    expandRet: string
    expandDaily: string
    subPreview: string
    viewSub: string
    online: string
    offline: string
  }
  localeBcp47: string
  onViewSubTree: () => void
}

export function DirectReferralsTab({ referrals, loading, labels, localeBcp47, onViewSubTree }: Props) {
  const [open, setOpen] = useState<string | null>(null)

  if (loading) {
    return <p className="px-5 py-6 text-[13px] text-[#64748b]">…</p>
  }

  if (referrals.length === 0) {
    return (
      <div className="flex flex-col items-center px-5 py-10 text-center">
        <svg className="mb-4 h-16 w-16 opacity-30" viewBox="0 0 64 64" fill="none" aria-hidden>
          <circle cx="32" cy="20" r="6" stroke="#94a3b8" strokeWidth="2" />
          <circle cx="16" cy="44" r="5" stroke="#94a3b8" strokeWidth="2" />
          <circle cx="48" cy="44" r="5" stroke="#94a3b8" strokeWidth="2" />
          <path d="M32 26L16 39M32 26L48 39" stroke="#94a3b8" strokeWidth="1.5" />
        </svg>
        <p className="text-[14px] text-[#94a3b8]">{labels.emptyTitle}</p>
        <p className="mt-1 text-[11px] text-[#475569]">{labels.emptySub}</p>
        <button
          type="button"
          onClick={onViewSubTree}
          className="mt-4 rounded-lg border border-[#00f5d440] px-4 py-2 text-[12px] text-[#00f5d4]"
        >
          {labels.cta}
        </button>
      </div>
    )
  }

  return (
    <div className="px-5 pb-4">
      {referrals.map((ref) => {
        const rwa = parseFloat(formatUnits(BigInt(ref.totalStaked || '0'), 18))
        const usdtEq = rwa * RWA_PRICE
        const est = estimateLevelFromPersonalStakeUSDT(usdtEq)
        const cfg = getNodeLevelConfig(est) ?? getNodeLevelConfig(1)!
        const short = `${ref.address.slice(0, 6)}…${ref.address.slice(-4)}`
        const initials = ref.address.slice(2, 4).toUpperCase()
        const isOpen = open === ref.address
        const joined = new Date((ref.firstStakeTime || 0) * 1000).toLocaleDateString(localeBcp47)

        return (
          <div key={ref.address} className="mb-2">
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : ref.address)}
              className={`flex w-full cursor-pointer items-center gap-3 rounded-[14px] border border-[#ffffff0f] bg-[#0d0d14] px-3.5 py-3 text-left transition-all hover:translate-x-[3px] hover:border-[#ffffff1f] ${
                isOpen ? 'border-[#00f5d42e]' : ''
              }`}
            >
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border font-[family-name:var(--font-jetbrains-mono)] text-[13px] font-bold ${
                  usdtEq > 0
                    ? 'border-[#00f5d433] bg-[#00f5d41a] text-[#00f5d4]'
                    : 'border-[#ffffff14] bg-[#1a1a2a] text-[#94a3b8]'
                }`}
              >
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-[family-name:var(--font-jetbrains-mono)] text-[12px] text-[#94a3b8]">{short}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${levelBadgeClass(est)}`}>
                    {cfg.code}
                    {est >= 9 ? ' 👑' : ''}
                  </span>
                  <span className="text-[10px] text-[#475569]">
                    {labels.stake}{' '}
                    <span className="font-[family-name:var(--font-jetbrains-mono)] text-[#94a3b8]">
                      {usdtEq.toLocaleString(undefined, { maximumFractionDigits: 0 })} USDT
                    </span>
                  </span>
                  <span className="text-[10px] text-[#475569]">
                    {labels.joined} {joined}
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-0.5">
                <span className={`h-2 w-2 rounded-full ${usdtEq > 0 ? 'bg-[#22c55e]' : 'bg-[#64748b]'}`} title={usdtEq > 0 ? labels.online : labels.offline} />
                <span className="font-[family-name:var(--font-jetbrains-mono)] text-[13px] font-semibold text-[#f1f5f9]">1</span>
                <span className="text-[9px] text-[#475569]">{labels.teamSize}</span>
              </div>
              <ChevronRight className={`h-4 w-4 shrink-0 text-[#475569] transition-transform ${isOpen ? 'rotate-90' : ''}`} />
            </button>
            {isOpen && (
              <div className="mt-2 rounded-[14px] border border-t-0 border-[#ffffff0f] bg-[#0d0d14] px-3.5 pb-3 pt-0">
                <div className="border-t border-[#ffffff0d] pt-3">
                  <div className="grid grid-cols-3 gap-2">
                    <Mini label={labels.expandStake} val={`${usdtEq.toFixed(0)}`} />
                    <Mini label={labels.expandRet} val="—" />
                    <Mini label={labels.expandDaily} val="—" />
                  </div>
                  <p className="mt-3 text-[10px] text-[#475569]">{labels.subPreview}</p>
                  <button
                    type="button"
                    onClick={onViewSubTree}
                    className="mt-2 w-full rounded-lg border border-[#00f5d433] py-1.5 text-[12px] text-[#00f5d4]"
                  >
                    {labels.viewSub}
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function Mini({ label, val }: { label: string; val: string }) {
  return (
    <div className="rounded-lg bg-[#ffffff05] px-2 py-2 text-center">
      <p className="text-[9px] text-[#475569]">{label}</p>
      <p className="font-[family-name:var(--font-jetbrains-mono)] text-[13px] font-semibold text-[#f1f5f9]">{val}</p>
    </div>
  )
}
