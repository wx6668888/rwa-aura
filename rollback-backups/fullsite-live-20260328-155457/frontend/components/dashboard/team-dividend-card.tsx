'use client'

import { Users, TrendingUp, ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAccount } from 'wagmi'
import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'
import { useState, useEffect, useRef } from 'react'
import { useLevelInfo } from '@/hooks/useLevelInfo'
import { useEstimatedDividend } from '@/hooks/useEstimatedDividend'
import { getNodeLevelConfig } from '@/lib/node-levels'

// 数字滚动动画
function useAnimatedNumber(targetValue: number, duration: number = 1500) {
  const [displayValue, setDisplayValue] = useState(0)
  const animationFrameRef = useRef<number>()
  const startTimeRef = useRef<number>()
  const startValueRef = useRef(0)

  useEffect(() => {
    startValueRef.current = displayValue
    startTimeRef.current = Date.now()

    const animate = () => {
      const now = Date.now()
      const elapsed = now - (startTimeRef.current || now)
      const progress = Math.min(elapsed / duration, 1)
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
  }, [targetValue, duration])

  return displayValue
}

export function TeamDividendCard() {
  const router = useRouter()
  const { locale } = useLocale()
  const { t } = useTranslation(locale)
  const { isConnected } = useAccount()
  const levelInfo = useLevelInfo()

  const nodeLevel = levelInfo?.nodeLevel ?? 1
  const { estimatedDividend, teamRetained } = useEstimatedDividend(nodeLevel)
  const animatedDividend = useAnimatedNumber(estimatedDividend || 0, 1500)

  const config = getNodeLevelConfig(nodeLevel)
  const isEligible = isConnected && nodeLevel >= 2 && (config?.projectDividendEligible ?? false)

  const handleClick = () => {
    router.push('/dividend')
  }

  return (
    <div
      onClick={handleClick}
      className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500/10 via-violet-500/5 to-transparent border border-purple-500/20 hover:border-purple-400/40 transition-all duration-300 cursor-pointer hover:shadow-[0_0_30px_rgba(168,85,247,0.15)]"
    >
      {/* 背景装饰 */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.1),transparent_50%)]" />
      <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl" />
      
      <div className="relative p-6">
        {/* 标题栏 */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-purple-500/20 rounded-xl blur-md" />
              <div className="relative bg-gradient-to-br from-purple-500/20 to-violet-500/20 p-2.5 rounded-xl border border-purple-500/30">
                <Users className="w-5 h-5 text-purple-400" />
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-text-primary">
                团队分红
              </h3>
              <p className="text-xs text-text-secondary mt-0.5">
                本月预估
              </p>
            </div>
          </div>
          
          <ArrowRight className="w-5 h-5 text-purple-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300" />
        </div>

        {/* 主要数据 */}
        {!isConnected ? (
          <div className="text-center py-8">
            <p className="text-sm text-text-secondary">请连接钱包</p>
          </div>
        ) : isEligible ? (
          <>
            {/* 预估分红金额 */}
            <div className="mb-4">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-violet-400 font-jetbrains">
                  {animatedDividend.toFixed(2)}
                </span>
                <span className="text-sm text-text-secondary">USDT</span>
              </div>
            </div>

            {/* 详细信息 */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-surface-2/50 rounded-lg p-2.5 border border-border-subtle">
                <div className="text-xs text-text-secondary mb-1">
                  节点等级
                </div>
                <div className="text-sm font-semibold text-purple-400">
                  L{nodeLevel}
                </div>
              </div>
              
              <div className="bg-surface-2/50 rounded-lg p-2.5 border border-border-subtle">
                <div className="text-xs text-text-secondary mb-1">
                  分红比例
                </div>
                <div className="text-sm font-semibold text-purple-400">
                  {(config?.dividendWeight ?? 0) * 100}%
                </div>
              </div>
              
              <div className="bg-surface-2/50 rounded-lg p-2.5 border border-border-subtle">
                <div className="text-xs text-text-secondary mb-1">
                  团队业绩
                </div>
                <div className="text-sm font-semibold text-purple-400">
                  {teamRetained.toFixed(0)}
                </div>
              </div>
            </div>

            {/* 提示文本 */}
            <div className="mt-4 flex items-center gap-2 text-xs text-text-secondary">
              <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
              <span>点击前往提现页面</span>
            </div>
          </>
        ) : (
          <div className="text-center py-8">
            <p className="text-sm text-text-secondary">
              节点等级需达到L2及以上才可享受团队分红
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
