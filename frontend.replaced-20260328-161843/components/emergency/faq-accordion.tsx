'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

interface Props {
  t: (key: string) => string
}

const FAQ_ITEMS = [
  { q: 'emergency.q1', a: 'emergency.a1' },
  { q: 'emergency.q2', a: 'emergency.a2' },
  { q: 'emergency.q3', a: 'emergency.a3' },
]

export function FaqAccordion({ t }: Props) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  function toggle(i: number) {
    setOpenIndex(openIndex === i ? null : i)
  }

  return (
    <div className="mt-8">
      {FAQ_ITEMS.map((item, i) => {
        const isOpen = openIndex === i
        return (
          <div key={i} className="border-b border-[#ffffff0d]">
            <button
              type="button"
              onClick={() => toggle(i)}
              className="flex w-full items-center justify-between py-4 text-left transition-colors hover:text-[#f1f5f9]"
            >
              <span className="text-sm font-medium text-[#f1f5f9]">
                {t(item.q)}
              </span>
              <ChevronDown
                className="h-4 w-4 shrink-0 text-[#64748b] transition-transform duration-200"
                style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
              />
            </button>
            <div
              className="overflow-hidden transition-all duration-200"
              style={{ maxHeight: isOpen ? '200px' : '0px', opacity: isOpen ? 1 : 0 }}
            >
              <p className="pb-4 text-[13px] leading-relaxed text-[#64748b]">
                {t(item.a)}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
