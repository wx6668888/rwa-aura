import { useAccount, usePublicClient } from 'wagmi'
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

  useEffect(() => {
    async function fetchReferrals() {
      if (!address || !chainId || !publicClient) {
        setLoading(false)
        setReferrals([])
        return
      }

      try {
        const stakingAddress = CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES]?.stakingContract
        if (!stakingAddress) {
          setLoading(false)
          setReferrals([])
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
            fromBlock: 0n,
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
            const decoded = await publicClient.decodeEventLog({
              abi: stakingContractABI.filter((item: any) => item.type === 'event' && item.name === 'StakeEvent'),
              data: log.data,
              topics: log.topics,
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

        setReferrals(referralList)
        console.log(`✅ 共找到 ${referralList.length} 个直推用户`)
      } catch (error) {
        console.error('Failed to fetch referrals:', error)
        setReferrals([])
      } finally {
        setLoading(false)
      }
    }

    fetchReferrals()
  }, [address, chainId, publicClient])

  return { referrals, loading, count: referrals.length }
}
