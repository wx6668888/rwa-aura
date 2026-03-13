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
  const principalUSD = (parseFloat(data.rwaPrincipal) * RWA_TO_USD + parseFloat(data.usdtPrincipal)).toFixed(2)

  const items = [
    { id: 'quick' as PanelId, icon: Zap, name: '一键提取', sub: '快速提取所有资产', amount: `$${data.totalUSD}`, status: '快捷', color: '#fbbf24' },
    { id: 'yield' as PanelId, icon: TrendingUp, name: 'RWA 收益', sub: '每日 0.8% 收益率', amount: `${data.yieldAmount} RWA`, status: '可提取', color: '#22c55e' },
    { id: 'principal' as PanelId, icon: Briefcase, name: '质押本金', sub: `RWA: ${data.rwaPrincipal} | USDT: ${data.usdtPrincipal}`, amount: `${principalUSD} USDT`, status: '可提取', color: '#00ffc8' },
    { id: 'referral' as PanelId, icon: Users, name: '推荐奖励', sub: '每周结算', amount: `${data.referralAmount} USDT`, status: '可提取', color: '#f59e0b' },
    { id: 'dividend' as PanelId, icon: PieChart, name: '项目分红', sub: '每月结算 · 手续费 8%', amount: `${data.dividendAmount} USDT`, status: '可提取', color: '#a855f7' },
    { id: 'strwa' as PanelId, icon: Shield, name: 'stRWA 凭证', sub: '资产解锁', amount: data.strwaAmount, status: 'stRWA', color: '#00ffc8' },
  ]

  return (
    <div className="bg-[#131720] border-r border-[rgba(255,255,255,0.055)] flex flex-col h-full">
      {/* Header */}
      <div className="p-5 pb-4 border-b border-[rgba(255,255,255,0.055)]">
        <div className="text-[10px] uppercase tracking-[0.2em] text-[rgba(238,242,255,0.26)] mb-3">
          资产构成
        </div>
        
        {/* Donut Chart Placeholder */}
        <div className="flex flex-col items-center py-2 pb-4">
          <div className="w-[110px] h-[110px] rounded-full border-[10px] border-[#1a1f2e] relative flex items-center justify-center">
            <div className="text-center">
              <div className="text-[15px] font-[700] text-[#00ffc8]" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>5项</div>
              <div className="text-[9px] text-[rgba(238,242,255,0.26)]">资产</div>
            </div>
          </div>
          <div className="flex justify-between w-full mt-3 text-[11px]">
            <span className="text-[rgba(238,242,255,0.52)]">可提取总计</span>
            <span className="font-[700] text-[#00ffc8]" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
              {data.loading ? '...' : isConnected ? `$${data.totalUSD}` : '--'}
            </span>
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="flex-1 p-2.5 overflow-y-auto space-y-1">
        {items.map((item) => {
          const Icon = item.icon
          const isActive = activePanel === item.id
          
          return (
            <button
              key={item.id}
              onClick={() => onPanelSwitch(item.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all relative ${
                isActive
                  ? 'bg-[#0d1018] border-[rgba(0,255,200,0.22)] shadow-[0_0_16px_rgba(0,255,200,0.06)]'
                  : 'border-transparent hover:bg-[#1a1f2e]'
              }`}
            >
              {isActive && (
                <div className="absolute left-[-1px] top-1/2 -translate-y-1/2 w-[3px] h-[60%] bg-[#00ffc8] rounded-r-[3px]" />
              )}
              
              <div className="w-[34px] h-[34px] rounded-[10px] flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${item.color}1a` }}>
                <Icon className="w-4 h-4" style={{ color: item.color }} />
              </div>
              
              <div className="flex-1 min-w-0 text-left">
                <div className="text-[13px] font-[600] text-[#eef2ff] truncate">{item.name}</div>
                <div className="text-[10px] text-[rgba(238,242,255,0.52)] mt-0.5">{item.sub}</div>
              </div>
              
              <div className="text-right flex-shrink-0">
                <div className="text-[13px] font-[600]" style={{ fontFamily: 'var(--font-jetbrains-mono)', color: item.color }}>
                  {isConnected ? item.amount : '--'}
                </div>
                <div className={`text-[10px] mt-0.5 ${item.status === '可提取' ? 'text-[#22c55e]' : item.status === '部分锁定' ? 'text-[#ef4444]' : 'text-[rgba(238,242,255,0.26)]'}`}>
                  {item.status}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Footer */}
      <div className="p-3.5 border-t border-[rgba(255,255,255,0.055)] text-center">
        <div className="text-[10px] text-[rgba(238,242,255,0.26)] leading-[1.5]">
          点击左侧切换提取项目<br />数据每30秒自动刷新
        </div>
      </div>
    </div>
  )
}
