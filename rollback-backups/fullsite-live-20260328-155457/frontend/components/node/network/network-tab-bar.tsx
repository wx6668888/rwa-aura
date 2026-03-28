'use client'

export type NetworkTabId = 'direct' | 'tree' | 'ranking'

type Props = {
  tab: NetworkTabId
  onTab: (t: NetworkTabId) => void
  directCount: number
  labels: Record<NetworkTabId, string>
}

export function NetworkTabBar({ tab, onTab, directCount, labels }: Props) {
  const items: { id: NetworkTabId; label: string }[] = [
    { id: 'direct', label: labels.direct.replace('{n}', String(directCount)) },
    { id: 'tree', label: labels.tree },
    { id: 'ranking', label: labels.ranking },
  ]
  return (
    <div className="mt-4 flex gap-1.5 px-5">
      {items.map((it) => {
        const on = tab === it.id
        return (
          <button
            key={it.id}
            type="button"
            onClick={() => onTab(it.id)}
            className={`flex-1 rounded-[10px] py-2.5 text-center text-[12px] font-medium transition-colors ${
              on
                ? 'border border-[#00f5d42e] bg-[#00f5d41a] text-[#00f5d4]'
                : 'border border-transparent text-[#475569] hover:text-[#94a3b8]'
            }`}
          >
            {it.label}
          </button>
        )
      })}
    </div>
  )
}
