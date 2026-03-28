'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useAccount } from 'wagmi'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  TrendingUp,
  Briefcase,
  Users,
  PieChart,
  Shield,
  Zap,
  ArrowRight,
} from 'lucide-react'
import { AssetTree } from './asset-tree'
import { PanelRwaYield } from './panels/panel-rwa-yield'
import { PanelPrincipal } from './panels/panel-principal'
import { PanelReferral } from './panels/panel-referral'
import { PanelDividend } from './panels/panel-dividend'
import { PanelStRWA } from './panels/panel-strwa'
import { PanelQuickWithdraw } from './panels/panel-quick-withdraw'
import { useWithdrawData } from '@/hooks/useWithdrawData'
import { useCountUp } from '@/hooks/useCountUp'

export type WithdrawPanelId = 'quick' | 'yield' | 'principal' | 'referral' | 'dividend' | 'strwa'

const PANEL_IDS: WithdrawPanelId[] = ['quick', 'yield', 'principal', 'referral', 'dividend', 'strwa']

function parsePanelParam(v: string | null): WithdrawPanelId {
  if (v && (PANEL_IDS as readonly string[]).includes(v)) return v as WithdrawPanelId
  return 'quick'
}

const RWA_TO_USD = 0.85

type CyberItem = {
  id: WithdrawPanelId
  icon: typeof Zap
  name: string
  desc: string
  amount: string
  unit: string
  color: string
  gradient: string
}

/**
 * 桌面端：双栏 + URL `?panel=`（与历史一致）。
 * 手机端：与 /withdraw-preview（WithdrawPageCyber）相同的背景与一级视觉；交互仍走原有路由与 handleTreeSelect / 返回。
 */
