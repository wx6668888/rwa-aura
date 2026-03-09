'use client';

import { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { useLocale } from '@/components/locale-provider';
import { useTranslation } from '@/lib/i18n';

interface DrawRecord {
  round: number;
  date: string;
  poolAmount: string;
  winners: number;
  vrfTxHash: string;
}

export default function DrawHistory() {
  const { locale } = useLocale();
  const { t } = useTranslation(locale);
  const [currentPage, setCurrentPage] = useState(1);
  
  // Mock data - TODO: 从合约获取
  const mockHistory: DrawRecord[] = [
    {
      round: 52,
      date: '2026-02-21',
      poolAmount: '12,450',
      winners: 4,
      vrfTxHash: '0x1234...5678',
    },
    {
      round: 51,
      date: '2026-02-14',
      poolAmount: '11,230',
      winners: 3,
      vrfTxHash: '0x2345...6789',
    },
    {
      round: 50,
      date: '2026-02-07',
      poolAmount: '10,890',
      winners: 5,
      vrfTxHash: '0x3456...7890',
    },
  ];
  
  const totalPages = 10;

  return (
    <div className="mt-8">
      <h2 className="text-[18px] font-700 text-text-primary mb-4">
        {t('lucky.drawHistory')}
      </h2>
      
      <div className="border border-border-subtle rounded-2xl backdrop-blur-xl bg-surface-1 overflow-hidden">
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-subtle">
                <th className="text-left px-6 py-4 text-[12px] text-text-secondary font-600">
                  {t('lucky.round')}
                </th>
                <th className="text-left px-6 py-4 text-[12px] text-text-secondary font-600">
                  {t('lucky.drawDate')}
                </th>
                <th className="text-right px-6 py-4 text-[12px] text-text-secondary font-600">
                  {t('lucky.poolAmount')}
                </th>
                <th className="text-center px-6 py-4 text-[12px] text-text-secondary font-600">
                  {t('lucky.winners')}
                </th>
                <th className="text-center px-6 py-4 text-[12px] text-text-secondary font-600">
                  {t('lucky.vrfProof')}
                </th>
              </tr>
            </thead>
            <tbody>
              {mockHistory.map((record) => (
                <tr
                  key={record.round}
                  className="border-b border-border-subtle hover:bg-surface-2 transition-colors"
                >
                  <td className="px-6 py-4">
                    <span className="text-[13px] font-jetbrains text-text-primary font-700">
                      #{record.round}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[13px] text-text-secondary">
                      {record.date}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-[13px] font-jetbrains text-plasma-cyan font-700">
                      {record.poolAmount} RWA
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-[13px] font-jetbrains text-text-primary font-700">
                      {record.winners}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <a
                      href={`https://bscscan.com/tx/${record.vrfTxHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[12px] text-plasma-cyan hover:underline"
                    >
                      {record.vrfTxHash}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden divide-y divide-border-subtle">
          {mockHistory.map((record) => (
            <div key={record.round} className="p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[14px] font-jetbrains text-text-primary font-700">
                  {t('lucky.round')} #{record.round}
                </span>
                <span className="text-[12px] text-text-disabled">
                  {record.date}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-[12px] text-text-secondary">
                  {t('lucky.poolAmount')}
                </span>
                <span className="text-[13px] font-jetbrains text-plasma-cyan font-700">
                  {record.poolAmount} RWA
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-[12px] text-text-secondary">
                  {t('lucky.winners')}
                </span>
                <span className="text-[13px] font-jetbrains text-text-primary font-700">
                  {record.winners}
                </span>
              </div>
              
              <a
                href={`https://bscscan.com/tx/${record.vrfTxHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between text-[12px] text-plasma-cyan hover:underline"
              >
                <span>{t('lucky.vrfProof')}</span>
                <span className="flex items-center gap-1">
                  {record.vrfTxHash}
                  <ExternalLink className="w-3 h-3" />
                </span>
              </a>
            </div>
          ))}
        </div>

        {/* Pagination */}
        <div className="border-t border-border-subtle px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 rounded-full border border-border-subtle text-[12px] text-text-secondary hover:border-border-active transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← {t('lucky.previous')}
          </button>
          
          <span className="text-[12px] text-text-secondary">
            {t('lucky.page')} {currentPage} / {totalPages}
          </span>
          
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 rounded-full border border-border-subtle text-[12px] text-text-secondary hover:border-border-active transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('lucky.next')} →
          </button>
        </div>
      </div>
    </div>
  );
}
