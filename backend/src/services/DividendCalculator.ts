/**
 * 团队业绩分红计算器
 * 净增业绩 = 团队质押 - 团队提现 - 团队推荐奖励 - 下级本轮已结算分红
 */

import { getPool } from '../config/database.config';
import { calculateDividendAmount, calculateNetGrowth } from '../utils/bigint';
import { getMonthBoundary } from '../utils/time';
import { RowDataPacket } from 'mysql2';

const RATE_TABLE: Record<number, number> = {
  1: 0, 2: 5, 3: 8, 4: 12, 5: 17, 6: 23, 7: 30, 8: 35, 9: 50,
};

/** 18位转6位（USDT等值）：除以 1e12 */
function to6Decimals(val: string): bigint {
  const n = BigInt(val);
  return n / 10n ** 12n;
}

/**
 * 拓扑排序（后序DFS）：叶子先算，根后算
 */
export function topologicalSort(
  users: string[],
  snapshot: Map<string, string[]>
): string[] {
  const visited = new Set<string>();
  const result: string[] = [];
  const userSet = new Set(users);

  function dfs(user: string): void {
    if (visited.has(user)) return;
    visited.add(user);
    for (const sub of snapshot.get(user) ?? []) {
      if (userSet.has(sub)) dfs(sub);
    }
    result.push(user);
  }

  for (const u of users) dfs(u);
  return result;
}

/**
 * 从 DB 获取用户团队成员（含自己）
 */
export async function getTeamMembers(userAddress: string): Promise<string[]> {
  const pool = getPool();
  const addr = userAddress.toLowerCase();
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT user_address FROM referral_relations WHERE ancestor_address = ?`,
    [addr]
  );
  const members = new Set<string>([addr]);
  for (const r of rows) {
    members.add((r.user_address as string).toLowerCase());
  }
  return Array.from(members);
}

/**
 * 构建推荐关系快照：user -> 直接下级
 */
export async function buildSubordinatesSnapshot(
  users: string[]
): Promise<Map<string, string[]>> {
  const pool = getPool();
  const result = new Map<string, string[]>();
  const userSet = new Set(users.map((u) => u.toLowerCase()));

  for (const u of users) {
    const addr = u.toLowerCase();
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT user_address FROM referral_relations 
       WHERE ancestor_address = ? AND depth = 1`,
      [addr]
    );
    const subs = (rows || [])
      .map((r) => (r.user_address as string).toLowerCase())
      .filter((s) => userSet.has(s));
    result.set(addr, subs);
  }
  return result;
}

/**
 * 月内团队质押总额（USDT等值，18位）
 * stakes: amount 18位，asset_type USDT/RWA；RWA 按 0.85 折算
 */
async function sumTeamStakes(
  members: string[],
  startTs: number,
  endTs: number
): Promise<bigint> {
  if (members.length === 0) return 0n;
  const pool = getPool();
  const placeholders = members.map(() => '?').join(',');
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT asset_type, SUM(amount) AS total FROM stakes
     WHERE user_address IN (${placeholders})
       AND UNIX_TIMESTAMP(timestamp) >= ? AND UNIX_TIMESTAMP(timestamp) < ?
     GROUP BY asset_type`,
    [...members, startTs, endTs]
  );
  let sum = 0n;
  const RWA_RATE = 85n;
  for (const r of rows || []) {
    const amt = BigInt(r.total?.toString() ?? '0');
    if (r.asset_type === 'RWA') {
      sum += (amt * RWA_RATE) / 100n;
    } else {
      sum += amt;
    }
  }
  return to6Decimals(sum.toString());
}

/**
 * 月内团队提现总额（withdrawal_log，created_at 近似区块时间）
 */
async function sumTeamWithdraws(
  members: string[],
  startTs: number,
  endTs: number
): Promise<bigint> {
  if (members.length === 0) return 0n;
  const pool = getPool();
  const placeholders = members.map(() => '?').join(',');
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT COALESCE(SUM(amount_usdt_equiv), 0) AS total FROM withdrawal_log
     WHERE user_address IN (${placeholders})
       AND UNIX_TIMESTAMP(created_at) >= ? AND UNIX_TIMESTAMP(created_at) < ?`,
    [...members, startTs, endTs]
  );
  const total = rows?.[0]?.total?.toString() ?? '0';
  return to6Decimals(total);
}

