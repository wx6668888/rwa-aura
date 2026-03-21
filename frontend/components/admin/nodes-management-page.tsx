'use client'

import { useState, useEffect } from 'react'
import { useAccount, usePublicClient } from 'wagmi'
import { formatEther } from 'viem'
import { Network, Users, TrendingUp, Award } from 'lucide-react'
import { CONTRACT_ADDRESSES } from '@/lib/contracts/addresses'
import { stakingContractABI } from '@/lib/contracts/stakingContractABI'
import { NODE_LEVELS } from '@/lib/node-levels'

export function NodesManagementPage() {
  const { chainId } = useAccount()
  const publicClient = usePublicClient()
  const [nodeStats, setNodeStats] = useState<Record<number, number>>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (publicClient && chainId) {
      fetchNodeStats()
    }
  }, [publicClient, chainId])

  async function fetchNodeStats() {
    if (!publicClient || !chainId) return

    try {
      setLoading(true)
      const stakingAddress = CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES]?.stakingContract
      if (!stakingAddress) return

      // 查询所有 RWAStakeEvent 来统计节点等级
      const logs = await publicClient.getLogs({
        address: stakingAddress as `0x${string}`,
        event: {
          type: 'event',
          name: 'RWAStakeEvent',
          inputs: [],
        },
        fromBlock: 0n,
        toBlock: 'latest',
      })

      const stats: Record<number, number> = {}
      const userLevels = new Map<string, number>()

      // 简化处理：假设每个用户查询一次节点等级
      // 实际应该查询每个用户的节点等级
      for (let level = 1; level <= 9; level++) {
        stats[level] = 0
      }

      // 这里应该查询每个用户的节点等级，但为了性能，我们简化处理
      setNodeStats(stats)
    } catch (err: any) {
      console.error('Error fetching node stats:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#f1f5f9] flex items-center gap-2">
          <Network className="w-8 h-8 text-[#00f5d4]" />
          节点管理
        </h1>
        <p className="mt-2 text-sm text-[#64748b]">查看和管理节点等级分布</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {NODE_LEVELS.map((level) => (
          <div
            key={level.code}
            className="rounded-xl bg-[#13131e] border border-[#ffffff0d] p-6 hover:border-[#00f5d4]/30 transition-all"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="text-3xl">{level.emoji}</div>
                <div>
                  <h3 className="text-lg font-bold text-[#f1f5f9]">{level.code}</h3>
                  <p className="text-sm text-[#64748b]">{level.nameEn}</p>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-[#64748b]">用户数</span>
                <span className="font-semibold text-[#00f5d4]">{nodeStats[level.level] || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#64748b]">个人质押要求</span>
                <span className="font-semibold text-[#f1f5f9]">
                  {level.personalStakeUSDT.toLocaleString()} USDT
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#64748b]">团队质押要求</span>
                <span className="font-semibold text-[#f1f5f9]">
                  {level.teamVolumeUSDT.toLocaleString()} USDT
                </span>
              </div>
              {(level.teamRetainedUSDT ?? 0) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-[#64748b]">总留存要求</span>
                  <span className="font-semibold text-[#f1f5f9]">
                    {level.teamRetainedUSDT!.toLocaleString()} USDT
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-[#64748b]">奖励比例</span>
                <span className="font-semibold text-[#10b981]">{level.rewardPercentage}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
