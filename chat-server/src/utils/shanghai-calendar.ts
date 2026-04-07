/**
 * 上海时区：收益发放窗口、周末与节假日问候（用于机器人话术与 LLM 约束）
 */
import { getShanghaiDateKey } from './utterance-dedupe';

export function getShanghaiHourMinute(d = new Date()): { hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Shanghai',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
    .formatToParts(d)
    .reduce<Record<string, string>>((acc, p) => {
      if (p.type) acc[p.type] = p.value;
      return acc;
    }, {});
  return {
    hour: Number(parts.hour || '0'),
    minute: Number(parts.minute || '0'),
  };
}

/** 收益发放与可讨论「当日到账数字」的时段：每日 8:00–8:30（上海，含 8:00、不含 8:30 之后） */
export function isInEarningsDistributionWindow(d = new Date()): boolean {
  const { hour, minute } = getShanghaiHourMinute(d);
  if (hour !== 8) return false;
  return minute >= 0 && minute < 30;
}

function parseShanghaiKey(key: string): { y: number; m: number; d: number } {
  const [y, m, d] = key.split('-').map((x) => Number(x));
  return { y, m, d };
}

/** 上海日历的周六日 */
export function isWeekendShanghai(d = new Date()): boolean {
  const wd = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Shanghai',
    weekday: 'short',
  }).format(d);
  return wd === 'Sat' || wd === 'Sun';
}

/** 按公历 key 配置的节日额外话术（每年可增补） */
const HOLIDAY_FALLBACK_BY_DATE: Record<string, string[]> = {
  '2025-01-01': ['元旦快乐 新年新气象', '跨年刚缓过来 群里冒个泡'],
  '2026-01-01': ['元旦快乐呀', '新年第一天 来逛逛群'],
  '2027-01-01': ['元旦快乐', '新年好 各位'],
  '2028-01-01': ['元旦快乐 顺顺利利'],
  '2025-01-28': ['明天除夕 提前拜年啦', '春节将至 心态放轻松'],
  '2025-01-29': ['春节快乐 过年好', '新春大吉 拜年啦', '过年好呀 群里热闹'],
  '2025-01-30': ['初二快乐', '过年这几天别手滑乱点链接哈'],
  '2025-01-31': ['初三溜达一下', '过年也在潜水学习'],
  '2025-02-01': ['初四冒泡', '假期还剩几天 别熬夜太狠'],
  '2025-02-02': ['初五迎财神 合规第一别走歪路', '破五啦 吃个饺子'],
  '2026-02-16': ['明天除夕 提前祝大家春节快乐', '春节前夕 稳住别乱操作'],
  '2026-02-17': ['春节快乐 过年好', '新春大吉', '拜年啦 群里见'],
  '2026-02-18': ['初二快乐', '过年好呀'],
  '2026-02-19': ['初三快乐', '假期走走流程也行'],
  '2026-02-20': ['初四啦', '过年别信私信套路'],
  '2026-02-21': ['破五啦 迎财神也别贪快', '初五快乐'],
  '2027-02-05': ['除夕前问候下', '春节将至'],
  '2027-02-06': ['春节快乐', '过年好', '新春大吉'],
  '2027-02-07': ['初二拜年', '过年这几天先看公告'],
  '2027-02-08': ['初三冒泡', '假期愉快'],
  '2027-02-09': ['初四啦', '慢慢熟悉规则'],
  '2027-02-10': ['初五快乐', '稳住别乱点'],
  '2028-01-25': ['春节快到了 提前拜年', '除夕前问候'],
  '2028-01-26': ['春节快乐', '过年好', '新春大吉'],
  '2028-01-27': ['初二快乐', '拜年啦'],
  '2028-01-28': ['初三', '假期摸鱼也来群里看看'],
  '2028-01-29': ['初四', '别信陌生私信'],
  '2028-01-30': ['初五啦', '迎财神也要走正道'],
  '2025-04-04': ['清明节安康', '清明时节注意出行安全'],
  '2026-04-04': ['清明安康', '出门看看天气'],
  '2026-04-05': ['清明节安康', '今天清淡点也行哈哈'],
  '2027-04-05': ['清明安康'],
  '2028-04-04': ['清明安康'],
  '2025-05-01': ['劳动节快乐', '五一假期别熬夜刷手机太久'],
  '2026-05-01': ['劳动节快乐', '五一放松一下'],
  '2027-05-01': ['劳动节快乐'],
  '2028-05-01': ['劳动节快乐'],
  '2025-05-31': ['端午节快乐', '端午安康 粽子甜咸都能聊哈哈'],
  '2026-06-19': ['端午节快乐', '端午安康 吃粽子了没', '端午啦 划水也要看规则'],
  '2027-06-09': ['端午节快乐', '端午安康'],
  '2028-05-28': ['端午节快乐', '端午安康'],
  '2025-10-01': ['国庆快乐', '假期愉快', '十一快乐呀'],
  '2025-10-02': ['国庆假期第二天 缓缓', '假期也在逛群'],
  '2025-10-03': ['国庆中段 别贪快操作', '假期愉快'],
  '2025-10-04': ['国庆快乐', '出门注意钱包安全'],
  '2025-10-05': ['中秋国庆连着嗨 月饼吃了没', '假期愉快'],
  '2025-10-06': ['中秋快乐', '月饼节快乐', '中秋安康 团圆饭吃了吗'],
  '2025-10-07': ['假期尾声啦 收收心', '国庆最后一天溜达'],
  '2026-10-01': ['国庆快乐', '假期愉快'],
  '2026-10-02': ['国庆假期 慢慢来', '假期摸鱼'],
  '2026-10-03': ['国庆中段', '先看规则再动手'],
  '2026-10-04': ['国庆快乐', '别信陌生链接'],
  '2026-10-05': ['假期过半', '群里逛逛'],
  '2026-09-25': ['中秋快乐', '月饼节嗨皮', '中秋安康'],
  '2026-10-06': ['假期快结束 别熬夜', '国庆尾声'],
  '2026-10-07': ['假期最后一天', '收心啦'],
  '2027-10-01': ['国庆快乐', '假期愉快'],
  '2027-10-02': ['国庆假期', '慢慢玩'],
  '2027-10-03': ['国庆', '稳住'],
  '2027-10-04': ['国庆快乐'],
  '2027-10-05': ['中秋快乐', '中秋安康'],
  '2027-10-06': ['国庆假期', '别乱点'],
  '2027-10-07': ['假期愉快'],
  '2028-10-01': ['国庆快乐', '假期愉快'],
  '2028-10-02': ['国庆', '群里见'],
  '2028-10-03': ['国庆假期中段', '中秋快乐', '月饼节快乐'],
  '2028-10-04': ['国庆快乐'],
  '2028-10-05': ['国庆', '放松下'],
  '2028-10-06': ['中秋快乐', '中秋安康'],
  '2028-10-07': ['假期尾声'],
  '2027-09-15': ['中秋快乐', '中秋安康'],
};

