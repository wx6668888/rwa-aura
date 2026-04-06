// ============================================================
// 拟人化辅助：时段权重、心情注入、安全错字、阅读延迟（可 env 调参）
// ============================================================
import { getShanghaiHourMinute } from '../utils/shanghai-calendar';

function hash32(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** 约 12% 机器人在凌晨仍可能冒泡（其余在 deep night 几乎不说话） */
export function isNightOwlBot(botId: string, ratio = 0.12): boolean {
  return (hash32(`owl:${botId}`) % 10_000) / 10_000 < ratio;
}

/** 上海时间 2–7 点视为「深夜低谷」 */
export function isDeepNightHour(hour: number): boolean {
  return hour >= 2 && hour < 7;
}

/**
 * 主动插话是否在深夜静默：是则 execute 直接 return null（接真人不受影响）
 */
export function shouldBlockAmbientDeepNight(botId: string, hour: number): boolean {
  return isDeepNightHour(hour) && !isNightOwlBot(botId);
}

const MOODS = [
  '心情还行，别整太正式',
  '有点困，话别太长',
  '刚忙完一阵，随便唠两句',
  '今天节奏慢，打字也懒一点',
  '有点烦琐事先放一边，闲聊口气',
  '状态一般，短句为主',
  '还行，别像客服腔',
  '有点好奇群里聊啥，口语点',
];

const STATES = [
  '可能在刷手机，一句完事',
  '边喝水边看群，别写小作文',
  '刚站起来活动一下，别啰嗦',
  '在外面有点吵，短一点',
  '手头有点事，别长篇',
  '刚回完别的消息，接着聊',
];

const LENGTH_BIAS = [
  '本条优先控制在 20 字内，除非话题真的需要多一句',
  '本条可以特别短，几个字也行',
  '本条允许两三行，但别堆术语',
  '本条更像随手打一行，别排版',
];

function pick<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length]!;
}

/**
 * 注入到 system prompt 的一小段「实时状态」，增加非模板感（每次发言独立随机）
 */
export function buildLiveStatePromptBlock(botId: string): string {
  const h = hash32(`${botId}:${Math.floor(Date.now() / 60_000)}`);
  const mood = pick(MOODS, h % MOODS.length);
  const state = pick(STATES, (h >> 3) % STATES.length);
  const len = pick(LENGTH_BIAS, (h >> 7) % LENGTH_BIAS.length);
  return `LIVE_STATE（自然融入语气即可，不要复述本标签）:\n- ${mood}\n- ${state}\n- ${len}`;
}

/** 接真人时强调称呼 */
export function buildAddressingLine(peerNickname: string): string {
  const n = peerNickname.trim() || '这位群友';
  return `ADDRESSING: 开头尽量带对方称呼（如「${n}」或「兄弟/姐」类自然叫法），像微信群回话，不要机械重复整段原话。`;
}

/** 连发第二条：极短补充 */
export function buildChunkyFollowUpUserPrompt(botName: string, recentSnippet: string): string {
  return `你刚在群里说过话了。现在只补一条更短的跟进（多数 12 字以内，最多一行），接个语气或半个玩笑，不要重复上一条的意思。\n最近上下文摘要：\n${recentSnippet.slice(0, 800)}`;
}

/** 错字：仅替换白名单同音词，且避开数字与常见规则词 */
const TYPO_SAFE: Array<{ from: RegExp; to: string }> = [
  { from: /在吗/g, to: '在嘛' },
  { from: /好的/g, to: '好滴' },
  { from: /知道/g, to: '知到' },
  { from: /没事/g, to: '没四' },
];

function looksSensitiveForTypo(s: string): boolean {
  return /[0-9]|%|质押|收益|赎回|年化|利息|RWA|USDT|UUSD|钱包|合约/i.test(s);
}

/** 极低概率、仅闲聊向；敏感内容跳过 */
export function maybeApplyCasualTypoAmbient(text: string, probability: number): string {
  if (probability <= 0 || Math.random() >= probability) return text;
  if (text.length < 4 || looksSensitiveForTypo(text)) return text;
  const rule = TYPO_SAFE[Math.floor(Math.random() * TYPO_SAFE.length)]!;
  if (!rule.from.test(text)) return text;
  return text.replace(rule.from, rule.to).slice(0, 500);
}

