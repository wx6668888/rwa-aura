'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Minus, Plus, Loader2, ExternalLink } from 'lucide-react'
import { useAccount } from 'wagmi'
import { formatEther } from 'viem'
import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'
import { useLottery } from '@/hooks/useLottery'
import { useRwaPrice } from '@/hooks/useRwaPrice'
import { stable01 } from '@/lib/stable-random'
import type { LuckyPoolType } from './pool-switcher'

interface TicketPurchaseCardProps {
  poolType: LuckyPoolType
}

const POOL_TO_NUM: Record<LuckyPoolType, 0 | 1 | 2 | 3> = { weekly: 0, monthly: 1, realtime: 2, annual: 3 }

export default function TicketPurchaseCard({ poolType }: TicketPurchaseCardProps) {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)
  const { isConnected } = useAccount()
  const { price: rwaPrice } = useRwaPrice()

  const [quantity, setQuantity] = useState(1)
  const [purchaseSuccess, setPurchaseSuccess] = useState(false)

  const {
    buyTickets,
    isBuying,
    isApproving,
    weeklyPool,
    monthlyPool,
    realtimePool,
    annualPool,
    getTicketPriceByPool,
    rwaBalance,
  } = useLottery()

  const ticketPrice = getTicketPriceByPool(POOL_TO_NUM[poolType])
  const totalCost = quantity * ticketPrice
  const usdValue = totalCost * (rwaPrice || 0.85)

  const currentPool =
    poolType === 'weekly' ? weeklyPool : poolType === 'monthly' ? monthlyPool : poolType === 'realtime' ? realtimePool : annualPool
  const totalTickets = currentPool?.ticketsSold ?? 1
  const winChance = ((quantity / (totalTickets + quantity)) * 100).toFixed(2)

  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity >= 1 && newQuantity <= 100) {
      setQuantity(newQuantity)
    }
  }

  const handlePurchase = async () => {
    try {
      await buyTickets(quantity, POOL_TO_NUM[poolType])
      setPurchaseSuccess(true)
      setTimeout(() => setPurchaseSuccess(false), 3000)
    } catch (error: any) {
      console.error(t('lucky.purchaseFailed'), error)
      if (error?.message?.includes('User rejected')) {
        alert('交易已取消')
      } else {
        alert('购买失败：' + (error?.message || '未知错误'))
      }
    }
  }

  const rwaBalanceNum = rwaBalance ? parseFloat(formatEther(rwaBalance)) : 0
  const insufficientBalance = totalCost > rwaBalanceNum
  const isPurchasing = isBuying || isApproving

  return (
    <div className="rounded-2xl border border-border-subtle bg-surface-1 p-6 backdrop-blur-xl">
      <h3 className="text-[15px] font-700 text-text-primary">{t('lucky.buyTickets')}</h3>

      <div className="mt-3 flex items-center justify-between">
        <span className="text-[12px] text-text-secondary">{t('lucky.rwaBalance')}</span>
        <div className="flex items-center gap-2">
          <span className="font-jetbrains text-[13px] text-plasma-cyan">{rwaBalanceNum.toFixed(2)} RWA</span>
          <Link href="/swap" className="text-[11px] text-plasma-cyan hover:underline">
            → {t('lucky.buyRwa')}
          </Link>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-2 text-[12px] text-text-secondary">{t('lucky.quantity')}</div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => handleQuantityChange(quantity - 1)}
            className="h-10 w-10 rounded-full border border-border-subtle bg-surface-2 text-[20px] text-text-primary transition-colors hover:border-border-active"
          >
            <Minus className="mx-auto h-5 w-5" />
          </button>

          <div className="min-w-[60px] text-center font-jetbrains text-[32px] text-text-primary">{quantity}</div>

          <button
            onClick={() => handleQuantityChange(quantity + 1)}
            className="h-10 w-10 rounded-full border border-border-subtle bg-surface-2 text-[20px] text-text-primary transition-colors hover:border-border-active"
          >
            <Plus className="mx-auto h-5 w-5" />
          </button>

          <button
            onClick={() => handleQuantityChange(100)}
            className="ml-2 rounded-full border border-border-subtle px-3 py-1.5 text-[12px] text-plasma-cyan transition-colors hover:border-plasma-cyan"
          >
            {t('swap.max')}
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {[1, 5, 10, 25, 50, 100].map((num) => (
            <button
              key={num}
              onClick={() => handleQuantityChange(num)}
              className={`rounded-full px-3 py-1.5 text-[12px] transition-colors ${
                quantity === num
                  ? 'bg-plasma-cyan text-void-black'
                  : 'border border-border-subtle text-text-secondary hover:border-border-active'
              }`}
            >
              {num}
              {t('lucky.tickets')}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 space-y-2 rounded-xl bg-surface-2 p-4">
        <div className="flex items-center justify-between">
          <span className="text-[12px] text-text-secondary">{t('lucky.ticketCost')}</span>
          <span className="font-jetbrains text-[13px] text-text-primary">
            {quantity} × {ticketPrice} RWA = {totalCost} RWA
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[12px] text-text-secondary">{t('lucky.usdValue')}</span>
          <span className="font-jetbrains text-[12px] text-text-secondary">≈ ${usdValue.toFixed(2)} USDT</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[12px] text-text-secondary">{t('lucky.winChanceThis')}</span>
          <span className="font-jetbrains text-[13px] text-plasma-cyan">{winChance}%</span>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-2 text-[11px] text-text-secondary">{t('lucky.ticketNumbers')}</div>
        <div className="text-[11px] leading-relaxed text-text-secondary">
          票号将由合约在链上随机生成。购买成功后请在右侧「我的彩票」查看真实票号与状态。
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {!isConnected ? (
          <button className="h-[56px] w-full rounded-full border border-border-active bg-surface-2 font-700 text-text-primary transition-colors hover:bg-surface-3">
            {t('lucky.connectWallet')}
          </button>
        ) : insufficientBalance ? (
          <>
            <button disabled className="h-[56px] w-full cursor-not-allowed rounded-full bg-danger bg-opacity-10 font-700 text-danger">
              {t('lucky.insufficientRwa')}
            </button>
            <Link
              href="/swap"
              className="flex h-[44px] w-full items-center justify-center rounded-full border border-plasma-cyan font-700 text-plasma-cyan transition-colors hover:bg-plasma-cyan hover:bg-opacity-10"
            >
              {t('lucky.goToSwap')} <ExternalLink className="ml-2 h-4 w-4" />
            </Link>
          </>
        ) : purchaseSuccess ? (
          <div className="relative overflow-hidden rounded-2xl border border-plasma-cyan/30 bg-gradient-to-br from-plasma-cyan/10 to-void-purple/10 p-6 text-center">
            <div className="pointer-events-none absolute inset-0">
              {Array.from({ length: 20 }).map((_, i) => {
                const left = stable01(i, 21) * 100
                const top = stable01(i, 22) * 100
                const size = stable01(i, 23) * 8 + 4
                const animationDelay = stable01(i, 24) * 2
                const animationDuration = stable01(i, 25) * 2 + 1
                const opacity = stable01(i, 26) * 0.5 + 0.3

                return (
                  <div
                    key={i}
                    className="absolute rounded-full bg-plasma-cyan animate-ping"
                    style={{
                      left: `${left}%`,
                      top: `${top}%`,
                      width: `${size}px`,
                      height: `${size}px`,
                      animationDelay: `${animationDelay}s`,
                      animationDuration: `${animationDuration}s`,
                      opacity,
                    }}
                  />
                )
              })}
            </div>

            <div className="relative z-10">
              <div className="animate-bounce text-[48px]">🎉</div>
              <div className="mt-3 animate-pulse text-[24px] font-700 text-plasma-cyan">{t('lucky.purchaseSuccess')}</div>
              <div className="mt-2 text-[15px] text-text-primary">
                {t('lucky.youHave')} <span className="font-700 text-plasma-cyan">{quantity}</span> {t('lucky.tickets')}
              </div>
              <div className="mt-2 text-[13px] text-text-secondary">{t('lucky.drawTime')}</div>
              <button
                onClick={() => setPurchaseSuccess(false)}
                className="mt-4 rounded-full bg-plasma-cyan px-6 py-2.5 text-[13px] font-700 text-void-black transition-all hover:brightness-110"
              >
                {t('lucky.viewMyTickets')} ↓
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={handlePurchase}
            disabled={isPurchasing}
            className="flex h-[56px] w-full items-center justify-center gap-2 rounded-full bg-plasma-cyan font-700 text-void-black transition-all hover:scale-[1.02] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isApproving ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                授权中... (1/2)
              </>
            ) : isPurchasing ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                购买中... (2/2)
              </>
            ) : (
              t('lucky.buyNow').replace('{n}', quantity.toString()) + ' →'
            )}
          </button>
        )}
      </div>
    </div>
  )
}
