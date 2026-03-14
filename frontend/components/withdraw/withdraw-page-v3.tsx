'use client'

import { useState } from 'react'
import { useAccount } from 'wagmi'
import { TrendingUp, Briefcase, Users, PieChart, Shield } from 'lucide-react'
import { AssetTree } from './asset-tree'
import { PanelRwaYield } from './panels/panel-rwa-yield'
import { PanelPrincipal } from './panels/panel-principal'
import { PanelReferral } from './panels/panel-referral'
import { PanelDividend } from './panels/panel-dividend'
import { PanelStRWA } from './panels/panel-strwa'
import { PanelQuickWithdraw } from './panels/panel-quick-withdraw'
import { useWithdrawData } from '@/hooks/useWithdrawData'

type PanelId = 'quick' | 'yield' | 'principal' | 'referral' | 'dividend' | 'strwa'

export function WithdrawPageV3() {
  const { address, isConnected } = useAccount()
  const [activePanel, setActivePanel] = useState<PanelId>('quick')
  const [showMobilePanel, setShowMobilePanel] = useState(false)
  const data = useWithdrawData()

  console.log('=== WithdrawPageV3 Render ===')
  console.log('data:', data)

  const handlePanelSwitch = (panelId: PanelId) => {
    setActivePanel(panelId)
    setShowMobilePanel(true)
  }

  const handleMobileBack = () => {
    setShowMobilePanel(false)
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] relative overflow-hidden">
      {/* Enhanced Background Grid */}
      <div className="fixed inset-0 pointer-events-none opacity-30">
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(rgba(0,255,200,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,200,0.08) 1px, transparent 1px)',
          backgroundSize: '50px 50px',
          animation: 'gridPulse 4s ease-in-out infinite'
        }} />
      </div>
      
      {/* Animated Gradient Orbs */}
      <div className="fixed top-[-150px] left-[-150px] w-[500px] h-[500px] rounded-full pointer-events-none opacity-40"
        style={{
          background: 'radial-gradient(circle, rgba(0,255,200,0.15) 0%, transparent 70%)',
          filter: 'blur(80px)',
          animation: 'float 20s ease-in-out infinite'
        }} />
      <div className="fixed bottom-[-150px] right-[-150px] w-[500px] h-[500px] rounded-full pointer-events-none opacity-40"
        style={{
          background: 'radial-gradient(circle, rgba(168,85,247,0.12) 0%, transparent 70%)',
          filter: 'blur(80px)',
          animation: 'float 25s ease-in-out infinite reverse'
        }} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full pointer-events-none opacity-20"
        style={{
          background: 'radial-gradient(circle, rgba(251,191,36,0.1) 0%, transparent 70%)',
          filter: 'blur(60px)',
          animation: 'pulse 8s ease-in-out infinite'
        }} />

      <div className="relative z-10 pt-[100px] pb-24 px-4 max-w-[1400px] mx-auto">
        {/* Enhanced Hero Total */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full mb-4 backdrop-blur-sm">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-[11px] tracking-[0.15em] text-emerald-400/80 uppercase font-medium">
              可提取总金额
            </span>
          </div>
          <div 
            className="text-[56px] font-bold tracking-tight mb-2 transition-all duration-500"
            style={{
              background: 'linear-gradient(135deg, #00ffc8 0%, #00d4aa 50%, rgba(0,255,200,0.8) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 0 30px rgba(0,255,200,0.35))'
            }}
          >
            {data.loading ? '...' : isConnected ? `$${data.totalUSD}` : '--'}
          </div>
          <p className="text-sm text-white/40">Ready to withdraw anytime</p>
        </div>

        {/* Enhanced Main Container */}
        <div className="grid lg:grid-cols-[300px_1fr] gap-0 bg-[#0d1018]/80 backdrop-blur-xl border border-[rgba(255,255,255,0.08)] rounded-[28px] overflow-hidden min-h-[650px] shadow-2xl shadow-black/50">
          {/* Left Tree */}
          <div className={`${showMobilePanel ? 'hidden lg:block' : 'block'}`}>
            <AssetTree activePanel={activePanel} onPanelSwitch={handlePanelSwitch} data={data} />
          </div>

          {/* Right Panel with transition */}
          <div className={`${showMobilePanel ? 'block' : 'hidden lg:block'} bg-[#0a0a0f]/40 transition-all duration-300`}>
            <div className="animate-fadeIn">
              {activePanel === 'quick' && <PanelQuickWithdraw onMobileBack={handleMobileBack} data={data} />}
              {activePanel === 'yield' && <PanelRwaYield onMobileBack={handleMobileBack} data={data} />}
              {activePanel === 'principal' && <PanelPrincipal onMobileBack={handleMobileBack} data={data} />}
              {activePanel === 'referral' && <PanelReferral onMobileBack={handleMobileBack} data={data} />}
              {activePanel === 'dividend' && <PanelDividend onMobileBack={handleMobileBack} data={data} />}
              {activePanel === 'strwa' && <PanelStRWA onMobileBack={handleMobileBack} data={data} />}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes gridPulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.5; }
        }
        @keyframes float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -30px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        @keyframes glow {
          0%, 100% { filter: drop-shadow(0 0 30px rgba(0,255,200,0.35)); }
          50% { filter: drop-shadow(0 0 40px rgba(0,255,200,0.5)); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.4s ease-out;
        }
      `}</style>
    </div>
  )
}
