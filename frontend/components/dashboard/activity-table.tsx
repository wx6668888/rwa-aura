'use client'

import { useEffect, useState } from 'react'
import { useAccount, usePublicClient } from 'wagmi'
import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'
import { CONTRACT_ADDRESSES } from '@/lib/contracts/addresses'
import { stakingContractABI } from '@/lib/contracts/stakingContractABI'
import { formatUnits } from 'viem'
import { ActivityModal } from './activity-modal'

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

interface ActivityRow {
  time: string
  type: string
  typeVariant: 'cyan' | 'purple' | 'neutral'
  amount: string
  amountColor: string
  status: string
  txHash?: string
}

export function ActivityTable() {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)
  const { address, chainId } = useAccount()
  const publicClient = usePublicClient()
  const [activities, setActivities] = useState<ActivityRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  const stakingAddress = chainId ? CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES]?.stakingContract : undefined

  useEffect(() => {
    async function fetchActivities() {
      if (!address || !stakingAddress || !publicClient) {
        setLoading(false)
        return
      }

      try {
        // 查询 StakeEvent 事件
        const currentBlock = await publicClient.getBlockNumber()
        const fromBlock = currentBlock > 1000n ? currentBlock - 1000n : 0n

        const logs = await publicClient.getLogs({
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

        // 转换为活动记录
        const activityRows: ActivityRow[] = []
        
        for (const log of logs.slice(-10).reverse()) { // 只显示最近 10 条
          const block = await publicClient.getBlock({ blockNumber: log.blockNumber })
          const timestamp = new Date(Number(block.timestamp) * 1000)
          const amount = log.args.amount ? formatUnits(log.args.amount, 18) : '0'

          activityRows.push({
            time: timestamp.toLocaleString(locale === 'zh' ? 'zh-CN' : locale === 'ko' ? 'ko-KR' : 'en-US', { 
              month: '2-digit', 
              day: '2-digit', 
              hour: '2-digit', 
              minute: '2-digit' 
            }),
            type: t('activity.stake'),
            typeVariant: 'cyan',
            amount: `+${parseFloat(amount).toFixed(2)} USDT`,
            amountColor: '#00f5d4',
            status: t('activity.confirmed'),
            txHash: log.transactionHash,
          })
        }

        setActivities(activityRows)
      } catch (error) {
        console.error('Failed to fetch activities:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchActivities()
  }, [address, stakingAddress, publicClient])

  // 如果没有活动记录，显示默认数据
  const rows: ActivityRow[] = activities.length > 0 ? activities : [
    {
      time: t('activity.row1Time'),
      type: t('activity.row1Type'),
      typeVariant: 'cyan',
      amount: t('activity.row1Amount'),
      amountColor: '#00d4ff',
      status: t('activity.confirmed'),
    },
    {
      time: t('activity.row2Time'),
      type: t('activity.row2Type'),
      typeVariant: 'purple',
      amount: t('activity.row2Amount'),
      amountColor: '#8b5cf6',
      status: t('activity.confirmed'),
    },
    {
      time: t('activity.row3Time'),
      type: t('activity.row3Type'),
      typeVariant: 'neutral',
      amount: t('activity.row3Amount'),
      amountColor: '#f1f5f9',
      status: t('activity.confirmed'),
    },
  ]

  return (
    <div
      className="rounded-2xl bg-gradient-to-br from-[#0d0d14] to-[#13131e] p-6 backdrop-blur-xl"
      style={{ border: '1px solid #00f5d420', boxShadow: '0 0 20px rgba(0,245,212,0.05)' }}
    >
      {/* Header row */}
      <div className="mb-4 flex items-center justify-between">
        <span
          className="text-[13px] uppercase tracking-widest text-[#64748b]"
          style={{ fontVariant: 'small-caps' }}
        >
          {t('activity.title')}
        </span>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="text-[13px] text-[#00f5d4] transition-opacity hover:opacity-70"
        >
          {t('activity.viewAll')}
        </button>
      </div>

      {/* Table — horizontal scroll on mobile */}
      <div className="overflow-x-auto">
        {loading ? (
          <div className="py-8 text-center text-sm text-[#64748b]">
            {t('activity.loading')}
          </div>
        ) : rows.length === 0 ? (
          <div className="py-8 text-center text-sm text-[#64748b]">
            {t('activity.noRecords')}
          </div>
        ) : (
          <table className="w-full min-w-[500px]">
            <thead>
              <tr className="border-b border-[#ffffff0d]">
                {[
                  t('activity.colTime'),
                  t('activity.colType'),
                  t('activity.colAmount'),
                  t('activity.colStatus'),
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
              {rows.map((row, i) => (
                <tr
                  key={i}
                  className="border-b border-[#ffffff0d] transition-colors hover:bg-[#13131e]"
                >
                  <td className="sticky start-0 bg-inherit py-4 pe-4 font-mono text-[13px] text-[#64748b]">
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
                  <td className="py-4">
                    <span className="flex items-center gap-1 text-[12px] text-[#10b981]">
                      {row.status}
                      <span>&#10003;</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Activity Modal */}
      <ActivityModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </div>
  )
}
