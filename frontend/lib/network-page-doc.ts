/**
 * 设计文档 node-network-prompt_2.md：展示用英文等级称谓（与链上 NODE_LEVELS 中文名并存）
 */
export const DOC_LEVEL_NAME_EN: Record<number, string> = {
  1: 'Newcomer',
  2: 'Basic Node',
  3: 'Active Node',
  4: 'Senior Node',
  5: 'Super Node',
  6: 'Elite Node',
  7: 'Master Node',
  8: 'Grand Master',
  9: 'Supreme Node',
}

/** 文档示例：L4 日分红约 0.31% 基数；按 dividendWeight 相对 L4(0.12) 比例缩放 */
export function estimatedDailyDividendPercent(level: number, dividendWeight: number): number {
  if (level < 2) return 0
  const base = 0.31
  const refW = 0.12
  if (dividendWeight <= 0) return 0
  return (dividendWeight / refW) * base
}

export function fmtUsdtCompact(n: number): string {
  if (!Number.isFinite(n)) return '0'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 10_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 })
}

export function fmtTimeAgo(ms: number, locale: string): string {
  const sec = Math.floor(ms / 1000)
  if (sec < 5) return locale.startsWith('zh') ? '刚刚' : 'just now'
  if (sec < 60) return locale.startsWith('zh') ? `${sec} 秒前` : `${sec}s ago`
  const m = Math.floor(sec / 60)
  if (m < 60) {
    const s = sec % 60
    return locale.startsWith('zh') ? `${m} 分 ${s} 秒前` : `${m}m ${s}s ago`
  }
  return locale.startsWith('zh') ? `${m} 分钟前` : `${m}m ago`
}
