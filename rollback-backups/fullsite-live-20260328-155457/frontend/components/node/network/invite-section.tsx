'use client'

type Props = {
  link: string
  copied: boolean
  onCopy: () => void
  invitedCount: number
  earnedRwa: string
  labels: {
    title: string
    share: string
    qr: string
    copied: string
    copy: string
    stats: string
  }
}

export function InviteSection({ link, copied, onCopy, invitedCount, earnedRwa, labels }: Props) {
  const qrUrl =
    typeof link === 'string' && link.length > 0
      ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(link)}`
      : ''

  return (
    <section className="mx-5 mb-8 rounded-2xl border border-[#ffffff0f] bg-[#0d0d14] p-[18px]">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-[#475569]">{labels.title}</p>
      <div className="mb-3 flex items-center gap-2.5 rounded-[10px] border border-[#ffffff0f] bg-[#1a1a2a] px-3 py-2.5">
        <span className="min-w-0 flex-1 truncate font-[family-name:var(--font-jetbrains-mono)] text-[11px] text-[#94a3b8]">
          {link || '—'}
        </span>
        <button
          type="button"
          onClick={onCopy}
          className="shrink-0 rounded-lg border border-[#00f5d433] bg-[#00f5d41a] px-3 py-1.5 text-[11px] font-semibold text-[#00f5d4]"
        >
          {copied ? labels.copied : labels.copy}
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onCopy}
          className="flex h-[42px] items-center justify-center rounded-[10px] bg-[#00f5d4] text-[13px] font-semibold text-[#05050a]"
        >
          {labels.share}
        </button>
        <a
          href={qrUrl || '#'}
          target="_blank"
          rel="noreferrer"
          className={`flex h-[42px] items-center justify-center rounded-[10px] border border-[#ffffff0f] bg-[#1a1a2a] text-[13px] font-semibold text-[#f1f5f9] ${!qrUrl ? 'pointer-events-none opacity-40' : ''}`}
        >
          {labels.qr}
        </a>
      </div>
      <p className="mt-3 text-[11px] text-[#475569]">
        {labels.stats.replace('{n}', String(invitedCount)).replace('{e}', earnedRwa)}
      </p>
    </section>
  )
}
