'use client'

import { useState, useEffect } from 'react'
import { useAccount, usePublicClient } from 'wagmi'
import { formatEther, decodeEventLog } from 'viem'
import { FileText, Search, Filter, ExternalLink } from 'lucide-react'
import { CONTRACT_ADDRESSES } from '@/lib/contracts/addresses'
import { stakingContractABI } from '@/lib/contracts/stakingContractABI'

interface Transaction {
  txHash: string
  blockNumber: bigint
  timestamp: number
  events: Array<{
    type: string
    user: string
    amount: string
    referrer: string
    stakeId: string
    lockPeriod: number
  }>
}

export function TransactionsPage() {
  const { chainId } = useAccount()
  const publicClient = usePublicClient()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTx, setSearchTx] = useState('')

  useEffect(() => {
    if (publicClient && chainId) {
      fetchTransactions()
    }
  }, [publicClient, chainId])

  async function fetchTransactions() {
    if (!publicClient || !chainId) return

    try {
      setLoading(true)
      const stakingAddress = CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES]?.stakingContract
      if (!stakingAddress) return

      const [stakeLogs, rwaLogs] = await Promise.all([
        publicClient.getLogs({
          address: stakingAddress as `0x${string}`,
          event: {
            type: 'event',
            name: 'StakeEvent',
            inputs: [],
          },
          fromBlock: 0n,
          toBlock: 'latest',
        }),
        publicClient.getLogs({
          address: stakingAddress as `0x${string}`,
          event: {
            type: 'event',
            name: 'RWAStakeEvent',
            inputs: [],
          },
          fromBlock: 0n,
          toBlock: 'latest',
        }),
      ])

      const txMap = new Map<string, Transaction>()

      const processLogs = async (logs: any[], eventType: string) => {
        for (const log of logs) {
          try {
            const decoded = decodeEventLog({
              abi: stakingContractABI,
              data: log.data,
              topics: log.topics,
            }) as any

            const block = await publicClient.getBlock({ blockNumber: log.blockNumber })
            const txHash = log.transactionHash

            if (!txMap.has(txHash)) {
              txMap.set(txHash, {
                txHash,
                blockNumber: log.blockNumber,
                timestamp: Number(block.timestamp),
                events: [],
              })
            }

            const tx = txMap.get(txHash)!
            tx.events.push({
              type: eventType,
              user: decoded.args.user,
              amount: formatEther(decoded.args.amount || 0n),
              referrer: decoded.args.referrer || '0x0000000000000000000000000000000000000000',
              stakeId: decoded.args.stakeId?.toString() || '0',
              lockPeriod: Number(decoded.args.lockPeriod || 0),
            })
          } catch (err) {
            console.error('Error processing log:', err)
          }
        }
      }

      await processLogs(stakeLogs, 'StakeEvent')
      await processLogs(rwaLogs, 'RWAStakeEvent')

      const sortedTxs = Array.from(txMap.values()).sort((a, b) => Number(b.blockNumber) - Number(a.blockNumber))
      setTransactions(sortedTxs)
    } catch (err: any) {
      console.error('Error fetching transactions:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredTxs = searchTx
    ? transactions.filter(tx => tx.txHash.toLowerCase().includes(searchTx.toLowerCase()))
    : transactions

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#f1f5f9] flex items-center gap-2">
          <FileText className="w-8 h-8 text-[#00f5d4]" />
          交易记录
        </h1>
        <p className="mt-2 text-sm text-[#64748b]">查看所有链上交易</p>
      </div>

      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#64748b]" />
          <input
            type="text"
            value={searchTx}
            onChange={(e) => setSearchTx(e.target.value)}
            placeholder="搜索交易哈希..."
            className="w-full pl-10 pr-4 py-3 bg-[#13131e] border border-[#ffffff0d] rounded-lg text-[#f1f5f9] placeholder-[#64748b] focus:outline-none focus:ring-2 focus:ring-[#00f5d4]"
          />
        </div>
      </div>

      <div className="rounded-xl bg-[#13131e] border border-[#ffffff0d] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#0d0d14] border-b border-[#ffffff0d]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-[#64748b] uppercase">交易哈希</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-[#64748b] uppercase">区块</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-[#64748b] uppercase">时间</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-[#64748b] uppercase">事件数</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-[#64748b] uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ffffff0d]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-[#64748b]">加载中...</td>
                </tr>
              ) : filteredTxs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-[#64748b]">暂无数据</td>
                </tr>
              ) : (
                filteredTxs.map((tx) => (
                  <tr key={tx.txHash} className="hover:bg-[#ffffff05] transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm text-[#f1f5f9]">
                        {tx.txHash.slice(0, 10)}...{tx.txHash.slice(-8)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm text-[#64748b]">{tx.blockNumber.toString()}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-[#64748b]">
                        {new Date(tx.timestamp * 1000).toLocaleString('zh-CN')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-semibold text-[#00f5d4]">{tx.events.length}</span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => {
                          const details = tx.events.map(e => 
                            `${e.type}: ${e.amount} ${e.type === 'StakeEvent' ? 'USDT' : 'RWA'} by ${e.user.slice(0, 6)}...${e.user.slice(-4)}`
                          ).join('\n')
                          alert(details)
                        }}
                        className="text-sm text-[#00f5d4] hover:text-[#00d4aa] transition-colors"
                      >
                        查看详情
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
