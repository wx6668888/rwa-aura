'use client';

import { useState, useEffect } from 'react';
import { Minus, Plus, Loader2, ExternalLink } from 'lucide-react';
import { useAccount } from 'wagmi';
import { useLocale } from '@/components/locale-provider';
import { useTranslation } from '@/lib/i18n';
import Link from 'next/link';
import { useLottery } from '@/hooks/useLottery';
import { formatEther } from 'viem';

import type { LuckyPoolType } from './pool-switcher';

interface TicketPurchaseCardProps {
  poolType: LuckyPoolType;
}

const POOL_TO_NUM: Record<LuckyPoolType, 0 | 1 | 2 | 3> = { weekly: 0, monthly: 1, realtime: 2, annual: 3 };

export default function TicketPurchaseCard({ poolType }: TicketPurchaseCardProps) {
  const { locale } = useLocale();
  const { t } = useTranslation(locale);
  const { address, isConnected } = useAccount();
  
  const [quantity, setQuantity] = useState(5);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
  const [showAllTickets, setShowAllTickets] = useState(false);
  
  const { buyTickets, isBuying, isApproving, weeklyPool, monthlyPool, realtimePool, annualPool, getTicketPriceByPool, rwaBalance } = useLottery();
  
  const ticketPrice = getTicketPriceByPool(POOL_TO_NUM[poolType]);
  const totalCost = quantity * ticketPrice;
  const usdValue = totalCost * 0.8524;
  
  const currentPool = poolType === 'weekly' ? weeklyPool : poolType === 'monthly' ? monthlyPool : poolType === 'realtime' ? realtimePool : annualPool;
  const totalTickets = currentPool?.ticketsSold ?? 1;
  const winChance = (quantity / (totalTickets + quantity) * 100).toFixed(2);
  
  // 生成随机票号 - 根据数量动态生成
  const generateTicketNumbers = (count: number) => {
    return Array.from({ length: count }, () => 
      Math.floor(100000 + Math.random() * 900000).toString()
    );
  };
  
  // 根据当前数量生成票号
  const ticketNumbers = generateTicketNumbers(quantity);
  
  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity >= 1 && newQuantity <= 100) {
      setQuantity(newQuantity);
    }
  };
  
  const handlePurchase = async () => {
    try {
      await buyTickets(quantity, POOL_TO_NUM[poolType]);
      setPurchaseSuccess(true);
      
      // 3秒后重置成功状态
      setTimeout(() => {
        setPurchaseSuccess(false);
      }, 3000);
    } catch (error) {
      console.error(t('lucky.purchaseFailed'), error);
    }
  };
  
  const rwaBalanceNum = rwaBalance ? parseFloat(formatEther(rwaBalance)) : 845.50; // 模拟余额
  const insufficientBalance = totalCost > rwaBalanceNum;
  const isPurchasing = isBuying || isApproving;

  return (
    <div className="border border-border-subtle rounded-2xl p-6 backdrop-blur-xl bg-surface-1">
      {/* Header */}
      <h3 className="text-[15px] font-700 text-text-primary">
        {t('lucky.buyTickets')}
      </h3>

      {/* RWA Balance */}
      <div className="mt-3 flex justify-between items-center">
        <span className="text-[12px] text-text-secondary">
          {t('lucky.rwaBalance')}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-jetbrains text-plasma-cyan">
            {rwaBalanceNum.toFixed(2)} RWA
          </span>
          <Link 
            href="/swap"
            className="text-[11px] text-plasma-cyan hover:underline"
          >
            → {t('lucky.buyRwa')}
          </Link>
        </div>
      </div>

      {/* Quantity Selector */}
      <div className="mt-4">
        <div className="text-[12px] text-text-secondary mb-2">
          {t('lucky.quantity')}
        </div>
        
        <div className="flex items-center gap-4">
          <button
            onClick={() => handleQuantityChange(quantity - 1)}
            className="w-10 h-10 rounded-full bg-surface-2 border border-border-subtle text-text-primary text-[20px] font-700 hover:border-border-active transition-colors"
          >
            <Minus className="w-5 h-5 mx-auto" />
          </button>
          
          <div className="text-[32px] font-jetbrains text-text-primary min-w-[60px] text-center">
            {quantity}
          </div>
          
          <button
            onClick={() => handleQuantityChange(quantity + 1)}
            className="w-10 h-10 rounded-full bg-surface-2 border border-border-subtle text-text-primary text-[20px] font-700 hover:border-border-active transition-colors"
          >
            <Plus className="w-5 h-5 mx-auto" />
          </button>
          
          <button
            onClick={() => handleQuantityChange(100)}
            className="ml-2 px-3 py-1.5 rounded-full border border-border-subtle text-[12px] text-plasma-cyan hover:border-plasma-cyan transition-colors"
          >
{t('swap.max')}
          </button>
        </div>

        {/* Quick Select */}
        <div className="mt-3 flex gap-2 flex-wrap">
          {[1, 5, 10, 25, 50, 100].map((num) => (
            <button
              key={num}
              onClick={() => handleQuantityChange(num)}
              className={`px-3 py-1.5 rounded-full text-[12px] transition-colors ${
                quantity === num
                  ? 'bg-plasma-cyan text-void-black'
                  : 'border border-border-subtle text-text-secondary hover:border-border-active'
              }`}
            >
              {num}{t('lucky.tickets')}
            </button>
          ))}
        </div>
      </div>

      {/* Cost Breakdown */}
      <div className="mt-4 bg-surface-2 rounded-xl p-4 space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-[12px] text-text-secondary">
            {t('lucky.ticketCost')}
          </span>
          <span className="text-[13px] font-jetbrains text-text-primary">
            {quantity} × {ticketPrice} RWA = {totalCost} RWA
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-[12px] text-text-secondary">
            {t('lucky.usdValue')}
          </span>
          <span className="text-[12px] font-jetbrains text-text-secondary">
            ≈ ${usdValue.toFixed(2)} USDT
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-[12px] text-text-secondary">
            {t('lucky.winChanceThis')}
          </span>
          <span className="text-[13px] font-jetbrains text-plasma-cyan">
            {winChance}%
          </span>
        </div>
      </div>

      {/* Ticket Numbers Preview */}
      <div className="mt-4">
        <div className="flex justify-between items-center mb-2">
          <div className="text-[11px] text-text-secondary">
            {t('lucky.ticketNumbers')}
          </div>
          {ticketNumbers.length > 8 && (
            <button
              onClick={() => setShowAllTickets(!showAllTickets)}
              className="text-[11px] text-plasma-cyan hover:underline"
            >
              {showAllTickets ? t('lucky.showLess') : t('lucky.showMore')}
            </button>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          {(showAllTickets ? ticketNumbers : ticketNumbers.slice(0, 8)).map((num, i) => (
            <div
              key={i}
              className="bg-surface-3 border border-border-subtle rounded-lg px-3 py-1.5 text-[12px] font-jetbrains text-text-secondary"
            >
              #{num}
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-5 space-y-3">
        {!isConnected ? (
          <button className="w-full h-[56px] rounded-full border border-border-active bg-surface-2 text-text-primary font-700 hover:bg-surface-3 transition-colors">
            {t('lucky.connectWallet')}
          </button>
        ) : insufficientBalance ? (
          <>
            <button 
              disabled
              className="w-full h-[56px] rounded-full bg-danger bg-opacity-10 text-danger font-700 cursor-not-allowed"
            >
              {t('lucky.insufficientRwa')}
            </button>
            <Link
              href="/swap"
              className="block w-full h-[44px] rounded-full border border-plasma-cyan text-plasma-cyan font-700 hover:bg-plasma-cyan hover:bg-opacity-10 transition-colors flex items-center justify-center"
            >
              {t('lucky.goToSwap')} <ExternalLink className="w-4 h-4 ml-2" />
            </Link>
          </>
        ) : purchaseSuccess ? (
          <div className="bg-success bg-opacity-10 rounded-xl p-4 text-center">
            <div className="text-[32px]">🎉</div>
            <div className="text-[20px] font-700 text-text-primary mt-2">
              {t('lucky.purchaseSuccess')}
            </div>
            <div className="text-[14px] text-text-secondary mt-1">
              {t('lucky.youHave')} {quantity} {t('lucky.tickets')}
            </div>
            <div className="text-[12px] text-text-secondary mt-1">
              {t('lucky.drawTime')}
            </div>
            <button
              onClick={() => setPurchaseSuccess(false)}
              className="mt-3 px-4 py-2 rounded-full border border-border-subtle text-[12px] text-text-secondary hover:border-border-active transition-colors"
            >
              {t('lucky.viewMyTickets')} ↓
            </button>
          </div>
        ) : (
          <button
            onClick={handlePurchase}
            disabled={isPurchasing}
            className="w-full h-[56px] rounded-full bg-plasma-cyan text-void-black font-700 hover:brightness-110 hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isApproving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {t('lucky.approving')}
              </>
            ) : isPurchasing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {t('lucky.purchasing')}
              </>
            ) : (
              t('lucky.buyNow').replace('{n}', quantity.toString()) + ' →'
            )}
          </button>
        )}
      </div>
    </div>
  );
}
