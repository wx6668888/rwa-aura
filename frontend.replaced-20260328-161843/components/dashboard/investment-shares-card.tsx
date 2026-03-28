'use client'

import { TrendingUp, ExternalLink } from 'lucide-react'
import { useAccount, useChainId } from 'wagmi'
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

      setDisplayValue(currentValue)

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

export function InvestmentSharesCard() {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)
  const { isConnected } = useAccount()
  const chainId = useChainId()
  const { userStakeInfo, rwaStakeInfo } = useStakingContract()

  // RWA 价格（用于转换）
  const rwaPrice = 0.85 // 1 RWA ≈ 0.85 USDT

  // 计算投资份额（50%的质押金额）：合并 USDT 和 RWA 质押，转换为 RWA 显示
  const usdtStaked = parseFloat(userStakeInfo?.totalStaked || '0')
  const rwaStaked = parseFloat(rwaStakeInfo?.totalStakedRWA || '0')
  const usdtStakedInRWA = usdtStaked / rwaPrice // USDT 质押转换为 RWA
  const totalStakedRWA = usdtStakedInRWA + rwaStaked // 合并总质押（RWA）
  const investmentSharesRWA = totalStakedRWA / 2 // 50%转换为投资份额（RWA）
  const investmentSharesUSDT = investmentSharesRWA * rwaPrice // 转换为 USDT 等值（用于分红计算）

  // 模拟分红数据（实际应从后端获取）- 分红基于 USDT 等值计算
  const dividendAmount = investmentSharesUSDT * 0.04 // 假设4%年化分红
  const dividendRate = 0.04 // 4%年化

  // 使用动画数字
  const animatedShares = useAnimatedNumber(investmentSharesRWA, 1500, isConnected && investmentSharesRWA > 0)
  const animatedDividend = useAnimatedNumber(dividendAmount, 1500, isConnected && dividendAmount > 0)

  // BSCScan 链接
  const explorerUrl = chainId === 56 ? 'https://bscscan.com' : 'https://testnet.bscscan.com'
  const treasuryAddress = '0x0000000000000000000000000000000000000000' // TODO: 从合约地址获取

  return (
    <div
      className="relative rounded-2xl bg-gradient-to-br from-[#0d0d14] to-[#13131e] p-6 backdrop-blur-xl transition-all duration-500 hover:border-[#f59e0b40] hover:shadow-[0_0_30px_rgba(245,158,11,0.15)]"
      style={{ 
        border: '1px solid #f59e0b20', 
        boxShadow: '0 0 20px rgba(245,158,11,0.05)',
        animation: 'fadeInUp 0.6s ease-out',
      }}
    >
      {/* Subtle inner glow with animation */}
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl"
        style={{ 
          background: 'radial-gradient(ellipse at top left, rgba(245,158,11,0.08) 0%, transparent 60%)',
          animation: 'pulseGlow 3s ease-in-out infinite',
        }}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="relative">
            <TrendingUp 
              className="h-5 w-5 text-[#f59e0b] transition-transform duration-300 hover:scale-110 hover:rotate-12" 
              style={{ animation: 'iconFloat 2s ease-in-out infinite' }}
            />
            <div 
              className="absolute inset-0 rounded-full bg-[#f59e0b] opacity-20 blur-md"
              style={{ animation: 'pulseGlow 2s ease-in-out infinite' }}
            />
          </div>
          <p className="text-[11px] uppercase tracking-widest text-[#64748b]" style={{ fontVariant: 'small-caps' }}>
            {t('dashboard.investmentShares')}
          </p>
        </div>
        {treasuryAddress !== '0x0000000000000000000000000000000000000000' && (
          <a
            href={`${explorerUrl}/address/${treasuryAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-all duration-300 hover:text-[#00f5d4] hover:scale-110"
          >
            <ExternalLink className="h-4 w-4 text-[#00f5d4]" />
          </a>
        )}
      </div>

      {/* Investment Shares Value with animation */}
      <div className="mt-1 flex items-baseline gap-2">
        <span 
          className="font-mono text-4xl font-bold text-[#f1f5f9] transition-all duration-300"
          style={{ 
            textShadow: isConnected && investmentSharesRWA > 0 ? '0 0 20px rgba(245,158,11,0.3)' : 'none',
            animation: isConnected && investmentSharesRWA > 0 ? 'numberPop 0.5s ease-out' : 'none',
          }}
        >
          {isConnected 
            ? animatedShares.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            : '0.00'}
        </span>
        <span className="font-mono text-lg text-[#f59e0b] transition-all duration-300">RWA</span>
        {isConnected && investmentSharesRWA > 0 && (
          <span className="font-mono text-sm text-[#64748b] ml-auto transition-all duration-300">
            ≈ ${investmentSharesUSDT.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
          </span>
        )}
      </div>

      {/* Description */}
      <p className="mt-2 text-[12px] text-[#64748b] leading-relaxed">
        {t('dashboard.investmentSharesDesc')}
      </p>

      {/* Dividend Info with slide-in animation */}
      {isConnected && investmentSharesRWA > 0 && (
        <div 
          className="mt-4 rounded-xl border border-[#f59e0b20] bg-[#f59e0b10] p-4 transition-all duration-500"
          style={{ 
            animation: 'slideInUp 0.6s ease-out 0.3s both',
            boxShadow: '0 0 15px rgba(245,158,11,0.1)',
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12px] text-[#64748b]">{t('dashboard.dividendRate')}</span>
            <span 
              className="font-mono text-[14px] font-semibold text-[#f59e0b] transition-all duration-300"
              style={{ textShadow: '0 0 10px rgba(245,158,11,0.5)' }}
            >
              {(dividendRate * 100).toFixed(2)}% {t('dashboard.annual')}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-[#64748b]">{t('dashboard.estimatedDividendWithNote')}</span>
            <span 
              className="font-mono text-[14px] font-semibold text-[#f1f5f9] transition-all duration-300"
              style={{ 
                animation: 'numberPop 0.5s ease-out 0.8s both',
              }}
            >
              {animatedDividend.toFixed(2)} USDT
            </span>
          </div>
          <p className="mt-2 text-[11px] text-[#64748b] leading-relaxed">
            {t('dashboard.dividendDesc')}
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
      `}</style>
    </div>
  )
}