const WEEKEND_FALLBACK_LINES = [
  '周末愉快 刚上来看看',
  '周六啦 缓缓再研究也没事',
  '周日放空一下 顺便逛群',
  '周末快乐呀',
  '周末摸个鱼 别太累',
  '周六嗨一下 规则还是要看',
  '周日早安 潜水学习',
];

function nationalDayFallbackLines(y: number, m: number, d: number): string[] {
  if (m !== 10 || d < 1 || d > 7) return [];
  return [
    `${y} 国庆第${d}天 假期愉快`,
    '国庆假期 先看公告再操作',
    '十一快乐 别信私信带你飞',
    '国庆逛群 慢慢了解',
  ];
}

/** 注入兜底话术池：节日 / 国庆周 / 周末 */
export function getCalendarExtraFallbackLines(now = new Date()): string[] {
  const key = getShanghaiDateKey(now);
  const { y, m, d: day } = parseShanghaiKey(key);
  const out: string[] = [];
  const fixed = HOLIDAY_FALLBACK_BY_DATE[key];
  if (fixed?.length) out.push(...fixed);
  out.push(...nationalDayFallbackLines(y, m, day));
  if (isWeekendShanghai(now) && out.length === 0 && Math.random() < 0.85) {
    out.push(...WEEKEND_FALLBACK_LINES);
  } else if (isWeekendShanghai(now) && out.length > 0 && Math.random() < 0.4) {
    out.push(...WEEKEND_FALLBACK_LINES);
  }
  return out;
}

/** 人类可读：当前北京时间（用于 LLM 锚点） */
export function formatBeijingDateTimeForLlm(now = new Date()): string {
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(now);
}

