'use client'

import { TrendingUp, Briefcase, Users, PieChart, Shield, Zap } from 'lucide-react'
import { useAccount } from 'wagmi'

type PanelId = 'quick' | 'yield' | 'principal' | 'referral' | 'dividend' | 'strwa'

interface Props {
  activePanel: PanelId
  onPanelSwitch: (panel: PanelId) => void
  data: any
}

export function AssetTree({ activePanel, onPanelSwitch, data }: Props) {
  const { isConnected } = useAccount()

  const RWA_TO_USD = 0.85
  const principalUSD = (parseFloat(data.rwaPrincipal || '0') * RWA_TO_USD + parseFloat(data.usdtPrincipal || '0')).toFixed(2)

  const items = [
    // 下方各资产行：统一使用主霓虹青绿做点缀，避免多色干扰
    { id: 'yield' as PanelId, icon: TrendingUp, name: 'RWA 收益', sub: '每日 0.8% 收益率', amount: `${data.yieldAmount} RWA`, status: '可提取', color: '#00f5d4', value: parseFloat(data.yieldAmount || '0') * RWA_TO_USD },
    { id: 'principal' as PanelId, icon: Briefcase, name: '质押本金', sub: `RWA: ${data.rwaPrincipal} | USDT: ${data.usdtPrincipal}`, amount: `${principalUSD} USDT`, status: '可提取', color: '#00f5d4', value: parseFloat(principalUSD) },
    { id: 'referral' as PanelId, icon: Users, name: '推荐奖励', sub: '每周结算', amount: `${data.referralAmount} USDT`, status: '可提取', color: '#00f5d4', value: parseFloat(data.referralAmount || '0') },
    { id: 'dividend' as PanelId, icon: PieChart, name: '项目分红', sub: '每月结算', amount: `${data.dividendAmount} USDT`, status: '可提取', color: '#00f5d4', value: parseFloat(data.dividendAmount || '0') },
    { id: 'strwa' as PanelId, icon: Shield, name: 'stRWA 凭证', sub: '资产解锁', amount: data.strwaAmount, status: 'stRWA', color: '#00f5d4', value: parseFloat(data.strwaAmount || '0') * RWA_TO_USD },
  ]

  const quickItem = { id: 'quick' as PanelId, icon: Zap, name: '一键提取', sub: '快速提取所有资产', amount: `$${data.totalUSD}`, status: '快捷', color: '#fbbf24', value: 0 }
  const displayItems = [quickItem, ...items]

  // Calculate percentages (excluding quick withdraw)
  const total = items.reduce((sum, item) => sum + item.value, 0)
  const percentages = items.map(item => total > 0 ? (item.value / total * 100) : 0)
  // 圆环配色：与仪表台保持一致，只用主霓虹绿 + 暗底色
  const ringColor = '#00f5d4'

  const activeIndex = items.findIndex(item => item.id === activePanel)
  const activePercent = activeIndex >= 0 ? percentages[activeIndex] : 0
  const activeLabel = activeIndex >= 0 ? items[activeIndex].name : '资产类型'

  return (
    <div className="bg-[#0d1018] border-r border-[rgba(255,255,255,0.08)] flex flex-col h-full relative overflow-hidden">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-[rgba(0,255,200,0.02)] to-transparent pointer-events-none" />
      
      {/* Header */}
      <div className="relative p-5 pb-4 border-b border-[rgba(255,255,255,0.08)]">
        <div className="text-[10px] uppercase tracking-[0.2em] text-[rgba(238,242,255,0.4)] mb-4 flex items-center gap-2">
          <div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
          资产构成一览
        </div>
        
        {/* Enhanced Donut Chart with Percentages */}
        <div className="flex flex-col items-center py-3 pb-4">
          <div className="relative w-[120px] h-[120px]">
            {/* Animated percentage ring：与仪表台圆环配色保持一致，仅使用主霓虹绿 */}
            <svg className="absolute inset-0 -rotate-90" viewBox="0 0 120 120">
              {/* 背景环 */}
              <circle cx="60" cy="60" r="50" fill="none" stroke="#020617" strokeWidth="12" />
              {/* 前景环：使用选中资产的占比，颜色固定为主色 */}
              {total > 0 && (
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  fill="none"
                  stroke={ringColor}
                  strokeWidth="12"
                  strokeDasharray={`${(activePercent / 100) * 2 * Math.PI * 50} ${2 * Math.PI * 50}`}
                  strokeDashoffset="0"
                  opacity="0.9"
                  style={{
                    transition: 'all 0.8s ease-out',
                    filter: 'drop-shadow(0 0 8px rgba(0,245,212,0.6))'
                  }}
                />
              )}
            </svg>
            
            {/* Center content */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-[18px] font-[700] text-[#00ffc8] mb-0.5" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
                  {total > 0 ? `${activePercent.toFixed(1)}%` : '--'}
                </div>
                <div className="text-[9px] text-[rgba(238,242,255,0.3)]">{activeLabel}</div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-between w-full mt-4 text-[11px] px-1">
            <span className="text-[rgba(238,242,255,0.5)]">可提取总计</span>
            <span className="font-[700] text-[#00ffc8]" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
              {data.loading ? '...' : isConnected ? `$${data.totalUSD}` : '--'}
            </span>
          </div>
        </div>
      </div>

      {/* Items with stagger animation */}
      <div className="relative flex-1 p-2.5 overflow-y-auto space-y-1.5">
        {displayItems.map((item, index) => {
          const Icon = item.icon
          const isActive = activePanel === item.id
          const percentage = item.id === 'quick' ? null : percentages[index - 1]
          
          return (
            <button
              key={item.id}
              onClick={() => onPanelSwitch(item.id)}
              className={`w-full flex items-center gap-3 p-3.5 rounded-xl border transition-all duration-300 relative group ${
                isActive
                  ? 'bg-[rgba(0,255,200,0.05)] border-[rgba(0,255,200,0.25)] shadow-[0_0_20px_rgba(0,255,200,0.1)]'
                  : 'border-transparent hover:bg-[rgba(255,255,255,0.03)] hover:border-[rgba(255,255,255,0.08)]'
              }`}
              style={{
                animation: `slideIn 0.3s ease-out ${index * 0.05}s both`
              }}
            >
              {/* Active indicator */}
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[50%] bg-gradient-to-b from-emerald-400 to-teal-400 rounded-r-full animate-pulse" />
              )}
              
              {/* Icon with glow */}
              <div 
                className={`w-[38px] h-[38px] rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                  isActive ? 'scale-110' : 'group-hover:scale-105'
                }`}
                style={{ 
                  backgroundColor: `${item.color}15`,
                  boxShadow: isActive ? `0 0 20px ${item.color}40` : 'none'
                }}
              >
                <Icon className="w-[18px] h-[18px] transition-transform duration-300" style={{ color: item.color }} />
              </div>
              
              {/* Content */}
              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[13px] font-[600] text-[#eef2ff] truncate">{item.name}</span>
                  {percentage !== null && (
                    <span 
                      className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                      style={{ 
                        backgroundColor: `${item.color}26`,
                        color: item.color
                      }}
                    >
                      {percentage.toFixed(1)}%
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-[rgba(238,242,255,0.45)] leading-tight">{item.sub}</div>
              </div>
              
              {/* Amount */}
              <div className="text-right flex-shrink-0">
                <div 
                  className="text-[13px] font-[600] transition-all duration-300" 
                  style={{ 
                    fontFamily: 'var(--font-jetbrains-mono)',
                    color: '#e2e8f0',
                    textShadow: isActive ? `0 0 10px rgba(0,245,212,0.4)` : 'none'
                  }}
                >
                  {isConnected ? item.amount : '--'}
                </div>
                {item.id !== 'quick' && (
                  <div className="text-[10px] mt-0.5 text-[#22c55e]">
                    {item.status}
                  </div>
                )}
                {item.id === 'quick' && (
                  <div className="text-[10px] mt-0.5 text-[#fbbf24]">
                    {item.status}
                  </div>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* Footer */}
      <div className="relative p-4 border-t border-[rgba(255,255,255,0.08)] text-center bg-[rgba(0,0,0,0.2)]">
        <div className="text-[10px] text-[rgba(238,242,255,0.35)] leading-[1.6]">
          点击切换提取项目<br />
          <span className="text-emerald-400/60">数据每30秒自动刷新</span>
        </div>
      </div>

      <style jsx>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  )
}
