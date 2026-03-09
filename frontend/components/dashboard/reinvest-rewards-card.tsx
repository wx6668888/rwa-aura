'use client'

import { Repeat, Gift } from 'lucide-react'
import { useAccount } from 'wagmi'
import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'
import { useStakingContract } from '@/hooks/useStakingContract'
import { useState, useEffect, useRef } from 'react'

// 数字滚动动画 Hook
function useAnimatedNumber(targetValue: number, duration: number = 1500, enabled: boolean = true) {
  const [displayValue, setDisplayValue] = useState(0)
  const animationFrameRef = useRef<number>()
  const startTimeRef = useRef<number>()
  const startValueRef = useRef(0)

  useEffect(() => {
    if (!enabled) {
      setDisplayValue(targetValue)
      return
    }

    startValueRef.current = displayValue
    startTimeRef.current = Date.now()

    const animate = () => {
      const now = Date.now()
      const elapsed = now - (startTimeRef.current || now)
      const progress = Math.min(elapsed / duration, 1)

      // 使用缓动函数 (ease-out)
      const easeOut = 1 - Math.pow(1 - progress, 3)
      const currentValue = startValueRef.current + (targetValue - startValueRef.current) * easeOut

      setDisplayValue(Math.floor(currentValue))

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate)
      } else {
        setDisplayValue(targetValue)
      }
    }

    animationFrameRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [targetValue, duration, enabled])

  return displayValue
}

