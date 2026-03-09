/**
 * 团队业绩分红服务 - 简化版
 * 提供：团队成员查询、分红计算、池状态、用户分红信息
 */

import { getPool, query } from '../config/database.config';
import { ethers } from 'ethers';
import logger from '../utils/logger';
import { computeUserDividend } from './DividendCalculator';
import { getCurrentMonth } from '../utils/time';
import { getRateConfig as getRateConfigForMonth } from './DynamicRateAdjuster';
import { formatUsdt, calculateDividendAmount } from '../utils/bigint';

const USDT_DECIMALS = 6;
const CAP = 100_000n * 10n ** BigInt(USDT_DECIMALS);

/** 标准比例表 L1-L9 */
export const STANDARD_RATES: Record<number, number> = {
  1: 0,
  2: 5,
  3: 8,
  4: 12,
  5: 17,
  6: 23,
  7: 30,
  8: 35,
  9: 50,
};

export interface RateConfig {
  rates: Record<number, number>;
  multiplier: number; // 1.0 | 0.9 | 0.8
  status: '标准' | '紧张-10%' | '不足-20%';
}

export interface DividendUserInfo {
  currentMonth?: {
    month: string;
    nodeLevel: number;
    actualRate: number;
    rateStatus: string;
    netGrowth: string;
    estimatedDividend: string;
  };
  account: {
    balance: string;
  };
  history: Array<{
    month: string;
    dividendAmount: string;
    status: string;
    recordedAt: string | null;
  }>;
}

export interface PoolStatus {
  availableBalance: string;
  healthRatio: number;
  healthStatus: string;
  nextMonthRate?: Record<string, number> & { status: string };
}

const TEAM_DIVIDEND_POOL_ABI = [
  'function dividendBalances(address) view returns (uint256)',
  'function getAvailableBalance() view returns (uint256)',
  'function settledUnwithdrawn() view returns (uint256)',
];

/** 获取 TeamDividendPool 合约实例 */
function getPoolContract(chainId?: number): ethers.Contract | null {
  const rpcUrl = process.env.RPC_URL || process.env.BSC_RPC_URL || 'http://127.0.0.1:8545';
  const addr = process.env.TEAM_DIVIDEND_POOL_ADDRESS;
  if (!addr || !rpcUrl) return null;
  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    return new ethers.Contract(addr, TEAM_DIVIDEND_POOL_ABI, provider);
  } catch (e) {
    logger.warn('DividendService: getPoolContract failed', e);
    return null;
  }
}

/** 从 DB 获取用户的所有团队成员（下级，不含自己） */
export async function getTeamMembers(userAddress: string): Promise<string[]> {
  const pool = getPool();
  const [rows] = await pool.query<{ user_address: string }[]>(
    `SELECT user_address FROM referral_relations WHERE ancestor_address = ?`,
    [userAddress.toLowerCase()]
  );
  return [...new Set(rows.map((r) => r.user_address))];
}

/** 获取用户链上分红余额 */
export async function getContractDividendBalance(userAddress: string): Promise<string> {
  const contract = getPoolContract();
  if (!contract) return '0';
  try {
    const bal = await contract.dividendBalances(userAddress);
    return ethers.formatUnits(bal, USDT_DECIMALS);
  } catch (e) {
    logger.warn('getContractDividendBalance failed', e);
    return '0';
  }
}

/** 获取池可用余额 */
export async function getContractAvailableBalance(): Promise<string> {
  const contract = getPoolContract();
  if (!contract) return '0';
  try {
    const bal = await contract.getAvailableBalance();
    return ethers.formatUnits(bal, USDT_DECIMALS);
  } catch (e) {
    logger.warn('getContractAvailableBalance failed', e);
    return '0';
  }
}

/** 计算分红金额（向下取整到2位小数，上限 100,000 USDT） */
export function calculateDividendAmount(netGrowth: bigint, ratePercent: number): bigint {
  if (ratePercent <= 0) return 0n;
  const raw = (netGrowth * BigInt(Math.round(ratePercent * 100))) / 10000n;
  const truncated = (raw / 10000n) * 10000n;
  return truncated > CAP ? CAP : truncated;
}

/** 确定比例配置（健康度） */
export function determineRateConfig(
  availableBalance: bigint,
  estimatedPayout: bigint
): RateConfig | null {
  if (estimatedPayout <= 0n) return { rates: { ...STANDARD_RATES }, multiplier: 1, status: '标准' };
  const ratio = Number((availableBalance * 10000n) / estimatedPayout) / 10000;
  if (ratio >= 1.5) {
    return { rates: { ...STANDARD_RATES }, multiplier: 1, status: '标准' };
  }
  if (ratio >= 1.2) {
    const rates: Record<number, number> = {};
    for (const [k, v] of Object.entries(STANDARD_RATES)) {
      rates[Number(k)] = Math.round(v * 0.9 * 100) / 100;
    }
    return { rates, multiplier: 0.9, status: '紧张-10%' };
  }
  if (ratio >= 1.0) {
    const rates: Record<number, number> = {};
    for (const [k, v] of Object.entries(STANDARD_RATES)) {
      rates[Number(k)] = Math.round(v * 0.8 * 100) / 100;
    }
    return { rates, multiplier: 0.8, status: '不足-20%' };
  }
  return null;
}

