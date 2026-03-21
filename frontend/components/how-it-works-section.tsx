'use client'

import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'

interface Step {
  number: string
  titleKey: string
  descKey: string
}

const steps: Step[] = [
  { number: '01', titleKey: 'howItWorks.s1.title', descKey: 'howItWorks.s1.desc' },
  { number: '02', titleKey: 'howItWorks.s2.title', descKey: 'howItWorks.s2.desc' },
  { number: '03', titleKey: 'howItWorks.s3.title', descKey: 'howItWorks.s3.desc' },
  { number: '04', titleKey: 'howItWorks.s4.title', descKey: 'howItWorks.s4.desc' },
  { number: '05', titleKey: 'howItWorks.s5.title', descKey: 'howItWorks.s5.desc' },
]

export function HowItWorksSection() {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)

  return (
    <section className="mx-auto max-w-7xl px-4 py-20 lg:px-8">
      <h2 className="mb-16 font-[family-name:var(--font-space-grotesk)] text-[40px] font-extrabold text-[#f1f5f9]">
        {t('howItWorks.title')}
      </h2>

      {/* Desktop: horizontal timeline; Mobile: vertical centered */}
      <div className="relative flex flex-col gap-8 md:flex-row md:gap-0">
        {/* Connecting line — desktop (positioned below the number circles with gap) */}
        <div className="pointer-events-none absolute top-[52px] start-0 end-0 hidden h-px md:block">
          <svg width="100%" height="2" className="overflow-visible">
            <line
              x1="0"
              y1="1"
              x2="100%"
              y2="1"
              stroke="#00f5d4"
              strokeWidth="1"
              strokeDasharray="8 4"
              className="animate-dash-flow"
            />
          </svg>
        </div>

        {steps.map((step, i) => (
          <div key={i} className="relative flex flex-1 flex-col items-center gap-4 md:px-4">
            {/* Circle number with animation */}
            <div
              className="relative z-10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#05050a] font-[family-name:var(--font-space-grotesk)] text-sm font-bold text-[#00f5d4] animate-pulse-glow"
              style={{ border: '2px solid #00f5d4', boxShadow: '0 0 20px #00f5d440' }}
            >
              {step.number}
            </div>
            <div className="text-center">
              <p className="font-[family-name:var(--font-space-grotesk)] text-base font-bold text-[#f1f5f9]">
                {t(step.titleKey)}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-[#64748b]">
                {t(step.descKey)}
              </p>
            </div>
            {/* Vertical line — mobile (after text) */}
            {i < steps.length - 1 && (
              <div className="h-8 w-px bg-[#00f5d440] md:hidden" />
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
