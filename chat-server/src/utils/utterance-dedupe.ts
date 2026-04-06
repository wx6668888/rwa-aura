/** 机器人「当日不重复发言」：上海日历日 + 归一化键 */

export function getShanghaiDateKey(d = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

/** 当日 00:00 上海 → UTC 毫秒 */
export function getShanghaiMidnightUtcMs(d = new Date()): number {
  const key = getShanghaiDateKey(d);
  return new Date(`${key}T00:00:00+08:00`).getTime();
}

/** 去重键：去首尾空白、压缩空白；不删标点（避免不同句被合并） */
export function normalizeUtteranceKey(text: string): string {
  return text.trim().replace(/\s+/g, ' ');
}
