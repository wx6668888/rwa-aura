'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useLocale } from '@/components/locale-provider';
import { useTranslation } from '@/lib/i18n';
import { useLottery, type Ticket } from '@/hooks/useLottery';
import { Loader2 } from 'lucide-react';

import type { LuckyPoolType } from './pool-switcher';

interface MyTicketsCardProps {
  poolType: LuckyPoolType;
}

export default function MyTicketsCard({ poolType }: MyTicketsCardProps) {
  const { locale } = useLocale();
  const { t } = useTranslation(locale);
  const { address, isConnected } = useAccount();
  
  const [activeTab, setActiveTab] = useState<LuckyPoolType>(poolType);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const { getUserTicketsDetails, claimPrize, isClaiming } = useLottery();
  
  useEffect(() => {
    if (isConnected && address) {
      loadTickets();
    } else if (!isConnected) {
      setTickets([]);
    }
  }, [isConnected, address]);
  
  const loadTickets = async () => {
    setIsLoading(true);
    try {
      console.log('Loading tickets...');
      const userTickets = await getUserTicketsDetails();
      console.log('Loaded tickets:', userTickets);
      setTickets(userTickets);
    } catch (error) {
      console.error(t('lucky.loadTicketsFailed'), error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const weeklyTickets = tickets.filter(t => t.poolType === 'weekly');
  const monthlyTickets = tickets.filter(t => t.poolType === 'monthly');
  const realtimeTickets = tickets.filter(t => t.poolType === 'realtime');
  const annualTickets = tickets.filter(t => t.poolType === 'annual');
  
  const displayTickets = 
    activeTab === 'weekly' ? weeklyTickets :
    activeTab === 'monthly' ? monthlyTickets :
    activeTab === 'realtime' ? realtimeTickets :
    annualTickets;
  
  // 格式化时间
  const formatTime = (timestamp: number) => {
    const now = Date.now() / 1000;
    const diff = now - timestamp;
    
    if (diff < 3600) return t('lucky.justNow');
    if (diff < 86400) return t('lucky.today');
    if (diff < 172800) return t('lucky.yesterday');
    return Math.floor(diff / 86400) + ' ' + t('lucky.daysAgo');
  };
  
  // 领取奖金
  const handleClaim = (ticketId: string) => {
    claimPrize(ticketId);
  };

  return (
    <div className="border border-border-subtle rounded-2xl p-6 backdrop-blur-xl bg-surface-1">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-[15px] font-700 text-text-primary">
          {t('lucky.myTickets')}
        </h3>
      </div>

      {/* 调试：显示彩票数量和状态 */}
      <div className="mt-2 text-[11px] text-text-secondary bg-surface-2 rounded p-2 space-y-1">
        <div>总计: {tickets.length}张 | 周: {weeklyTickets.length} | 月: {monthlyTickets.length} | 实时: {realtimeTickets.length} | 年度: {annualTickets.length}</div>
        <div>连接状态: {isConnected ? '✅ 已连接' : '❌ 未连接'}</div>
        <div>地址: {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '无'}</div>
        <div>加载中: {isLoading ? '是' : '否'}</div>
      </div>

      {/* Pool Tabs */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          onClick={() => setActiveTab('weekly')}
          className={`px-3 py-1.5 rounded-full text-[12px] transition-colors ${
            activeTab === 'weekly'
              ? 'bg-plasma-cyan text-void-black font-700'
              : 'border border-border-subtle text-text-secondary hover:border-border-active'
          }`}
        >
          {t('lucky.weekly')} {weeklyTickets.length}{t('lucky.tickets')}
        </button>
        <button
          onClick={() => setActiveTab('monthly')}
          className={`px-3 py-1.5 rounded-full text-[12px] transition-colors ${
            activeTab === 'monthly'
              ? 'bg-plasma-cyan text-void-black font-700'
              : 'border border-border-subtle text-text-secondary hover:border-border-active'
          }`}
        >
          {t('lucky.monthly')} {monthlyTickets.length}{t('lucky.tickets')}
        </button>
        <button
          onClick={() => setActiveTab('realtime')}
          className={`px-3 py-1.5 rounded-full text-[12px] transition-colors ${
            activeTab === 'realtime'
              ? 'bg-plasma-cyan text-void-black font-700'
              : 'border border-border-subtle text-text-secondary hover:border-border-active'
          }`}
        >
          {t('lucky.realtime')} {realtimeTickets.length}{t('lucky.tickets')}
        </button>
        <button
          onClick={() => setActiveTab('annual')}
          className={`px-3 py-1.5 rounded-full text-[12px] transition-colors ${
            activeTab === 'annual'
              ? 'bg-plasma-cyan text-void-black font-700'
              : 'border border-border-subtle text-text-secondary hover:border-border-active'
          }`}
        >
          {t('lucky.annual')} {annualTickets.length}{t('lucky.tickets')}
        </button>
      </div>

      {/* Tickets Grid */}
      {isLoading ? (
        <div className="mt-4 py-8 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-plasma-cyan" />
        </div>
      ) : !isConnected ? (
        <div className="mt-4 py-8 text-center">
          <div className="text-[32px] text-text-disabled mx-auto">🔒</div>
          <div className="text-[13px] text-text-secondary mt-2">
            {t('lucky.connectWalletToView')}
          </div>
        </div>
      ) : displayTickets.length > 0 ? (
        <div className="mt-4 grid grid-cols-2 gap-3">
          {displayTickets.map((ticket) => (
            <div
              key={ticket.id}
              className={`relative rounded-xl p-3 border transition-all hover:scale-[1.02] ${
                ticket.isWinner
                  ? 'border-plasma-cyan bg-plasma-cyan bg-opacity-5'
                  : 'border-border-subtle bg-surface-2 hover:border-border-active'
              }`}
            >
              {/* 中奖标记 */}
              {ticket.isWinner && !ticket.claimed && (
                <div className="absolute -top-2 -right-2 bg-plasma-cyan text-void-black rounded-full px-2 py-0.5 text-[10px] font-700">
                  🎉 {t('lucky.winner')}
                </div>
              )}
              
              {/* Ticket Number */}
              <div className="flex items-center gap-2">
                <span className="text-[16px]">🎫</span>
                <span className="text-[14px] font-jetbrains font-700 text-text-primary">
                  #{ticket.number}
                </span>
              </div>
              
              {/* Info */}
              <div className="mt-2 flex justify-between items-center">
                <div className="text-[10px] text-text-secondary bg-surface-3 rounded-full px-2 py-0.5">
                  {ticket.poolType === 'weekly' ? t('lucky.weekly') : t('lucky.monthly')}
                </div>
                <div className="text-[10px] text-text-disabled">
                  {formatTime(ticket.purchaseTime)}
                </div>
              </div>
              
              {/* 中奖信息 */}
              {ticket.isWinner && (
                <div className="mt-2 pt-2 border-t border-border-subtle">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] text-text-secondary">
                      {t('lucky.prize')}:
                    </span>
                    <span className="text-[12px] font-jetbrains text-plasma-cyan">
                      {parseFloat(ticket.prizeAmount).toFixed(2)} RWA
                    </span>
                  </div>
                  {!ticket.claimed && (
                    <button
                      onClick={() => handleClaim(ticket.id)}
                      disabled={isClaiming}
                      className="mt-2 w-full py-1.5 rounded-full bg-plasma-cyan text-void-black text-[11px] font-700 hover:brightness-110 transition-all disabled:opacity-50"
                    >
                      {isClaiming ? t('lucky.claiming') : t('lucky.claimNow')}
                    </button>
                  )}
                  {ticket.claimed && (
                    <div className="mt-2 text-center text-[10px] text-text-disabled">
                      ✓ {t('lucky.claimed')}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="mt-4 py-8 text-center">
          <div className="text-[32px] text-text-disabled mx-auto">🎫</div>
          <div className="text-[13px] text-text-secondary mt-2">
            {t('lucky.noTickets')}
          </div>
          <div className="text-[12px] text-text-disabled mt-1">
            {t('lucky.buyFirst')}
          </div>
        </div>
      )}
    </div>
  );
}
