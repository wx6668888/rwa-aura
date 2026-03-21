import { useAccount, usePublicClient } from 'wagmi'
import { useCallback, useEffect, useState } from 'react'
import { decodeEventLog, parseAbiItem } from 'viem'
import { CONTRACT_ADDRESSES } from '@/lib/contracts/addresses'
import { stakingContractABI } from '@/lib/contracts/stakingContractABI'

// Prefer backend API base (same as other dashboard cards)
const API_BASE =
  typeof window !== 'undefined'
    ? ''
    : (process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_RELAYER_URL || 'http://localhost:3001')

export interface UserStake {
  stakeId: string
  amount: string // raw amount (both StakeEvent / RWAStakeEvent are handled as 18-decimal in this contract)
  timestamp: number
  lockPeriod?: 'flexible' | '30' | '90' | '180' | '365'
  isRWAStake?: boolean
  tokenDecimals?: number
}

function mapLockPeriod(lockPeriodNum: number): UserStake['lockPeriod'] {
  if (lockPeriodNum === 30) return '30'
  if (lockPeriodNum === 90) return '90'
  if (lockPeriodNum === 180) return '180'
  if (lockPeriodNum === 365) return '365'
  return 'flexible'
}

export function useUserStakes() {
  const { address, chainId } = useAccount()
  const publicClient = usePublicClient()
  const [stakes, setStakes] = useState<UserStake[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const refetch = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1)
  }, [])

  useEffect(() => {
    async function fetchStakes() {
      if (!address || !chainId || !publicClient) {
        setStakes([])
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        const normalizedUser = address.toLowerCase()
        console.log('🔍 [useUserStakes] 开始查询质押，用户:', normalizedUser)
        
        // 1. 先从后端获取（需要后端 EventMonitor 已把链上事件同步到 DB）
        let backendStakes: UserStake[] = []
        try {
          const apiUrl = `${API_BASE}/api/stakes/${address}?chainId=${chainId}`
          console.log('📡 [useUserStakes] 从后端获取:', apiUrl)
          const res = await fetch(apiUrl)
          if (res.ok) {
            const json = await res.json()
            const rows = Array.isArray(json?.data) ? json.data : (Array.isArray(json?.data?.stakes) ? json.data.stakes : [])
            if (Array.isArray(rows) && rows.length > 0) {
              backendStakes = rows.map((s: any) => ({
                stakeId: String(s.stakeId || s.id || `${s.event_type || 'stake'}_${s.timestamp || 0}`),
                amount: String(s.amount ?? '0'),
                timestamp: Number(s.timestamp || s.created_at || 0),
                lockPeriod: mapLockPeriod(Number(s.lockPeriod || s.lock_period || 0)),
                isRWAStake: String(s.assetType || s.asset_type || s.event_type || '').toUpperCase().includes('RWA'),
                tokenDecimals: 18,
              }))
              console.log('✅ [useUserStakes] 后端返回', backendStakes.length, '条记录')
            }
          }
        } catch (err) {
          console.warn('⚠️ [useUserStakes] 后端获取失败，回退到链上查询:', err)
        }

        // 2. 如果后端有数据，直接使用
        if (backendStakes.length > 0) {
          setStakes(backendStakes)
          setLoading(false)
          return
        }

        // 3. 后端无数据，从链上查询（保留原逻辑）
        console.log('📡 [useUserStakes] 后端无数据，从链上查询')
        const stakingAddress = CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES]?.stakingContract
        if (!stakingAddress) {
          setStakes([])
          setLoading(false)
          return
        }

        console.log('🔍 [useUserStakes] 开始查询质押事件，用户地址:', normalizedUser)
        console.log('🔍 [useUserStakes] StakingContract 地址:', stakingAddress)
        
        // 获取当前区块号
        const currentBlock = await publicClient.getBlockNumber()
        // 只查询最近 100,000 个区块，但必须按 RPC 限制的最大区间分片查询；
        // 否则会直接报错：exceed maximum block range: 50000
        const fromBlock = currentBlock > 100000n ? currentBlock - 100000n : 0n

        const userArg = address as `0x${string}`

        const stakeEvent = parseAbiItem(
          'event StakeEvent(address indexed user, uint256 amount, address indexed referrer, uint256 indexed stakeId, uint256 timestamp, uint256 lockPeriod)'
        )
        const rwaStakeEvent = parseAbiItem(
          'event RWAStakeEvent(address indexed user, uint256 amount, address indexed referrer, uint256 indexed stakeId, uint256 timestamp, uint256 lockPeriod)'
        )

        const CHUNK = 45000n // RPC 最大区间是 50000；留安全余量
        const rawLogs: {
          data: `0x${string}`
          topics: (`0x${string}` | `0x${string}`[])[] 
          blockNumber: bigint
          logIndex?: bigint
          transactionHash?: `0x${string}`
        }[] = []

        for (let start = fromBlock; start <= currentBlock; start += CHUNK) {
          const end = start + CHUNK - 1n > currentBlock ? currentBlock : start + CHUNK - 1n
          try {
            const [usdtChunkLogs, rwaChunkLogs] = await Promise.all([
              publicClient.getLogs({
                address: stakingAddress as `0x${string}`,
                event: stakeEvent,
                args: { user: userArg },
                fromBlock: start,
                toBlock: end,
              }),
              publicClient.getLogs({
                address: stakingAddress as `0x${string}`,
                event: rwaStakeEvent,
                args: { user: userArg },
                fromBlock: start,
                toBlock: end,
              }),
            ])

            rawLogs.push(...usdtChunkLogs, ...rwaChunkLogs)
          } catch (err: any) {
            const msg = err?.message || String(err)

            // 一旦触发 “history pruned”，更早的区块大概率也会失败，所以直接停止循环
            if (msg.includes('History has been pruned')) {
              console.warn('[useUserStakes] RPC history pruned，停止更早区块查询:', { start: start.toString(), end: end.toString() })
              break
            }

            console.warn('[useUserStakes] 查询日志失败（跳过当前区块分片）:', msg)
          }
        }

        console.log('🔍 [useUserStakes] 获取到原始日志数量:', rawLogs.length)

        const parsed: UserStake[] = []
        // 使用更严格的去重：stakeId + timestamp + amount 的组合
        const seen = new Set<string>()

        for (const log of rawLogs) {
              try {
            const decoded = decodeEventLog({
                  abi: stakingContractABI,
                  data: log.data,
                  topics: log.topics,
            }) as any

            if (decoded.eventName !== 'StakeEvent' && decoded.eventName !== 'RWAStakeEvent') {
              continue
            }

                  const args = decoded.args as any
            const user = args?.user?.toLowerCase?.()
            if (!user || user !== normalizedUser) {
              continue
            }
            
            const isRWAStake = decoded.eventName === 'RWAStakeEvent'
            const baseStakeId = args?.stakeId?.toString?.() ?? '0'
            const amount = args?.amount?.toString?.() ?? '0'
            const timestamp = Number(args?.timestamp ?? 0)
            
            // 使用交易哈希 + 日志索引创建唯一标识，确保每个事件都是唯一的
            // 即使 stakeId、timestamp、amount 都相同，交易哈希和日志索引也一定不同
            const txHash = log.transactionHash || ''
            const logIndex = log.logIndex?.toString() || '0'
            const uniqueKey = `${txHash}_${logIndex}`
            
            if (seen.has(uniqueKey)) {
              console.log('⚠️ [useUserStakes] 跳过重复的质押记录:', {
                eventName: decoded.eventName,
                stakeId: baseStakeId,
                timestamp,
                amount,
                txHash,
                logIndex,
                uniqueKey
              })
              continue
            }
            seen.add(uniqueKey)

            const lockPeriodNum = Number(args?.lockPeriod ?? 0)
            // 为了在 UI 中区分，使用 stakeId + timestamp 作为显示用的 ID
            // 这样即使 stakeId 相同，timestamp 不同也能区分
            const displayStakeId = isRWAStake 
              ? `rwa_${baseStakeId}_${timestamp}` 
              : `${baseStakeId}_${timestamp}`

            console.log('✅ [useUserStakes] 解析到质押事件:', {
              eventName: decoded.eventName,
              displayStakeId,
              baseStakeId,
              isRWAStake,
              amount,
              timestamp: new Date(timestamp * 1000).toLocaleString(),
              lockPeriod: mapLockPeriod(lockPeriodNum),
              txHash,
              logIndex,
              uniqueKey
            })

            parsed.push({
              stakeId: displayStakeId,
                amount,
                timestamp,
              lockPeriod: mapLockPeriod(lockPeriodNum),
              isRWAStake,
              // This staking contract emits 18-decimal amounts for both stake event types.
              tokenDecimals: 18,
            })
          } catch (error) {
            // Skip unrelated or undecodable logs.
            console.log('⚠️ [useUserStakes] 跳过无法解析的日志:', error)
          }
        }

        console.log('📊 [useUserStakes] 最终解析到的质押记录数量:', parsed.length)
        console.log('📋 [useUserStakes] 质押记录详情:', parsed.map((s, idx) => ({
          序号: idx + 1,
          stakeId: s.stakeId,
          isRWAStake: s.isRWAStake,
          amount: s.amount,
          timestamp: new Date(s.timestamp * 1000).toLocaleString(),
          lockPeriod: s.lockPeriod
        })))

        parsed.sort((a, b) => a.timestamp - b.timestamp)
        setStakes(parsed)
      } catch (error) {
        console.error('Failed to fetch stakes:', error)
        setStakes([])
      } finally {
        setLoading(false)
      }
    }

    fetchStakes()
  }, [address, chainId, publicClient, refreshTrigger])

  return { stakes, loading, refetch }
}
