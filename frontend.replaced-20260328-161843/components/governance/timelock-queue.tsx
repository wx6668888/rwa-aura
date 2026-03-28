'use client'

import { CheckCircle } from 'lucide-react'
import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'

// Set to true and populate items to show the table instead of the empty state
const TIMELOCK_ITEMS: Array<{
  param: string
  current: string
  proposed: string
  time: string
  ready: boolean
}> = []

export function TimelockQueue() {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)

  return (
    <section className="mt-8">
      <p className="text-[13px] font-semibold uppercase tracking-widest text-[#64748b]">
        {t('gov.timelockTitle')}
      </p>

      <div className="mt-4">
        {TIMELOCK_ITEMS.length === 0 ? (
          /* Empty state */
          <div className="rounded-xl border border-[#ffffff0d] bg-[#0d0d14] p-8 text-center backdrop-blur-xl">
            <CheckCircle className="mx-auto h-8 w-8 text-[#10b981]" />
            <p className="mt-3 text-base font-semibold text-[#f1f5f9]">{t('gov.timelockEmpty')}</p>
            <p className="mt-1 text-[13px] text-[#64748b]">{t('gov.timelockEmptySub')}</p>
          </div>
        ) : (
          /* Table */
          <div className="overflow-hidden rounded-xl border border-[#ffffff0d] bg-[#0d0d14] backdrop-blur-xl">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#ffffff0d]">
                    {[
                      t('gov.timelockColParam'),
                      t('gov.timelockColCurrent'),
                      t('gov.timelockColNew'),
                      t('gov.timelockColTime'),
                      t('gov.timelockColStatus'),
                    ].map((col) => (
                      <th
                        key={col}
                        className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[#334155]"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {TIMELOCK_ITEMS.map((item, i) => (
                    <tr
                      key={i}
                      className="border-b border-[#ffffff0d] last:border-0 hover:bg-[#13131e]"
                    >
                      <td className="px-5 py-4 text-sm text-[#f1f5f9]">{item.param}</td>
                      <td className="px-5 py-4 font-[family-name:var(--font-mono)] text-sm text-[#64748b]">{item.current}</td>
                      <td className="px-5 py-4 font-[family-name:var(--font-mono)] text-sm text-[#00f5d4]">{item.proposed}</td>
                      <td className="px-5 py-4 font-[family-name:var(--font-mono)] text-sm text-[#64748b]">{item.time}</td>
                      <td className="px-5 py-4">
                        {item.ready ? (
                          <span
                            className="rounded-full px-2.5 py-1 text-[11px] font-medium text-[#10b981]"
                            style={{ background: 'rgba(16,185,129,0.1)' }}
                          >
                            {t('gov.statusReady')}
                          </span>
                        ) : (
                          <span
                            className="rounded-full px-2.5 py-1 text-[11px] font-medium text-[#fb923c]"
                            style={{ background: 'rgba(251,146,60,0.1)' }}
                          >
                            {t('gov.statusLocked')}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
