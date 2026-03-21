'use client'

import { useState, useEffect } from 'react'
import { useAccount, usePublicClient } from 'wagmi'
import { formatEther, decodeEventLog } from 'viem'
import { 
  Users, Coins, TrendingUp, Award, Activity, 
  Database, Network, Wallet, FileText, BarChart3
} from 'lucide-react'
import { CONTRACT_ADDRESSES } from '@/lib/contracts/addresses'
import { stakingContractABI } from '@/lib/contracts/stakingContractABI'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

interface DashboardStats {
  totalUsers: number
  activeUsers: number
  totalStakedUSDT: string
  totalStakedRWA: string
  totalRWA: string
  totalStaticRewards: string
  totalDynamicRewards: string
  totalTransactions: number
  totalStakeEvents: number
  totalRWAStakeEvents: number
}

/** 从后端 API 拉取仪表盘统计（不依赖本地链） */
async function fetchDashboardStatsFromApi(): Promise<DashboardStats | null> {
  try {
    const res = await fetch(`${API_BASE}/api/stats/global`)
    if (!res.ok) return null
    const json = await res.json()
    if (!json?.success || !json?.data) return null
    const d = json.data
    return {
      totalUsers: Number(d.totalUsers) || 0,
      activeUsers: Number(d.activeUsers) || 0,
      totalStakedUSDT: d.totalStaked ?? '0',
      totalStakedRWA: d.totalRWAStaked ?? '0',
      totalRWA: '0',
      totalStaticRewards: d.totalStaticRewards ?? '0',
      totalDynamicRewards: d.totalDynamicRewards ?? '0',
      totalTransactions: 0,
      totalStakeEvents: 0,
      totalRWAStakeEvents: 0,
    }
  } catch {
    return null
  }
}

