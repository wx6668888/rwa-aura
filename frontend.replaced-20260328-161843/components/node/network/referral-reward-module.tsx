'use client'

type Props = {
  totalEarned: string
  thisMonth: string
  loading: boolean
  labels: {
    title: string
    badge: string
    total: string
    month: string
    rule: string
  }
}

export function ReferralRewardModule({ totalEarned, thisMonth, loading, labels }: Props) {
  return (
    <section
      className="mx-5 mb-2 rounded-2xl border border-[#00f5d426] p-4"
      style={{ background: 'linear-gradient(135deg, rgba(0,245,212,0.08), rgba(0,245,212,0.03))' }}
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-[#00f5d499]">{labels.title}</span>
        <span className="rounded-md border border-[#00f5d433] bg-[#00f5d41a] px-2.5 py-0.5 text-[10px] font-bold text-[#00f5d4]">
          {labels.badge}
        </span>
      </div>
      <div className="mb-3 grid grid-cols-2 gap-2">
        <div>
          <p className="text-[9px] uppercase text-[#475569]">{labels.total}</p>
          <p className="font-[family-name:var(--font-jetbrains-mono)] text-lg font-semibold text-[#00f5d4]">
            {loading ? '…' : totalEarned}
          </p>
        </div>
        <div>
          <p className="text-[9px] uppercase text-[#475569]">{labels.month}</p>
          <p className="font-[family-name:var(--font-jetbrains-mono)] text-lg font-semibold text-[#00f5d4]">
            {loading ? '…' : thisMonth}
          </p>
        </div>
      </div>
      <div className="rounded-[10px] border border-[#00f5d41a] bg-[#00f5d40d] p-3 text-[12px] leading-relaxed text-[#94a3b8]">
        {labels.rule}
      </div>
    </section>
  )
}
