'use client'

import { useEffect, useState } from 'react'
import { useAccount, usePublicClient } from 'wagmi'
import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'
import { CONTRACT_ADDRESSES } from '@/lib/contracts/addresses'
import { stakingContractABI } from '@/lib/contracts/stakingContractABI'
import { formatUnits } from 'viem'
import { X, ExternalLink } from 'lucide-react'

interface ActivityRow {
  time: string
  type: string
  typeVariant: 'cyan' | 'purple' | 'neutral'
  amount: string
  amountColor: string
  status: string
  txHash?: string
}

interface TypePillProps {
  label: string
  variant: 'cyan' | 'purple' | 'neutral'
}

function TypePill({ label, variant }: TypePillProps) {
  const styles: Record<string, { bg: string; color: string }> = {
    cyan:    { bg: 'rgba(0,245,212,0.15)',  color: '#00f5d4' },
    purple:  { bg: 'rgba(139,92,246,0.15)', color: '#8b5cf6' },
    neutral: { bg: '#1a1a2e',               color: '#64748b' },
  }
  const s = styles[variant]
  return (
    <span
      className="rounded-full px-2.5 py-0.5 text-[11px] font-medium"
      style={{ background: s.bg, color: s.color }}
    >
      {label}
    </span>
  )
}

interface ActivityModalProps {
  isOpen: boolean
  onClose: () => void
}

