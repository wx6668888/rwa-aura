'use client'

import { useState, useCallback } from 'react'
import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'
import { useAccount } from 'wagmi'
import { useDirectReferrals } from '@/hooks/useDirectReferrals'
import { NetworkTreeModal } from './network-tree-modal'
import { formatUnits } from 'viem'

export function ReferralNetwork() {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)
  const { isConnected, address } = useAccount()
  const { referrals, count: directRefsCount } = useDirectReferrals()
  const [copied, setCopied] = useState(false)
  const [showTreeModal, setShowTreeModal] = useState(false)

  const handleCopy = useCallback(() => {
    if (address) {
      // 必须来自 nodes 页面底部推荐链接：携带 referrer 地址参数
      const referralLink = `${window.location.origin}/?ref=${address}`
      navigator.clipboard.writeText(referralLink).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
    }
  }, [address])

  const referralLink = address ? `${window.location.origin}/?ref=${address}` : ''

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-[family-name:var(--font-space-grotesk)] text-base font-bold text-[#f1f5f9]">
          {t('nodes.networkTitle') || '推荐网络'}
        </h2>
      </div>

      {/* Referral link card */}
      <div className="rounded-2xl border border-[#00f5d420] bg-gradient-to-br from-[#0d0d14] to-[#13131e] p-4 shadow-[0_0_20px_rgba(0,245,212,0.05)]">
        <p className="text-[11px] uppercase tracking-widest text-[#00f5d4] mb-2" style={{ fontVariant: 'small-caps' }}>
          {t('nodes.refAddressLabel') || '推荐链接'}
        </p>
        <div className="flex gap-2">
          <input
            readOnly
            value={referralLink}
            className="h-10 flex-1 rounded-xl border border-[#00f5d420] bg-[#0d0d14] px-4 font-[family-name:var(--font-jetbrains-mono)] text-[12px] text-[#00f5d4] outline-none transition-colors focus:border-[#00f5d440]"
          />
          <button
            type="button"
            onClick={handleCopy}
            className="flex h-10 min-w-[40px] items-center justify-center rounded-full border border-[#00f5d430] bg-transparent px-3 text-[12px] text-[#00f5d4] transition-all hover:border-[#00f5d460] hover:bg-[#00f5d410] hover:shadow-[0_0_12px_rgba(0,245,212,0.2)]"
            aria-label="Copy referral link"
          >
            {copied ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00f5d4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00f5d4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            )}
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="flex h-10 items-center gap-1.5 rounded-full border border-[#00f5d430] bg-transparent px-4 text-[12px] text-[#00f5d4] transition-all hover:border-[#00f5d460] hover:bg-[#00f5d410] hover:shadow-[0_0_12px_rgba(0,245,212,0.2)]"
          >
            {t('nodes.shareBtn') || '分享'}
          </button>
        </div>
      </div>

      {/* 树状图预览 */}
      <div className="rounded-2xl border border-[#00f5d420] bg-gradient-to-br from-[#0d0d14] to-[#13131e] p-6 shadow-[0_0_40px_rgba(0,245,212,0.1)]">
        <NetworkTreePreview 
          referrals={referrals}
          currentAddress={address || ''}
          onViewFull={() => setShowTreeModal(true)}
        />
      </div>

      {/* 查看完整网络按钮 */}
      <button
        type="button"
        onClick={() => setShowTreeModal(true)}
        className="w-full rounded-full border border-[#00f5d430] bg-transparent px-6 py-3 text-[13px] text-[#00f5d4] transition-all hover:border-[#00f5d460] hover:bg-[#00f5d410] hover:shadow-[0_0_20px_rgba(0,245,212,0.3)] hover:text-[#00f5d4]"
      >
        {t('nodes.viewFull') || '查看完整网络'}
      </button>

      {/* 树状图弹窗 */}
      {showTreeModal && (
        <NetworkTreeModal
          isOpen={showTreeModal}
          onClose={() => setShowTreeModal(false)}
          currentAddress={address || ''}
          referrals={referrals}
        />
      )}
    </div>
  )
}

/**
 * 树状图预览组件（显示下级）
 */
function NetworkTreePreview({ 
  referrals, 
  currentAddress,
  onViewFull 
}: { 
  referrals: any[]
  currentAddress: string
  onViewFull: () => void
}) {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)
  const rwaPrice = 0.85

  // 只显示前3个直推作为预览
  const previewReferrals = referrals.slice(0, 3)

  if (previewReferrals.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-[13px] text-[#64748b] mb-4">
          {t('nodes.noReferrals') || '暂无推荐用户'}
        </p>
        <button
          onClick={onViewFull}
          className="text-[12px] text-[#00f5d4] hover:underline"
        >
          {t('nodes.viewFull') || '查看完整网络'}
        </button>
      </div>
    )
  }

  return (
    <div className="relative">
      {/* 中心节点（当前用户） */}
      <div className="flex justify-center mb-6">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 rounded-full border-2 border-[#00f5d4] bg-[#13131e] flex items-center justify-center mb-2">
            <span className="text-[#00f5d4] font-mono text-xs">
              {currentAddress ? `${currentAddress.slice(0, 4)}...${currentAddress.slice(-4)}` : t('nodes.you')}
            </span>
          </div>
          <span className="text-[10px] text-[#64748b]">{t('nodes.you')}</span>
        </div>
      </div>

      {/* 连接线 */}
      {previewReferrals.length > 0 && (
        <div className="absolute top-12 left-1/2 w-full h-px bg-gradient-to-r from-transparent via-[#00f5d420] to-transparent" 
          style={{ transform: 'translateX(-50%)' }}
        />
      )}

      {/* 下级节点预览 */}
      <div className="flex justify-center gap-4 mt-8 flex-wrap">
        {previewReferrals.map((ref, index) => {
          // totalStaked是18位精度的字符串，需要转换为USDT
          const stakedRWA = parseFloat(formatUnits(BigInt(ref.totalStaked || '0'), 18))
          const stakedUSDT = stakedRWA * rwaPrice
          return (
            <div key={ref.address} className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full border border-[#64748b] bg-[#13131e] flex items-center justify-center mb-1">
                <span className="text-[#64748b] font-mono text-[10px]">
                  {ref.address.slice(0, 3)}...{ref.address.slice(-3)}
                </span>
              </div>
              <span className="text-[9px] text-[#64748b]">
                {stakedUSDT.toFixed(0)} USDT
              </span>
            </div>
          )
        })}
        {referrals.length > 3 && (
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-full border border-dashed border-[#64748b] bg-[#13131e] flex items-center justify-center mb-1">
              <span className="text-[#64748b] text-xs">+{referrals.length - 3}</span>
            </div>
            <span className="text-[9px] text-[#64748b]">更多</span>
          </div>
        )}
      </div>
    </div>
  )
}
