'use client'

import { X } from 'lucide-react'

interface Props {
  t: (key: string) => string
}

export function WarningCards({ t }: Props) {
  const warnings = [
    { titleKey: 'emergency.w1title', descKey: 'emergency.w1desc' },
    { titleKey: 'emergency.w2title', descKey: 'emergency.w2desc' },
    { titleKey: 'emergency.w3title', descKey: 'emergency.w3desc' },
  ]

  return (
    <div className="flex flex-col gap-2">
      {warnings.map((w, i) => (
        <div
          key={i}
          className="border-l-4 border-[#f43f5e] bg-[#0d0d14] p-4"
          style={{ borderRadius: 0 }}
        >
          <div className="flex items-center gap-2">
            <X className="h-4 w-4 shrink-0 text-[#f43f5e]" />
            <span className="text-sm font-semibold text-[#f1f5f9]">
              {t(w.titleKey)}
            </span>
          </div>
          <p className="mt-1 pl-6 text-[13px] leading-relaxed text-[#64748b]">
            {t(w.descKey)}
          </p>
        </div>
      ))}
    </div>
  )
}
