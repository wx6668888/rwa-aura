'use client'

import { useState, useEffect } from 'react'
import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'
import { getNodeLevelConfig } from '@/lib/node-levels'
import { estimateLevelFromPersonalStakeUSDT } from '@/lib/referral-level-estimate'
import { formatUnits } from 'viem'
import { X, ChevronRight, ChevronDown } from 'lucide-react'

interface NetworkTreeModalProps {
  isOpen: boolean
  onClose: () => void
  currentAddress: string
  referrals: any[]
}

interface TreeNode {
  address: string
  level: number
  stakedUSDT: number
  registerTime: number
  children: TreeNode[]
  expanded: boolean
}

export function NetworkTreeModal({ isOpen, onClose, currentAddress, referrals }: NetworkTreeModalProps) {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)
  const [treeData, setTreeData] = useState<TreeNode[]>([])
  const rwaPrice = 0.85

  useEffect(() => {
    if (isOpen && referrals.length > 0) {
      // 构建简单的下级树状数据
      const nodes: TreeNode[] = referrals.map((ref) => {
        const stakedUSDT = parseFloat(formatUnits(BigInt(ref.totalStaked || '0'), 18)) * rwaPrice
        return {
          address: ref.address,
          level: estimateLevelFromPersonalStakeUSDT(stakedUSDT),
          stakedUSDT,
          registerTime: ref.firstStakeTime || Date.now() / 1000,
          children: [],
          expanded: false
        }
      })
      setTreeData(nodes)
    }
  }, [isOpen, referrals, rwaPrice])

  const toggleExpand = (index: number) => {
    setTreeData(prev => prev.map((node, i) => 
      i === index ? { ...node, expanded: !node.expanded } : node
    ))
  }

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  const localeToBcp47 = locale === 'zh' ? 'zh-CN' : locale === 'ja' ? 'ja-JP' : locale === 'ko' ? 'ko-KR' : 'en-US'
  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString(localeToBcp47, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
  }

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="relative w-full h-full max-w-4xl max-h-[90vh] m-4 rounded-2xl border border-[#00f5d420] bg-gradient-to-br from-[#0d0d14] to-[#13131e] shadow-[0_0_60px_rgba(0,245,212,0.3)] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#00f5d420] flex-shrink-0">
          <h2 className="text-xl font-bold text-[#f1f5f9]">
            {t('nodes.fullNetwork')}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[#1a1a2e] transition-colors"
          >
            <X className="w-5 h-5 text-[#64748b] hover:text-[#f1f5f9]" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* 中心节点 */}
          <div className="mb-6 flex justify-center">
            <div className="flex flex-col items-center p-4 rounded-xl border border-[#00f5d4] bg-[#13131e]">
              <div className="w-16 h-16 rounded-full border-2 border-[#00f5d4] bg-[#0d0d14] flex items-center justify-center mb-2">
                <span className="text-[#00f5d4] font-mono text-sm font-semibold">
                  {formatAddress(currentAddress)}
                </span>
              </div>
              <span className="text-xs text-[#64748b]">{t('nodes.you')}</span>
            </div>
          </div>

          {/* 简单的树状列表 */}
          <div className="space-y-2">
            {treeData.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-[#64748b]">{t('nodes.noReferrals') || '暂无推荐用户'}</p>
              </div>
            ) : (
              treeData.map((node, index) => {
                const levelConfig = getNodeLevelConfig(node.level) || getNodeLevelConfig(1)!
                return (
                  <div key={node.address} className="border border-[#00f5d420] rounded-lg bg-[#13131e] overflow-hidden">
                    {/* 节点头部 - 可点击展开/收起 */}
                    <div 
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-[#1a1a2e] transition-colors"
                      onClick={() => toggleExpand(index)}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {/* 展开/收起图标 */}
                        <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                          {node.expanded ? (
                            <ChevronDown className="w-4 h-4 text-[#64748b]" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-[#64748b]" />
                          )}
                        </div>
                        
                        {/* 地址 */}
                        <span className="font-mono text-sm text-[#f1f5f9] truncate">
                          {formatAddress(node.address)}
                        </span>
                        
                        {/* 级别 */}
                        <span 
                          className="px-2 py-0.5 rounded text-xs font-semibold flex-shrink-0"
                          style={{ 
                            color: levelConfig.color,
                            backgroundColor: `${levelConfig.color}20`,
                            border: `1px solid ${levelConfig.color}40`
                          }}
                        >
                          {levelConfig.code}
                        </span>
                      </div>
                      
                      {/* 右侧信息 */}
                      <div className="flex items-center gap-4 text-xs text-[#64748b] flex-shrink-0">
                        <span className="font-mono">{node.stakedUSDT.toFixed(2)} USDT</span>
                        <span>{formatDate(node.registerTime)}</span>
                      </div>
                    </div>

                    {/* 展开的详细信息 */}
                    {node.expanded && (
                      <div className="px-4 pb-4 border-t border-[#00f5d420] bg-[#0d0d14]">
                        <div className="pt-4 space-y-2 text-xs">
                          <div className="flex justify-between">
                            <span className="text-[#64748b]">{t('nodes.stakedAmount')}:</span>
                            <span className="font-mono text-[#00f5d4]">{node.stakedUSDT.toFixed(2)} USDT</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[#64748b]">{t('nodes.addressLabel')}:</span>
                            <span className="font-mono text-[#f1f5f9] break-all">{node.address}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[#64748b]">{t('nodes.registerTime')}:</span>
                            <span className="text-[#f1f5f9]">{formatDate(node.registerTime)}</span>
                          </div>
                          <div className="flex justify-between gap-2">
                            <span className="text-[#64748b] shrink-0">
                              {t('nodes.nodeLevelLabel')} ({t('nodes.refNetEstLevelNote')}):
                            </span>
                            <span className="font-semibold text-end" style={{ color: levelConfig.color }}>
                              {levelConfig.nameEn} ({levelConfig.code})
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