export function WithdrawPageV3() {
  const { isConnected } = useAccount()
  const router = useRouter()
  const searchParams = useSearchParams()
  const data = useWithdrawData()

  const activePanel = parsePanelParam(searchParams.get('panel'))

  const [showMobilePanel, setShowMobilePanel] = useState(false)
  /** 点击卡片后 URL 尚未更新前，用同步 id 渲染二级页，避免短暂显示「一键提取」 */
  const [mobilePanelTarget, setMobilePanelTarget] = useState<WithdrawPanelId | null>(null)
  /** 从二级返回列表时，高亮对应一级卡片（URL 无 ?panel= 时 activePanel 恒为 quick） */
  const [listBackHighlight, setListBackHighlight] = useState<WithdrawPanelId | null>(null)
  const listScrollYRef = useRef(0)

  const animatedTotal = useCountUp({
    end: parseFloat(String(data.totalUSD || '0').replace(/,/g, '')) || 0,
    duration: 2000,
    decimals: 2,
  })

  const goPanel = (id: WithdrawPanelId) => {
    if (id === 'quick') router.push('/withdraw', { scroll: false })
    else router.push(`/withdraw?panel=${id}`, { scroll: false })
  }

  const handleTreeSelect = (id: WithdrawPanelId) => {
    if (typeof window !== 'undefined') listScrollYRef.current = window.scrollY
    setMobilePanelTarget(id)
    setListBackHighlight(id)
    goPanel(id)
    setShowMobilePanel(true)
  }

  const handleMobileBack = () => {
    const leaving = activePanel
    setListBackHighlight(leaving)
    setMobilePanelTarget(null)
    router.push('/withdraw', { scroll: false })
    setShowMobilePanel(false)
    requestAnimationFrame(() => {
      window.scrollTo(0, listScrollYRef.current)
    })
  }

  useEffect(() => {
    const raw = searchParams.get('panel')
    if (raw && raw !== 'quick') setShowMobilePanel(true)
  }, [searchParams])

  useEffect(() => {
    if (mobilePanelTarget !== null && activePanel === mobilePanelTarget) {
      setMobilePanelTarget(null)
    }
  }, [activePanel, mobilePanelTarget])

  /** 仅手机二级区：URL 未跟上时用 mobilePanelTarget，避免闪错内容 */
  const mobileEffectivePanel: WithdrawPanelId =
    showMobilePanel && mobilePanelTarget !== null ? mobilePanelTarget : activePanel

  /** 一级列表高亮：返回后 URL 无 ?panel= 时用 listBackHighlight，否则跟 URL */
  const highlightOnList = useMemo(() => listBackHighlight ?? activePanel, [listBackHighlight, activePanel])

  const cyberItems: CyberItem[] = useMemo(() => {
    const rwaP = String(data.rwaPrincipal ?? '0')
    const usdtP = String(data.usdtPrincipal ?? '0')
    const principalUSD = (
      parseFloat(rwaP || '0') * RWA_TO_USD +
      parseFloat(usdtP.replace(/,/g, '') || '0')
    ).toFixed(2)

    return [
      {
        id: 'quick',
        icon: Zap,
        name: '一键提取',
        desc: '快速提取所有资产',
        amount: String(data.totalUSD ?? '0'),
        unit: 'USD',
        color: '#fbbf24',
        gradient: 'from-amber-500 to-orange-500',
      },
      {
        id: 'yield',
        icon: TrendingUp,
        name: 'RWA 收益',
        desc: '每日 0.8% 收益率',
        amount: String(data.yieldAmount ?? '0'),
        unit: 'RWA',
        color: '#22c55e',
        gradient: 'from-green-500 to-emerald-500',
      },
      {
        id: 'principal',
        icon: Briefcase,
        name: '质押本金',
        desc: `RWA ${rwaP} | USDT ${usdtP}`,
        amount: principalUSD,
        unit: 'USD',
        color: '#00ffc8',
        gradient: 'from-emerald-400 to-teal-400',
      },
      {
        id: 'referral',
        icon: Users,
        name: '推荐奖励',
        desc: '每周结算',
        amount: String(data.referralAmount ?? '0'),
        unit: 'USDT',
        color: '#f59e0b',
        gradient: 'from-orange-500 to-amber-500',
      },
      {
        id: 'dividend',
        icon: PieChart,
        name: '项目分红',
        desc: '每月结算',
        amount: String(data.dividendAmount ?? '0'),
        unit: 'USDT',
        color: '#a855f7',
        gradient: 'from-purple-500 to-violet-500',
      },
      {
        id: 'strwa',
        icon: Shield,
        name: 'stRWA 凭证',
        desc: '资产解锁',
        amount: String(data.strwaAmount ?? '0'),
        unit: 'stRWA',
        color: '#06b6d4',
        gradient: 'from-cyan-500 to-blue-500',
      },
    ]
  }, [data])

  const renderPanels = (panelId: WithdrawPanelId) => (
    <>
      {panelId === 'quick' && <PanelQuickWithdraw onMobileBack={handleMobileBack} data={data} />}
      {panelId === 'yield' && <PanelRwaYield onMobileBack={handleMobileBack} data={data} />}
      {panelId === 'principal' && <PanelPrincipal onMobileBack={handleMobileBack} data={data} />}
      {panelId === 'referral' && <PanelReferral onMobileBack={handleMobileBack} data={data} />}
      {panelId === 'dividend' && <PanelDividend onMobileBack={handleMobileBack} data={data} />}
      {panelId === 'strwa' && <PanelStRWA onMobileBack={handleMobileBack} data={data} />}
    </>
  )

  const heroDesktop = (
    <div className="mb-8 text-center">
      <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 backdrop-blur-sm">
        <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
        <span className="text-[11px] font-medium uppercase tracking-[0.15em] text-emerald-400/80">
          可提取总金额
        </span>
      </div>
      <div
        className="mb-2 text-[56px] font-bold tracking-tight transition-all duration-500"
        style={{
          background: 'linear-gradient(135deg, #00ffc8 0%, #00d4aa 50%, rgba(0,255,200,0.8) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          filter: 'drop-shadow(0 0 30px rgba(0,255,200,0.35))',
        }}
      >
        {data.loading ? '...' : isConnected ? `$${animatedTotal}` : '--'}
      </div>
    </div>
  )

  const desktopMainGrid = (
    <div className="grid min-h-[650px] gap-0 overflow-hidden rounded-[28px] border border-[rgba(255,255,255,0.08)] bg-[#0d1018]/80 shadow-2xl shadow-black/50 backdrop-blur-xl lg:grid-cols-[300px_1fr]">
      <div className={`${showMobilePanel ? 'hidden lg:block' : 'block'}`}>
        <AssetTree activePanel={activePanel} onPanelSwitch={handleTreeSelect} data={data} />
      </div>
      <div
        className={`${showMobilePanel ? 'block' : 'hidden lg:block'} bg-[#0a0a0f]/40 transition-all duration-300`}
      >
        <div className="animate-fadeIn">{renderPanels(activePanel)}</div>
      </div>
    </div>
  )

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0a0a0f]">
      {/* —— 桌面专用背景（与现网一致） —— */}
      <div className="pointer-events-none fixed inset-0 hidden opacity-30 lg:block">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(rgba(0,255,200,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,200,0.08) 1px, transparent 1px)',
            backgroundSize: '50px 50px',
            animation: 'gridPulse 4s ease-in-out infinite',
          }}
        />
      </div>
      <div
        className="pointer-events-none fixed left-[-150px] top-[-150px] hidden h-[500px] w-[500px] rounded-full opacity-40 lg:block"
        style={{
          background: 'radial-gradient(circle, rgba(0,255,200,0.15) 0%, transparent 70%)',
          filter: 'blur(80px)',
          animation: 'float 20s ease-in-out infinite',
        }}
      />
      <div
        className="pointer-events-none fixed bottom-[-150px] right-[-150px] hidden h-[500px] w-[500px] rounded-full opacity-40 lg:block"
        style={{
          background: 'radial-gradient(circle, rgba(168,85,247,0.12) 0%, transparent 70%)',
          filter: 'blur(80px)',
          animation: 'float 25s ease-in-out infinite reverse',
        }}
      />
      <div
        className="pointer-events-none fixed left-1/2 top-1/2 hidden h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-20 lg:block"
        style={{
          background: 'radial-gradient(circle, rgba(251,191,36,0.1) 0%, transparent 70%)',
          filter: 'blur(60px)',
          animation: 'pulse 8s ease-in-out infinite',
        }}
      />

      {/* —— 手机专用背景（与 withdraw-preview / WithdrawPageCyber 一致） —— */}
      <div className="pointer-events-none fixed inset-0 opacity-20 lg:hidden">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(rgba(0,255,200,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,200,0.1) 1px, transparent 1px)',
            backgroundSize: '50px 50px',
          }}
        />
      </div>
      <div className="pointer-events-none fixed left-1/4 top-0 h-96 w-96 animate-pulse rounded-full bg-emerald-500/20 blur-3xl lg:hidden" />
      <div
        className="pointer-events-none fixed bottom-0 right-1/4 h-96 w-96 animate-pulse rounded-full bg-purple-500/20 blur-3xl lg:hidden"
        style={{ animationDelay: '1s' }}
      />

      {/* 桌面内容 */}
      <div className="relative z-10 mx-auto hidden max-w-[1400px] px-4 pb-24 pt-[100px] lg:block">
        {heroDesktop}
        {desktopMainGrid}
      </div>

      {/* 手机内容：预览同款 Hero + 卡片；进入详情后同一路由与 Panel */}
      <div className="relative z-10 mx-auto max-w-[1600px] px-4 pb-12 pt-24 lg:hidden">
        <div className="mb-12 text-center">
          <h1
            className="hero-mobile-amount mb-3 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text text-5xl font-bold tabular-nums text-transparent sm:text-7xl"
            style={{
              filter: 'drop-shadow(0 0 28px rgba(0,255,200,0.28))',
            }}
          >
            {data.loading ? '...' : isConnected ? `$${animatedTotal}` : '--'}
          </h1>
          <p className="hero-mobile-label text-sm font-medium tracking-wide text-white/50">
            可提取的总额
          </p>
        </div>

        {!showMobilePanel ? (
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {cyberItems.map((item) => {
              const Icon = item.icon
              const isActive = highlightOnList === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleTreeSelect(item.id)}
                  className={`group relative rounded-2xl border p-6 transition-all ${
                    isActive
                      ? 'border-white/20 bg-white/5 shadow-2xl'
                      : 'border-white/10 bg-white/[0.02] hover:border-white/15 hover:bg-white/5'
                  }`}
                  style={isActive ? { boxShadow: `0 0 40px ${item.color}40` } : undefined}
                >
                  {isActive ? (
                    <div
                      className="absolute inset-0 rounded-2xl opacity-50 blur-xl"
                      style={{
                        background: `radial-gradient(circle at center, ${item.color}30, transparent 70%)`,
                      }}
                    />
                  ) : null}
                  <div className="relative flex flex-col">
                    <div className="mb-4 flex w-full items-start justify-between">
                      <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${item.gradient} p-0.5`}>
                        <div className="flex h-full w-full items-center justify-center rounded-xl bg-[#0a0a0f]">
                          <Icon className="h-6 w-6" style={{ color: item.color }} />
                        </div>
                      </div>
                      {isActive ? (
                        <ArrowRight className="h-5 w-5 shrink-0" style={{ color: item.color }} />
                      ) : null}
                    </div>
                    <div className="mb-4 text-center">
                      <h3 className="mb-1 text-lg font-semibold text-white">{item.name}</h3>
                      <p className="text-xs leading-relaxed text-white/40">{item.desc}</p>
                    </div>
                    <div className="flex items-baseline justify-center gap-2">
                      <span className="font-mono text-2xl font-bold" style={{ color: item.color }}>
                        {isConnected ? item.amount : '--'}
                      </span>
                      <span className="text-sm text-white/40">{item.unit}</span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        ) : null}

        {showMobilePanel ? (
          <div className="rounded-2xl border border-white/10 bg-[#12141a]/80 p-4 shadow-2xl backdrop-blur-xl sm:p-6">
            <div className="animate-fadeIn min-h-[min(70vh,640px)]">{renderPanels(mobileEffectivePanel)}</div>
          </div>
        ) : null}
      </div>

      <style jsx>{`
        @keyframes gridPulse {
          0%,
          100% {
            opacity: 0.3;
          }
          50% {
            opacity: 0.5;
          }
        }
        @keyframes float {
          0%,
          100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(30px, -30px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.4s ease-out;
        }
        @keyframes heroReveal {
          from {
            opacity: 0;
            transform: translateY(28px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .hero-mobile-amount {
          animation: heroReveal 0.85s cubic-bezier(0.22, 1, 0.36, 1) 0.08s both;
        }
        .hero-mobile-label {
          animation: heroReveal 0.65s cubic-bezier(0.22, 1, 0.36, 1) 0.28s both;
        }
      `}</style>
    </div>
  )
}
