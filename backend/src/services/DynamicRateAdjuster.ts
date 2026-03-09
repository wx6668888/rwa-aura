/**
 * 动态分红比例调整
 * 健康度 = 可调拨余额 / 预估支出
 * ≥150% 标准，120-150% 降10%，100-120% 降20%，<100% 暂停
 */

import { getPool } from '../config/database.config';
import { formatUsdt } from '../utils/bigint';
import { RowDataPacket } from 'mysql2';

const STANDARD_RATES: Record<string, number> = {
  L1: 0, L2: 5, L3: 8, L4: 12, L5: 17, L6: 23, L7: 30, L8: 35, L9: 50,
};

export async function getRateConfig(
  month: string
): Promise<Record<string, number> | null> {
  const pool = getPool();
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT rate_config, adjustment_type FROM dividend_rate_history
     WHERE month = ? ORDER BY version DESC LIMIT 1`,
    [month]
  );
  if (!rows?.length) return null;
  const row = rows[0];
  if (row.adjustment_type === '暂停') return null;
  return JSON.parse(row.rate_config as string);
}

function applyMultiplier(
  rates: Record<string, number>,
  multiplier: number
): Record<string, number> {
  return Object.fromEntries(
    Object.entries(rates).map(([k, v]) => [
      k,
      Math.round(v * multiplier * 100) / 100,
    ])
  );
}

function getHealthStatus(ratio: number): string {
  if (ratio >= 1.5) return '充足';
  if (ratio >= 1.2) return '紧张';
  if (ratio >= 1.0) return '不足';
  return '严重不足';
}

function getFirstDayOfNextMonth(month: string): string {
  const [y, m] = month.split('-').map(Number);
  const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
  return `${next}-01 00:00:00`;
}

/**
 * 预估支出：前3月管理员配置，第4月起最近3月平均×1.2
 */
async function calculateEstimatedPayout(
  monthIndex: number
): Promise<bigint> {
  const pool = getPool();
  if (monthIndex <= 3) {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT config_value FROM admin_config WHERE config_key = ?`,
      [`cold_start_estimate_month_${monthIndex}`]
    );
    if (!rows?.length) {
      throw new Error(
        `Admin must configure cold_start_estimate_month_${monthIndex} in admin_config`
      );
    }
    const val = parseFloat(rows[0].config_value as string);
    return BigInt(Math.round(val * 1_000_000));
  }

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT month, SUM(dividend_amount) AS total FROM team_dividends
     WHERE status = 'RECORDED'
     GROUP BY month ORDER BY month DESC LIMIT 3`
  );
  if (!rows?.length || rows.length < 3) {
    throw new Error('Insufficient history for standard formula');
  }
  let sum = 0n;
  for (const r of rows) {
    const v = parseFloat(r.total as string);
    sum += BigInt(Math.round(v * 1_000_000));
  }
  const avg = sum / BigInt(rows.length);
  return (avg * 12n) / 10n;
}

export interface DetermineRateResult {
  rateConfig: Record<string, number>;
  adjustmentType: string;
  healthRatio: number;
  healthStatus: string;
}

/**
 * 确定并保存比例配置
 */
export async function determineAndSaveRateConfig(
  month: string,
  monthIndex: number,
  availableBalance: bigint
): Promise<DetermineRateResult> {
  const estimated = await calculateEstimatedPayout(monthIndex);
  const healthRatio =
    estimated > 0n
      ? Number((availableBalance * 10000n) / estimated) / 10000
      : 0;
  const healthStatus = getHealthStatus(healthRatio);

  let rateConfig: Record<string, number>;
  let adjustmentType: string;

  if (healthRatio >= 1.5) {
    rateConfig = { ...STANDARD_RATES };
    adjustmentType = '标准';
  } else if (healthRatio >= 1.2) {
    rateConfig = applyMultiplier(STANDARD_RATES, 0.9);
    adjustmentType = '降低10%';
  } else if (healthRatio >= 1.0) {
    rateConfig = applyMultiplier(STANDARD_RATES, 0.8);
    adjustmentType = '降低20%';
  } else {
    rateConfig = applyMultiplier(STANDARD_RATES, 0);
    adjustmentType = '暂停';
  }

  const pool = getPool();
  const [verRows] = await pool.query<RowDataPacket[]>(
    `SELECT COALESCE(MAX(version), 0) AS v FROM dividend_rate_history WHERE month = ?`,
    [month]
  );
  const version = ((verRows?.[0]?.v as number) ?? 0) + 1;
  const effectiveAt = getFirstDayOfNextMonth(month);

  await pool.query(
    `INSERT INTO dividend_rate_history
       (month, version, available_balance, estimated_payout, health_ratio,
        health_status, rate_config, adjustment_type, announced_at, effective_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)`,
    [
      month,
      version,
      formatUsdt(availableBalance),
      formatUsdt(estimated),
      healthRatio,
      healthStatus,
      JSON.stringify(rateConfig),
      adjustmentType,
      effectiveAt,
    ]
  );

  return {
    rateConfig,
    adjustmentType,
    healthRatio,
    healthStatus,
  };
}
