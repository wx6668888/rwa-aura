'use client'

import { useState } from 'react'
import { useAccount } from 'wagmi'
import { TrendingUp, Briefcase, Users, PieChart, Shield, Zap, ChevronRight } from 'lucide-react'

type PanelId = 'quick' | 'yield' | 'principal' | 'referral' | 'dividend' | 'strwa'

export function WithdrawPageModern() {
  const { address, isConnected } = useAccount()
  const [activePanel, setActivePanel] = useState<PanelId>('quick')

  // Mock data
  const data = {
    loading: false,
    totalUSD: '2,450.00',
    yieldAmount: '125.5',
    rwaPrincipal: '544',
    usdtPrincipal: '1700',
    referralAmount: '85.50',
    dividendAmount: '42.30',
    strwaAmount: '0'
  }

  const RWA_TO_USD = 0.85
  const principalUSD = (parseFloat(data.rwaPrincipal) * RWA_TO_USD + parseFloat(data.usdtPrincipal)).toFixed(2)

  const items = [
    { 
      id: 'quick' as PanelId, 
      icon: Zap, 
      name: 'Quick Withdraw', 
      sub: 'Withdraw all assets instantly', 
      amount: `$${data.totalUSD}`, 
      badge: 'Fast',
      color: '#fbbf24',
      bgGradient: 'from-amber-500/10 to-orange-500/10'
    },
    { 
      id: 'yield' as PanelId, 
      icon: TrendingUp, 
      name: 'RWA Yield', 
      sub: '0.8% daily returns', 
      amount: `${data.yieldAmount} RWA`, 
      badge: 'Available',
      color: '#22c55e',
      bgGradient: 'from-green-500/10 to-emerald-500/10'
    },
    { 
      id: 'principal' as PanelId, 
      icon: Briefcase, 
      name: 'Staked Principal', 
      sub: `RWA: ${data.rwaPrincipal} | USDT: ${data.usdtPrincipal}`, 
      amount: `$${principalUSD}`, 
      badge: 'Available',
      color: '#00ffc8',
      bgGradient: 'from-emerald-500/10 to-teal-500/10'
    },
    { 
      id: 'referral' as PanelId, 
      icon: Users, 
      name: 'Referral Rewards', 
      sub: 'Weekly settlement', 
      amount: `${data.referralAmount} USDT`, 
      badge: 'Available',
      color: '#f59e0b',
      bgGradient: 'from-orange-500/10 to-amber-500/10'
    },
    { 
      id: 'dividend' as PanelId, 
      icon: PieChart, 
      name: 'Project Dividend', 
      sub: 'Monthly settlement', 
      amount: `${data.dividendAmount} USDT`, 
      badge: 'Available',
      color: '#a855f7',
      bgGradient: 'from-purple-500/10 to-violet-500/10'
    },
    { 
      id: 'strwa' as PanelId, 
      icon: Shield, 
      name: 'stRWA Tokens', 
      sub: 'Unlock your assets', 
      amount: data.strwaAmount, 
      badge: 'stRWA',
      color: '#00ffc8',
      bgGradient: 'from-teal-500/10 to-cyan-500/10'
    },
  ]

  return (
    <div className="min-h-screen bg-[#0a0b0d]">
      {/* Subtle Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-purple-500/5 pointer-events-none" />
      
      {/* Header */}
      <div className="border-b border-white/5 bg-[#0d0e11]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-[1400px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-lg font-semibold text-white">Withdraw Assets</h1>
            </div>
            <div className="text-sm text-white/40">
              {isConnected ? `${address?.slice(0, 6)}...${address?.slice(-4)}` : 'Not Connected'}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1400px] mx-auto px-6 py-8">
        
        {/* Total Available */}
        <div className="text-center mb-8">
          <div className="text-sm text-white/40 mb-2">Total Available to Withdraw</div>
          <div className="text-5xl font-bold text-white mb-1">
            ${data.loading ? '...' : isConnected ? data.totalUSD : '--'}
          </div>
          <div className="text-sm text-emerald-400">Ready to withdraw</div>
        </div>

        {/* Grid Layout */}
        <div className="grid lg:grid-cols-[320px_1fr] gap-6">
          
          {/* Left Sidebar - Asset Cards */}
          <div className="space-y-3">
            {items.map((item) => {
              const Icon = item.icon
              const isActive = activePanel === item.id
              
              return (
                <button
                  key={item.id}
                  onClick={() => setActivePanel(item.id)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    isActive
                      ? 'bg-white/5 border-white/15 shadow-lg'
                      : 'bg-white/3 border-white/8 hover:bg-white/5 hover:border-white/12'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div 
                      className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-gradient-to-br ${item.bgGradient}`}
                    >
                      <Icon className="w-5 h-5" style={{ color: item.color }} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-white">{item.name}</span>
                        <span 
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={{ 
                            backgroundColor: `${item.color}20`,
                            color: item.color
                          }}
                        >
                          {item.badge}
                        </span>
                      </div>
                      <div className="text-xs text-white/40 mb-2">{item.sub}</div>
                      <div className="text-base font-semibold" style={{ color: item.color }}>
                        {isConnected ? item.amount : '--'}
                      </div>
                    </div>
                    
                    {isActive && (
                      <ChevronRight className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                    )}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Right Panel - Placeholder */}
          <div className="bg-[#12141a] border border-white/8 rounded-2xl p-8 min-h-[600px]">
            <div className="text-center py-20">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center mx-auto mb-4">
                {items.find(i => i.id === activePanel)?.icon && 
                  (() => {
                    const Icon = items.find(i => i.id === activePanel)!.icon
                    return <Icon className="w-8 h-8 text-emerald-400" />
                  })()
                }
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                {items.find(i => i.id === activePanel)?.name}
              </h2>
              <p className="text-white/40 mb-6">
                {items.find(i => i.id === activePanel)?.sub}
              </p>
              <div className="text-3xl font-bold text-emerald-400 mb-8">
                {items.find(i => i.id === activePanel)?.amount}
              </div>
              <button className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold rounded-xl transition-all">
                Withdraw Now
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
