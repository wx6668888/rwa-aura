'use client'

import { useState } from 'react'
import type { RetentionRow } from '@/hooks/useRetentionLeaderboard'
import { getNodeLevelConfig } from '@/lib/node-levels'

type Props = {
  rows: RetentionRow[]
  myAddress?: string
  myRank: number | null
  myRetained: number
  loading: boolean
  labels: {
    intro: string
    netRet: string
    you: string
    loadMore: string
  }
}

const PAGE = 15

export function RankingTab({ rows, myAddress, myRank, myRetained, loading, labels }: Props) {
  const [n, setN] = useState(PAGE)
  const slice = rows.slice(0, n)
  const me = (myAddress || '').toLowerCase()

  if (loading) {
    return <p className="px-5 py-6 text-[13px] text-[#64748b]">…</p>
  }

  return (
    <div className="px-5 pb-4">
      {labels.intro?.trim() ? (
        <p className="py-3 text-[11px] text-[#475569]">{labels.intro}</p>
      ) : null}
      {slice.map((row) => {
        const isMe = me && row.address === me
        const medal = row.rank === 1 ? '🥇' : row.rank === 2 ? '🥈' : row.rank === 3 ? '🥉' : null
        const cfg = getNodeLevelConfig(row.level)
        return (
          <div
            key={row.address}
            className={`mb-2 flex items-center gap-3 rounded-[13px] border px-3.5 py-3 ${
              isMe ? 'border-[#00f5d433] bg-[#00f5d414]' : 'border-[#ffffff0f] bg-[#0d0d14]'
            }`}
          >
            <div className="w-7 shrink-0 text-center font-[family-name:var(--font-jetbrains-mono)] text-[13px] font-bold text-[#475569]">
              {medal || (isMe ? <span className="text-[#00f5d4]">{row.rank}</span> : row.rank)}
            </div>
            <div
              className={`flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] border font-[family-name:var(--font-jetbrains-mono)] text-[11px] ${
                isMe ? 'border-[#00f5d440] bg-[#00f5d41a] text-[#00f5d4]' : 'border-[#ffffff14] bg-[#1a1a2a] text-[#94a3b8]'
              }`}
            >
              {row.address.slice(2, 4).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-[family-name:var(--font-jetbrains-mono)] text-[11px] text-[#94a3b8]">
                {row.address.slice(0, 6)}…{row.address.slice(-4)}
                {isMe && (
                  <span className="ml-2 rounded border border-[#00f5d440] px-1 text-[9px] text-[#00f5d4]">{labels.you}</span>
                )}
              </p>
              <p className="text-[10px] text-[#475569]">
                {cfg?.code ?? 'L1'} · {row.directReferrals} dir.
              </p>
            </div>
            <div className="text-end">
              <p className="font-[family-name:var(--font-jetbrains-mono)] text-[13px] font-semibold text-[#f1f5f9]">
                {row.teamRetainedUsdt.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
              <p className="text-[9px] text-[#475569]">{labels.netRet}</p>
            </div>
          </div>
        )
      })}

      {myRank != null && me && !slice.some((r) => r.address === me) && (
        <>
          <p className="py-2 text-center text-[#475569]">· · ·</p>
          <div className="mb-2 flex items-center gap-3 rounded-[13px] border border-[#00f5d433] bg-[#00f5d414] px-3.5 py-3">
            <div className="w-7 shrink-0 text-center font-[family-name:var(--font-jetbrains-mono)] text-[13px] font-bold text-[#00f5d4]">
              {myRank}
            </div>
            <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] border border-[#00f5d440] bg-[#00f5d41a] font-[family-name:var(--font-jetbrains-mono)] text-[11px] text-[#00f5d4]">
              {me.slice(2, 4).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-[family-name:var(--font-jetbrains-mono)] text-[11px] text-[#94a3b8]">
                {me.slice(0, 6)}…{me.slice(-4)}{' '}
                <span className="rounded border border-[#00f5d440] px-1 text-[9px] text-[#00f5d4]">{labels.you}</span>
              </p>
            </div>
            <div className="text-end">
              <p className="font-[family-name:var(--font-jetbrains-mono)] text-[13px] font-semibold text-[#f1f5f9]">
                {myRetained.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
              <p className="text-[9px] text-[#475569]">{labels.netRet}</p>
            </div>
          </div>
        </>
      )}

      {n < rows.length && (
        <button
          type="button"
          onClick={() => setN((x) => x + PAGE)}
          className="mt-2 w-full rounded-[10px] border border-[#ffffff0f] py-2.5 text-[13px] text-[#475569] hover:text-[#94a3b8]"
        >
          {labels.loadMore}
        </button>
      )}
    </div>
  )
}
