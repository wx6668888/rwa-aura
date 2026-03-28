import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { formatUnits } from 'viem'

interface TeamData {
  nodeLevel: number
  cumulativePersonalStake: string // 个人累计质押（USDT 等值，18位）
  teamVolume: string // 团队下级总质押（不包括个人，USDT 等值，18位）
  teamTotalDeposited: string // 团队总充值（18位）
  teamTotalWithdrawn: string // 团队总提现（18位）
  teamRetained: string // 总留存 = 充值 - 提现（18位）
  loading: boolean
  error: string | null
}

/**
 * 从后端 API 获取团队数据
 * 用于节点等级考核和仪表板显示
 */
export function useTeamData(): TeamData {
  const { address, chainId } = useAccount()
  const [data, setData] = useState<TeamData>({
    nodeLevel: 1,
    cumulativePersonalStake: '0',
    teamVolume: '0',
    teamTotalDeposited: '0',
    teamTotalWithdrawn: '0',
    teamRetained: '0',
    loading: false,
    error: null,
  })

  useEffect(() => {
    if (!address) {
      setData({
        nodeLevel: 1,
        cumulativePersonalStake: '0',
        teamVolume: '0',
        teamTotalDeposited: '0',
        teamTotalWithdrawn: '0',
        teamRetained: '0',
        loading: false,
        error: null,
      })
      return
    }

    const fetchTeamData = async () => {
      setData(prev => ({ ...prev, loading: true, error: null }))

      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
        // 传递 chainId 参数，让后端知道从哪条链查询
        const url = chainId 
          ? `${apiUrl}/api/user/${address}/level-info?chainId=${chainId}`
          : `${apiUrl}/api/user/${address}/level-info`
        
        const response = await fetch(url)
        const result = await response.json()

        if (result.success && result.data) {
          setData({
            nodeLevel: result.data.nodeLevel || 1,
            cumulativePersonalStake: formatUnits(BigInt(result.data.cumulativePersonalStake || '0'), 18),
            teamVolume: formatUnits(BigInt(result.data.teamVolume || '0'), 18),
            teamTotalDeposited: formatUnits(BigInt(result.data.teamTotalDeposited || '0'), 18),
            teamTotalWithdrawn: formatUnits(BigInt(result.data.teamTotalWithdrawn || '0'), 18),
            teamRetained: formatUnits(BigInt(result.data.teamRetained || '0'), 18),
            loading: false,
            error: null,
          })
        } else {
          setData(prev => ({
            ...prev,
            loading: false,
            error: result.error || 'Failed to fetch team data',
          }))
        }
      } catch (error) {
        console.error('Error fetching team data:', error)
        setData(prev => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }))
      }
    }

    fetchTeamData()

    // 每 30 秒刷新一次团队数据
    const interval = setInterval(fetchTeamData, 30000)

    return () => clearInterval(interval)
  }, [address, chainId])

  return data
}