/** 获取用户分红信息（API 用） */
export async function getUserDividendInfo(
  address: string,
  chainId?: number
): Promise<DividendUserInfo> {
  const lower = address.toLowerCase();
  const balance = await getContractDividendBalance(address);
  const pool = getPool();

  // 历史已结算/待结算记录
  let historyRows: any[] = [];
  try {
    const [rows] = await pool.query<any[]>(
      `SELECT month, dividend_amount, status, recorded_at 
       FROM team_dividends 
       WHERE user_address = ? AND status IN ('RECORDED','PENDING')
       ORDER BY month DESC LIMIT 12`,
      [lower]
    );
    historyRows = rows || [];
  } catch (e) {
    logger.warn('DividendService: team_dividends table may not exist', e);
  }

  const history = historyRows.map((r) => ({
    month: r.month,
    dividendAmount: String(r.dividend_amount ?? 0),
    status: r.status,
    recordedAt: r.recorded_at ? new Date(r.recorded_at).toISOString() : null,
  }));

  // 当前月预估：使用 DividendCalculator + 动态比例
  let currentMonth: DividendUserInfo['currentMonth'] | undefined;
  try {
    const [userRows] = await pool.query<any[]>(
      'SELECT node_level FROM users WHERE address = ?',
      [lower]
    );
    const nodeLevel = userRows[0]?.node_level ?? 1;
    if (nodeLevel >= 2) {
      const month = getCurrentMonth();
      // 优先使用该月已确定的比例配置，否则退回标准比例
      const cfgFromHistory = await getRateConfigForMonth(month);
      const rateConfig: Record<string, number> = cfgFromHistory
        ? cfgFromHistory
        : Object.fromEntries(
            Object.entries(STANDARD_RATES).map(([k, v]) => [`L${k}`, v])
          );

      const data = await computeUserDividend(lower, month, rateConfig, nodeLevel);

      // 若当月净增业绩为 0，但用户有历史总留存，则用总留存做一次“冷启动”预估
      let netGrowth = data.netGrowth;
      let dividendAmount = data.dividendAmount;
      if (netGrowth === 0n) {
        const [aggRows] = await pool.query<any[]>(
          `SELECT GREATEST(0, COALESCE(team_total_deposited, 0) - COALESCE(team_total_withdrawn, 0)) AS team_retained
           FROM users WHERE address = ?`,
          [lower]
        );
        const retainedRaw = aggRows?.[0]?.team_retained?.toString() ?? '0';
        const retained18 = BigInt(retainedRaw);
        const retained6 = retained18 / 10n ** 12n; // 18 位 → 6 位
        if (retained6 > 0n) {
          netGrowth = retained6;
          dividendAmount = calculateDividendAmount(netGrowth, data.actualRate);
        }
      }

      currentMonth = {
        month,
        nodeLevel,
        actualRate: data.actualRate,
        rateStatus: data.rateStatus,
        netGrowth: formatUsdt(netGrowth),
        estimatedDividend: formatUsdt(dividendAmount),
      };
    }
  } catch (e) {
    logger.warn('DividendService: failed to compute current month estimate', e);
  }

  return {
    currentMonth,
    account: { balance },
    history,
  };
}

/** 获取分红池状态 */
export async function getPoolStatus(): Promise<PoolStatus & {
  totalBalance?: string;
  settledUnwithdrawn?: string;
  reservedGas?: string;
  nextMonthRate?: Record<string, number> & { status: string };
}> {
  const contract = getPoolContract();
  let availableStr = '0';
  let totalBalance = '0';
  let settledUnwithdrawn = '0';
  let reservedGas = '0';

  if (contract) {
    try {
      const status = await contract.getPoolStatus();
      if (status && status.length >= 4) {
        totalBalance = ethers.formatUnits(status[0], USDT_DECIMALS);
        settledUnwithdrawn = ethers.formatUnits(status[1], USDT_DECIMALS);
        reservedGas = ethers.formatUnits(status[2], USDT_DECIMALS);
        availableStr = ethers.formatUnits(status[3], USDT_DECIMALS);
      }
    } catch (e) {
      availableStr = await getContractAvailableBalance();
    }
  } else {
    availableStr = await getContractAvailableBalance();
  }

  const available = BigInt(Math.round(parseFloat(availableStr || '0') * 10 ** USDT_DECIMALS));
  const estimatedStr = process.env.DIVIDEND_ESTIMATED_PAYOUT || '100000';
  const estimated = BigInt(Math.round(parseFloat(estimatedStr) * 10 ** USDT_DECIMALS));
  const ratio = estimated > 0n ? Number((available * 10000n) / estimated) / 10000 : 0;
  let healthStatus = '严重不足';
  if (ratio >= 1.5) healthStatus = '充足';
  else if (ratio >= 1.2) healthStatus = '紧张';
  else if (ratio >= 1.0) healthStatus = '不足';

  const config = determineRateConfig(available, estimated);
  const nextMonthRate: PoolStatus['nextMonthRate'] = config
    ? {
        ...Object.fromEntries(
          Object.entries(config.rates).map(([k, v]) => [`L${k}`, v])
        ),
        status: config.status,
      }
    : undefined;

  const result: PoolStatus & Record<string, unknown> = {
    availableBalance: availableStr || '0',
    healthRatio: ratio,
    healthStatus,
    nextMonthRate,
  };
  if (totalBalance !== '0') result.totalBalance = totalBalance;
  if (settledUnwithdrawn !== '0') result.settledUnwithdrawn = settledUnwithdrawn;
  if (reservedGas !== '0') result.reservedGas = reservedGas;
  return result as PoolStatus & { totalBalance?: string; settledUnwithdrawn?: string; reservedGas?: string };
}
