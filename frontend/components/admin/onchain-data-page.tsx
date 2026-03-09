'use client'

import { useState, useEffect } from 'react'
import { useAccount, usePublicClient } from 'wagmi'
import { formatEther, decodeEventLog } from 'viem'
import { Activity, FileText, RefreshCw, ExternalLink } from 'lucide-react'
import { CONTRACT_ADDRESSES } from '@/lib/contracts/addresses'
import { stakingContractABI } from '@/lib/contracts/stakingContractABI'

interface EventLog {
  type: 'StakeEvent' | 'RWAStakeEvent'
  user: string
  amount: string
  referrer: string
  stakeId: string
  timestamp: number
  lockPeriod: number
  txHash: string
  blockNumber: bigint
}

export function OnChainDataPage() {
  const { chainId } = useAccount()
  const publicClient = usePublicClient()
  const [events, setEvents] = useState<EventLog[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [eventType, setEventType] = useState<'all' | 'StakeEvent' | 'RWAStakeEvent'>('all')
  const [limit, setLimit] = useState(50)

  useEffect(() => {
    if (publicClient && chainId) {
      fetchEvents()
    }
  }, [publicClient, chainId, eventType, limit])

  async function fetchEvents() {
    if (!publicClient || !chainId) {
      setError('请连接钱包')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const stakingAddress = CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES]?.stakingContract
      if (!stakingAddress) {
        throw new Error('未找到合约地址')
      }

      const allEvents: EventLog[] = []

      // 查询 StakeEvent
      if (eventType === 'all' || eventType === 'StakeEvent') {
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
              { type: 'uint256', indexed: false, name: 'lockPeriod' },
            ],
          },
          fromBlock: 0n,
          toBlock: 'latest',
        })

        stakeLogs.forEach((log) => {
          try {
            const decoded = decodeEventLog({
              abi: stakingContractABI,
              data: log.data,
              topics: log.topics,
            }) as any

            if (decoded.eventName === 'StakeEvent') {
              allEvents.push({
                type: 'StakeEvent',
                user: decoded.args.user,
                amount: formatEther(decoded.args.amount || 0n),
                referrer: decoded.args.referrer || '0x0000000000000000000000000000000000000000',
                stakeId: decoded.args.stakeId?.toString() || '0',
                timestamp: Number(decoded.args.timestamp || 0),
                lockPeriod: Number(decoded.args.lockPeriod || 0),
                txHash: log.transactionHash,
                blockNumber: log.blockNumber,
              })
            }
          } catch (err) {
            console.error('Error decoding log:', err)
          }
        })
      }

      // 查询 RWAStakeEvent
      if (eventType === 'all' || eventType === 'RWAStakeEvent') {
        const rwaLogs = await publicClient.getLogs({
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
        })

        rwaLogs.forEach((log) => {
          try {
            const decoded = decodeEventLog({
              abi: stakingContractABI,
              data: log.data,
              topics: log.topics,
            }) as any

            if (decoded.eventName === 'RWAStakeEvent') {
              allEvents.push({
                type: 'RWAStakeEvent',
                user: decoded.args.user,
                amount: formatEther(decoded.args.amount || 0n),
                referrer: decoded.args.referrer || '0x0000000000000000000000000000000000000000',
                stakeId: decoded.args.stakeId?.toString() || '0',
                timestamp: Number(decoded.args.timestamp || 0),
                lockPeriod: Number(decoded.args.lockPeriod || 0),
                txHash: log.transactionHash,
                blockNumber: log.blockNumber,
              })
            }
          } catch (err) {
            console.error('Error decoding log:', err)
          }
        })
      }

      // 按时间戳排序（最新的在前）
      allEvents.sort((a, b) => b.timestamp - a.timestamp)
      setEvents(allEvents.slice(0, limit))
    } catch (err: any) {
      console.error('Error fetching events:', err)
      setError(err.message || '加载链上数据失败')
    } finally {
      setLoading(false)
    }
  }

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#f1f5f9] flex items-center gap-2">
            <Activity className="w-8 h-8 text-[#00f5d4]" />
            链上数据
          </h1>
          <p className="mt-2 text-sm text-[#64748b]">查看所有链上事件和交易</p>
        </div>
        <button
          onClick={fetchEvents}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-[#00f5d4] text-[#05050a] font-semibold rounded-lg hover:brightness-110 transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          刷新
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="flex gap-2">
          <button
            onClick={() => setEventType('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              eventType === 'all'
                ? 'bg-[#00f5d4] text-[#05050a]'
                : 'bg-[#13131e] text-[#64748b] hover:text-[#f1f5f9]'
            }`}
          >
            全部
          </button>
          <button
            onClick={() => setEventType('StakeEvent')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              eventType === 'StakeEvent'
                ? 'bg-[#00f5d4] text-[#05050a]'
                : 'bg-[#13131e] text-[#64748b] hover:text-[#f1f5f9]'
            }`}
          >
            USDT 质押
          </button>
          <button
            onClick={() => setEventType('RWAStakeEvent')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              eventType === 'RWAStakeEvent'
                ? 'bg-[#00f5d4] text-[#05050a]'
                : 'bg-[#13131e] text-[#64748b] hover:text-[#f1f5f9]'
            }`}
          >
            RWA 质押
          </button>
        </div>
        <select
          value={limit}
          onChange={(e) => setLimit(Number(e.target.value))}
          className="px-4 py-2 bg-[#13131e] border border-[#ffffff0d] rounded-lg text-[#f1f5f9] text-sm focus:outline-none focus:ring-2 focus:ring-[#00f5d4]"
        >
          <option value={50}>显示 50 条</option>
          <option value={100}>显示 100 条</option>
          <option value={200}>显示 200 条</option>
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* Events Table */}
      <div className="rounded-xl bg-[#13131e] border border-[#ffffff0d] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#0d0d14] border-b border-[#ffffff0d]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-[#64748b] uppercase">类型</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-[#64748b] uppercase">用户</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-[#64748b] uppercase">金额</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-[#64748b] uppercase">推荐人</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-[#64748b] uppercase">锁仓期</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-[#64748b] uppercase">时间</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-[#64748b] uppercase">区块</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-[#64748b] uppercase">交易</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ffffff0d]">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-[#64748b]">
                    加载中...
                  </td>
                </tr>
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-[#64748b]">
                    暂无数据
                  </td>
                </tr>
              ) : (
                events.map((event, index) => (
                  <tr key={`${event.txHash}-${index}`} className="hover:bg-[#ffffff05] transition-colors">
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        event.type === 'StakeEvent'
                          ? 'bg-[#f59e0b]/20 text-[#f59e0b]'
                          : 'bg-[#8b5cf6]/20 text-[#8b5cf6]'
                      }`}>
                        {event.type === 'StakeEvent' ? 'USDT' : 'RWA'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm text-[#f1f5f9]">{formatAddress(event.user)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-semibold text-[#f1f5f9]">
                        {parseFloat(event.amount).toLocaleString('en-US', { maximumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm text-[#64748b]">
                        {event.referrer === '0x0000000000000000000000000000000000000000' ? '-' : formatAddress(event.referrer)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-[#64748b]">
                        {event.lockPeriod === 0 ? '灵活' : `${event.lockPeriod} 天`}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-[#64748b]">
                        {new Date(event.timestamp * 1000).toLocaleString('zh-CN')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm text-[#64748b]">{event.blockNumber.toString()}</span>
                    </td>
                    <td className="px-6 py-4">
                      <a
                        href={`#`}
                        onClick={(e) => {
                          e.preventDefault()
                          navigator.clipboard.writeText(event.txHash)
                        }}
                        className="flex items-center gap-1 text-sm text-[#00f5d4] hover:text-[#00d4aa] transition-colors"
                      >
                        {formatAddress(event.txHash)}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl bg-[#13131e] border border-[#ffffff0d] p-4">
          <p className="text-xs text-[#64748b] mb-1">总事件数</p>
          <p className="text-2xl font-bold text-[#f1f5f9]">{events.length}</p>
        </div>
        <div className="rounded-xl bg-[#13131e] border border-[#ffffff0d] p-4">
          <p className="text-xs text-[#64748b] mb-1">USDT 质押事件</p>
          <p className="text-2xl font-bold text-[#f59e0b]">
            {events.filter(e => e.type === 'StakeEvent').length}
          </p>
        </div>
        <div className="rounded-xl bg-[#13131e] border border-[#ffffff0d] p-4">
          <p className="text-xs text-[#64748b] mb-1">RWA 质押事件</p>
          <p className="text-2xl font-bold text-[#8b5cf6]">
            {events.filter(e => e.type === 'RWAStakeEvent').length}
          </p>
        </div>
      </div>
    </div>
  )
}
