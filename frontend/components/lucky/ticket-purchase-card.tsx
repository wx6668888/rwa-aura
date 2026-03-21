'use client';

import { useState, useEffect } from 'react';
import { Minus, Plus, Loader2, ExternalLink } from 'lucide-react';
import { useAccount } from 'wagmi';
import { useLocale } from '@/components/locale-provider';
import { useTranslation } from '@/lib/i18n';
import Link from 'next/link';
import { useLottery } from '@/hooks/useLottery';
import { formatEther } from 'viem';
import { useRwaPrice } from '@/hooks/useRwaPrice'

import type { LuckyPoolType } from './pool-switcher';

interface TicketPurchaseCardProps {
  poolType: LuckyPoolType;
}

const POOL_TO_NUM: Record<LuckyPoolType, 0 | 1 | 2 | 3> = { weekly: 0, monthly: 1, realtime: 2, annual: 3 };

export default function TicketPurchaseCard({ poolType }: TicketPurchaseCardProps) {
  const { locale } = useLocale();
  const { t } = useTranslation(locale);
  const { address, isConnected } = useAccount();
  const { price: rwaPrice } = useRwaPrice()
  
  const [quantity, setQuantity] = useState(1);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
  const [showAllTickets, setShowAllTickets] = useState(false);
  
  const { buyTickets, isBuying, isApproving, weeklyPool, monthlyPool, realtimePool, annualPool, getTicketPriceByPool, rwaBalance } = useLottery();
  
  const ticketPrice = getTicketPriceByPool(POOL_TO_NUM[poolType]);
  const totalCost = quantity * ticketPrice;
  const usdValue = totalCost * (rwaPrice || 0.85);
  
  const currentPool = poolType === 'weekly' ? weeklyPool : poolType === 'monthly' ? monthlyPool : poolType === 'realtime' ? realtimePool : annualPool;
  const totalTickets = currentPool?.ticketsSold ?? 1;
  const winChance = (quantity / (totalTickets + quantity) * 100).toFixed(2);
  
  // 票号由合约在链上生成；这里不做前端随机模拟，避免“数据不对”的错觉
  const ticketNumbers: string[] = [];
  
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
    } catch (error: any) {
      console.error(t('lucky.purchaseFailed'), error);
      
      // 显示错误提示
      if (error?.message?.includes('User rejected')) {
        alert('交易已取消');
      } else {
        alert('购买失败：' + (error?.message || '未知错误'));
      }
    }
  };
  
  const rwaBalanceNum = rwaBalance ? parseFloat(formatEther(rwaBalance)) : 0;
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
        </div>
        <div className="text-[11px] text-text-secondary leading-relaxed">
          票号将由合约在链上随机生成。购买成功后请在右侧「我的彩票」查看真实票号与状态。
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
          <div className="relative overflow-hidden bg-gradient-to-br from-plasma-cyan/10 to-void-purple/10 rounded-2xl p-6 text-center border border-plasma-cyan/30">
            {/* 动画背景 */}
            <div className="absolute inset-0 pointer-events-none">
              {Array.from({ length: 20 }).map((_, i) => (
                <div
                  key={i}
                  className="absolute rounded-full bg-plasma-cyan animate-ping"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    width: `${Math.random() * 8 + 4}px`,
                    height: `${Math.random() * 8 + 4}px`,
                    animationDelay: `${Math.random() * 2}s`,
                    animationDuration: `${Math.random() * 2 + 1}s`,
                    opacity: Math.random() * 0.5 + 0.3,
                  }}
                />
              ))}
            </div>
            
            {/* 内容 */}
            <div className="relative z-10">
              <div className="text-[48px] animate-bounce">🎉</div>
              <div className="text-[24px] font-700 text-plasma-cyan mt-3 animate-pulse">
                {t('lucky.purchaseSuccess')}
              </div>
              <div className="text-[15px] text-text-primary mt-2">
                {t('lucky.youHave')} <span className="font-700 text-plasma-cyan">{quantity}</span> {t('lucky.tickets')}
              </div>
              <div className="text-[13px] text-text-secondary mt-2">
                {t('lucky.drawTime')}
              </div>
              <button
                onClick={() => setPurchaseSuccess(false)}
                className="mt-4 px-6 py-2.5 rounded-full bg-plasma-cyan text-void-black text-[13px] font-700 hover:brightness-110 transition-all"
              >
                {t('lucky.viewMyTickets')} ↓
              </button>
            </div>
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
                授权中... (1/2)
              </>
            ) : isPurchasing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                购买中... (2/2)
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
