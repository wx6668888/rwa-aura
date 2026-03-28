/**
 * 分红金额精度处理规则：
 * 1. 中间计算保留6位小数精度（bigint，单位 = 1e-6 USDT）
 * 2. 向下取整到2位小数：truncated = (raw / 10000n) * 10000n
 * 3. 应用100,000 USDT上限
 */

export const USDT_DECIMALS = 6n;
export const USDT_UNIT = 10n ** USDT_DECIMALS;
export const CAP_AMOUNT = 100_000n * USDT_UNIT;
export const TWO_DECIMAL = 10_000n;

/**
 * 计算分红金额
 * @param netGrowth 净增业绩（bigint，6位小数）
 * @param ratePercent 分红比例百分比（如 17 代表 17%）
 */
export function calculateDividendAmount(netGrowth: bigint, ratePercent: number): bigint {
  if (netGrowth <= 0n || ratePercent <= 0) return 0n;

  const rateBps = BigInt(Math.round(ratePercent * 100));
  const raw = (netGrowth * rateBps) / 10_000n;
  const truncated = (raw / TWO_DECIMAL) * TWO_DECIMAL;

  return truncated > CAP_AMOUNT ? CAP_AMOUNT : truncated;
}

/**
 * 净增业绩计算
 * 负数归零
 */
export function calculateNetGrowth(
  stakes: bigint,
  withdraws: bigint,
  rewards: bigint,
  subDividends: bigint
): bigint {
  const raw = stakes - withdraws - rewards - subDividends;
  return raw < 0n ? 0n : raw;
}

/** 将 USDT 字符串转为 bigint（6位小数） */
export function parseUsdt(value: string): bigint {
  const [int, dec = ''] = value.split('.');
  const padded = (dec + '000000').slice(0, 6);
  return BigInt(int || '0') * USDT_UNIT + BigInt(padded);
}

/** 将 bigint 格式化为 USDT 字符串（保留6位小数） */
export function formatUsdt(value: bigint): string {
  const int = value / USDT_UNIT;
  const dec = value % USDT_UNIT;
  return `${int}.${String(dec).padStart(6, '0')}`;
}
