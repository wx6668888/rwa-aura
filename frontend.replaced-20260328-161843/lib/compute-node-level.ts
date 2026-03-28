import { NODE_LEVELS } from '@/lib/node-levels'

/** 与节点状态卡片一致的链上考核逻辑：个人质押 + 团队量 + 团队留存 */
export function computeNodeLevel(params: {
  personalStakeUSDT: number
  teamVolumeUSDT: number
  teamRetainedUSDT: number
}): number {
  const { personalStakeUSDT, teamVolumeUSDT, teamRetainedUSDT } = params
  for (let i = NODE_LEVELS.length - 1; i >= 0; i--) {
    const level = NODE_LEVELS[i]
    const meetsPersonal = personalStakeUSDT >= (level.personalStakeUSDT || 0)
    const meetsTeam = teamVolumeUSDT >= level.teamVolumeUSDT
    const meetsRetained = teamRetainedUSDT >= (level.teamRetainedUSDT || 0)
    if (meetsPersonal && meetsTeam && meetsRetained) {
      return level.level
    }
  }
  return 1
}
