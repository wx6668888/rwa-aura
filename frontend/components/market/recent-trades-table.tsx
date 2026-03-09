'use client'

import { useEffect, useState } from 'react'
import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'
import { useTradesData } from '@/hooks/useMarketData'

export function RecentTradesTable() {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)
  const trades = useTradesData()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  function formatTime(timestamp: number) {
    const date = new Date(timestamp)
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    const seconds = date.getSeconds().toString().padStart(2, '0')
    return `${hours}:${minutes}:${seconds}`
  }

  if (!mounted) {
    return (
      <div className="rounded-xl border border-[#ffffff0d] bg-[#0d0d1499] backdrop-blur-xl">
        <div className="flex items-center justify-between border-b border-[#ffffff0d] px-5 py-4">
          <h3 className="text-[13px] font-medium uppercase tracking-wider text-[#64748b]">
            {t('market.recentTrades')}
          </h3>
        </div>
        <div className="p-8">
          <div className="h-64 animate-pulse bg-[#13131e] rounded" />
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-[#ffffff0d] bg-[#0d0d1499] backdrop-blur-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#ffffff0d] px-5 py-4">
        <h3 className="text-[13px] font-medium uppercase tracking-wider text-[#64748b]">
          {t('market.recentTrades')}
        </h3>
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#10b981]" />
          <span className="text-[11px] font-medium text-[#10b981]">{t('market.live')}</span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#ffffff0d]">
              <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-[#334155]">
                {t('market.colTime')}
              </th>
              <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-[#334155]">
                {t('market.colType')}
              </th>
              <th className="px-5 py-3 text-right text-[11px] font-medium uppercase tracking-wider text-[#334155]">
                {t('market.colPrice')}
              </th>
              <th className="px-5 py-3 text-right text-[11px] font-medium uppercase tracking-wider text-[#334155]">
                {t('market.colAmount')}
              </th>
              <th className="px-5 py-3 text-right text-[11px] font-medium uppercase tracking-wider text-[#334155]">
                {t('market.colTotal')}
              </th>
            </tr>
          </thead>
          <tbody>
            {trades.map((trade, index) => (
              <tr
                key={index}
                className="border-b border-[#ffffff0d] transition-colors hover:bg-[#13131e] last:border-0"
                style={{
                  animation: index === 0 ? 'slideFromTop 300ms ease-out' : undefined,
                }}
              >
                <td className="px-5 py-3 font-[family-name:var(--font-jetbrains-mono)] text-xs text-[#64748b]">
                  {formatTime(trade.time)}
                </td>
                <td className="px-5 py-3">
                  <span
                    className={`inline-block rounded px-2 py-0.5 text-[11px] font-medium ${
                      trade.type === 'buy'
                        ? 'bg-[#10b98126] text-[#10b981]'
                        : 'bg-[#f43f5e26] text-[#f43f5e]'
                    }`}
                  >
                    {trade.type === 'buy' ? t('market.buy') : t('market.sell')}
                  </span>
                </td>
                <td
                  className={`px-5 py-3 text-right font-[family-name:var(--font-jetbrains-mono)] text-[13px] ${
                    trade.type === 'buy' ? 'text-[#10b981]' : 'text-[#f43f5e]'
                  }`}
                >
                  ${trade.price.toFixed(4)}
                </td>
                <td className="px-5 py-3 text-right font-[family-name:var(--font-jetbrains-mono)] text-[13px] text-[#64748b]">
                  {trade.amount.toLocaleString()}
                </td>
                <td className="px-5 py-3 text-right font-[family-name:var(--font-jetbrains-mono)] text-[13px] text-[#64748b]">
                  ${trade.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style jsx>{`
        @keyframes slideFromTop {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}
