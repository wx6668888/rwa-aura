'use client'

import { useState } from 'react'
import { useLocale } from '@/components/locale-provider'
import { useAccount } from 'wagmi'
import { useStakingContract } from '@/hooks/useStakingContract'
import { useReferralRewards } from '@/hooks/useReferralRewards'
import { Wallet, ChevronRight, ChevronLeft } from 'lucide-react'
import { RwaRewardsWithdrawCard } from './rwa-rewards-withdraw-card'
import { PrincipalWithdrawCard } from './principal-withdraw-card'
import { ReferralRewardsWithdrawCard } from './referral-rewards-withdraw-card'
import { DividendRewardsWithdrawCard } from './dividend-rewards-withdraw-card'
import { UnlockStRWACard } from './unlock-strwa-card'

export function WithdrawPageNew() {
  const { locale } = useLocale()
  const isZh = locale === 'zh'
  const { isConnected } = useAccount()
  const { userStakeInfo, rwaStakeInfo } = useStakingContract()
  const { balance: referralBalance } = useReferralRewards()
  
  const [currentCard, setCurrentCard] = useState(0)
  
  // 计算总可提现金额
  const rwaRewards = parseFloat(userStakeInfo?.rwaPending || '0') + parseFloat(rwaStakeInfo?.rwaPending || '0')
  const totalWithdrawable = rwaRewards * 0.85 + referralBalance // RWA按0.85换算 + 推荐奖励
  
  const cards = [
    { id: 'rwa', title: isZh ? '提取RWA收益' : 'Withdraw RWA Rewards' },
    { id: 'principal', title: isZh ? '提取本金' : 'Withdraw Principal' },
    { id: 'referral', title: isZh ? '提取推荐奖励' : 'Withdraw Referral' },
    { id: 'dividend', title: isZh ? '提取项目分红' : 'Withdraw Dividend' },
    { id: 'unlock', title: isZh ? '解锁stRWA' : 'Unlock stRWA' },
  ]

  return (
    <main className="relative min-h-screen bg-[#05050a] pb-24 pt-20">
      {/* 页头 - 总可提现金额 */}
      <div className="mx-auto max-w-6xl px-4 mb-8">
        <div className="text-center mb-6">
          <h1 className="font-[family-name:var(--font-space-grotesk)] text-3xl font-bold text-[#f1f5f9] mb-2">
            {isZh ? '提现' : 'Withdraw'}
          </h1>
          <p className="text-sm text-[#64748b]">
            {isZh ? '管理您的资产提现' : 'Manage your asset withdrawals'}
          </p>
        </div>

        {/* 总金额卡片 - 动态弹出效果 */}
        {isConnected && (
          <div className="animate-slideDown">
            <div className="mx-auto max-w-md rounded-2xl border border-[#00f5d420] bg-gradient-to-br from-[#0d0d14] to-[#13131e] p-6 backdrop-blur-xl shadow-[0_0_40px_rgba(0,245,212,0.15)]">
              <div className="flex items-center justify-center gap-3 mb-3">
                <Wallet className="h-5 w-5 text-[#00f5d4]" />
                <span className="text-sm text-[#64748b]">
                  {isZh ? '总可提现' : 'Total Withdrawable'}
                </span>
              </div>
              <div className="text-center">
                <p className="font-[family-name:var(--font-jetbrains-mono)] text-4xl font-bold text-[#00f5d4]">
                  {totalWithdrawable.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
                <p className="text-sm text-[#64748b] mt-1">USDT {isZh ? '等值' : 'Equivalent'}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 桌面端 - 显示所有卡片 */}
      <div className="hidden lg:block mx-auto max-w-6xl px-4">
        <div className="grid grid-cols-1 gap-6">
          <RwaRewardsWithdrawCard />
          <PrincipalWithdrawCard />
          <ReferralRewardsWithdrawCard />
          <DividendRewardsWithdrawCard />
          <UnlockStRWACard />
        </div>
      </div>

      {/* 移动端 - 滑动卡片 */}
      <div className="lg:hidden mx-auto max-w-md px-4">
        <div className="relative">
          {/* 卡片指示器 */}
          <div className="flex justify-center gap-2 mb-4">
            {cards.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentCard(index)}
                className={`h-1.5 rounded-full transition-all ${
                  index === currentCard 
                    ? 'w-8 bg-[#00f5d4]' 
                    : 'w-1.5 bg-[#64748b]'
                }`}
              />
            ))}
          </div>

          {/* 当前卡片 */}
          <div className="relative overflow-hidden">
            <div 
              className="flex transition-transform duration-300 ease-out"
              style={{ transform: `translateX(-${currentCard * 100}%)` }}
            >
              <div className="w-full flex-shrink-0"><RwaRewardsWithdrawCard /></div>
              <div className="w-full flex-shrink-0"><PrincipalWithdrawCard /></div>
              <div className="w-full flex-shrink-0"><ReferralRewardsWithdrawCard /></div>
              <div className="w-full flex-shrink-0"><DividendRewardsWithdrawCard /></div>
              <div className="w-full flex-shrink-0"><UnlockStRWACard /></div>
            </div>
          </div>

          {/* 导航按钮 */}
          <div className="flex justify-between mt-4">
            <button
              onClick={() => setCurrentCard(Math.max(0, currentCard - 1))}
              disabled={currentCard === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0d0d14] border border-[#00f5d420] text-[#00f5d4] disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="text-sm">{isZh ? '上一个' : 'Previous'}</span>
            </button>
            <button
              onClick={() => setCurrentCard(Math.min(cards.length - 1, currentCard + 1))}
              disabled={currentCard === cards.length - 1}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0d0d14] border border-[#00f5d420] text-[#00f5d4] disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <span className="text-sm">{isZh ? '下一个' : 'Next'}</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* 滑动提示 */}
          <div className="text-center mt-4 text-xs text-[#64748b]">
            {isZh ? '左右滑动查看更多' : 'Swipe to view more'}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slideDown {
          animation: slideDown 0.5s ease-out;
        }
      `}</style>
    </main>
  )
}
