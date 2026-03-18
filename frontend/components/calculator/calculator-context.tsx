'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { NODE_LEVELS } from '@/lib/node-levels';

// 使用与全站一致的节点等级编码（L1-L9）
export type NodeLevel = (typeof NODE_LEVELS)[number]['code'];
export type ChartMode = 'linear' | 'compound';
export type LockPeriod = 'flexible' | '30' | '90' | '180' | '365';

interface CalculatorState {
  amount: number;
  days: number;
  lockPeriod: LockPeriod;
  nodeLevel: NodeLevel;
  referralEnabled: boolean;
  directRefs: number;
  avgStake: number;
  /** 团队留存率（0-100），用于模拟“团队总留存” */
  teamRetentionRate: number;
  chartMode: ChartMode;
  reinvestEnabled: boolean;
  reinvestCount: number;
  comparisons: {
    bank: boolean;
    stable: boolean;
    eth: boolean;
  };
}

interface DifferentialExampleRow {
  role: 'directRef' | 'you' | 'higherUpline';
  levelCode: NodeLevel;
  levelName: string;
  rewardPercentage: number;      // 等级对应的最大百分比（如 12%）
  differentialPercentage: number; // 级差部分（如实际拿到的 5%）
  amount: number;                // 对应的 USDT 奖励金额
}

interface CalculatorResults {
  staticYield: number;
  referralIncome: number;
  referralEligible: boolean;
  reinvestBonus: number;
  totalReturn: number;
  totalValue: number;
  stRWAValue: number;
  investmentShares: number;
  estimatedDividend: number;
  teamTotalStake: number;
  teamRetained: number;
  teamRetainedRate: number;
  roi: number;
  dailyYield: number;
  weeklyYield: number;
  monthlyYield: number;
  breakEvenDays: number; // Days to break even (recover principal)
  breakEvenDate: Date | null; // Estimated break-even date
  // 高级：级差 / 压级模拟
  differentialBestCase: DifferentialExampleRow[] | null;
  differentialCompressedCase: DifferentialExampleRow[] | null;
}

interface CalculatorContextType {
  state: CalculatorState;
  results: CalculatorResults;
  updateAmount: (amount: number) => void;
  updateDays: (days: number) => void;
  updateNodeLevel: (level: NodeLevel) => void;
  toggleReferral: () => void;
  updateDirectRefs: (refs: number) => void;
  updateAvgStake: (stake: number) => void;
  updateTeamRetentionRate: (rate: number) => void;
  updateChartMode: (mode: ChartMode) => void;
  updateLockPeriod: (period: LockPeriod) => void;
  toggleReinvest: () => void;
  updateReinvestCount: (count: number) => void;
  toggleComparison: (type: 'bank' | 'stable' | 'eth') => void;
}

const CalculatorContext = createContext<CalculatorContextType | undefined>(undefined);

const DAILY_RATE = 0.008; // 0.8%

// 节点等级对应的级差奖励百分比（来自 NODE_LEVELS / 后端 NODE_REQUIREMENTS）
const NODE_RATES: Record<NodeLevel, number> = NODE_LEVELS.reduce(
  (acc, cfg) => {
    acc[cfg.code as NodeLevel] = cfg.rewardPercentage / 100;
    return acc;
  },
  {} as Record<NodeLevel, number>,
);

// 兼容旧链接中的 V1-V5 参数，映射到新等级编码
function normalizeNodeLevel(levelParam: string | null | undefined): NodeLevel | undefined {
  if (!levelParam) return undefined;
  const upper = levelParam.toUpperCase();
  // 旧枚举到新枚举的简单映射（按顺序对齐）
  const legacyMap: Record<string, NodeLevel> = {
    V1: 'L1',
    V2: 'L2',
    V3: 'L3',
    V4: 'L4',
    V5: 'L5',
  };
  if (legacyMap[upper]) return legacyMap[upper];
  // 如果本来就是 L1-L9，且在配置中存在，则直接使用
  const exists = NODE_LEVELS.some((cfg) => cfg.code.toUpperCase() === upper);
  if (exists) return upper as NodeLevel;
  return undefined;
}