/**
 * 发请求前「看到消息 → 打字」的延迟（ms）
 */
export function computePreLlmDelayMs(opts: {
  replyToHuman: boolean;
  contextCharLen: number;
  capMs: number;
}): number {
  const { replyToHuman, contextCharLen, capMs } = opts;
  const base = replyToHuman ? 900 + Math.floor(Math.random() * 2_800) : 350 + Math.floor(Math.random() * 1_100);
  const perChar = replyToHuman ? 28 : 12;
  const extra = Math.min(4_200, Math.floor(contextCharLen * perChar / 100));
  return Math.min(capMs, base + extra);
}

/**
 * scheduleNext 里拉长/缩短定时器：按时段分周期
 * - 09:00-12:00 / 14:00-18:00: 正常偏慢
 * - 12:00-14:00 / 20:00-22:30: 稍活跃但不刷屏
 * - 22:30-02:00: 明显降频
 * - 02:00-07:00: 深夜极低频（非夜猫几乎静默）
 */
export function getAmbientScheduleDelayMultiplier(hour: number, botId: string): number {
  // per-bot + per-time-slice jitter to avoid fixed-looking cycles
  const bucket = Math.floor(Date.now() / (12 * 60 * 1000)); // 12-minute bucket
  const jitterSeed = hash32(`ambient:${botId}:${bucket}`);
  const jitter = 0.9 + ((jitterSeed % 1000) / 1000) * 0.4; // 0.9 ~ 1.3

  let base = 1.0;
  if (isDeepNightHour(hour)) {
    base = isNightOwlBot(botId) ? 2.6 : 7.5;
    return base * jitter;
  }
  // 晚间收口：22:00 后逐步慢下来
  if (hour >= 22 || hour < 2) {
    base = 2.2;
    return base * jitter;
  }
  // 午间/晚高峰：可稍微热闹，但避免过密
  if ((hour >= 12 && hour < 14) || (hour >= 20 && hour < 22)) {
    base = 1.25;
    return base * jitter;
  }
  // 白天常规时段
  if (hour >= 9 && hour < 20) {
    base = 1.65;
    return base * jitter;
  }
  // 清晨
  base = 2.2;
  return base * jitter;
}

/**
 * 超省模式下，按时段再压一层“发言概率”：
 * - 白天常规：偏慢
 * - 午间/晚间峰值：略活跃
 * - 22:00后：明显降频
 * - 02:00-07:00：极低频
 */
export function getAmbientSpeakChanceMultiplierByHour(hour: number, botId: string): number {
  if (isDeepNightHour(hour)) return isNightOwlBot(botId) ? 0.42 : 0.09;
  if (hour >= 22 || hour < 2) return 0.38;
  if ((hour >= 12 && hour < 14) || (hour >= 20 && hour < 22)) return 0.72;
  if (hour >= 9 && hour < 20) return 0.52;
  return 0.36;
}

/**
 * 真人触发回复的时段系数（超省 token）：
 * - peak: 稍微放开
 * - 夜间/深夜: 显著收紧
 */
export function getHumanReplyFactorsByHour(hour: number): { probMult: number; gapMult: number } {
  if (isDeepNightHour(hour)) return { probMult: 0.22, gapMult: 2.3 };
  if (hour >= 22 || hour < 2) return { probMult: 0.45, gapMult: 1.8 };
  if ((hour >= 12 && hour < 14) || (hour >= 20 && hour < 22)) return { probMult: 1.2, gapMult: 0.85 };
  if (hour >= 9 && hour < 20) return { probMult: 0.9, gapMult: 1.2 };
  return { probMult: 0.6, gapMult: 1.5 };
}

export function getShanghaiHour(now: Date): number {
  return getShanghaiHourMinute(now).hour;
}

/**
 * 识别「收到/明白 + 小额/查看详情」类超短客服复读，多 bot 易撞款。
 * 用于触发 LLM 重试，而非直接发出。
 */