export function AdminDashboard() {
  const { chainId } = useAccount()
  const publicClient = usePublicClient()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dataSource, setDataSource] = useState<'chain' | 'api'>('chain')

  useEffect(() => {
    fetchDashboardStats()
    const interval = setInterval(fetchDashboardStats, 30000)
    return () => clearInterval(interval)
  }, [publicClient, chainId])

  async function fetchDashboardStats() {
    setLoading(true)
    setError(null)

    const tryChain = publicClient && chainId && CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES]?.stakingContract

    if (tryChain) {
      try {
        const stakingAddress = CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES]!.stakingContract!

        const [
          totalStakedRWA,
          totalStakedUSDT,
          totalRWA,
          stakeEvents,
          rwaStakeEvents,
        ] = await Promise.all([
          publicClient.readContract({
            address: stakingAddress as `0x${string}`,
            abi: stakingContractABI,
            functionName: 'totalStakedRWA',
          }),
          publicClient.readContract({
            address: stakingAddress as `0x${string}`,
            abi: stakingContractABI,
            functionName: 'getTotalStaked',
          }),
          Promise.resolve(0n),
          publicClient.getLogs({
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
                { type: 'uint256', indexed: false, name: 'lockPeriod' },
              ],
            },
            fromBlock: 0n,
            toBlock: 'latest',
          }),
          publicClient.getLogs({
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
                { type: 'uint256', indexed: false, name: 'lockPeriod' },
              ],
            },
            fromBlock: 0n,
            toBlock: 'latest',
          }),
        ])

        const allUsers = new Set<string>()
        for (const log of stakeEvents) {
          try {
            const decoded = decodeEventLog({
              abi: stakingContractABI,
              data: log.data,
              topics: log.topics,
            }) as any
            if (decoded.eventName === 'StakeEvent' && decoded.args?.user) {
              allUsers.add(decoded.args.user.toLowerCase())
            }
          } catch {}
        }
        for (const log of rwaStakeEvents) {
          try {
            const decoded = decodeEventLog({
              abi: stakingContractABI,
              data: log.data,
              topics: log.topics,
            }) as any
            if (decoded.eventName === 'RWAStakeEvent' && decoded.args?.user) {
              allUsers.add(decoded.args.user.toLowerCase())
            }
          } catch {}
        }

        setStats({
          totalUsers: allUsers.size,
          activeUsers: allUsers.size,
          totalStakedUSDT: formatEther(totalStakedUSDT || 0n),
          totalStakedRWA: formatEther(totalStakedRWA || 0n),
          totalRWA: '0',
          totalStaticRewards: '0',
          totalDynamicRewards: '0',
          totalTransactions: stakeEvents.length + rwaStakeEvents.length,
          totalStakeEvents: stakeEvents.length,
          totalRWAStakeEvents: rwaStakeEvents.length,
        })
        setDataSource('chain')
        setLoading(false)
        return
      } catch (err: any) {
        console.error('Error fetching dashboard stats from chain:', err)
        const msg = err?.message ?? ''
        if (!msg.includes('fetch') && !msg.includes('8545') && !msg.includes('HTTP request failed')) {
          setError(err.message || '加载数据失败')
          setLoading(false)
          return
        }
      }
    }

    // 链不可用或未连接钱包：从后端 API 拉取（数据库统计）
    const apiStats = await fetchDashboardStatsFromApi()
    if (apiStats) {
      setStats(apiStats)
      setDataSource('api')
      setError(null)
    } else if (!tryChain) {
      setError('请连接钱包，或确保后端服务已启动 (http://localhost:3001) 以查看数据库统计。')
    } else {
      setError('无法连接本地节点。请先启动 Hardhat 本地链，或确保后端已启动 (http://localhost:3001) 以使用数据库数据。')
    }
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-[#64748b]">加载中...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4">
        <p className="text-red-400">错误：{error}</p>
        <button
          onClick={fetchDashboardStats}
          className="mt-4 rounded-lg bg-[#00f5d4] px-4 py-2 text-sm font-semibold text-[#05050a] transition-all hover:brightness-110"
        >
          重试
        </button>
      </div>
    )
  }

  const statCards = [
    {
      title: '总用户数',
      value: stats?.totalUsers || 0,
      icon: Users,
      color: 'text-[#00f5d4]',
      bg: 'from-[#00f5d4]/10 to-[#00d4aa]/10',
    },
    {
      title: '活跃用户',
      value: stats?.activeUsers || 0,
      icon: Activity,
      color: 'text-[#10b981]',
      bg: 'from-[#10b981]/10 to-[#059669]/10',
    },
    {
      title: '总 USDT 质押',
      value: `${parseFloat(stats?.totalStakedUSDT || '0').toLocaleString('en-US', { maximumFractionDigits: 2 })} USDT`,
      icon: Coins,
      color: 'text-[#f59e0b]',
      bg: 'from-[#f59e0b]/10 to-[#d97706]/10',
    },
    {
      title: '总 RWA 质押',
      value: `${parseFloat(stats?.totalStakedRWA || '0').toLocaleString('en-US', { maximumFractionDigits: 2 })} RWA`,
      icon: Wallet,
      color: 'text-[#8b5cf6]',
      bg: 'from-[#8b5cf6]/10 to-[#7c3aed]/10',
    },
    {
      title: 'USDT 质押事件',
      value: stats?.totalStakeEvents || 0,
      icon: FileText,
      color: 'text-[#3b82f6]',
      bg: 'from-[#3b82f6]/10 to-[#2563eb]/10',
    },
    {
      title: 'RWA 质押事件',
      value: stats?.totalRWAStakeEvents || 0,
      icon: FileText,
      color: 'text-[#ec4899]',
      bg: 'from-[#ec4899]/10 to-[#db2777]/10',
    },
    {
      title: '总交易数',
      value: stats?.totalTransactions || 0,
      icon: BarChart3,
      color: 'text-[#06b6d4]',
      bg: 'from-[#06b6d4]/10 to-[#0891b2]/10',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[#f1f5f9]">仪表盘</h1>
        <p className="mt-2 text-sm text-[#64748b]">
          RWA Protocol 后台管理控制台
          {dataSource === 'api' && (
            <span className="ml-2 text-[#00f5d4]">（数据来自后端数据库）</span>
          )}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card, index) => {
          const Icon = card.icon
          return (
            <div
              key={index}
              className={`rounded-2xl bg-gradient-to-br ${card.bg} p-6 border border-[#ffffff0d] hover:border-[#00f5d4]/30 transition-all`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs uppercase tracking-widest text-[#64748b] mb-2">
                    {card.title}
                  </p>
                  <p className={`text-2xl font-bold ${card.color}`}>
                    {card.value}
                  </p>
                </div>
                <div className={`p-3 rounded-lg bg-gradient-to-br ${card.bg}`}>
                  <Icon className={`w-6 h-6 ${card.color}`} />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <a
          href="/admin/users"
          className="rounded-xl bg-[#13131e] border border-[#ffffff0d] p-6 hover:border-[#00f5d4]/30 transition-all group"
        >
          <Users className="w-8 h-8 text-[#00f5d4] mb-3 group-hover:scale-110 transition-transform" />
          <h3 className="text-lg font-semibold text-[#f1f5f9] mb-1">用户管理</h3>
          <p className="text-sm text-[#64748b]">查看和管理所有用户信息</p>
        </a>
        <a
          href="/admin/onchain"
          className="rounded-xl bg-[#13131e] border border-[#ffffff0d] p-6 hover:border-[#00f5d4]/30 transition-all group"
        >
          <Activity className="w-8 h-8 text-[#10b981] mb-3 group-hover:scale-110 transition-transform" />
          <h3 className="text-lg font-semibold text-[#f1f5f9] mb-1">链上数据</h3>
          <p className="text-sm text-[#64748b]">查看链上交易和事件</p>
        </a>
        <a
          href="/admin/transactions"
          className="rounded-xl bg-[#13131e] border border-[#ffffff0d] p-6 hover:border-[#00f5d4]/30 transition-all group"
        >
          <FileText className="w-8 h-8 text-[#f59e0b] mb-3 group-hover:scale-110 transition-transform" />
          <h3 className="text-lg font-semibold text-[#f1f5f9] mb-1">交易记录</h3>
          <p className="text-sm text-[#64748b]">查看所有交易历史</p>
        </a>
      </div>

      {/* Refresh Button */}
      <div className="flex justify-end">
        <button
          onClick={fetchDashboardStats}
          disabled={loading}
          className="rounded-lg bg-[#00f5d4] px-6 py-2 text-sm font-semibold text-[#05050a] transition-all hover:brightness-110 disabled:opacity-50"
        >
          {loading ? '加载中...' : '刷新数据'}
        </button>
      </div>
    </div>
  )
}
