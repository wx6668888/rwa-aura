'use client'

import { useState } from 'react'
import { useAccount } from 'wagmi'
import { TrendingUp, Briefcase, Users, PieChart, Shield, Zap, ArrowRight } from 'lucide-react'

type PanelId = 'quick' | 'yield' | 'principal' | 'referral' | 'dividend' | 'strwa'

export function WithdrawPageCyber() {
  const { address, isConnected } = useAccount()
  const [activePanel, setActivePanel] = useState<PanelId>('quick')

  // Mock data
  const data = {
    loading: false,
    totalUSD: '2,450.00',
    yieldAmount: '125.5',
    rwaPrincipal: '544',
    usdtPrincipal: '1,700',
    referralAmount: '85.50',
    dividendAmount: '42.30',
    strwaAmount: '0'
  }

  const RWA_TO_USD = 0.85
  const principalUSD = (parseFloat(data.rwaPrincipal) * RWA_TO_USD + parseFloat(data.usdtPrincipal.replace(/,/g, ''))).toFixed(2)

  const items = [
    { 
      id: 'quick' as PanelId, 
      icon: Zap, 
      name: '一键提取',
      desc: '快速提取所有资产',
      amount: data.totalUSD,
      unit: 'USD',
      color: '#fbbf24',
      gradient: 'from-amber-500 to-orange-500'
    },
    { 
      id: 'yield' as PanelId, 
      icon: TrendingUp, 
      name: 'RWA 收益',
      desc: '每日 0.8% 收益率',
      amount: data.yieldAmount,
      unit: 'RWA',
      color: '#22c55e',
      gradient: 'from-green-500 to-emerald-500'
    },
    { 
      id: 'principal' as PanelId, 
      icon: Briefcase, 
      name: '质押本金',
      desc: `RWA ${data.rwaPrincipal} | USDT ${data.usdtPrincipal}`,
      amount: principalUSD,
      unit: 'USD',
      color: '#00ffc8',
      gradient: 'from-emerald-400 to-teal-400'
    },
    { 
      id: 'referral' as PanelId, 
      icon: Users, 
      name: '推荐奖励',
      desc: '每周结算',
      amount: data.referralAmount,
      unit: 'USDT',
      color: '#f59e0b',
      gradient: 'from-orange-500 to-amber-500'
    },
    { 
      id: 'dividend' as PanelId, 
      icon: PieChart, 
      name: '项目分红',
      desc: '每月结算',
      amount: data.dividendAmount,
      unit: 'USDT',
      color: '#a855f7',
      gradient: 'from-purple-500 to-violet-500'
    },
    { 
      id: 'strwa' as PanelId, 
      icon: Shield, 
      name: 'stRWA 凭证',
      desc: '资产解锁',
      amount: data.strwaAmount,
      unit: 'stRWA',
      color: '#06b6d4',
      gradient: 'from-cyan-500 to-blue-500'
    },
  ]

  return (
    <div className="min-h-screen bg-[#0a0a0f] relative overflow-hidden">
      {/* Cyber Grid Background */}
      <div className="fixed inset-0 pointer-events-none opacity-20">
        <div className="absolute inset-0" style={{
          backgroundImage: `linear-gradient(rgba(0,255,200,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,200,0.1) 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }} />
      </div>

      {/* Animated Orbs */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl animate-pulse" />
      <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

      {/* Content */}
      <div className="relative z-10 pt-24 pb-12 px-4 max-w-[1600px] mx-auto">
        
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-full mb-4">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-xs text-emerald-400 font-mono uppercase tracking-wider">Available Assets</span>
          </div>
          
          <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent">
            ${data.loading ? '...' : isConnected ? data.totalUSD : '--'}
          </h1>
          
          <p className="text-white/40 text-sm">Ready to withdraw anytime</p>
        </div>

        {/* Main Grid */}
        <div className="grid lg:grid-cols-3 gap-4 mb-6">
          {items.map((item) => {
            const Icon = item.icon
            const isActive = activePanel === item.id
            
            return (
              <button
                key={item.id}
                onClick={() => setActivePanel(item.id)}
                className={`relative group p-6 rounded-2xl border transition-all ${
                  isActive
                    ? 'bg-white/5 border-white/20 shadow-2xl'
                    : 'bg-white/[0.02] border-white/10 hover:bg-white/5 hover:border-white/15'
                }`}
                style={isActive ? { boxShadow: `0 0 40px ${item.color}40` } : {}}
              >
                {isActive && (
                  <div className="absolute inset-0 rounded-2xl opacity-50 blur-xl" style={{
                    background: `radial-gradient(circle at center, ${item.color}30, transparent 70%)`
                  }} />
                )}
                
                <div className="relative">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.gradient} p-0.5 mb-4`}>
                    <div className="w-full h-full bg-[#0a0a0f] rounded-xl flex items-center justify-center">
                      <Icon className="w-6 h-6" style={{ color: item.color }} />
                    </div>
                  </div>
                  
                  <h3 className="text-lg font-semibold text-white mb-1">{item.name}</h3>
                  <p className="text-xs text-white/40 mb-4">{item.desc}</p>
                  
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold font-mono" style={{ color: item.color }}>
                      {isConnected ? item.amount : '--'}
                    </span>
                    <span className="text-sm text-white/40">{item.unit}</span>
                  </div>
                  
                  {isActive && (
                    <div className="absolute top-6 right-6">
                      <ArrowRight className="w-5 h-5" style={{ color: item.color }} />
                    </div>
                  )}
                </div>
              </button>
            )
          })}
        </div>

        {/* Active Panel Placeholder */}
        <div className="bg-[#12141a]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center mx-auto mb-4">
              {(() => {
                const Icon = items.find(i => i.id === activePanel)!.icon
                return <Icon className="w-8 h-8 text-emerald-400" />
              })()}
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              {items.find(i => i.id === activePanel)?.name}
            </h2>
            <p className="text-white/40 mb-6">
              {items.find(i => i.id === activePanel)?.desc}
            </p>
            <div className="text-3xl font-bold text-emerald-400 mb-8">
              {items.find(i => i.id === activePanel)?.amount} {items.find(i => i.id === activePanel)?.unit}
            </div>
            <button className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-emerald-500/25">
              Withdraw Now
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