/**
 * 月内团队推荐奖励（USDT，rewards 表）
 */
async function sumTeamRewards(
  members: string[],
  startTs: number,
  endTs: number
): Promise<bigint> {
  if (members.length === 0) return 0n;
  const pool = getPool();
  const placeholders = members.map(() => '?').join(',');
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT COALESCE(SUM(amount), 0) AS total FROM rewards
     WHERE user_address IN (${placeholders})
       AND token_type = 'USDT'
       AND UNIX_TIMESTAMP(timestamp) >= ? AND UNIX_TIMESTAMP(timestamp) < ?`,
    [...members, startTs, endTs]
  );
  const total = rows?.[0]?.total?.toString() ?? '0';
  return to6Decimals(total);
}

/**
 * 下级本轮已结算分红（从 team_dividends 读取）
 */
async function sumTeamSubDividends(
  members: string[],
  month: string
): Promise<bigint> {
  if (members.length === 0) return 0n;
  const pool = getPool();
  const placeholders = members.map(() => '?').join(',');
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT COALESCE(SUM(dividend_amount), 0) AS total FROM team_dividends
     WHERE user_address IN (${placeholders}) AND month = ? AND status IN ('RECORDED','PENDING')`,
    [...members, month]
  );
  const total = rows?.[0]?.total?.toString() ?? '0';
  return BigInt(Math.round(parseFloat(total) * 1_000_000));
}

function getRateStatus(standard: number, actual: number): string {
  if (actual === standard) return '标准';
  if (Math.abs(actual - standard * 0.9) < 0.01) return '紧张-10%';
  if (Math.abs(actual - standard * 0.8) < 0.01) return '不足-20%';
  return '标准';
}

export interface UserDividendResult {
  nodeLevel: number;
  teamStakes: bigint;
  teamWithdraws: bigint;
  teamRewards: bigint;
  teamSubDividends: bigint;
  netGrowth: bigint;
  standardRate: number;
  actualRate: number;
  rateStatus: string;
  dividendAmount: bigint;
}

/**
 * 计算单用户分红
 */
export async function computeUserDividend(
  userAddress: string,
  month: string,
  rateConfig: Record<string, number>,
  nodeLevel: number
): Promise<UserDividendResult> {
  if (nodeLevel < 2) {
    throw new Error(`User ${userAddress} is L${nodeLevel}, not eligible`);
  }

  const members = await getTeamMembers(userAddress);
  const { startTs, endTs } = getMonthBoundary(month);

  const [stakes, withdraws, rewards] = await Promise.all([
    sumTeamStakes(members, startTs, endTs),
    sumTeamWithdraws(members, startTs, endTs),
    sumTeamRewards(members, startTs, endTs),
  ]);

  const subDividends = await sumTeamSubDividends(members, month);
  const netGrowth = calculateNetGrowth(stakes, withdraws, rewards, subDividends);
  const standardRate = RATE_TABLE[nodeLevel] ?? 0;
  const actualRate = rateConfig[`L${nodeLevel}`] ?? standardRate;
  const rateStatus = getRateStatus(standardRate, actualRate);
  const dividendAmount = calculateDividendAmount(netGrowth, actualRate);

  return {
    nodeLevel,
    teamStakes: stakes,
    teamWithdraws: withdraws,
    teamRewards: rewards,
    teamSubDividends: subDividends,
    netGrowth,
    standardRate,
    actualRate,
    rateStatus,
    dividendAmount,
  };
}
