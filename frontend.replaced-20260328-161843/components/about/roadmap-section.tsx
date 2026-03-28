'use client'

import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'
import { Check, Circle, Lock } from 'lucide-react'

export function RoadmapSection() {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)

  const milestones = [
    {
      status: 'completed',
      period: t('about.q1_2025'),
      title: t('about.m1title'),
      items: [
        { done: true, text: t('about.m1item1') },
        { done: true, text: t('about.m1item2') },
        { done: true, text: t('about.m1item3') },
        { done: true, text: t('about.m1item4') },
      ],
    },
    {
      status: 'inProgress',
      period: t('about.q2_2025'),
      title: t('about.m2title'),
      items: [
        { done: true, text: t('about.m2item1') },
        { done: true, text: t('about.m2item2') },
        { done: 'partial', text: t('about.m2item3') },
        { done: false, text: t('about.m2item4') },
      ],
    },
    {
      status: 'upcoming',
      period: t('about.q3_2025'),
      title: t('about.m3title'),
      items: [
        { done: false, text: t('about.m3item1') },
        { done: false, text: t('about.m3item2') },
        { done: false, text: t('about.m3item3') },
        { done: false, text: t('about.m3item4') },
      ],
    },
    {
      status: 'future',
      period: t('about.q4_2025'),
      title: t('about.m4title'),
      items: [
        { done: false, text: t('about.m4item1') },
        { done: false, text: t('about.m4item2') },
        { done: false, text: t('about.m4item3') },
        { done: false, text: t('about.m4item4') },
      ],
    },
  ]

  return (
    <section className="border-y border-[#ffffff0d] bg-[#0d0d14] px-4 py-16 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-12 text-center">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-[#64748b]">
            {t('about.roadmapLabel')}
          </div>
          <h2 className="mt-3 font-[family-name:var(--font-space-grotesk)] text-4xl font-extrabold text-[#f1f5f9]">
            {t('about.roadmapTitle')}
          </h2>
        </div>

        {/* Timeline - vertical on mobile, horizontal on desktop */}
        <div className="relative">
          {/* Connecting line (desktop) */}
          <div className="absolute left-0 top-12 hidden h-0.5 w-full bg-gradient-to-r from-[#00f5d4] via-[#00f5d4] to-[#334155] lg:block" style={{ backgroundSize: '200% 100%' }} />

          {/* Milestones */}
          <div className="grid gap-8 lg:grid-cols-4">
            {milestones.map((milestone, i) => (
              <div key={i} className="relative">
                {/* Status indicator */}
                <div className="mb-4 flex items-center justify-center lg:justify-start">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full ${
                      milestone.status === 'completed'
                        ? 'bg-[#00f5d4] text-[#05050a]'
                        : milestone.status === 'inProgress'
                        ? 'animate-pulse border-2 border-[#00f5d4] bg-[#0d0d14] text-[#00f5d4]'
                        : 'border-2 border-[#334155] bg-[#0d0d14] text-[#334155]'
                    }`}
                  >
                    {milestone.status === 'completed' && <Check className="h-5 w-5" />}
                    {milestone.status === 'inProgress' && <Circle className="h-5 w-5 fill-current" />}
                    {(milestone.status === 'upcoming' || milestone.status === 'future') && <Lock className="h-5 w-5" />}
                  </div>
                </div>

                {/* Card */}
                <div
                  className={`rounded-xl border p-6 ${
                    milestone.status === 'completed'
                      ? 'border-[#00f5d4] bg-[#00f5d410]'
                      : milestone.status === 'inProgress'
                      ? 'border-[#fb923c] bg-[#fb923c10]'
                      : 'border-[#ffffff0d] bg-[#0d0d14]'
                  }`}
                >
                  {/* Period */}
                  <div className="text-xs font-semibold uppercase tracking-wider text-[#64748b]">
                    {milestone.period}
                  </div>

                  {/* Title */}
                  <h3 className="mt-2 font-[family-name:var(--font-space-grotesk)] text-lg font-bold text-[#f1f5f9]">
                    {milestone.title}
                  </h3>

                  {/* Items */}
                  <ul className="mt-4 space-y-2">
                    {milestone.items.map((item, j) => (
                      <li key={j} className="flex items-start gap-2 text-sm text-[#64748b]">
                        <span className="mt-0.5">
                          {item.done === true && '✓'}
                          {item.done === 'partial' && '◐'}
                          {item.done === false && '○'}
                        </span>
                        <span>{item.text}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Status badge */}
                  {milestone.status === 'inProgress' && (
                    <div className="mt-4 inline-block rounded-full bg-[#fb923c] px-3 py-1 text-xs font-semibold text-white">
                      {t('about.inProgress')}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