export function ActivityModal({ isOpen, onClose }: ActivityModalProps) {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)
  const { address, chainId } = useAccount()
  const publicClient = usePublicClient()
  const [activities, setActivities] = useState<ActivityRow[]>([])
  const [loading, setLoading] = useState(true)

  const stakingAddress = chainId ? CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES]?.stakingContract : undefined
  const explorerUrl = chainId === 56 ? 'https://bscscan.com' : chainId === 97 ? 'https://testnet.bscscan.com' : 'http://localhost:8545'

  useEffect(() => {
    async function fetchAllActivities() {
      if (!address || !stakingAddress || !publicClient || !isOpen) {
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        // 查询所有 StakeEvent 和 RWAStakeEvent 事件
        const currentBlock = await publicClient.getBlockNumber()
        const fromBlock = currentBlock > 10000n ? currentBlock - 10000n : 0n

        // 获取所有 StakeEvent
        const stakeLogs = await publicClient.getLogs({
          address: stakingAddress as `0x${string}`,
          event: {
            type: 'event',
            name: 'StakeEvent',
            inputs: [
              { type: 'address', indexed: true, name: 'user' },
              { type: 'uint256', indexed: false, name: 'amount' },
              { type: 'address', indexed: true, name: 'referrer' },
              { type: 'uint256', indexed: true, name: 'stakeId' },
              { type: 'uint256', indexed: false, name: 'timestamp' },
            ],
          },
          args: {
            user: address,
          },
          fromBlock,
          toBlock: 'latest',
        })

        // 获取所有 RWAStakeEvent
        const rwaStakeLogs = await publicClient.getLogs({
          address: stakingAddress as `0x${string}`,
          event: {
            type: 'event',
            name: 'RWAStakeEvent',
            inputs: [
              { type: 'address', indexed: true, name: 'user' },
              { type: 'uint256', indexed: false, name: 'amount' },
              { type: 'address', indexed: true, name: 'referrer' },
              { type: 'uint256', indexed: true, name: 'stakeId' },
              { type: 'uint256', indexed: false, name: 'timestamp' },
            ],
          },
          args: {
            user: address,
          },
          fromBlock,
          toBlock: 'latest',
        })

        // 创建 RWA 质押交易哈希集合（用于识别 RWA 质押事件）
        const rwaStakeTxHashes = new Set(rwaStakeLogs.map(log => log.transactionHash))

        // 合并所有日志并按时间排序
        const allLogs = [...stakeLogs, ...rwaStakeLogs].sort((a, b) => {
          if (a.blockNumber !== b.blockNumber) {
            return Number(b.blockNumber - a.blockNumber)
          }
          return Number((b.logIndex || 0n) - (a.logIndex || 0n))
        })

        // 转换为活动记录
        const activityRows: ActivityRow[] = []
        
        for (const log of allLogs) {
          const block = await publicClient.getBlock({ blockNumber: log.blockNumber })
          const timestamp = new Date(Number(block.timestamp) * 1000)
          const amount = log.args.amount ? formatUnits(log.args.amount, 18) : '0'
          // 通过检查交易哈希是否在 rwaStakeLogs 中来判断是否是 RWA 质押
          const isRWA = rwaStakeTxHashes.has(log.transactionHash)

          activityRows.push({
            time: timestamp.toLocaleString(locale === 'zh' ? 'zh-CN' : locale === 'ko' ? 'ko-KR' : 'en-US', { 
              year: 'numeric',
              month: '2-digit', 
              day: '2-digit', 
              hour: '2-digit', 
              minute: '2-digit',
              second: '2-digit'
            }),
            type: isRWA ? t('activity.stakeRWA') || '质押 RWA' : t('activity.stake'),
            typeVariant: isRWA ? 'purple' : 'cyan',
            amount: `+${parseFloat(amount).toFixed(2)} ${isRWA ? 'RWA' : 'USDT'}`,
            amountColor: isRWA ? '#8b5cf6' : '#00f5d4',
            status: t('activity.confirmed'),
            txHash: log.transactionHash,
          })
        }

        setActivities(activityRows)
      } catch (error) {
        console.error('Failed to fetch activities:', error)
        setActivities([])
      } finally {
        setLoading(false)
      }
    }

    if (isOpen) {
      fetchAllActivities()
    }
  }, [address, stakingAddress, publicClient, isOpen, locale, t])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl border border-[#00f5d420] bg-gradient-to-br from-[#0d0d14] to-[#13131e] shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#00f5d420]">
          <h3 className="text-xl font-semibold text-[#f1f5f9]">{t('activity.title') || '最近活动'}</h3>
          <button 
            onClick={onClose} 
            className="text-[#64748b] hover:text-[#f1f5f9] transition-colors p-1 rounded-full hover:bg-[#1a1a2e]"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)] scrollbar-hide">
          {loading ? (
            <div className="py-12 text-center text-sm text-[#64748b]">
              {t('activity.loading') || '加载中...'}
            </div>
          ) : activities.length === 0 ? (
            <div className="py-12 text-center text-sm text-[#64748b]">
              {t('activity.noRecords') || '暂无活动记录'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b border-[#ffffff0d]">
                    {[
                      t('activity.colTime'),
                      t('activity.colType'),
                      t('activity.colAmount'),
                      t('activity.colStatus'),
                      t('activity.colTx') || '交易',
                    ].map((col) => (
                      <th
                        key={col}
                        className="pb-3 text-start text-[11px] uppercase tracking-widest text-[#334155]"
                        style={{ fontVariant: 'small-caps' }}
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {activities.map((row, i) => (
                    <tr
                      key={i}
                      className="border-b border-[#ffffff0d] transition-colors hover:bg-[#13131e]"
                    >
                      <td className="py-4 pe-4 font-mono text-[13px] text-[#64748b]">
                        {row.time}
                      </td>
                      <td className="py-4 pe-4">
                        <TypePill label={row.type} variant={row.typeVariant} />
                      </td>
                      <td className="py-4 pe-4">
                        <span className="font-mono text-[13px]" style={{ color: row.amountColor }}>
                          {row.amount}
                        </span>
                      </td>
                      <td className="py-4 pe-4">
                        <span className="flex items-center gap-1 text-[12px] text-[#10b981]">
                          {row.status}
                          <span>&#10003;</span>
                        </span>
                      </td>
                      <td className="py-4">
                        {row.txHash ? (
                          <a
                            href={`${explorerUrl}/tx/${row.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-[12px] text-[#00f5d4] hover:text-[#00f5d4] hover:underline transition-colors"
                          >
                            <span className="font-mono">
                              {row.txHash.slice(0, 6)}...{row.txHash.slice(-4)}
                            </span>
                            <ExternalLink size={14} />
                          </a>
                        ) : (
                          <span className="text-[12px] text-[#64748b]">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
