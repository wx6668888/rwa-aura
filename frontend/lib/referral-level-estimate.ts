import { NODE_LEVELS } from '@/lib/node-levels'

/**
 * 用「个人质押 USDT 等值」对照各档 personalStakeUSDT，得到用于展示的估算等级。
 * 链上节点等级还受团队量、留存等约束，此处仅作列表/头像旁参考。
 */
export function estimateLevelFromPersonalStakeUSDT(stakeUSDT: number): number {
  if (!Number.isFinite(stakeUSDT) || stakeUSDT < 0) return 1
  let level = 1
  for (const cfg of NODE_LEVELS) {
    if (stakeUSDT >= (cfg.personalStakeUSDT ?? 0)) {
      level = cfg.level
    }
  }
  return level
}