// 内部组件：使用 useSearchParams
function CalculatorProviderInner({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [state, setState] = useState<CalculatorState>({
    amount: 1000,
    days: 30,
    lockPeriod: 'flexible',
    nodeLevel: NODE_LEVELS[0]?.code as NodeLevel, // 默认 L1
    referralEnabled: false,
    directRefs: 0,
    avgStake: 1000,
    teamRetentionRate: 70,
    chartMode: 'linear',
    reinvestEnabled: false,
    reinvestCount: 0,
    comparisons: {
      bank: false,
      stable: false,
      eth: false,
    },
  });

  // Initialize from URL params
  useEffect(() => {
    const amount = searchParams?.get('amount');
    const days = searchParams?.get('days');
    const levelParam = searchParams?.get('level');
    const normalizedLevel = normalizeNodeLevel(levelParam || undefined);
    
    if (amount || days || normalizedLevel) {
      setState(prev => ({
        ...prev,
        ...(amount && { amount: Number(amount) }),
        ...(days && { days: Number(days) }),
        ...(normalizedLevel && { nodeLevel: normalizedLevel }),
      }));
    }
  }, [searchParams]);

  // 锁仓期限收益倍数
  const getLockPeriodMultiplier = (period: LockPeriod): number => {
    switch (period) {
      case '30': return 1.3;   // +30%
      case '90': return 1.6;   // +60%
      case '180': return 2.0;  // +100%
      case '365': return 2.5;  // +150%
      case 'flexible':
      default: return 1.0;
    }
  };

  // 复投奖励率
  const getReinvestBonusRate = (count: number): number => {
    if (count < 1) return 0.05;  // 5%
    if (count < 3) return 0.10;  // 10%
    if (count < 5) return 0.15;  // 15%
    return 0.20;  // 20%
  };

  // Calculate results
  const results = useMemo<CalculatorResults>(() => {
    const { amount, days, lockPeriod, nodeLevel, referralEnabled, directRefs, avgStake, teamRetentionRate, chartMode, reinvestEnabled, reinvestCount } = state;
    
    // 锁仓期限倍数（作为最终收益的加成，而不是日收益率的倍数）
    const lockMultiplier = getLockPeriodMultiplier(lockPeriod);
    
    let staticYield: number;
    let totalValue: number;
    
    // 先计算基础收益（不应用锁仓倍数）
    if (chartMode === 'linear') {
      const dailyYield = amount * DAILY_RATE;
      const baseYield = dailyYield * days;
      // 锁仓倍数应用到最终收益
      staticYield = baseYield * lockMultiplier;
      totalValue = amount + staticYield;
    } else {
      // Compound mode
      const baseTotalValue = amount * Math.pow(1 + DAILY_RATE, days);
      const baseYield = baseTotalValue - amount;
      // 锁仓倍数应用到最终收益
      staticYield = baseYield * lockMultiplier;
      totalValue = amount + staticYield;
    }
    
    // 推荐收益（基于节点等级的级差奖励百分比）
    // 规则（与你之前口径一致的最小版）：
    // - 仅当“下级锁仓≥30天”才会产生推荐奖励
    // - 这里用当前选择的 lockPeriod 近似模拟“下级锁仓期”（用户更直观）
    const referralEligible = lockPeriod !== 'flexible' && Number(lockPeriod) >= 30;
    let referralIncome = 0;
    if (referralEnabled && directRefs > 0 && referralEligible) {
      const referralRate = NODE_RATES[nodeLevel];
      // 这里采用简化模型：假设所有直推用户都低于当前等级，
      // 每个直推按其平均质押金额 * 本等级最大奖励比例 计算一次性推荐奖励
      referralIncome = directRefs * avgStake * referralRate;
    }

    // 团队留存（依据“团队总质押 - 团队总提现”的定义做模拟）
    const teamTotalStake = referralEnabled ? Math.max(0, directRefs) * Math.max(0, avgStake) : 0
    const rr = Math.min(100, Math.max(0, Number(teamRetentionRate) || 0))
    const teamRetained = teamTotalStake * (rr / 100)
    
    // 复投奖励
    let reinvestBonus = 0;
    if (reinvestEnabled && reinvestCount > 0) {
      const bonusRate = getReinvestBonusRate(reinvestCount);
      reinvestBonus = staticYield * bonusRate;
    }
    
    // stRWA资产凭证（50%的质押金额）
    const stRWAValue = amount * 0.5;
    
    // 投资份额（50%的质押金额）
    const investmentShares = amount * 0.5;
    
    // 预计分红（假设4%年化）
    const estimatedDividend = investmentShares * 0.04 * (days / 365);
    
    const totalReturn = staticYield + referralIncome + reinvestBonus;
    const roi = (totalReturn / amount) * 100;
    
    // 日/周/月收益计算（应用锁仓倍数）
    const baseDailyYield = amount * DAILY_RATE;
    const dailyYield = baseDailyYield * lockMultiplier;
    const weeklyYield = dailyYield * 7;
    const monthlyYield = dailyYield * 30;
    
    // ===== 高级部分：级差 / 压级奖励模拟 =====
    let differentialBestCase: DifferentialExampleRow[] | null = null;
    let differentialCompressedCase: DifferentialExampleRow[] | null = null;

    const meConfig = NODE_LEVELS.find((cfg) => cfg.code === nodeLevel);
    const stakeBasis = avgStake > 0 ? avgStake : amount;

    if (referralEnabled && stakeBasis > 0 && meConfig) {
      const mePct = meConfig.rewardPercentage / 100; // 自己等级最大百分比
      const lowest = NODE_LEVELS[0];
      const lowPct = lowest.rewardPercentage / 100;

      // 最佳情况：下级是最低等级，你上面没有更高级别阻挡
      const bestDiffDirect = lowPct; // 直接下级拿自己全部百分比
      const bestDiffMe = Math.max(0, mePct - bestDiffDirect);

      differentialBestCase = [
        {
          role: 'directRef',
          levelCode: lowest.code as NodeLevel,
          levelName: lowest.nameEn,
          rewardPercentage: lowest.rewardPercentage,
          differentialPercentage: bestDiffDirect * 100,
          amount: stakeBasis * bestDiffDirect,
        },
        {
          role: 'you',
          levelCode: meConfig.code as NodeLevel,
          levelName: meConfig.nameEn,
          rewardPercentage: meConfig.rewardPercentage,
          differentialPercentage: bestDiffMe * 100,
          amount: stakeBasis * bestDiffMe,
        },
      ];

      // 压级情况：你上面存在一个更高等级的上级（取第一个奖励比例大于你的等级）
      const higher = NODE_LEVELS.find((cfg) => cfg.rewardPercentage > meConfig.rewardPercentage);
      if (higher) {
        const highPct = higher.rewardPercentage / 100;
        const compressedDiffDirect = lowPct;
        const compressedDiffHigher = Math.max(0, highPct - compressedDiffDirect);
        const compressedDiffMe = Math.max(0, mePct - Math.max(compressedDiffDirect, compressedDiffHigher)); // 理论上为 0

        differentialCompressedCase = [
          {
            role: 'directRef',
            levelCode: lowest.code as NodeLevel,
            levelName: lowest.nameEn,
            rewardPercentage: lowest.rewardPercentage,
            differentialPercentage: compressedDiffDirect * 100,
            amount: stakeBasis * compressedDiffDirect,
          },
          {
            role: 'higherUpline',
            levelCode: higher.code as NodeLevel,
            levelName: higher.nameEn,
            rewardPercentage: higher.rewardPercentage,
            differentialPercentage: compressedDiffHigher * 100,
            amount: stakeBasis * compressedDiffHigher,
          },
          {
            role: 'you',
            levelCode: meConfig.code as NodeLevel,
            levelName: meConfig.nameEn,
            rewardPercentage: meConfig.rewardPercentage,
            differentialPercentage: compressedDiffMe * 100,
            amount: stakeBasis * compressedDiffMe,
          },
        ];
      }
    }

    // 计算回本时间（考虑所有收益来源）
    // 每日总收益 = 静态收益 + 推荐收益/天数 + 复投奖励/天数
    const dailyReferralIncome = referralEnabled && directRefs > 0 
      ? (referralIncome / days) 
      : 0;
    const dailyReinvestBonus = reinvestEnabled && reinvestCount > 0
      ? (reinvestBonus / days)
      : 0;
    const totalDailyYield = dailyYield + dailyReferralIncome + dailyReinvestBonus;
    
    // 回本天数 = 本金 / 每日总收益
    const breakEvenDays = totalDailyYield > 0 
      ? Math.ceil(amount / totalDailyYield)
      : Infinity;
    
    // 回本日期（从今天开始计算）
    const breakEvenDate = totalDailyYield > 0 && breakEvenDays !== Infinity
      ? new Date(Date.now() + breakEvenDays * 24 * 60 * 60 * 1000)
      : null;
    
    return {
      staticYield,
      referralIncome,
      referralEligible,
      reinvestBonus,
      totalReturn,
      totalValue: totalValue + referralIncome + reinvestBonus,
      stRWAValue,
      investmentShares,
      estimatedDividend,
      teamTotalStake,
      teamRetained,
      teamRetainedRate: teamTotalStake > 0 ? (teamRetained / teamTotalStake) * 100 : 0,
      roi,
      dailyYield,
      weeklyYield,
      monthlyYield,
      breakEvenDays,
      breakEvenDate,
      differentialBestCase,
      differentialCompressedCase,
    };
  }, [state]);

  const updateAmount = (amount: number) => {
    setState(prev => ({ ...prev, amount }));
  };

  const updateDays = (days: number) => {
    setState(prev => ({ ...prev, days }));
  };

  const updateNodeLevel = (nodeLevel: NodeLevel) => {
    setState(prev => ({ ...prev, nodeLevel }));
  };

  const toggleReferral = () => {
    setState(prev => ({ ...prev, referralEnabled: !prev.referralEnabled }));
  };

  const updateDirectRefs = (directRefs: number) => {
    setState(prev => ({ ...prev, directRefs }));
  };

  const updateAvgStake = (avgStake: number) => {
    setState(prev => ({ ...prev, avgStake }));
  };

  const updateTeamRetentionRate = (rate: number) => {
    const v = Number.isFinite(rate) ? rate : 0
    setState(prev => ({ ...prev, teamRetentionRate: Math.min(100, Math.max(0, v)) }));
  };

  const updateChartMode = (chartMode: ChartMode) => {
    setState(prev => ({ ...prev, chartMode }));
  };

  const updateLockPeriod = (lockPeriod: LockPeriod) => {
    setState(prev => ({ ...prev, lockPeriod }));
  };

  const toggleReinvest = () => {
    setState(prev => ({ ...prev, reinvestEnabled: !prev.reinvestEnabled }));
  };

  const updateReinvestCount = (reinvestCount: number) => {
    setState(prev => ({ ...prev, reinvestCount }));
  };

  const toggleComparison = (type: 'bank' | 'stable' | 'eth') => {
    setState(prev => ({
      ...prev,
      comparisons: {
        ...prev.comparisons,
        [type]: !prev.comparisons[type],
      },
    }));
  };

  return (
    <CalculatorContext.Provider
      value={{
        state,
        results,
        updateAmount,
        updateDays,
        updateNodeLevel,
        toggleReferral,
        updateDirectRefs,
        updateAvgStake,
        updateTeamRetentionRate,
        updateChartMode,
        updateLockPeriod,
        toggleReinvest,
        updateReinvestCount,
        toggleComparison,
      }}
    >
      {children}
    </CalculatorContext.Provider>
  );
}

// 外部 Provider：用 Suspense 包裹
export function CalculatorProvider({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-void-black" />}>
      <CalculatorProviderInner>{children}</CalculatorProviderInner>
    </Suspense>
  );
}

export function useCalculator() {
  const context = useContext(CalculatorContext);
  if (!context) {
    throw new Error('useCalculator must be used within CalculatorProvider');
  }
  return context;
}