export function ReinvestRewardsCard() {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)
  const { isConnected } = useAccount()
  const { userStakeInfo } = useStakingContract()

  // 模拟复投数据（实际应从后端获取）
  const reinvestCount = 0 // TODO: 从合约或后端获取
  const reinvestBonus = 0 // TODO: 从合约或后端获取
  const nextReinvestBonus = reinvestCount < 1 ? 0.05 : reinvestCount < 3 ? 0.10 : reinvestCount < 5 ? 0.15 : 0.20 // 5%, 10%, 15%, 20%

  // 计算当前复投奖励等级
  const getReinvestBonusRate = (count: number) => {
    if (count < 1) return 0.05 // 5%
    if (count < 3) return 0.10 // 10%
    if (count < 5) return 0.15 // 15%
    return 0.20 // 20%
  }

  const currentBonusRate = getReinvestBonusRate(reinvestCount)
  const nextBonusRate = nextReinvestBonus

  // 使用动画数字
  const animatedCount = useAnimatedNumber(reinvestCount, 1500, isConnected)

  // 计算当前等级进度
  const getCurrentTierProgress = () => {
    if (reinvestCount < 1) return (reinvestCount / 1) * 100
    if (reinvestCount < 3) return ((reinvestCount - 1) / 2) * 100
    if (reinvestCount < 5) return ((reinvestCount - 3) / 2) * 100
    if (reinvestCount < 10) return ((reinvestCount - 5) / 5) * 100
    return 100
  }

  const tierProgress = getCurrentTierProgress()

  return (
    <div
      className="relative rounded-2xl bg-gradient-to-br from-[#0d0d14] to-[#13131e] p-6 backdrop-blur-xl transition-all duration-500 hover:border-[#00f5d440] hover:shadow-[0_0_30px_rgba(0,245,212,0.15)]"
      style={{ 
        border: '1px solid #00f5d420', 
        boxShadow: '0 0 20px rgba(0,245,212,0.05)',
        animation: 'fadeInUp 0.6s ease-out 0.1s both',
      }}
    >
      {/* Subtle inner glow with animation */}
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl"
        style={{ 
          background: 'radial-gradient(ellipse at top left, rgba(0,245,212,0.08) 0%, transparent 60%)',
          animation: 'pulseGlow 3s ease-in-out infinite',
        }}
      />

      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="relative">
          <Repeat 
            className="h-5 w-5 text-[#00f5d4] transition-transform duration-300 hover:scale-110 hover:rotate-180" 
            style={{ animation: 'iconRotate 3s ease-in-out infinite' }}
          />
          <div 
            className="absolute inset-0 rounded-full bg-[#00f5d4] opacity-20 blur-md"
            style={{ animation: 'pulseGlow 2s ease-in-out infinite' }}
          />
        </div>
        <p className="text-[11px] uppercase tracking-widest text-[#64748b]" style={{ fontVariant: 'small-caps' }}>
          {t('dashboard.reinvestRewards')}
        </p>
      </div>

      {/* Reinvest Count with animation */}
      <div className="mt-1 flex items-baseline gap-2">
        <span 
          className="font-mono text-4xl font-bold text-[#f1f5f9] transition-all duration-300"
          style={{ 
            textShadow: isConnected && reinvestCount > 0 ? '0 0 20px rgba(0,245,212,0.3)' : 'none',
            animation: isConnected && reinvestCount > 0 ? 'numberPop 0.5s ease-out' : 'none',
          }}
        >
          {isConnected ? animatedCount : '0'}
        </span>
        <span className="font-mono text-lg text-[#64748b] transition-all duration-300">{t('dashboard.times')}</span>
      </div>

      {/* Current Bonus Rate with animation */}
      {isConnected && (
        <div 
          className="mt-3 flex items-center justify-between p-2 rounded-lg transition-all duration-300"
          style={{ 
            background: 'rgba(0,245,212,0.05)',
            animation: 'slideInLeft 0.5s ease-out 0.4s both',
          }}
        >
          <span className="text-[12px] text-[#64748b]">{t('dashboard.currentBonus')}</span>
          <span 
            className="font-mono text-[16px] font-semibold text-[#00f5d4] transition-all duration-300"
            style={{ 
              textShadow: '0 0 10px rgba(0,245,212,0.5)',
              animation: 'numberPop 0.5s ease-out 0.6s both',
            }}
          >
            +{(currentBonusRate * 100).toFixed(0)}%
          </span>
        </div>
      )}

      {/* Description */}
      <p className="mt-2 text-[12px] text-[#64748b] leading-relaxed">
        {t('dashboard.reinvestRewardsDesc')}
      </p>

      {/* Coming Soon Badge */}
      <div className="mt-4 rounded-lg border border-[#f59e0b30] bg-[#f59e0b10] px-3 py-2.5">
        <div className="flex items-center gap-2">
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#f59e0b]">
            <span className="text-xs font-bold text-[#0a0a0f]">!</span>
          </div>
          <p className="text-xs font-semibold text-[#f59e0b]">
            {t('dashboard.comingSoon') || 'Coming Soon'}
          </p>
        </div>
        <p className="mt-1.5 text-[11px] text-[#64748b] leading-relaxed">
          {t('dashboard.reinvestComingSoonDesc') || 'Reinvestment feature is under development. Stay tuned!'}
        </p>
      </div>

      {/* Bonus Tiers with progress bars - 暂时隐藏，等待功能实现 */}
      {false && isConnected && (
        <div className="mt-4 space-y-2">
          {[
            { tier: 1, label: t('dashboard.bonusTier1'), bonus: 5, threshold: 1, active: reinvestCount >= 1 },
            { tier: 2, label: t('dashboard.bonusTier2'), bonus: 10, threshold: 3, active: reinvestCount >= 3 },
            { tier: 3, label: t('dashboard.bonusTier3'), bonus: 15, threshold: 5, active: reinvestCount >= 5 },
            { tier: 4, label: t('dashboard.bonusTier4'), bonus: 20, threshold: 10, active: reinvestCount >= 10 },
          ].map((tier, index) => {
            const isCurrentTier = reinvestCount < tier.threshold && reinvestCount >= (index === 0 ? 0 : [0, 1, 3, 5][index])
            const progress = isCurrentTier ? tierProgress : tier.active ? 100 : 0

            return (
              <div 
                key={tier.tier}
                className="relative rounded-lg p-2 transition-all duration-300"
                style={{ 
                  animation: `slideInLeft 0.4s ease-out ${0.5 + index * 0.1}s both`,
                  background: tier.active ? 'rgba(0,245,212,0.1)' : isCurrentTier ? 'rgba(0,245,212,0.05)' : 'transparent',
                  border: tier.active ? '1px solid rgba(0,245,212,0.3)' : isCurrentTier ? '1px solid rgba(0,245,212,0.2)' : '1px solid transparent',
                }}
              >
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className={tier.active ? 'text-[#00f5d4] font-semibold' : isCurrentTier ? 'text-[#00f5d4]' : 'text-[#64748b]'}>
                    {tier.label}
                  </span>
                  <span className={`font-mono ${tier.active ? 'text-[#00f5d4]' : 'text-[#64748b]'}`}>
                    +{tier.bonus}%
                  </span>
                </div>
                {/* Progress bar */}
                {isCurrentTier && (
                  <div className="h-1 w-full overflow-hidden rounded-full bg-[#1a1a2e] mt-1">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#00f5d4] to-[#00f5d4] transition-all duration-1000 ease-out"
                      style={{ 
                        width: `${progress}%`,
                        boxShadow: '0 0 8px rgba(0,245,212,0.5)',
                      }}
                    />
                  </div>
                )}
                {/* Checkmark for completed tiers */}
                {tier.active && (
                  <div className="absolute top-1 right-1">
                    <div className="w-3 h-3 rounded-full bg-[#00f5d4] flex items-center justify-center" style={{ animation: 'scaleIn 0.3s ease-out' }}>
                      <svg className="w-2 h-2 text-[#0a0a0f]" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Next Bonus Info with animation - 暂时隐藏，等待功能实现 */}
      {false && isConnected && reinvestCount < 10 && (
        <div 
          className="mt-4 rounded-xl border border-[#00f5d420] bg-[#00f5d410] p-3 transition-all duration-500"
          style={{ 
            animation: 'slideInUp 0.6s ease-out 0.9s both',
            boxShadow: '0 0 15px rgba(0,245,212,0.1)',
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <Gift 
              className="h-4 w-4 text-[#00f5d4] transition-transform duration-300"
              style={{ animation: 'iconFloat 2s ease-in-out infinite' }}
            />
            <span className="text-[12px] font-semibold text-[#00f5d4]">{t('dashboard.nextBonus')}</span>
          </div>
          <p className="text-[11px] text-[#64748b] leading-relaxed">
            {t('dashboard.nextBonusDesc', { count: reinvestCount < 1 ? 1 : reinvestCount < 3 ? 3 : reinvestCount < 5 ? 5 : 10, bonus: (nextBonusRate * 100).toFixed(0) })}
          </p>
        </div>
      )}

      {/* Not Connected */}
      {!isConnected && (
        <div className="mt-4 text-center text-sm text-[#64748b] animate-pulse">
          {t('portfolio.connectWalletToView')}
        </div>
      )}

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes pulseGlow {
          0%, 100% {
            opacity: 0.3;
          }
          50% {
            opacity: 0.6;
          }
        }

        @keyframes iconRotate {
          0%, 100% {
            transform: rotate(0deg);
          }
          25% {
            transform: rotate(90deg);
          }
          50% {
            transform: rotate(180deg);
          }
          75% {
            transform: rotate(270deg);
          }
        }

        @keyframes iconFloat {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-3px);
          }
        }

        @keyframes numberPop {
          0% {
            transform: scale(0.8);
            opacity: 0;
          }
          50% {
            transform: scale(1.1);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(15px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes scaleIn {
          from {
            transform: scale(0);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )
}
