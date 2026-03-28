/** 对外展示用户数 = 链上/库统计 + 该偏移（仅展示，不改库） */
export const DISPLAY_USER_OFFSET = 20

export function displayUserCount(realUsers: number): number {
  return Math.max(0, Math.floor(realUsers)) + DISPLAY_USER_OFFSET
}

export function formatUsdAmount(n: number, compact = true): string {
  if (!Number.isFinite(n) || n < 0) n = 0
  if (compact && n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (compact && n >= 10_000) return `$${(n / 1_000).toFixed(1)}K`
  if (n >= 1000) return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatUsdFull(n: number): string {
  if (!Number.isFinite(n) || n < 0) n = 0
  if (n > 0 && n < 1) {
    return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`
  }
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

/** 兼容 `YYYY-MM-DD` 与 ISO 字符串（JSON 序列化 Date 后带 T...Z，直接 split 会解析失败导致图表全被过滤成空） */
export function parseIsoDate(d: string): Date {
  const dayPart = typeof d === 'string' ? d.slice(0, 10) : String(d).slice(0, 10)
  const [y, m, day] = dayPart.split('-').map(Number)
  if (!y || !m || !day) return new Date(0)
  return new Date(y, m - 1, day)
}

export function filterSeriesByDays<T extends { date: string }>(rows: T[], timeRange: string): T[] {
  const map: Record<string, number> = {
    '7d': 7,
    '30d': 30,
    '90d': 90,
    '180d': 180,
    all: 365 * 20,
  }
  const days = map[timeRange] ?? 30
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  return rows.filter((r) => parseIsoDate(r.date) >= cutoff)
}

export function shortenAddress(addr: string): string {
  const a = (addr || '').toLowerCase()
  if (a.length < 10) return a
  return `${a.slice(0, 6)}...${a.slice(-4)}`
}