export function isShallowRoboticAckLine(text: string): boolean {
  const t = text.replace(/\s+/g, ' ').trim();
  if (!t || t.length > 52) return false;

  const hasLatinNoise = /[a-zA-Z]{4,}/.test(t);
  if (hasLatinNoise) return true;

  /** 产品按钮套话单独出现或占主句，一律视为浅层 */
  if (
    /(查看详情|点击查看|点我查看|查看全文)/.test(t) &&
    t.length <= 48 &&
    !/[店厂修车摆摊生意具体哪条哪款]/.test(t)
  ) {
    return true;
  }

  const ackHead = /^(收到|明白|好滴|嗯嗯|嗯|好的|OK|ok|标记了|同上)[。！？.…\s]/;
  const thinTail =
    /(小额|分笔|试水|查看详情|先看规则|对一下页面|看规则|核对|详情|起步|仓位)/;
  const thinOnly =
    ackHead.test(t) &&
    thinTail.test(t) &&
    t.length <= 40 &&
    !/[店厂生意收摊吃饭开车修车摆摊]/.test(t);

  const doubleMicro =
    /^.{0,18}[。！？.][^。！？]{0,18}$/.test(t) &&
    /^(收到|明白|好滴|嗯|好的)/.test(t) &&
    (t.match(/小额|查看|规则|页面|详情|分笔/g) || []).length >= 1 &&
    t.length <= 36;

  return thinOnly || doubleMicro;
}

/** 将模型爱用的「按钮文案」换成口语，避免满屏 查看详情 */
export function sanitizeLlmStockPhrases(text: string): string {
  let s = text;
  const swaps: Array<[RegExp, string[]]> = [
    [/查看详情/g, ['看公告', '对一下页面说明', '条款里自己核对下']],
    [/点击查看/g, ['自己点进去看', '上页面瞅一眼']],
    [/点我查看/g, ['点进去看就行']],
    [/查看全文/g, ['看原文']],
  ];
  for (const [re, picks] of swaps) {
    s = s.replace(re, () => picks[Math.floor(Math.random() * picks.length)]!);
  }
  // 历史上下文污染词：统一替换为自然口语，避免全群复读
  s = s.replace(/halk[aǎ]?o/gi, '先不喝了');
  s = s.replace(/haikao/gi, '先不喝了');
  s = s.replace(/留着晚上再喝/g, '先忙正事');
  s = s.replace(/留着晚上喝/g, '先忙正事');
  s = s.replace(/留咖啡钱/g, '先省着点');
  s = s.replace(/口头不算数/g, '按页面规则来');
  // 清理偶发元信息/脏片段
  s = s.replace(/ocale:简体中文;tz:Asia\/Shanghai/gi, '');
  s = s.replace(/\b(?:Wrestlers,\s*take\s*your\s*time\.?|rotterdam|NIGHT BBQ)\b/gi, '');
  s = s.replace(/\s{2,}/g, ' ').trim();
  return s;
}

/**
 * 低质量高频口头禅：出现就要求重写（避免全群复制粘贴感）
 */
export function isBannedLowValuePhrase(text: string): boolean {
  const t = text.replace(/\s+/g, '').trim();
  if (!t) return false;
  return /(口头不算数|按口头算|夜班挺累|刚下夜班好累|夜班太累了)/.test(t);
}

/**
 * 时段语义冲突：白天别说“刚下夜班/夜班很累”等当下状态。
 * hour 传入上海小时(0-23)。
 */
export function isTimeContextContradiction(text: string, hour: number): boolean {
  const t = text.replace(/\s+/g, '').trim();
  if (!t) return false;
  const isDaytime = hour >= 8 && hour < 19;
  const isDeepNight = hour >= 0 && hour < 6;
  const nightNowLike = /(刚下夜班|夜班挺累|夜班太累|通宵刚结束|凌晨还在忙)/;
  const dayNowLike = /(大中午|午休刚醒|白天太晒|中午太热)/;
  if (isDaytime && nightNowLike.test(t)) return true;
  if (isDeepNight && dayNowLike.test(t)) return true;
  return false;
}
