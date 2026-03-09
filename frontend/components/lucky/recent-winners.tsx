'use client';

import { ExternalLink } from 'lucide-react';
import { useLocale } from '@/components/locale-provider';
import { useTranslation } from '@/lib/i18n';

export default function RecentWinners() {
  const { locale } = useLocale();
  const { t } = useTranslation(locale);
  
  // Mock data - TODO: 从合约获取
  const winners = [
    { rank: '🥇', address: '0xAbcd...1234', amount: '+$6,225' },
    { rank: '🥈', address: '0xEfgh...5678', amount: '+$3,112' },
    { rank: '🥉', address: '0xIjkl...9012', amount: '+$1,867' },
    { rank: '🎁', address: '0xMnop...3456', amount: '+$622' },
    { rank: '🎁', address: '0xQrst...7890', amount: '+$623' },
  ];

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
        {winners.map((winner, index) => (
          <div key={index} className="flex items-center gap-3">
            <span className="text-[20px]">{winner.rank}</span>
            <span className="text-[12px] font-jetbrains text-text-secondary flex-1">
              {winner.address}
            </span>
            <span className="text-[14px] font-jetbrains text-gold-node font-700">
              {winner.amount}
            </span>
          </div>
        ))}
      </div>

      {/* View All Link */}
      <button className="mt-3 w-full text-[12px] text-plasma-cyan hover:underline flex items-center justify-center gap-1">
        {t('lucky.viewAllHistory')} →
      </button>
    </div>
  );
}
