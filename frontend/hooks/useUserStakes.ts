import { useAccount, usePublicClient } from 'wagmi'
import { useCallback, useEffect, useState } from 'react'
import { decodeEventLog } from 'viem'
import { CONTRACT_ADDRESSES } from '@/lib/contracts/addresses'
import { stakingContractABI } from '@/lib/contracts/stakingContractABI'

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
        const stakingAddress = CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES]?.stakingContract
        if (!stakingAddress) {
          setStakes([])
          setLoading(false)
          return
        }

        const normalizedUser = address.toLowerCase()
        console.log('🔍 [useUserStakes] 开始查询质押事件，用户地址:', normalizedUser)
        console.log('🔍 [useUserStakes] StakingContract 地址:', stakingAddress)
        
        const rawLogs = await publicClient.getLogs({
              address: stakingAddress as `0x${string}`,
              fromBlock: 0n,
              toBlock: 'latest',
            })
            
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
