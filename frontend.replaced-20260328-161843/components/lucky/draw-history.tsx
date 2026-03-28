'use client';

import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Loader2 } from 'lucide-react';
import { useLocale } from '@/components/locale-provider';
import { useTranslation } from '@/lib/i18n';
import { useLottery } from '@/hooks/useLottery'

interface DrawRecord {
  round: number;
  date: string;
  poolAmount: string;
  winners: number;
  winningNumber: string;
  completed: boolean;
}

export default function DrawHistory() {
  const { locale } = useLocale();
  const { t } = useTranslation(locale);
  const [currentPage, setCurrentPage] = useState(1);
  const [poolType, setPoolType] = useState<0 | 1 | 2 | 3>(0)
  const [loading, setLoading] = useState(false)
  const [records, setRecords] = useState<DrawRecord[]>([])

  const { getDrawHistory, weeklyPool, monthlyPool, realtimePool, annualPool } = useLottery()
  
  const currentRound = useMemo(() => {
    const p = poolType === 0 ? weeklyPool : poolType === 1 ? monthlyPool : poolType === 2 ? realtimePool : annualPool
    return p?.currentRound ? Number(p.currentRound) : 0
  }, [poolType, weeklyPool, monthlyPool, realtimePool, annualPool])

  const pageSize = 10
  const totalPages = useMemo(() => {
    const completedApprox = Math.max(0, currentRound - 1)
    return Math.max(1, Math.ceil(completedApprox / pageSize))
  }, [currentRound])

  useEffect(() => {
    let cancelled = false
    async function run() {
      setLoading(true)
      try {
        const list = await getDrawHistory(poolType, pageSize * currentPage)
        if (cancelled) return
        // getDrawHistory 返回从新到旧；这里取当前页切片
        const start = (currentPage - 1) * pageSize
        const page = list.slice(start, start + pageSize)
        setRecords(
          page.map((d) => ({
            round: Number(d.round),
            date: d.drawTime ? new Date(d.drawTime * 1000).toISOString().slice(0, 10) : '-',
            poolAmount: Number(d.totalPrize).toLocaleString(undefined, { maximumFractionDigits: 2 }),
            winners: 0, // 合约未直接暴露赢家地址列表；这里不做猜测
            winningNumber: d.winningNumber,
            completed: d.completed,
          })),
        )
      } catch {
        if (!cancelled) setRecords([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [getDrawHistory, poolType, currentPage])

  return (
    <div className="mt-8">
      <h2 className="text-[18px] font-700 text-text-primary mb-4">
        {t('lucky.drawHistory')}
      </h2>
      
      <div className="border border-border-subtle rounded-2xl backdrop-blur-xl bg-surface-1 overflow-hidden">
        {/* Pool Tabs */}
        <div className="px-4 md:px-6 py-3 border-b border-border-subtle flex flex-wrap gap-2">
          {[
            { id: 0 as const, label: t('lucky.weeklyPool') },
            { id: 1 as const, label: t('lucky.monthlyPool') },
            { id: 2 as const, label: t('lucky.realtimePool') },
            { id: 3 as const, label: t('lucky.annualPool') },
          ].map((p) => (
            <button
              key={p.id}
              onClick={() => {
                setPoolType(p.id)
                setCurrentPage(1)
              }}
              className={`px-3 py-1.5 rounded-full text-[12px] transition-colors ${
                poolType === p.id
                  ? 'bg-plasma-cyan text-void-black font-700'
                  : 'border border-border-subtle text-text-secondary hover:border-border-active'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

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
                  中奖号码
                </th>
                <th className="text-center px-6 py-4 text-[12px] text-text-secondary font-600">
                  状态
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10">
                    <div className="flex justify-center">
                      <Loader2 className="w-5 h-5 animate-spin text-plasma-cyan" />
                    </div>
                  </td>
                </tr>
              ) : records.length ? (
                records.map((record) => (
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
                    <span className="text-[13px] font-jetbrains text-text-secondary">
                      {record.winningNumber && record.winningNumber !== '0' ? record.winningNumber : '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`text-[12px] ${record.completed ? 'text-green-400' : 'text-text-secondary'}`}>
                      {record.completed ? '已开奖' : '记录中'}
                    </span>
                  </td>
                </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-[12px] text-text-secondary">
                    暂无开奖历史
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden divide-y divide-border-subtle">
          {loading ? (
            <div className="p-8 flex justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-plasma-cyan" />
            </div>
          ) : records.length ? (
            <>
              {records.map((record) => (
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
                      中奖号码
                    </span>
                    <span className="text-[13px] font-jetbrains text-text-primary font-700">
                      {record.winningNumber && record.winningNumber !== '0' ? record.winningNumber : '-'}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="text-text-secondary">状态</span>
                    <span className={record.completed ? 'text-green-400' : 'text-text-secondary'}>
                      {record.completed ? '已开奖' : '记录中'}
                    </span>
                  </div>
                </div>
              ))}
            </>
          ) : (
            <div className="p-8 text-center text-[12px] text-text-secondary">暂无开奖历史</div>
          )}
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

        {/* Link */}
        <div className="px-6 pb-5">
          <a
            href="https://bscscan.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[12px] text-plasma-cyan hover:underline"
          >
            在 BscScan 查看事件 <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
