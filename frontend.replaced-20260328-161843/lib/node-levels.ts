/**
 * 节点等级系统配置
 * 基于金额考核，最高500万USDT
 * 使用科技感Unicode图标
 */

export interface NodeLevelConfig {
  level: number
  code: string // L1, L2, etc.
  name: string // 中文名称
  nameEn: string // 英文名称
  emoji: string // emoji表情图标
  color: string // 主色调
  glowColor: string // 发光颜色
  teamVolumeUSDT: number // 团队总质押要求（USDT）
  personalStakeUSDT: number // 个人质押要求（USDT）
  teamRetainedUSDT: number // 总留存要求：团队充值-团队提现（USDT等值，约团队量40%）
  rewardPercentage: number // 奖励百分比
  projectDividendEligible: boolean // 是否参与项目分红
  dividendWeight: number // 分红权重
  hasAnimation: boolean // 是否有旋转动画（L8-L9）
}

export const NODE_LEVELS: NodeLevelConfig[] = [
  {
    level: 1,
    code: 'L1',
    name: '量子',
    nameEn: 'Quantum',
    emoji: '⚡',
    color: '#64748b',
    glowColor: '#64748b40',
    teamVolumeUSDT: 0,
    personalStakeUSDT: 0,
    teamRetainedUSDT: 0,
    rewardPercentage: 3,
    projectDividendEligible: false,
    dividendWeight: 0,
    hasAnimation: false,
  },
  {
    level: 2,
    code: 'L2',
    name: '粒子',
    nameEn: 'Particle',
    emoji: '🔬',
    color: '#f59e0b',
    glowColor: '#f59e0b40',
    teamVolumeUSDT: 5000,
    personalStakeUSDT: 500,
    teamRetainedUSDT: 2000,
    rewardPercentage: 5,
    projectDividendEligible: true,
    dividendWeight: 0.05, // 5% 分红比例
    hasAnimation: false,
  },
  {
    level: 3,
    code: 'L3',
    name: '光子',
    nameEn: 'Photon',
    emoji: '✨',
    color: '#f59e0b',
    glowColor: '#f59e0b40',
    teamVolumeUSDT: 20000,
    personalStakeUSDT: 1000,
    teamRetainedUSDT: 8000,
    rewardPercentage: 8,
    projectDividendEligible: true,
    dividendWeight: 0.08, // 8% 分红比例
    hasAnimation: false,
  },
  {
    level: 4,
    code: 'L4',
    name: '星舰',
    nameEn: 'Starship',
    emoji: '🛸',
    color: '#f59e0b',
    glowColor: '#f59e0b60',
    teamVolumeUSDT: 50000,
    personalStakeUSDT: 3000,
    teamRetainedUSDT: 20000,
    rewardPercentage: 12,
    projectDividendEligible: true,
    dividendWeight: 0.12, // 12% 分红比例
    hasAnimation: false,
  },
  {
    level: 5,
    code: 'L5',
    name: '彗星',
    nameEn: 'Comet',
    emoji: '☄️',
    color: '#f59e0b',
    glowColor: '#f59e0b60',
    teamVolumeUSDT: 150000,
    personalStakeUSDT: 8000,
    teamRetainedUSDT: 60000,
    rewardPercentage: 17,
    projectDividendEligible: true,
    dividendWeight: 0.17, // 17% 分红比例
    hasAnimation: false,
  },
  {
    level: 6,
    code: 'L6',
    name: '行星',
    nameEn: 'Planet',
    emoji: '🪐',
    color: '#f59e0b',
    glowColor: '#f59e0b60',
    teamVolumeUSDT: 400000,
    personalStakeUSDT: 20000,
    teamRetainedUSDT: 160000,
    rewardPercentage: 23,
    projectDividendEligible: true,
    dividendWeight: 0.23, // 23% 分红比例
    hasAnimation: false,
  },
  {
    level: 7,
    code: 'L7',
    name: '恒星',
    nameEn: 'Star',
    emoji: '⭐',
    color: '#f59e0b',
    glowColor: '#f59e0b60',
    teamVolumeUSDT: 1000000,
    personalStakeUSDT: 50000,
    teamRetainedUSDT: 400000,
    rewardPercentage: 30,
    projectDividendEligible: true,
    dividendWeight: 0.30, // 30% 分红比例
    hasAnimation: false,
  },
  {
    level: 8,
    code: 'L8',
    name: '星云',
    nameEn: 'Nebula',
    emoji: '🌌',
    color: '#f59e0b',
    glowColor: '#f59e0b80',
    teamVolumeUSDT: 2500000,
    personalStakeUSDT: 100000,
    teamRetainedUSDT: 1000000,
    rewardPercentage: 35,
    projectDividendEligible: true,
    dividendWeight: 0.40, // 40% 分红比例
    hasAnimation: true, // 有旋转动画
  },
  {
    level: 9,
    code: 'L9',
    name: '超新星',
    nameEn: 'Supernova',
    emoji: '💫',
    color: '#f59e0b',
    glowColor: '#f59e0b80',
    teamVolumeUSDT: 5000000,
    personalStakeUSDT: 200000,
    teamRetainedUSDT: 2000000,
    rewardPercentage: 40,
    projectDividendEligible: true,
    dividendWeight: 0.50, // 50% 分红比例（最高）
    hasAnimation: true, // 有旋转动画
  },
]

/**
 * 根据等级获取配置
 */
export function getNodeLevelConfig(level: number): NodeLevelConfig | undefined {
  return NODE_LEVELS.find((l) => l.level === level)
}

/**
 * 获取当前等级的下一个等级配置
 */
export function getNextLevelConfig(currentLevel: number): NodeLevelConfig | undefined {
  const nextLevel = currentLevel + 1
  return getNodeLevelConfig(nextLevel)
}

/**
 * 格式化团队量要求（仅显示USDT）
 */
export function formatTeamVolumeRequirement(usdtAmount: number): string {
  if (usdtAmount === 0) {
    return '无要求'
  }
  if (usdtAmount >= 1000000) {
    return `${(usdtAmount / 1000000).toFixed(1)}M USDT`
  }
  if (usdtAmount >= 1000) {
    return `${(usdtAmount / 1000).toFixed(0)}K USDT`
  }
  return `${usdtAmount.toLocaleString()} USDT`
}

/**
 * 格式化总留存要求（仅显示USDT）
 */
export function formatTeamRetainedRequirement(usdtAmount: number): string {
  return formatTeamVolumeRequirement(usdtAmount)
}
