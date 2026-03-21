'use client'

import { useMemo } from 'react'
import { useTeamStats } from './useTeamStats'
import { getNodeLevelConfig } from '@/lib/node-levels'

/**
 * 实时模拟计算预估分红
 * 
 * 计算公式：
 * 预估分红 = 团队总留存 × 分红比例
 * 团队总留存 = 团队总充值 - 团队总提现（包含所有提现）
 * 如果 < 0，则计为 0
 */
export function useEstimatedDividend(userLevel: number) {
  const teamStats = useTeamStats()
  
  const estimatedDividend = useMemo(() => {
    // 获取用户等级配置
    const config = getNodeLevelConfig(userLevel)
    if (!config || !config.projectDividendEligible) {
      return 0
    }
    
    // 计算团队总留存
    const teamRetained = teamStats.teamRetained // 已经在 useTeamStats 中处理了 Math.max(0, ...)
    
    // 获取分红比例
    const dividendRate = config.dividendWeight
    
    // 计算预估分红
    const dividend = teamRetained * dividendRate
    
    return dividend
  }, [userLevel, teamStats.teamRetained])
  
  return {
    estimatedDividend,
    teamRetained: teamStats.teamRetained,
    loading: teamStats.loading,
  }
}
