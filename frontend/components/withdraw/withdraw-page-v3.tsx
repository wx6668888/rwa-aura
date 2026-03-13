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
    <div className="min-h-screen bg-[#07090e] relative">
      {/* Background Grid */}
      <div className="fixed inset-0 pointer-events-none" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
        backgroundSize: '48px 48px'
      }} />
      
      {/* Background Grain */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03]">
        <svg className="w-full h-full">
          <filter id="grain">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" />
          </filter>
          <rect width="100%" height="100%" filter="url(#grain)" />
        </svg>
      </div>

      {/* Background Orbs */}
      <div className="fixed top-[-200px] left-[-200px] w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(0,255,200,0.07) 0%, transparent 70%)',
          filter: 'blur(100px)',
          animation: 'drift 20s ease-in-out infinite alternate'
        }} />
      <div className="fixed bottom-[-200px] right-[-200px] w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(168,85,247,0.055) 0%, transparent 70%)',
          filter: 'blur(100px)',
          animation: 'drift 25s ease-in-out infinite alternate-reverse'
        }} />

      <div className="relative z-10 pt-[100px] pb-24 px-4 max-w-[1400px] mx-auto">
        {/* Hero Total */}
        <div className="text-center mb-12">
          <div className="text-[13px] tracking-[0.07em] text-[rgba(238,242,255,0.52)] mb-2">
            可提取总金额
          </div>
          <div className="text-[54px] font-[800] tracking-[-2.5px] mb-6"
            style={{
              fontFamily: 'var(--font-space-grotesk)',
              background: 'linear-gradient(135deg, #00ffc8 0%, rgba(0,255,200,0.72) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 0 22px rgba(0,255,200,0.28))'
            }}>
            {data.loading ? '...' : isConnected ? `$${data.totalUSD}` : '--'}
          </div>
        </div>

        {/* Main Container */}
        <div className="grid lg:grid-cols-[280px_1fr] gap-0 bg-[#0d1018] border border-[rgba(255,255,255,0.055)] rounded-[24px] overflow-hidden min-h-[600px]">
          {/* Left Tree */}
          <div className={`${showMobilePanel ? 'hidden lg:block' : 'block'}`}>
            <AssetTree activePanel={activePanel} onPanelSwitch={handlePanelSwitch} data={data} />
          </div>

          {/* Right Panel */}
          <div className={`${showMobilePanel ? 'block' : 'hidden lg:block'}`}>
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
  )
}