/**
 * 强制 LLM 按北京时间叙事：吃饭/带娃/收摊等必须与当前钟点一致
 */
export function buildBeijingDailyLifeNarrationRules(now = new Date()): string {
  const { hour } = getShanghaiHourMinute(now);
  const ts = formatBeijingDateTimeForLlm(now);
  const lines: string[] = [
    `【北京时间锚点】当前时刻：${ts}（Asia/Shanghai，与北京时间相同）。所有涉及吃饭、睡觉、下班、带娃、开店收摊的描写必须与此刻一致，禁止假装是晚上/深夜/刚吃完晚饭若实际为清晨上午。`,
    '- 叙事一律以上海/北京时间为准，不要按 UTC 或服务器本地时间想象场景。',
    '- 人设（PERSONA）里的「娃睡后上线」「夜市摊主」「夜班」等只是身份标签：本句描写必须是「此刻正在发生的事」，清晨至傍晚不得把夜间习惯写成本刻场景（例如上午不能说娃已睡、刚吃完晚饭）。',
  ];
  if (hour >= 5 && hour < 10) {
    lines.push(
      '- 当前属清晨至上午早间：可写吃早饭、通勤、送孩子上学/去幼儿园、刚到公司、泡茶开始一天、上午店里客流等；禁止写「吃晚饭/晚餐/夜宵/宵夜」「娃睡了/孩子睡了/哄睡完成」「收摊逛夜市/晚上收摊刷群」「刚下班去吃晚饭」；也不要写「娃睡后上线」当本句状态（应改成送娃出门前、刚送完娃等）。'
    );
  } else if (hour >= 10 && hour < 12) {
    lines.push(
      '- 当前近中午：可写午饭、上午忙完等；不要写「吃晚饭/晚餐/夜宵」「娃睡了（指夜间哄睡）」「夜市/晚上收摊」类晚间话术，也不要把「娃睡后上线」当本句状态。'
    );
  } else if (hour >= 12 && hour < 17) {
    lines.push(
      '- 当前下午：可写午休后、下午茶、接孩子放学前等；不要写「吃晚饭了/刚吃完晚饭/刚吃完晚餐」「娃睡了（夜间）」「夜市/晚上收摊」等晚间话术。'
    );
  } else if (hour >= 17 && hour < 19) {
    lines.push(
      '- 当前傍晚：可以自然提到准备晚饭或刚下班；避免写「娃已经睡了」类通常指夜间哄睡完成的表述（除非明确是幼儿午睡且上下文合理）。'
    );
  } else {
    lines.push(
      '- 当前晚间或深夜：晚饭、夜宵、娃睡后上线、收摊等表述一般合理，但仍勿与「大中午/午休刚醒」等白天场景混用。'
    );
  }
  return lines.join('\n');
}

/** 给 LLM 的日历与收益时段说明 */
export function describeCalendarForLlm(now = new Date()): string {
  const key = getShanghaiDateKey(now);
  const lines: string[] = [];
  lines.push(`【当前北京时间】${formatBeijingDateTimeForLlm(now)}（一切生活化描写必须与此刻钟点一致）。`);
  if (isInEarningsDistributionWindow(now)) {
    lines.push(
      '【收益话术窗口】当前为上海时间早间收益发放时段约 8:00–8:30，仅在此窗口内可以说「今天到账大约 X RWA」这类具体数字；语气仍要口语自然。'
    );
  } else {
    lines.push(
      '【收益话术禁令】当前不在上海 8:00–8:30 收益发放窗口：禁止写「今日到账/领取收益/结算到账了多少 RWA」等具体收益数字或领取描述；可聊规则、流程、心态、公告、风险提示，但不要假装刚领到收益。'
    );
  }
  const hol = HOLIDAY_FALLBACK_BY_DATE[key];
  if (hol?.length) {
    lines.push(`【节日】今天是特殊日期，可自然穿插问候（示例，勿照搬）：${hol.slice(0, 3).join('；')}`);
  } else {
    const { m, d: day } = parseShanghaiKey(key);
    if (m === 10 && day >= 1 && day <= 7) {
      lines.push('【节日】国庆假期期间可偶尔带一句节日问候，不必每条都说。');
    } else if (isWeekendShanghai(now)) {
      lines.push('【周末】可适当随机带一句周末愉快类口语，不必每条都说。');
    }
  }
  return lines.join('\n');
}
