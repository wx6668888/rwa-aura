'use client'

import { Bug, Mail } from 'lucide-react'
import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'

const rewards = [
  {
    severity: 'critical',
    severityKey: 'security.severityCritical',
    amount: '$50,000 USDT',
    color: 'danger',
  },
  {
    severity: 'high',
    severityKey: 'security.severityHigh',
    amount: '$10,000 USDT',
    color: 'warning',
  },
  {
    severity: 'medium',
    severityKey: 'security.severityMedium',
    amount: '$3,000 USDT',
    color: 'purple',
  },
  {
    severity: 'low',
    severityKey: 'security.severityLow',
    amount: '$500 USDT',
    color: 'secondary',
  },
]

export function BugBounty() {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)

  const getSeverityStyles = (color: string) => {
    switch (color) {
      case 'danger':
        return 'bg-[#f43f5e1a] text-[#f43f5e]'
      case 'warning':
        return 'bg-[#fb923c1a] text-[#fb923c]'
      case 'purple':
        return 'bg-[#8b5cf61a] text-[#8b5cf6]'
      default:
        return 'bg-[#13131e] text-[#64748b]'
    }
  }

  const getAmountColor = (color: string) => {
    switch (color) {
      case 'danger':
        return 'text-[#f43f5e]'
      case 'warning':
        return 'text-[#fb923c]'
      case 'purple':
        return 'text-[#8b5cf6]'
      default:
        return 'text-[#64748b]'
    }
  }

  return (
    <section className="mt-16">
      <div
        className="rounded-xl border border-[#00f5d4] bg-[#0d0d14] p-6 shadow-[0_0_30px_rgba(0,245,212,0.25)] sm:p-8"
      >
        <div className="grid gap-6 md:grid-cols-2 md:gap-8">
          {/* Left column */}
          <div>
            <Bug className="h-8 w-8 text-[#00f5d4]" />
            <p
              className="mt-3 text-[11px] uppercase tracking-widest text-[#00f5d4]"
              style={{ fontVariant: 'small-caps' }}
            >
              {t('security.bugBounty')}
            </p>
            <h2 className="mt-2 font-[family-name:var(--font-space-grotesk)] text-2xl font-extrabold text-[#f1f5f9] sm:text-[28px]">
              {t('security.bugBountyTitle')}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[#64748b]">
              {t('security.bugBountyDescription')}
            </p>

            <button className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#00f5d4] px-6 py-3 text-sm font-bold text-[#05050a] transition-all hover:scale-105 hover:brightness-110 sm:w-auto">
              {t('security.submitReport')}
            </button>

            <div className="mt-3 flex items-center gap-2 text-xs text-[#64748b]">
              <Mail className="h-3.5 w-3.5" />
              <span>{t('security.orEmail')}: rwacoin001@gmail.com</span>
            </div>
          </div>

          {/* Right column - Rewards table */}
          <div className="rounded-xl border border-[#ffffff0d] bg-[#0d0d14] p-4 backdrop-blur-xl sm:p-5">
            <p
              className="mb-4 text-[11px] uppercase tracking-widest text-[#64748b]"
              style={{ fontVariant: 'small-caps' }}
            >
              {t('security.rewardLevels')}
            </p>

            <div className="space-y-3">
              {rewards.map((reward, index) => (
                <div
                  key={reward.severity}
                  className={`flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between ${
                    index < rewards.length - 1 ? 'border-b border-[#ffffff0d]' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-medium sm:px-3 sm:text-xs ${getSeverityStyles(
                        reward.color
                      )}`}
                    >
                      {t(reward.severityKey)}
                    </span>
                  </div>
                  <span
                    className={`font-[family-name:var(--font-jetbrains-mono)] text-xs font-bold sm:text-sm ${getAmountColor(
                      reward.color
                    )}`}
                  >
                    {t('security.upTo')} {reward.amount}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
