import { useAccount, usePublicClient } from 'wagmi'
import { decodeEventLog } from 'viem'
import { useEffect, useState } from 'react'
import { CONTRACT_ADDRESSES } from '@/lib/contracts/addresses'
import { stakingContractABI } from '@/lib/contracts/stakingContractABI'

export interface DirectReferral {
  address: string
  totalStaked: string // RWA amount (18 decimals)
  firstStakeTime: number
  stakeId: string
}

/**
 * Hook to get user's direct referrals from events
 */
export function useDirectReferrals() {
  const { address, chainId } = useAccount()
  const publicClient = usePublicClient()
  const [referrals, setReferrals] = useState<DirectReferral[]>([])
  const [loading, setLoading] = useState(true)
  const [count, setCount] = useState(0)
  const [backendMembers, setBackendMembers] = useState<Array<{ address: string; timestamp: number }>>([])

  function mapBackendMembersToReferrals(members: Array<{ address: string; timestamp: number }>): DirectReferral[] {
    return members.map((m) => ({
      address: m.address,
      totalStaked: '0',
      firstStakeTime: Number(m.timestamp || 0),
      stakeId: '0',
    }))
  }

  // 始终优先用后端人数兜底，避免链上日志波动导致卡片显示 0
  useEffect(() => {
    let cancelled = false
    async function fetchBackendCount() {
      if (!address) {
        setCount(0)
        return
      }
      try {
        const normalizedAddress = address.toLowerCase()
        const res = await fetch(`/api/data/${normalizedAddress}/team`)
        const json = await res.json()
        const directReferrals = Number(json?.data?.directReferrals || 0)
        if (!cancelled && Number.isFinite(directReferrals) && directReferrals >= 0) {
          setCount(directReferrals)
        }
      } catch {
        // ignore
      }
    }
    void fetchBackendCount()
    return () => {
      cancelled = true
    }
  }, [address])

  // 从后端拿直推成员列表，作为链上日志列表的兜底，避免“上方有直推数、下方空列表”。
  useEffect(() => {
    let cancelled = false
    async function fetchBackendMembers() {
      if (!address) {
        setBackendMembers([])
        return
      }
      try {
        const res = await fetch(`/api/team/${address.toLowerCase()}`)
        const json = await res.json()
        const membersRaw = Array.isArray(json?.data?.members) ? json.data.members : []
        const members = membersRaw
          .map((row: any) => ({
            address: String(row?.user_address || '').toLowerCase(),
            timestamp: Number(row?.timestamp || 0),
          }))
          .filter((row: { address: string; timestamp: number }) => row.address.startsWith('0x') && row.address.length === 42)
        if (!cancelled) {
          setBackendMembers(members)
          // 当链上还没拿到列表时，用后端成员先填充，保证页面口径一致
          setReferrals((prev) => (prev.length > 0 ? prev : mapBackendMembersToReferrals(members)))
        }
      } catch {
        if (!cancelled) {
          setBackendMembers([])
        }
      }
    }
    void fetchBackendMembers()
    return () => {
      cancelled = true
    }
  }, [address])

  useEffect(() => {
    async function fetchReferrals() {
      if (!address) {
        setLoading(false)
        setReferrals([])
        setCount(0)
        return
      }

      if (!chainId || !publicClient) {
        setLoading(false)
        setReferrals(mapBackendMembersToReferrals(backendMembers))
        return
      }

      try {
        const stakingAddress = CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES]?.stakingContract
        if (!stakingAddress) {
          setLoading(false)
          // 若用户连接了不支持的网络，链上无法查询，但后端统计/成员仍可用；避免“上方有直推数、下方空列表”
          setReferrals(mapBackendMembersToReferrals(backendMembers))
          return
        }

        // Get current block
        const currentBlock = await publicClient.getBlockNumber()
        const fromBlock = currentBlock > 10000n ? currentBlock - 10000n : 0n

        // Query StakeEvent - 查询所有推荐人是当前用户的事件
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
            referrer: address, // 查询推荐人是当前用户的事件
          },
          fromBlock,
          toBlock: 'latest',
        })

        // 如果查询结果为空，尝试从更早的区块查询
        if (logs.length === 0 && fromBlock > 0n) {
          const allLogs = await publicClient.getLogs({
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
              referrer: address,
            },
            fromBlock: currentBlock > 10000n ? currentBlock - 10000n : 0n,
            toBlock: 'latest',
          })
          if (allLogs.length > 0) {
            logs.push(...allLogs)
          }
        }

        console.log(`🔍 查询到 ${logs.length} 个直推事件 (从区块 ${fromBlock} 到最新)`)

        // Convert to DirectReferral array
        const referralList: DirectReferral[] = []
        const seenAddresses = new Set<string>() // 防止重复

        for (const log of logs) {
          try {
            // 使用 decodeEventLog 正确解析事件
            const decoded = decodeEventLog({
              abi: stakingContractABI.filter((item: any) => item.type === 'event' && item.name === 'StakeEvent'),
              data: log.data,
              topics: log.topics as [`0x${string}`, ...`0x${string}`[]] | [],
            })

            const args = decoded.args as any
            const referralAddress = args.user?.toLowerCase() || ''

            // 检查是否已存在（防止重复）
            if (!referralAddress || seenAddresses.has(referralAddress)) {
              continue
            }
            seenAddresses.add(referralAddress)

            // 获取被推荐人的质押信息
            try {
              const userStakeInfo = await publicClient.readContract({
                address: stakingAddress as `0x${string}`,
                abi: stakingContractABI,
                functionName: 'getUserStakeInfo',
                args: [referralAddress as `0x${string}`],
              })

              const timestamp = args.timestamp ? Number(args.timestamp) : Number((await publicClient.getBlock({ blockNumber: log.blockNumber })).timestamp)

              referralList.push({
                address: referralAddress,
                totalStaked: userStakeInfo[0]?.toString() || '0',
                firstStakeTime: timestamp,
                stakeId: args.stakeId?.toString() || '0',
              })

              console.log(`✅ 解析直推: 地址=${referralAddress}, 总质押=${userStakeInfo[0]?.toString() || '0'}`)
            } catch (error) {
              // 如果无法获取质押信息，仍然添加基本信息
              const timestamp = args.timestamp ? Number(args.timestamp) : Number((await publicClient.getBlock({ blockNumber: log.blockNumber })).timestamp)
              referralList.push({
                address: referralAddress,
                totalStaked: '0',
                firstStakeTime: timestamp,
                stakeId: args.stakeId?.toString() || '0',
              })
            }
          } catch (error) {
            console.error('解析直推事件失败:', error, log)
          }
        }

        // Sort by first stake time (oldest first)
        referralList.sort((a, b) => a.firstStakeTime - b.firstStakeTime)

        setReferrals(referralList.length > 0 ? referralList : mapBackendMembersToReferrals(backendMembers))
        // 链上结果仅做上限补充，不覆盖已拿到的后端人数
        setCount((prev) => Math.max(prev, referralList.length))
        console.log(`✅ 共找到 ${referralList.length} 个直推用户`)
      } catch (error: any) {
        // 部分 BSC 公共 RPC（例如 bsc-dataseed1.defibit.io）对 eth_getLogs 有「limit exceeded」限制，
        // 当超出范围时直接视为「暂无推荐」，避免在前端抛出红色报错影响用户体验。
        const msg = error?.message || String(error || '')
        if (msg.includes('LimitExceededRpcError') || msg.includes('limit exceeded')) {
          console.warn('Direct referrals log query hit RPC limit, treating as empty list.')
          // 这里不再把 count 置 0，保留后端已拿到的兜底值
        } else {
          console.error('Failed to fetch referrals:', error)
        }
        setReferrals(mapBackendMembersToReferrals(backendMembers))
        // 注意：这里不要直接 setCount(referrals.length)，因为 referrals 可能为空但后端 count 可用
      } finally {
        setLoading(false)
      }
    }

    fetchReferrals()
  }, [address, chainId, publicClient, backendMembers])

  return { referrals, loading, count }
}
