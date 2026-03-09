/**
 * 时间边界工具（UTC）
 * 规则：使用区块时间戳（UTC），不受时区影响
 *   时间戳 < startTs → 计入上月
 *   时间戳 ≥ startTs → 计入当月
 */

/**
 * 获取指定月份的 UTC 时间戳边界
 * @param month 格式 YYYY-MM，如 "2026-03"
 */
export function getMonthBoundary(month: string): { startTs: number; endTs: number } {
  const [year, mon] = month.split('-').map(Number);
  const startTs = Math.floor(new Date(Date.UTC(year, mon - 1, 1)).getTime() / 1000);

  const nextYear = mon === 12 ? year + 1 : year;
  const nextMon = mon === 12 ? 1 : mon + 1;
  const endTs = Math.floor(new Date(Date.UTC(nextYear, nextMon - 1, 1)).getTime() / 1000);

  return { startTs, endTs };
}

/** 获取上月的 YYYY-MM 字符串 */
export function getPreviousMonth(): string {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** 获取当前月的 YYYY-MM */
export function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** 获取系统第几个月（用于冷启动判断） */
export function getMonthIndex(month: string, launchMonth: string): number {
  const [y1, m1] = month.split('-').map(Number);
  const [y2, m2] = launchMonth.split('-').map(Number);
  return (y1 - y2) * 12 + (m1 - m2) + 1;
}
