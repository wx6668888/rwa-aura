'use client'

import { ArrowUpRight, Star, ArrowDownRight, TrendingUp } from 'lucide-react'
import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'

type FeedItemType = 'stake' | 'reward' | 'withdraw' | 'levelup'

interface FeedItem {
  type: FeedItemType
  evtKey: string
  amount: string
  addr: string
  timeKey: string
}

const FEED_ITEMS: FeedItem[] = [
  { type: 'stake',   evtKey: 'gov.evtStake',    amount: '+1,000 USDT', addr: '0x4f2a...c193', timeKey: 'gov.ago5m'  },
  { type: 'reward',  evtKey: 'gov.evtReward',   amount: '+50 USDT',    addr: '0x9b1d...e047', timeKey: 'gov.ago12m' },
  { type: 'withdraw',evtKey: 'gov.evtWithdraw', amount: '-200 RWA',    addr: '0x3c8f...a712', timeKey: 'gov.ago28m' },
  { type: 'levelup', evtKey: 'gov.evtLevelUp',  amount: '—',           addr: '0x7e5b...f290', timeKey: 'gov.ago1h'  },
  { type: 'stake',   evtKey: 'gov.evtStake',    amount: '+500 USDT',   addr: '0x2a0c...b384', timeKey: 'gov.ago2h'  },
]

const TYPE_CONFIG: Record<FeedItemType, { icon: React.ReactNode; color: string; bg: string; amountColor: string }> = {
  stake:   { icon: <ArrowUpRight className="h-3 w-3" />,  color: '#00f5d4', bg: 'rgba(0,245,212,0.15)',   amountColor: '#00f5d4' },
  reward:  { icon: <Star className="h-3 w-3" />,          color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)',  amountColor: '#8b5cf6' },
  withdraw:{ icon: <ArrowDownRight className="h-3 w-3" />,color: '#fb923c', bg: 'rgba(251,146,60,0.15)',  amountColor: '#fb923c' },
  levelup: { icon: <TrendingUp className="h-3 w-3" />,    color: '#f59e0b', bg: 'rgba(245,158,11,0.15)',  amountColor: '#f59e0b' },
}

export function ActivityFeed() {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-[13px] font-semibold uppercase tracking-widest text-[#64748b]">
            {t('gov.activityTitle')}
          </p>
          <span className="relative flex h-1.5 w-1.5 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#10b981] opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#10b981]" />
          </span>
        </div>
        <span className="text-[11px] text-[#334155]">{t('gov.activityAuto')}</span>
      </div>

      <div
        className="mt-4 max-h-80 overflow-y-auto rounded-xl border border-[#ffffff0d] bg-[#0d0d14] backdrop-blur-xl"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: '#00f5d4 #1a1a2e',
        }}
      >
        {FEED_ITEMS.map((item, i) => {
          const cfg = TYPE_CONFIG[item.type]
          return (
            <div
              key={i}
              className="flex items-center border-b border-[#ffffff0d] px-5 py-3.5 transition-colors duration-150 last:border-0 hover:bg-[#13131e]"
            >
              {/* Icon circle */}
              <div
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                style={{ background: cfg.bg, color: cfg.color }}
              >
                {cfg.icon}
              </div>

              {/* Middle */}
              <div className="mx-4 flex-1 min-w-0">
                <p className="text-[13px] font-medium text-[#f1f5f9]">{t(item.evtKey)}</p>
                <p
                  className="font-[family-name:var(--font-mono)] text-xs"
                  style={{ color: item.amount === '—' ? '#334155' : cfg.amountColor }}
                >
                  {item.amount}
                </p>
              </div>

              {/* Right */}
              <div className="flex flex-col items-end gap-0.5 shrink-0">
                <div className="flex items-center gap-1">
                  <span className="font-[family-name:var(--font-mono)] text-[11px] text-[#334155]">
                    {item.addr}
                  </span>
                  <a
                    href="https://bscscan.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#334155] hover:text-[#64748b]"
                    aria-label="View on BSCScan"
                  >
                    <ArrowUpRight className="h-2.5 w-2.5" />
                  </a>
                </div>
                <span className="text-[11px] text-[#334155]">{t(item.timeKey)}</span>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
