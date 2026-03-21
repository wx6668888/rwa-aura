'use client';

import { ExternalLink, Loader2 } from 'lucide-react';
import { useLocale } from '@/components/locale-provider';
import { useTranslation } from '@/lib/i18n';
import { useEffect, useMemo, useState } from 'react'
import { useLottery } from '@/hooks/useLottery'

export default function RecentWinners() {
  const { locale } = useLocale();
  const { t } = useTranslation(locale);
  const { getRecentPrizes } = useLottery()
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<
    { rank: string; address: string; amount: string; txHash: string }[]
  >([])
  
  const levelToRank = useMemo(() => {
    return (lvl: number) => (lvl === 1 ? '🥇' : lvl === 2 ? '🥈' : lvl === 3 ? '🥉' : '🎁')
  }, [])

  const shortAddr = (a: string) => (a && a.startsWith('0x') && a.length > 10 ? `${a.slice(0, 6)}...${a.slice(-4)}` : a)

  useEffect(() => {
    let cancelled = false
    async function run() {
      setLoading(true)
      try {
        const prizes = await getRecentPrizes(5)
        if (cancelled) return
        setItems(
          prizes.map((p) => ({
            rank: levelToRank(p.prizeLevel),
            address: shortAddr(p.winner),
            amount: `+${Number(p.prizeAmount).toFixed(2)} RWA`,
            txHash: p.txHash,
          })),
        )
      } catch {
        if (!cancelled) setItems([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    const id = setInterval(run, 15000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [getRecentPrizes, levelToRank])

  return (
    <div className="border border-border-subtle rounded-2xl p-5 backdrop-blur-xl bg-surface-1">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-[13px] font-700 text-text-primary">
          {t('lucky.recentWinners')}
        </h3>
        <span className="text-[11px] text-text-disabled">
          {t('lucky.lastRound')}
        </span>
      </div>

      {/* Winners List */}
      <div className="mt-3 space-y-3">
        {loading ? (
          <div className="py-6 flex justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-plasma-cyan" />
          </div>
        ) : items.length ? (
          items.map((winner, index) => (
            <div key={`${winner.txHash}-${index}`} className="flex items-center gap-3">
              <span className="text-[20px]">{winner.rank}</span>
              <span className="text-[12px] font-jetbrains text-text-secondary flex-1">
                {winner.address}
              </span>
              <a
                href={`https://bscscan.com/tx/${winner.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[14px] font-jetbrains text-gold-node font-700 hover:underline inline-flex items-center gap-1"
              >
                {winner.amount}
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          ))
        ) : (
          <div className="py-6 text-center text-[12px] text-text-secondary">
            暂无最近中奖记录
          </div>
        )}
      </div>

      {/* View All Link */}
      <a
        className="mt-3 w-full text-[12px] text-plasma-cyan hover:underline flex items-center justify-center gap-1"
        href="https://bscscan.com/"
        target="_blank"
        rel="noopener noreferrer"
      >
        {t('lucky.viewAllHistory')} →
      </a>
    </div>
  );
}
