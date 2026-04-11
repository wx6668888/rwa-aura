// ============================================================
// RWA Aura Chat — Bot Engine（LLM + 无网兜底话术）
// ============================================================
import { ethers } from 'ethers';
import { v4 as uuid } from 'uuid';
import { chatService } from './chat-service';
import {
  tryLlmChatCompletion,
  buildGroqFailoverOrder,
  buildOpenRouterFailoverOrder,
  buildSiliconFlowFailoverOrder,
  getGroqKeyCount,
  getOpenRouterKeyCount,
  getSiliconFlowKeyCount,
  getDefaultOpenAiCompatKeys,
} from './bot-llm';
import { BOT_PERSONAS_50 } from '../data/bot-personas-50';
import type { BotRuntimeTuning } from '../data/rwa-bot-persona-types';
import { humanizeCasualChinese, saltUtteranceUnique, type PunctuationStyle } from './bot-humanize';
import {
  createYieldScreenshotImage,
  type PhoneStatusStyle,
  type ActivityCardSpec,
  type ActivityScreenshotPreset,
} from './bot-yield-screenshot';
import { getShanghaiDateKey, getShanghaiMidnightUtcMs, normalizeUtteranceKey } from '../utils/utterance-dedupe';
import {
  buildAddressingLine,
  buildChunkyFollowUpUserPrompt,
  buildLiveStatePromptBlock,
  computePreLlmDelayMs,
  getAmbientScheduleDelayMultiplier,
  getAmbientSpeakChanceMultiplierByHour,
  getHumanReplyFactorsByHour,
  getShanghaiHour,
  maybeApplyCasualTypoAmbient,
  shouldBlockAmbientDeepNight,
  isShallowRoboticAckLine,
  sanitizeLlmStockPhrases,
  isBannedLowValuePhrase,
  isTimeContextContradiction,
} from './bot-human-sim';
import {
  getShanghaiHourMinute,
  isInEarningsDistributionWindow,
  describeCalendarForLlm,
  getCalendarExtraFallbackLines,
} from '../utils/shanghai-calendar';
import { isAllowedChatImageUrl } from '../utils/safe-image-url';
import { Bot, User, Message } from '../models/types';
import type { BotSchedule, BotRole } from '../models/types';
import { ADMIN_SUPPORT_INSTRUCTIONS, ADMIN_SUPPORT_KNOWLEDGE } from '../data/admin-support-knowledge';
import { SUPPORT_KNOWLEDGE_ARTICLE_LINK_INDEX } from '../data/support-knowledge-article-links';
import { buildSupportFeedbackHintsForPrompt } from './support-feedback-store';
import { botMemoryService } from './bot-memory-service';

type BotIdentity = 'beginner' | 'pro' | 'wool' | 'earner' | 'generic';
type FallbackId = BotIdentity;

type SocialGraphRuntime = {
  referrer?: string; // persona id like RWA_BOT_005
  known_bots?: string[];
  downlines?: string[]; // persona ids
  cross_bot_triggers?: Array<{
    condition?: string;
    respond_probability?: number;
    style?: string;
  }>;
};

type YieldScreenshotTrigger = 'yield_just_arrived' | 'someone_asks_about_yield' | 'celebrating_together';

function makeDeterministicBotAddress(seed: string): string {
  // Deterministic 0x address from seed (so restarts don't spam new bot users)
  const hash = ethers.id(`rwa-aura-bot:${seed}`);
  return `0x${hash.slice(2).slice(0, 40)}`.toLowerCase();
}

function isInActiveHours(bot: Bot): boolean {
  const now = new Date();
  // We currently only honor Asia/Shanghai; schedule.timezone kept for compatibility.
  const { hour } = getShanghaiHourMinute(now);
  const start = bot.schedule.activeHoursStart;
  const end = bot.schedule.activeHoursEnd;
  if (start === end) return true;
  if (start < end) return hour >= start && hour < end;
  // Wrap around midnight (not used by defaults, but keep safe)
  return hour >= start || hour < end;
}

function pickEarningsRwaAmount(): number {
  // Required: 9 - 300 RWA
  return Math.floor(9 + Math.random() * (300 - 9 + 1));
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function readEnvInt(name: string, def: number, lo: number, hi: number): number {
  const n = Number(process.env[name]);
  if (!Number.isFinite(n)) return def;
  return Math.max(lo, Math.min(hi, Math.floor(n)));
}

function readEnvFloat(name: string, def: number, lo: number, hi: number): number {
  const n = Number(process.env[name]);
  if (!Number.isFinite(n)) return def;
  return Math.max(lo, Math.min(hi, n));
}

function clampNum(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/** 真人安静满此时间后，机器人才会「主动插话」；可由 BOT_HUMAN_QUIET_MS 调小以提高活跃度 */
function humanQuietMs(): number {
  return readEnvInt('BOT_HUMAN_QUIET_MS', 120_000, 20_000, 600_000);
}

const MICRO_REPLIES = new Set([
  '收到',
  '明白',
  '嗯',
  '嗯嗯',
  '+1',
  'OK',
  'ok',
  '好的',
  '标记了',
  '我也在',
  '同上',
  '学到了',
  '踏实',
  '懂了',
  '可以',
]);

/** 质押 / 充值 / 收益规则向（不含具体到账数字，数字仅在 earnings 模板与 8:00–8:30 LLM 中出现） */
const RW_TOPIC_AMBIENT: string[] = [
  '质押页面我习惯先看锁定期和赎回条件 别光看点数',
  '充值走官方入口 截图保存哈希 别信代充',
  '收益规则以公告为准 群里口头别全信',
  '新手质押先小额 熟悉赎回流程再加大',
  '链上确认慢正常 别连续重复点授权',
  '我一般是充完等确认再去看质押额度',
  '质押和活期别混在一个脑回路里 条款分开看',
  '有人问我收益啥时候能聊细节 我说早上八点到八点半窗口看公告节奏',
  '充值网络别选错 转错链很麻烦',
  '质押前核对合约地址 手快不如手稳',
  '收益这块心态放平 先搞懂规则再焦虑',
  '我蹲公告比蹲群消息多 信息准一点',
  '赎回如果有冷静期 自己记一下别忘',
  '质押额度不够先检查是否到账确认数够了',
  '别跟人比仓位 每个人节奏不一样',
];

const RW_TOPIC_REPLY: string[] = [
  '楼上说的质押条款我也对过页面 以详情为准',
  '充值这块走站内路径最稳 别私聊转账',
  '收益规则我记公告 有更新再同步',
  '同意 先小额质押把流程摸熟',
  '链上 pending 先看浏览器 别急着重发',
  '+1 到账确认够了再操作下一步',
  '质押周期不同别硬比 看自己的产品说明',
  '早上发放窗口再看数字 其他时间别乱猜到账',
  '收到 我再去核对下赎回条件',
  '明白 先确认充值网络',
];

/** 日常闲聊 / 小店老板式对话（与质押场景自然混用） */
const DAILY_CHITCHAT: string[] = [
  '今年生意不好做啊',
  '对啊 钱难挣 你是做啥的',
  '烟酒店 你呢',
  '差不多 生鲜超市 你入了多少',
  '我 2000u 先试试水 不敢梭',
  '哈哈一样 先小额跑跑流程',
  '晚上收摊了刷下群 看看公告',
  '别跟风吹 自己看页面条款最稳',
  '楼上说的在理 我也就是瞎聊两句',
  '最近客流一般 群里蹲蹲干货',
  '实体店难 线上也卷 心态放平',
  '你那边回款周期咋样',
  '还行 别拖太久 现金流要紧',
  '我先潜水 有红包喊我',
  '同蹲 薅也要按规则来',
];

/**
 * 非 8:00–8:30 禁止出现「到账收益/领取收益/今日RWA数字」类描述；话术带问答感（不单问）
 */
const FALLBACK_AMBIENT: Record<FallbackId, string[]> = {
  beginner: [
    '新人问锁仓和活期啥差别 简单说锁仓周期更长 具体条款以页面为准别听口头忽悠',
    '怕踩坑很正常 我习惯先把账号钱包流程走完 再拿最小额度点一遍熟悉按钮',
    '规则字多看不懂 你就搜关键词对照官方说明 比群里碎片信息稳',
    '有人问节点重不重要 我觉得先看自己玩法 别被带节奏乱冲',
    '群里挺热闹 我先潜水偷师 有问题再冒出来问',
  ],
  pro: [
    '链上慢别狂点 打开浏览器看是不是pending 重复提交反而容易翻车',
    '参数别凭记忆 关键页面截个图 后面核对省时间',
    '站内功能自己点两遍 比到处问二手描述靠谱',
    '不确定的先看公告再动手 别被群消息带跑',
    '钱包授权前多看一眼地址和合约 手快不如手稳',
  ],
  wool: [
    '活动就按页面规则来 别信私信内部渠道 那是经典套路',
    '红包趁早领别拖过期 时间记小本本上',
    '薅可以 灰产别碰 账号安全比那点羊毛值钱',
    '节奏自己排 别全堆最后一天手忙脚乱',
    '群里气氛组上线 我也来凑个热闹',
  ],
  earner: [
    '我刚开始也懵 完整流程走两遍就顺了 别一上来就梭哈',
    '有人一起讨论挺省事 哪有坑一般会有人喊 自己再对照公告',
    '别贪快 一步一步反而省时间 心急容易点错',
    '公告比群聊准 养成习惯少踩雷',
    '心态放平 先熟悉再加大 别被焦虑带节奏',
  ],
  generic: [
    '经常逛逛群能学到点姿势 今天聊啥我也插一句',
    '刚上线看看 有新鲜事喊我',
    '先围观哈哈 有空交流使用体验',
    '潜水结束 出来透口气',
    '随便看看 别嫌我话多',
  ],
};

const FALLBACK_REPLY: Record<FallbackId, string[]> = {
  beginner: [
    '楼上这问题我也想过 锁仓主要是时间维度不同 最终以产品说明为准',
    '说到怕理解偏 我建议对照官方流程一步步核对 别跳步',
    '有道理 我记下这条 回头打开页面找对应条款验证',
    '新手别慌 先小额试水把按钮摸熟 比空想强',
  ],
  pro: [
    '同意 这个点关键 操作前把条件读清楚再点确认',
    '我补充下 链上卡了先看浏览器状态 别重复授权',
    '别被节奏带跑 自己核对一遍页面参数最稳',
    '这条实在 手快容易误触 慢半拍不丢人',
  ],
  wool: [
    '对对 按活动细则来 细则小字也要看',
    '节奏对就舒服 我也习惯提前设提醒',
    '薅要薅明白 别贪小便宜吃大亏',
    '说到心坎了 手气随缘别上火',
  ],
  earner: [
    '我也差不多 先小步试错 熟了再加大',
    '稳稳的就好 别跟别人比 自己舒服最重要',
    '同意 别焦虑 流程熟了自然快',
    '群里互相提醒挺好 我一般会再去公告二次确认',
  ],
  generic: [
    '有道理 我也记一下',
    '哈哈 说到这个我也在想',
    '确实 按规则来省心',
    '同意 先观察清楚再动手',
  ],
};

const FALLBACK_AMBIENT_EXTRA: Record<FallbackId, string[]> = {
  beginner: [
    '有人问第一步干啥 答先把认证和钱包搞定 再去看产品入口别乱点外链',
    '锁仓活期看不懂 答先记死一条 周期和条款在详情页 别信截图',
    '小额试可以不 答可以 用你能承受的最小额度走全流程最稳',
    '规则太长咋办 答先抓目录和小标题 不懂再针对性搜',
    '群里吵啥呢 我先围观 有干货再插话',
  ],
  pro: [
    '提现相关别堆情绪 答先看页面提示和状态 再决定要不要重试',
    '官方说明比群聊准 答有争议以公告为准 别杠',
    '别信私信带你飞 答正规路径都在站内 私聊要钱的直接拉黑',
    '截图留痕 答养成习惯 出争议你能说清楚',
    '条件没看清别确认 答多看一眼不亏',
  ],
  wool: [
    '红包忘了领 答设闹钟 过期真的亏',
    '活动看不懂 答从规则页第一条开始读 别跳',
    '薅也要体面 答别碰灰产 号没了更亏',
    '手速重要心态也重要 答抢不到别气 下次再来',
    '来凑气氛 答嘿嘿 合规第一',
  ],
  earner: [
    '有人问会不会很难 答我当初也怕 走两遍流程就踏实了',
    '别跟人比 答每个人节奏不一样 自己舒服就好',
    '公告更新 答养成瞄一眼的习惯 比群消息靠谱',
    '每天看一眼就行 答别刷太狠 累的是自己',
    '体验还行 答先把基础打牢再谈别的',
  ],
  generic: [
    '今天聊啥 插一句 我也在学习',
    '刚上来看看 群里氛围还可以',
    '冒个泡 有空交流',
    '潜水久了 出来喘口气',
    '凑个热闹 别介意',
  ],
};

const FALLBACK_REPLY_EXTRA: Record<FallbackId, string[]> = {
  beginner: [
    '你这条我也在琢磨 答我倾向看官方流程图 一步一步对照',
    '哈哈说到心坎 答新手怕偏很正常 多核对就少踩坑',
    '我先马住 答晚点打开页面找条款验证',
    '同问 答蹲大佬也行 但最终还是以说明为准',
  ],
  pro: [
    '嗯 关键 答按规则最省事',
    '操作前看条件 答别急 确认界面多看一眼',
    '别被带节奏 答自己核对一遍心里踏实',
    '补充 官方为准 答有更新以公告为准',
  ],
  wool: [
    '对对 按规则来 答细则字号小也得看',
    '节奏舒服 答我也这么干',
    '薅明白 答别走歪路',
    '手气随缘 答别上火',
  ],
  earner: [
    '我也这感觉 答小步来比较快',
    '心态稳住 答别焦虑',
    '同意 答自己舒服最重要',
    '慢慢来 答熟练了就不慌',
  ],
  generic: [
    '有道理 记一下',
    '哈哈 我也在想',
    '确实 省心',
    '+1 我也觉得',
    '嗯嗯 是这样',
  ],
};

/** 仅在上海 8:00–8:30 收益发放窗口使用 */
const EARNINGS_FALLBACK_LINES: string[] = [
  '早间发放窗口瞄了眼 今天大概 {n} RWA 左右',
  '刚发下来约 {n} RWA 还行吧',
  '今天这波大约 {n} RWA 有人比我高吗哈哈',
  '发放后看了下 大约 {n} RWA 小开心',
  '大概 {n} RWA 先这样',
  '今天 {n} RWA 左右 不多不少',
  '数了下 {n} RWA 心情还行',
  '早间 {n} RWA 凑合',
  '大概 {n} RWA 你们呢',
  '小晒 {n} RWA 别笑',
  '今天 {n} RWA 稳稳的',
];

const TW_BASE = 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72';

const BOT_STICKER_URLS: string[] = [
  `${TW_BASE}/1f389.png`,
  `${TW_BASE}/1f525.png`,
  `${TW_BASE}/1f44c.png`,
  `${TW_BASE}/1f64c.png`,
  `${TW_BASE}/1f31f.png`,
  `${TW_BASE}/2728.png`,
  `${TW_BASE}/1f4aa.png`,
  `${TW_BASE}/1f44d.png`,
  `${TW_BASE}/1f606.png`,
  `${TW_BASE}/1f973.png`,
  `${TW_BASE}/1f37b.png`,
  `${TW_BASE}/2615.png`,
  `${TW_BASE}/1f4b0.png`,
  `${TW_BASE}/1f381.png`,
  `${TW_BASE}/1f440.png`,
];

function shuffleInPlace<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

/** 像在@群友、问称呼/在不在等，需要优先接话 */
function isLikelyAtSomeoneQuestion(content: string): boolean {
  const t = content.trim();
  if (t.length > 100) return false;
  return /叫啥|叫什么|你叫|贵姓|你是谁|哪位|在吗|在嘛|在不|能听到|回个话|人呢|说一下|问问|请教|聊两句|有人吗|谁在|出来|哈喽|你好/i.test(
    t
  );
}

/** 问职业、籍贯、年龄等 */
function isIdentityOrJobQuestion(content: string): boolean {
  const t = content.trim();
  if (t.length > 120) return false;
  return (
    /做啥的|干啥的|干什么|什么工作|上班|哪工作|哪上班|职业|哪行的|哪里人|老家|多大|几岁|学生吗|宝妈吗|老板吗/i.test(t) ||
    (/谁啊|^谁$|是谁/.test(t) && t.length < 28)
  );
}

/** 普通问句（结尾问号/吗 等），提高接话概率与速度 */
function isLikelyGeneralQuestion(content: string): boolean {
  const t = content.trim();
  if (t.length < 2 || t.length > 100) return false;
  if (/入了多少|投了多少|多少u|多少U|多少rwa|质押多少|买了多少|仓位多少|梭了多少/i.test(t)) return true;
  if (/[？?]$/.test(t)) return true;
  if (/吗[？?！!。.…~～]*$/u.test(t)) return true;
  if (/^(怎么|如何|为啥|为什么|啥|什么|有没有|能不能|是不是|哪位|大家|群里)/.test(t)) return true;
  return false;
}

/** 产品/链上/规则类意图 → 优先由管理员机器人接待 */
function isSupportIntent(content: string): boolean {
  const t = content.trim();
  if (t.length < 2) return false;
  return /质押|赎回|提现|领取|收益|利息|日化|年化|APY|规则|合约|地址|链上|确认数|区块|Gas|手续费|滑点|USDT|RWA|BNB|BSC|钱包|授权|节点|推荐|邀请|税|税率|锁仓|周期|活期|暴雷|跑路|靠谱|安全|风险|官方|公告|白皮书|教程|怎么玩|如何操作|失败|pending|交易哈希|跨链|滑点|池子|流动性/i.test(
    t
  );
}

/**
 * BOT_ADMIN_ROUTING: support | questions | always
 * - support：仅产品/规则意图或 @ 管理员昵称
 * - questions：任意明显提问/身份/在吗类也走管理员（更「专业全面」）
 * - always：每条真人消息都由管理员接（氛围组不参与接话）
 */
function shouldRouteToAdminBot(content: string): boolean {
  const mode = String(process.env.BOT_ADMIN_ROUTING || 'support')
    .trim()
    .toLowerCase();
  const adminName = String(process.env.ADMIN_BOT_NAME || 'Aura助手').trim();
  const t = content.trim();

  if (mode === 'always') return true;
  if (adminName && t.includes(adminName)) return true;
  if (/@\s*(官方|客服|助手|admin|小助手)/i.test(t)) return true;
  if (isSupportIntent(t)) return true;
  if (
    mode === 'questions' &&
    (isLikelyGeneralQuestion(t) || isIdentityOrJobQuestion(t) || isLikelyAtSomeoneQuestion(t))
  ) {
    return true;
  }
  return false;
}

/**
 * BOT_OWNER_ROUTING: mention | support | always
 */
function shouldRouteToOwnerBot(content: string): boolean {
  const mode = String(process.env.BOT_OWNER_ROUTING || 'mention')
    .trim()
    .toLowerCase();
  const ownerName = String(process.env.OWNER_BOT_NAME || '群主').trim();
  const t = content.trim();
  const mention = (ownerName && t.includes(ownerName)) || /@\s*(群主|owner|站长|管理员)/i.test(t);
  if (mode === 'always') return true;
  if (mention) return true;
  if (mode === 'support' && isSupportIntent(t)) return true;
  return false;
}

function punctuationFromIdentity(identity: BotIdentity): PunctuationStyle {
  switch (identity) {
    case 'pro':
    case 'beginner':
      return Math.random() < 0.62 ? 'formal' : 'mixed';
    case 'wool':
      return Math.random() < 0.72 ? 'casual' : 'mixed';
    case 'earner':
      return Math.random() < 0.55 ? 'mixed' : 'formal';
    default:
      return Math.random() < 0.42 ? 'casual' : Math.random() < 0.55 ? 'mixed' : 'formal';
  }
}

function normalizeForSemanticSim(input: string): string {
  return input
    .toLowerCase()
    .replace(/[，。！？、；：,.!?;:\-_/\\()[\]{}"'`~@#$%^&*+=|<>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function toBigrams(input: string): Set<string> {
  const s = normalizeForSemanticSim(input).replace(/\s+/g, '');
  const out = new Set<string>();
  if (!s) return out;
  if (s.length < 2) {
    out.add(s);
    return out;
  }
  for (let i = 0; i < s.length - 1; i++) out.add(s.slice(i, i + 2));
  return out;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter += 1;
  const union = a.size + b.size - inter;
  return union <= 0 ? 0 : inter / union;
}

function containsEmojiLike(text: string): boolean {
  // Best-effort: covers most emoji + pictographs + dingbats.
  return /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(text);
}

function stripEmojiLike(text: string): string {
  return text
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function sanitizeLinkLikeMarkup(text: string): string {
  let out = text;
  // BBCode-like [href='...']Text[/href] / [url=...]Text[/url]
  out = out.replace(/\[(?:href|url)\s*=\s*['"]?([^\]'"]+)['"]?\]([\s\S]*?)\[\/(?:href|url)\]/gi, (_m, url, label) => {
    const t = String(label || '').trim();
    const u = String(url || '').trim();
    if (!t && !u) return '';
    if (!t) return u;
    if (!u) return t;
    return `${t} (${u})`;
  });
  out = out.replace(/\[(?:href|url)\s*['"]?([^\]'"]+)['"]?\]([\s\S]*?)\[\/(?:href|url)\]/gi, (_m, url, label) => {
    const t = String(label || '').trim();
    const u = String(url || '').trim();
    if (!t && !u) return '';
    if (!t) return u;
    if (!u) return t;
    return `${t} (${u})`;
  });
  // Bare [href='...']Text[/href]
  out = out.replace(/\[(?:href|url)\s*['"]?([^\]'"]+)['"]?\]([\s\S]*?)\[\/(?:href|url)\]/gi, (_m, url, label) => {
    const t = String(label || '').trim();
    const u = String(url || '').trim();
    return t ? `${t} (${u})` : u;
  });
  // HTML anchor <a href="...">Text</a>
  out = out.replace(/<a\s+[^>]*href\s*=\s*['"]([^'"]+)['"][^>]*>([\s\S]*?)<\/a>/gi, (_m, url, label) => {
    const t = String(label || '').replace(/<[^>]+>/g, '').trim();
    const u = String(url || '').trim();
    return t ? `${t} (${u})` : u;
  });
  return out;
}

function sanitizeAmbientNoiseTokens(text: string): string {
  return String(text || '')
    .replace(/\b(?:ha\s*lk|halk|lk|lK|LK)\b/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/([。！？!?])\s+([。！？!?])/g, '$1$2')
    .trim();
}

function collapseRepeatedClauses(text: string): string {
  const s = String(text || '').trim();
  if (!s) return s;
  const parts = s
    .split(/([。！？!?])/)
    .reduce<string[]>((acc, cur, idx, arr) => {
      if (idx % 2 === 0) {
        const punc = arr[idx + 1] || '';
        const seg = `${cur || ''}${punc}`.trim();
        if (seg) acc.push(seg);
      }
      return acc;
    }, []);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of parts) {
    const k = normalizeUtteranceKey(p);
    if (!k) continue;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(p);
  }
  return out.join('').trim() || s;
}

function sanitizeYieldClaimRanges(text: string): string {
  return String(text || '').replace(/日收益率?\s*[:：]?\s*(\d+(?:\.\d+)?)\s*%/g, (_m, n) => {
    const v = Number(n);
    // Bot knowledge base caps at about 2.0% daily (allow tiny margin for wording).
    if (!Number.isFinite(v) || v <= 0 || v > 2.2) return '日收益率按页面档位';
    return `日收益率${v}%`;
  });
}

function hasAnswerShape(text: string): boolean {
  const s = String(text || '').trim();
  if (s.length < 6) return false;
  const qCount = (s.match(/[?？]/g) || []).length;
  const hasStatementPunc = /[。；!！]/.test(s);
  const hasAnswerCue = /(我这|我一般|我会|我觉得|建议|可以|先|通常|因为|所以|需要|得|会|是|不是|别急|先看|先核对|先确认)/.test(s);
  // If it is mostly asking back without any declarative cue, treat as non-answer.
  if (qCount >= 1 && !hasStatementPunc && !hasAnswerCue) return false;
  return hasStatementPunc || hasAnswerCue || qCount === 0;
}

function isQuestionHeavyNoAnswer(text: string): boolean {
  const s = String(text || '').trim();
  if (s.length < 6) return true;
  const qCount = (s.match(/[?？]/g) || []).length;
  const stmtCount = (s.match(/[。；!！]/g) || []).length;
  const answerCue = /(我这|我一般|我会|我觉得|建议|可以|先|通常|因为|所以|需要|得|会|是|不是|别急|先看|先核对|先确认)/.test(s);
  return qCount >= 2 && stmtCount === 0 && !answerCue;
}

function isTemplateyQuestionSpam(text: string): boolean {
  const s = String(text || '').trim();
  if (!s) return false;
  const pat =
    /(你们(那边)?呢[?？]?|有啥(经验|方法|建议|技巧)[?？]?|天气咋样[?？]?|适合出去走走[?？]?|确认数.*(咋样|怎么样)[?？]?|你们平时.*(吗|呢)[?？]?|最近.*(吗|呢)[?？]?)/;
  const qCount = (s.match(/[?？]/g) || []).length;
  return pat.test(s) && qCount >= 1;
}

function classifySimpleIntent(text: string): string {
  const t = String(text || '').trim().toLowerCase();
  if (!t) return '';
  if (/投了多少|投了几|仓位|多少u|多少usdt|多少rwa|入了多少|买了多少/.test(t)) return 'invest_amount';
  if (/收益|回报|日收益|年化|利息|到账/.test(t)) return 'yield';
  if (/你是干啥的|你做什么|做啥工作|什么工作|职业|身份|你是谁/.test(t)) return 'identity_job';
  if (/哪里跑|在哪跑|哪片区|在哪里|哪个区|哪边|跑单|外卖|网约车/.test(t)) return 'location_work';
  if (/收入|工资|一个月|月入|大概多少|多少钱|挣多少/.test(t)) return 'income_amount';
  if (/谁介绍|谁带你|怎么来的|怎么入的/.test(t)) return 'referrer';
  return '';
}

function isNearMeaningDuplicate(a: string, b: string, threshold: number): boolean {
  const aa = normalizeForSemanticSim(a);
  const bb = normalizeForSemanticSim(b);
  if (!aa || !bb) return false;
  if (aa === bb) return true;
  if (aa.length >= 10 && bb.length >= 10 && (aa.includes(bb) || bb.includes(aa))) return true;
  const score = jaccard(toBigrams(aa), toBigrams(bb));
  return score >= threshold;
}

function detectContradictionHint(reply: string, fullPersona: Record<string, unknown> | null): string {
  const t = String(reply || '');
  if (!t.trim() || !fullPersona) return '';
  const locks = ((fullPersona as any).consistency_locks || {}) as any;
  if (!locks || typeof locks !== 'object') return '';
  const hints: string[] = [];
  // Node level consistency (if present in locks).
  const node = String(locks.current_node_level || locks.node_level || '').trim();
  if (node && /L\d/i.test(node)) {
    const m = t.match(/\bL(\d)\b/i);
    if (m && `L${m[1]}`.toUpperCase() !== node.toUpperCase()) {
      hints.push(`你的人设锁定节点等级是 ${node}，不要自称为 L${m[1]}.`);
    }
  }
  // Downline/referral consistency.
  const downCnt = Number(locks.downline_count ?? locks.team_downline_count ?? NaN);
  if (Number.isFinite(downCnt) && downCnt > 0) {
    if (/没推荐过|没带过人|就我自己|没下线|没团队/.test(t)) {
      hints.push(`你的人设显示你已推荐过人/有下线（数量>0），不要说“没推荐过/就我自己”。`);
    }
  }
  // Spouse location (if present).
  const wifeLoc = String(locks.wife_location || '').trim();
  if (wifeLoc) {
    if (/老婆.*(深圳|在这|在这边|一起)/.test(t) && /老家|江苏|安徽|河南|四川|东北|广西|湖南|湖北/.test(wifeLoc)) {
      hints.push(`你的人设锁定“老婆位置”是「${wifeLoc}」，不要说老婆在深圳/在你身边。`);
    }
  }
  return hints.slice(0, 2).join(' ');
}

/** 天热却只说「带伞」易穿帮：防雨要讲下雨；防晒要讲遮阳/防晒 */
function isHotWeatherUmbrellaMistake(text: string): boolean {
  const t = String(text || '');
  if (!t) return false;
  const hot = /(有点热|挺热|天热|高温|闷热|好热|气温.{0,4}高|周末.{0,6}热)/.test(t);
  const umbrella = /带伞|拿个?伞|记得.*伞|出门.*伞/.test(t);
  const rainReason = /(下雨|降雨|阵雨|雷雨|台风|转雨|有雨|小到中雨|暴雨)/.test(t);
  const sunReason = /(遮阳|防晒|挡太阳|太阳毒|暴晒|紫外线|大太阳|晒)/.test(t);
  return hot && umbrella && !rainReason && !sunReason;
}

/**
 * 对方没问工作地/职业/具体收益，却一句话叠「地点/工种 + 收益数字」，像硬广自嗨。
 * ambient 与接短句「收益挺稳」类都容易误触发，需要压住。
 */
function isUnsolicitedJobPlaceYieldStack(reply: string, triggerContent: string | undefined): boolean {
  const t = String(reply || '').trim();
  const tr = String(triggerContent || '');
  if (t.length < 10) return false;
  // ambient 与接话共用：对方没点名问职务/收益时，禁止「城市+工种+收益数字」简历式叠句
  const hasYieldCue = /(RWA|USDT|\d+\s*块|[三四五六七八九十两几]+块|几块|日收益|每天.{0,8}块)/i.test(t);
  const hasJobPlaceCue =
    /在[\u4e00-\u9fa5]{1,5}(?:市|州|县)?做[\u4e00-\u9fa5]{2,12}/.test(t) ||
    (/我在[\u4e00-\u9fa5]{1,6}(?:市|州|县)?/.test(t) && /做[\u4e00-\u9fa5]{2,10}/.test(t));
  if (!hasYieldCue || !hasJobPlaceCue) return false;
  const askedConcrete =
    /(你是做什么|你做什么|你干啥|你在哪(上班|工作)?|你哪个城市|你什么职业|你的(工作|收入|收益)|你.*收益.*多少|收益.*你|一天多少|几块|投了多少|仓位|问的就是你|我是在问你|@)/i.test(
      tr
    ) ||
    /(大家|群里|各位).{0,14}(收益|收入).{0,10}(怎么样|如何|多少|咋样|还好吗)/i.test(tr);
  if (askedConcrete) return false;
  return true;
}

function tokenizeCn(input: string): string[] {
  const t = String(input || '')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[0-9a-fA-F]{40,}/g, ' ')
    .replace(/[^\u4e00-\u9fa5A-Za-z0-9]+/g, ' ')
    .toLowerCase()
    .trim();
  if (!t) return [];
  const parts = t.split(/\s+/).filter(Boolean);
  const stop = new Set([
    '这个',
    '那个',
    '然后',
    '就是',
    '还是',
    '有没有',
    '怎么',
    '为啥',
    '为什么',
    '可以',
    '不可以',
    '我',
    '你',
    '他',
    '她',
    '我们',
    '你们',
    '他们',
    '啊',
    '呢',
    '吗',
    '嘛',
    '吧',
    '了',
    '的',
    '在',
    '和',
    '与',
    '要',
    '就',
    '都',
  ]);
  return parts
    .filter((p) => p.length >= 2 && p.length <= 18 && !stop.has(p))
    .slice(0, 16);
}

function looksContextualEnough(reply: string, anchor: string, roomContext: string): boolean {
  const r = String(reply || '').trim();
  if (r.length < 6) return false;
  const keys = Array.from(new Set([...tokenizeCn(anchor), ...tokenizeCn(roomContext)]));
  if (keys.length === 0) return true;
  const hit = keys.filter((k) => r.toLowerCase().includes(k)).length;
  // Must "touch" at least one anchor keyword to avoid self-talk.
  return hit >= 1;
}

function buildRoomHumanStyleHint(recent: Array<{ name: string; content: string; isHuman: boolean }>): string {
  const humans = recent.filter((x) => x.isHuman).slice(-8);
  if (humans.length < 3) return '';
  const lens = humans.map((h) => (h.content || '').trim().length).filter((n) => n > 0);
  const avg = lens.reduce((a, b) => a + b, 0) / Math.max(1, lens.length);
  const shortRatio = lens.filter((n) => n <= 18).length / Math.max(1, lens.length);
  const lineBreakRatio = humans.filter((h) => (h.content || '').includes('\n')).length / Math.max(1, humans.length);
  const questionRatio = humans.filter((h) => /[?？]$/.test((h.content || '').trim()) || /(吗|嘛|么)$/.test((h.content || '').trim()))
    .length / Math.max(1, humans.length);

  const style: string[] = [];
  style.push(`- 近期真人平均长度约 ${Math.round(avg)} 字；短句占比约 ${Math.round(shortRatio * 100)}%`);
  if (lineBreakRatio > 0.25) style.push(`- 真人偶尔分行（约 ${Math.round(lineBreakRatio * 100)}%）；你也可偶尔分行但别像公告`);
  if (questionRatio > 0.25) style.push(`- 真人提问较多（约 ${Math.round(questionRatio * 100)}%）；你接话时尽量“先答后追问”保持对话`);
  style.push(`- 用词与语气尽量贴近真人，不要客服腔；但必须保持 PERSONA，不可漂移`);
  return `\nROOM_HUMAN_STYLE_HINT (imitate humans in this room):\n${style.map((s) => `  ${s}`).join('\n')}\n`;
}

function compressRecentChatContext(
  recent: Array<{ name: string; content: string; isHuman: boolean }>,
  opts: { maxRawMsgs: number; alwaysKeepLastN: number }
): { context: string; compressed: boolean } {
  const maxRaw = Math.max(8, Math.min(80, Math.floor(opts.maxRawMsgs)));
  const keepN = Math.max(4, Math.min(18, Math.floor(opts.alwaysKeepLastN)));
  if (recent.length <= maxRaw) {
    return { context: recent.map((x) => `${x.name}: ${x.content}`).join('\n'), compressed: false };
  }
  const head = recent.slice(0, Math.max(0, recent.length - keepN));
  const tail = recent.slice(-keepN);
  // Very cheap deterministic "summary": keep last message per speaker + coarse topic tags.
  const lastBySpeaker = new Map<string, string>();
  for (const r of head) {
    const k = r.name || 'Unknown';
    const v = String(r.content || '').trim();
    if (!v) continue;
    lastBySpeaker.set(k, v);
  }
  const speakerSnippets = Array.from(lastBySpeaker.entries())
    .slice(-10)
    .map(([n, c]) => `- ${n}: ${c.slice(0, 60)}`);
  const tags = extractTopicTags(head.map((x) => x.content).join(' ')).slice(0, 6);
  const summary = [
    'HISTORY_SUMMARY (compressed; do not quote; use as background):',
    tags.length ? `- topics: ${tags.join(', ')}` : '- topics: (unknown)',
    ...(speakerSnippets.length ? speakerSnippets : ['- (no earlier content)']),
    '',
    'RECENT_TURNS (verbatim):',
    ...tail.map((x) => `${x.name}: ${x.content}`),
  ].join('\n');
  return { context: summary, compressed: true };
}

function extractTopicTags(text: string): string[] {
  const t = normalizeForSemanticSim(text);
  const tags = new Set<string>();
  if (!t) return [];
  if (/质押|锁仓|周期|活期|解锁/.test(t)) tags.add('staking');
  if (/收益|利息|日化|年化|到账|发放/.test(t)) tags.add('yield');
  if (/充值|入金|上分|转账|usdt|rwa|bnb/.test(t)) tags.add('funding');
  if (/提现|赎回|提币|出金/.test(t)) tags.add('withdraw');
  if (/规则|公告|条款|页面|说明|合约/.test(t)) tags.add('rules');
  if (/链上|确认数|pending|gas|手续费|哈希/.test(t)) tags.add('chain');
  if (/天气|收工|下班|吃饭|通勤|门店|生意|咖啡|堵车|今天凉快/.test(t)) tags.add('daily');
  if (tags.size === 0) tags.add('misc');
  return Array.from(tags);
}

type AdminBroadcastSlot = 'morning' | 'afternoon' | 'night';

type AdminBroadcastVariant = 'long' | 'medium';
type AdminBroadcastTopic = { long: string; medium: string };

type PersonaTopicItem = { id: string; title: string; prompt: string; tags: string[] };

function buildPersonaTopicPoolsMinimal(): Record<BotIdentity, PersonaTopicItem[]> {
  const mk = (pfx: string, title: string, prompt: string, tags: string[]): PersonaTopicItem => ({
    id: `${pfx}-${normalizeForSemanticSim(title).slice(0, 24)}`.replace(/\s+/g, '-'),
    title,
    prompt,
    tags,
  });

  const generic: PersonaTopicItem[] = [
    mk('g', '新手最容易踩坑的 3 个步骤', '用口语列出 3 个最容易踩坑的步骤，并问一句“你卡在哪一步？”', ['rules', 'chain']),
    mk('g', '为什么建议先小额试一笔', '解释“先小额验证链路”的原因，给一个具体的小额范围，并追问对方计划操作哪一步', ['rules']),
    mk('g', 'Gas 不够会出现什么症状', '用通俗话解释 BNB Gas 不足会导致什么，并问对方钱包里是否有少量 BNB', ['chain']),
    mk('g', 'Pending 处理顺序', '给出 pending 的排查顺序（先看确认数/TxHash），最后追问对方 TxHash 有了吗', ['chain']),
    mk('g', '地址三段法怎么核对', '教“三段法”，举个例子说明前6后4怎么对，并问对方复制地址来自哪里（TP/币安）', ['rules']),
    mk('g', '签名/授权/转账怎么区分', '用 3 句话对比签名/授权/转账，并让对方把弹窗关键信息发出来', ['rules', 'chain']),
    mk('g', '邀请好友推广的合规说法', '给两句合规表述（不承诺收益、不代操作），最后问“你准备怎么说？”', ['rules']),
  ];

  const beginner: PersonaTopicItem[] = [
    mk('b', '我到底该用哪个钱包', '用新手口吻问：TP/币安哪个更好用？你自己更倾向哪种？', ['misc']),
    mk('b', '我担心签名会扣钱', '表达担心签名扣钱，顺带问“你们签名的时候弹窗长啥样？”', ['rules']),
    mk('b', '第一次准备 Gas 要多少', '问 BNB 要准备多少才够，别太专业，带一点慌张', ['chain']),
    mk('b', '地址复制后我不敢点确认', '说自己不敢点确认，想让大家教怎么核对地址', ['rules']),
  ];

  const pro: PersonaTopicItem[] = [
    mk('p', '把步骤写成 checklist 更不容易错', '用专业口吻给一个 5 步 checklist，并问对方现在在哪一步', ['rules']),
    mk('p', '授权额度建议怎么选', '说明授权额度的取舍（最小额度优先），并问对方是否看到 approve 弹窗', ['chain']),
    mk('p', '如何留存核账四件套', '给出核账四件套并解释价值，追问对方是否有 TxHash', ['rules']),
    mk('p', '遇到异常先做信息收集', '强调先收集截图/TxHash/网络信息，问对方能否补齐这些信息', ['rules']),
  ];

  const wool: PersonaTopicItem[] = [
    mk('w', '别整天公告腔，来点真实卡点', '用更俗气一点的口吻吐槽别公告腔，问“你们卡哪儿了？”', ['misc']),
    mk('w', '别瞎点，先小额跑通', '用直接一点的口吻劝先小额，问对方准备上多少', ['rules']),
    mk('w', '别信私聊，真有事就群里问', '用粗一点的口吻反诈，提醒别信私聊，问有没有遇到私聊', ['rules']),
  ];

  const earner: PersonaTopicItem[] = [
    mk('e', '收益核对看哪两处', '强调站内+链上两处核对，问对方收益显示是不是有延迟', ['yield', 'chain']),
    mk('e', '收益不到账先别慌', '用口语安抚但要具体：先看确认数/时间窗口，问对方是哪一笔', ['yield']),
  ];

  const dedupe = (arr: PersonaTopicItem[]) => {
    const seen = new Set<string>();
    return arr.filter((x) => {
      if (seen.has(x.id)) return false;
      seen.add(x.id);
      return true;
    });
  };

  return {
    beginner: dedupe([...generic, ...beginner]),
    pro: dedupe([...generic, ...pro]),
    wool: dedupe([...generic, ...wool]),
    earner: dedupe([...generic, ...earner]),
    generic: dedupe([...generic]),
  };
}

function adminPickVariantBySlot(slot: AdminBroadcastSlot): AdminBroadcastVariant {
  // 默认：早上发长版，下午/晚上发中版（中版也保持公告级详细）
  if (slot === 'morning') return 'long';
  return 'medium';
}

// 7-day rotation (Mon..Sun), one topic per day, 2 variants (long/medium).
// 注意：优先推荐 TP 钱包与币安；不要提欧易。
const ADMIN_BROADCAST_LIBRARY_WEEKLY: Record<AdminBroadcastSlot, AdminBroadcastTopic[]> = {
  morning: [
    {
      long:
        `📢【官方教程】Web3 钱包（0x 地址）配置指南（优先 TP 钱包 + 币安）\n` +
        `尊敬的 RWA 平台用户：\n\n` +
        `为提供更合规、更安全、更高效的资产管理体验，平台后续链上交互将以 BSC（BNB Smart Chain / 币安智能链）为主。迁移/结算相关动作将通过链上智能合约完成，链上记录可核验、可追溯。\n\n` +
        `为确保您的资产与后续收益发放顺利进行，请务必完成 Web3 BSC 钱包（0x 开头地址）的准备与核对。不确定是否完成？请先按下列步骤自查；如需协助，点我头像直接咨询。\n\n` +
        `💡 核心说明：什么是 Web3 钱包？\n` +
        `- 自托管：助记词/私钥由你本人保管，等同于资产所有权。\n` +
        `- 0x 地址：你在 BSC 上接收资产与执行交互的唯一账户标识。\n` +
        `- 不可逆：链上操作无法撤销，必须严格核对网络/地址/币种。\n\n` +
        `一、官方优先推荐：TP 钱包（TokenPocket）创建 BSC 钱包\n` +
        `1）在应用商店下载安装 TP 钱包（请认准官方来源）。\n` +
        `2）创建/导入钱包：选择【创建钱包】或【导入钱包】。\n` +
        `3）备份助记词（核心环节）：使用纸笔抄写并离线保存。\n` +
        `   - 严禁截图、相册、微信传输或云盘存储。\n` +
        `4）切换到 BSC 网络：在钱包内选择 BSC / BNB Smart Chain。\n` +
        `5）复制 0x 地址：进入【接收/收款】复制 0x 开头地址（这就是你的 BSC 地址）。\n\n` +
        `二、备选方案（同样推荐）：币安 Web3 钱包创建 BSC 地址\n` +
        `1）打开币安 App → 进入【Web3】入口。\n` +
        `2）创建钱包并完成备份/恢复设置（务必记住恢复方式）。\n` +
        `3）获取地址：点击【接收】→ 选择 BNB Smart Chain（BEP20）→ 复制 0x 地址。\n\n` +
        `三、链上交互准备：储备“燃油费”(BNB) ⛽\n` +
        `在 BSC 上进行领取/转账/提现/授权等操作，需要消耗少量 BNB 作为 Gas Fee。\n` +
        `- 建议准备：约 5–10 USDT 等值的 BNB（随链拥堵可能波动）。\n` +
        `- 从交易所提币到钱包：提现币种 BNB，网络务必选择 BSC/BEP20，地址粘贴你的 0x 地址。\n\n` +
        `四、地址校验“三段法”（防剪贴板劫持）\n` +
        `复制地址后不要直接确认：\n` +
        `- 前 6 位 + 中间任意 4 位 + 后 4 位，三段一致再提交。\n\n` +
        `⚠️ 安全合规警示（请务必阅读）\n` +
        `- 平台/客服/群主不会索要：助记词、私钥、验证码、远程控制。\n` +
        `- 任何“代操作/包回本/内部通道/私聊引导链接”均为高风险。\n` +
        `- 一切以站内页面说明与链上结果为准；不确定先停一步再咨询。\n\n` +
        `RWA 运营团队`,
      medium:
        `📢【官方教程】3 分钟完成 BSC Web3 钱包准备（TP 钱包 + 币安）\n` +
        `尊敬的 RWA 平台用户：\n\n` +
        `为确保后续链上交互与收益发放顺利进行，请务必准备 BSC（BEP20）网络的 Web3 钱包 0x 地址，并预留少量 BNB 作为 Gas。\n\n` +
        `✅ 1）优先推荐：TP 钱包（TokenPocket）\n` +
        `- 创建/导入钱包 → 纸笔备份助记词（严禁截图/转发）\n` +
        `- 切换网络到 BSC/BNB Smart Chain\n` +
        `- 进入【接收】复制 0x 地址\n\n` +
        `✅ 2）同样推荐：币安 Web3 钱包\n` +
        `- 进入币安 App 的 Web3 入口创建钱包并完成备份\n` +
        `- 选择 BNB Smart Chain（BEP20）获取 0x 地址\n\n` +
        `⛽ 3）准备 Gas（BNB）\n` +
        `- 建议准备 5–10 USDT 等值 BNB\n` +
        `- 提现网络务必选 BSC/BEP20，地址粘贴 0x 地址\n\n` +
        `🔎 4）地址三段法核对\n` +
        `前 6 位 + 中间 4 位 + 后 4 位一致再确认\n\n` +
        `⚠️ 安全提醒：任何索要助记词/私钥/验证码/远程协助的都是诈骗；不确定请点我头像直接咨询。\n\n` +
        `RWA 运营团队`,
    },
    {
      long:
        `📢【官方教程】充值/转账“零失误”流程（BSC/BEP20 必读）✅\n` +
        `尊敬的 RWA 平台用户：\n\n` +
        `链上转账与充值具有不可逆特性。多数问题都来自三个点：网络选错、地址粘贴被劫持、币种链路不一致。\n` +
        `为保障资产安全，请按本公告流程执行；不确定请先暂停操作，点我头像直接咨询。\n\n` +
        `✅ 一、操作前的“三核对”（必须执行）🔎\n` +
        `1）核对网络：钱包/交易所网络是否为 BSC / BEP20（与页面要求一致）\n` +
        `2）核对币种：USDT/RWA/BNB 是否一致；不要把 TRC20、ERC20、BEP20 混用\n` +
        `3）核对地址：使用“三段法”对照（防剪贴板劫持）\n` +
        `   - 前 6 位 + 中间任意 4 位 + 后 4 位，三段一致再确认\n\n` +
        `✅ 二、强烈建议：先小额验证，再放大金额🧪\n` +
        `首次链路建议 1–5 USDT 小额测试，确认“上链→确认→页面展示/到账”完整闭环后，再做大额操作。\n\n` +
        `✅ 三、从交易所提币到 TP 钱包 / 币安 Web3 钱包（示例）📤\n` +
        `1）交易所【提现】选择币种（如 USDT/BNB）\n` +
        `2）网络务必选择：BSC / BEP20\n` +
        `3）提现地址：粘贴你的 0x 地址（来自 TP 钱包或币安 Web3 钱包的【接收】）\n` +
        `4）提交后等待确认：不要在 Pending 期间重复提交同类型交易\n\n` +
        `⏳ 四、Pending 很久/页面不更新怎么办？（按步骤排查）\n` +
        `1）先看链上确认是否在推进（TxHash/确认数）\n` +
        `2）检查钱包 Gas 是否过低、链是否拥堵\n` +
        `3）不要多端、多页面反复操作同一步\n` +
        `4）需要协助：准备“截图 + TxHash”，点我头像直接咨询\n\n` +
        `⚠️ 五、安全合规警示🛡️\n` +
        `- 平台/客服/群主不会索要：助记词、私钥、验证码、远程控制\n` +
        `- 任何“代操作/保本承诺/私聊引导链接”均为高风险\n` +
        `- 规则与口径以站内页面与链上结果为准\n\n` +
        `RWA 运营团队`,
      medium:
        `📢【官方教程】充值/转账前必做“三核对”（BSC/BEP20）\n` +
        `尊敬的 RWA 平台用户：\n\n` +
        `为避免误转与不到账，请务必按以下流程执行；不确定请暂停，点我头像直接咨询。\n\n` +
        `✅ 1）核对网络：BSC / BEP20\n` +
        `✅ 2）核对币种：链路一致，TRC20/ERC20/BEP20 不混用\n` +
        `✅ 3）核对地址：三段法（前 6 + 中间 4 + 后 4）一致再确认\n\n` +
        `🧪 建议：首次先小额（1–5 USDT）跑通链路，再放大金额。\n\n` +
        `⏳ Pending 处理：先看 TxHash/确认数，不要重复提交同一步。\n\n` +
        `⚠️ 安全提醒：任何索要助记词/私钥/验证码/远程协助的都是诈骗。\n\n` +
        `RWA 运营团队`,
    },
    {
      long:
        `📢【官方教程】签名 vs 授权 Approve vs 转账交易：一眼辨别，避免误操作\n` +
        `尊敬的 RWA 平台用户：\n\n` +
        `钱包弹窗里最常见的三类动作是“签名（Sign）”“授权（Approve）”“提交交易（Confirm/Send）”。理解它们的区别，能显著降低误操作与风险。\n\n` +
        `🟢 一、签名（Sign Message）是什么？\n` +
        `- 用途：登录/身份校验/建立会话。\n` +
        `- 特点：通常不扣资产、通常不消耗 Gas（取决于具体实现）。\n` +
        `- 风险：也不要随意给陌生站点签名，避免被诱导进行后续授权。\n\n` +
        `🟠 二、授权（Approve）是什么？\n` +
        `- 用途：允许合约在一定额度内使用你的代币（常见于首次质押/兑换/交互）。\n` +
        `- 特点：会产生链上交易，需要 Gas（BNB）。\n` +
        `- 建议：\n` +
        `  1）优先选择“最小必要额度”（如页面提供）；\n` +
        `  2）不要对来源不明的合约地址授权；\n` +
        `  3）授权后若不再使用，可在钱包/工具里撤销授权（Revocation）。\n\n` +
        `🔴 三、提交交易（Confirm/Send）是什么？\n` +
        `- 这一步会真正上链，产生 TxHash。\n` +
        `- 会消耗 Gas，且不可逆。\n` +
        `- 提交前必须核对：网络（BSC/BEP20）/地址/金额/合约交互类型。\n\n` +
        `⛽ 四、为什么要准备 BNB（Gas）？\n` +
        `在 BSC 上的授权、转账、领取等操作都需要少量 BNB。\n` +
        `建议提前准备 5–10 USDT 等值 BNB，避免“临门一脚操作失败”。\n\n` +
        `📌 五、遇到不确定弹窗怎么办？\n` +
        `- 先不要点确认；截屏弹窗内容（网络/合约/费用/动作描述）\n` +
        `- 点我头像直接咨询，我会按步骤帮你判断“这是签名/授权/转账”\n\n` +
        `⚠️ 安全合规警示：任何索要助记词/私钥/验证码/远程协助的都是诈骗。\n\n` +
        `RWA 运营团队`,
      medium:
        `📢【官方教程】三类弹窗分清楚：签名 / 授权 / 转账\n` +
        `尊敬的 RWA 平台用户：\n\n` +
        `🟢 签名：用于登录校验，通常不扣资产\n` +
        `🟠 授权 Approve：给额度，会产生链上交易并消耗 BNB Gas\n` +
        `🔴 转账/提交交易：真正上链，不可逆\n\n` +
        `✅ 关键：确认前先看网络是否 BSC/BEP20，合约/金额是否合理。\n` +
        `不确定就先别点，点我头像直接咨询。\n\n` +
        `RWA 运营团队`,
    },
    {
      long:
        `📢【官方教程】质押标准流程（含首次授权）与常见问题\n` +
        `尊敬的 RWA 平台用户：\n\n` +
        `质押类操作一般包含“授权→确认质押→等待确认→页面更新”。请严格按顺序执行，避免 Pending 期间重复提交造成多笔手续费。\n\n` +
        `✅ 一、质押标准顺序（别跳步）\n` +
        `1）输入金额：确认币种、数量与页面规则一致\n` +
        `2）首次授权 Approve：允许合约使用代币额度（会消耗 Gas）\n` +
        `3）确认质押：提交交易并等待链上确认（生成 TxHash）\n` +
        `4）等待页面更新：确认后再进行下一步\n\n` +
        `⛽ 二、Gas 准备（BNB）\n` +
        `- 授权与质押都需要少量 BNB 作为手续费\n` +
        `- 建议提前准备 5–10 USDT 等值 BNB\n\n` +
        `⏳ 三、Pending 期间注意事项\n` +
        `- 不要重复点击同一个按钮\n` +
        `- 不要多端同时操作同一钱包\n` +
        `- 先看链上确认数是否推进\n\n` +
        `🔎 四、质押后如何核对？\n` +
        `- 站内：仓位/状态/收益展示\n` +
        `- 链上：TxHash/确认状态\n` +
        `如出现短时延迟，先等确认块。\n\n` +
        `📌 五、需要协助时请准备的信息\n` +
        `- 你在第几步（授权/质押/等待确认）\n` +
        `- 页面截图 + TxHash\n` +
        `点我头像直接咨询，我会按步骤帮你对齐。\n\n` +
        `⚠️ 安全提醒：任何索要助记词/私钥/验证码/远程协助的都是诈骗。\n\n` +
        `RWA 运营团队`,
      medium:
        `📢【官方教程】质押标准流程（4 步）\n` +
        `尊敬的 RWA 平台用户：\n\n` +
        `✅ 1）输入金额\n` +
        `✅ 2）首次需要授权 Approve（消耗 BNB Gas）\n` +
        `✅ 3）确认质押提交交易（生成 TxHash）\n` +
        `✅ 4）等待链上确认与页面更新（Pending 别重复点）\n\n` +
        `需要我帮你看 Pending/TxHash？点我头像直接咨询。\n\n` +
        `RWA 运营团队`,
    },
    {
      long:
        `📢【官方教程】提现/赎回与 Pending 排查（按步骤处理）\n` +
        `尊敬的 RWA 平台用户：\n\n` +
        `提现/赎回属于链上不可逆操作，常见问题集中在：余额条件、冷却/到期规则、Gas 不足、链拥堵、重复提交。请按以下步骤执行。\n\n` +
        `✅ 一、提现/赎回前必看 3 项\n` +
        `1）可提余额是否足够\n` +
        `2）是否存在冷却/到期限制（以页面说明为准）\n` +
        `3）钱包是否有足够 BNB 作为 Gas\n\n` +
        `⛽ 二、Gas 说明\n` +
        `链上提交交易需要消耗少量 BNB。没有 Gas 会导致交易无法发出或失败。\n\n` +
        `⏳ 三、Pending 很久怎么办（排查顺序）\n` +
        `1）先看 TxHash 是否生成、确认数是否推进\n` +
        `2）检查链拥堵与 Gas 设置是否过低\n` +
        `3）不要重复提交同类型交易（避免多笔手续费/状态混乱）\n` +
        `4）确认是否在同一钱包地址下操作\n\n` +
        `🧾 四、建议留存“核账四件套”\n` +
        `- 时间\n` +
        `- 金额\n` +
        `- TxHash\n` +
        `- 页面截图\n\n` +
        `📌 五、需要协助时怎么提问最快？\n` +
        `请说明：你在第几步 + 发 TxHash + 发页面截图。\n` +
        `点我头像直接咨询，我会按步骤帮你定位问题。\n\n` +
        `⚠️ 安全提醒：任何索要助记词/私钥/验证码/远程协助的都是诈骗。\n\n` +
        `RWA 运营团队`,
      medium:
        `📢【官方教程】提现/赎回前 3 项自查 + Pending 排查\n` +
        `尊敬的 RWA 平台用户：\n\n` +
        `✅ 提现前自查：可提余额 / 冷却或到期规则 / BNB Gas 是否足够\n` +
        `⏳ Pending：先看 TxHash 与确认数，别重复提交同一步\n` +
        `需要协助：点我头像直接咨询（发截图 + TxHash）\n\n` +
        `RWA 运营团队`,
    },
    {
      long:
        `📢【官方教程】邀请好友推广指引：如何合规分享并获得收益（国内用户必读）\n` +
        `尊敬的 RWA 平台用户：\n\n` +
        `为帮助国内用户更清晰、合规地完成“邀请好友/推广分享”，并减少不规范宣传带来的纠纷与风险，现发布本指引。请务必按以下步骤执行；不确定时请先停一步，点我头像直接咨询。\n\n` +
        `✅ 一、推广收益的基本逻辑（先讲清楚）\n` +
        `- 推广行为：你将站内的邀请入口/专属链接/邀请码分享给真实好友。\n` +
        `- 绑定关系：好友通过你的入口完成注册/连接钱包/参与相关流程后，系统会记录邀请关系。\n` +
        `- 收益规则：以站内页面当前展示的“邀请/推荐”规则为准（口口相传、截图可能过期）。\n\n` +
        `📌 二、标准推广流程（推荐按“微信场景”执行）\n` +
        `1）先把自己账号配置好：完成钱包连接与 0x 地址准备（BSC/BEP20）。\n` +
        `2）在站内进入【邀请/推荐】页面，复制你的专属入口。\n` +
        `3）分享给真实好友：建议一对一说明，不建议群发刷屏。\n` +
        `4）提醒好友按步骤完成：注册/连接钱包/按页面要求操作。\n` +
        `5）回到站内查看邀请记录与状态：以页面展示为准。\n\n` +
        `🧾 三、建议你这样说（更像“官方/合规表达”）\n` +
        `✅ 可用：\n` +
        `- “我这边有个站内邀请入口，你按页面步骤走，规则以页面为准。”\n` +
        `- “涉及链上操作需要少量 BNB Gas，不确定先问官方。”\n` +
        `- “助记词/私钥自己保管，任何人要都别给。”\n\n` +
        `🚫 禁止/高风险表达（请避免）\n` +
        `- “保本/稳赚/内部渠道/躺赚”\n` +
        `- “我帮你代操作/把助记词给我”\n` +
        `- “点陌生短链/下载不明软件包”\n\n` +
        `⚠️ 四、国内用户特别提醒（务必遵守）\n` +
        `- 不做收益承诺：任何收益以站内规则与链上结果为准。\n` +
        `- 不诱导陌生人：建议分享给真实熟人，避免纠纷。\n` +
        `- 不要代操作：不要帮别人点授权/转账/签名。\n\n` +
        `🔐 五、安全合规警示\n` +
        `- 官方不会索要：助记词/私钥/验证码/远程控制。\n` +
        `- 链上不可逆：涉及转账/授权/提现必须自己确认网络与地址。\n` +
        `- 如遇异常：保留截图与 TxHash，点我头像直接咨询。\n\n` +
        `RWA 运营团队`,
      medium:
        `📢【官方教程】邀请好友推广：合规分享与注意事项（国内用户）\n` +
        `尊敬的 RWA 平台用户：\n\n` +
        `✅ 推广步骤：站内进入【邀请/推荐】→ 复制专属入口 → 分享给真实好友 → 好友按页面完成流程 → 回站内查看记录。\n\n` +
        `⚠️ 合规要点：不做收益承诺；不群发刷屏；不代操作；规则以站内页面为准。\n` +
        `🔐 安全红线：任何索要助记词/私钥/验证码/远程协助的都是诈骗。\n\n` +
        `RWA 运营团队`,
    },
  ],
  afternoon: [],
  night: [],
};

// Reuse same weekly topics across all slots; slot only decides long/medium.
ADMIN_BROADCAST_LIBRARY_WEEKLY.afternoon = ADMIN_BROADCAST_LIBRARY_WEEKLY.morning;
ADMIN_BROADCAST_LIBRARY_WEEKLY.night = ADMIN_BROADCAST_LIBRARY_WEEKLY.morning;

function getShanghaiWeekdayIndex(now: Date): number {
  // Monday=0 ... Sunday=6
  const sh = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Shanghai' }));
  const d = sh.getDay(); // Sunday=0 ... Saturday=6
  return d === 0 ? 6 : d - 1;
}

function formatShanghaiYmd(now: Date): string {
  const sh = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Shanghai' }));
  const y = sh.getFullYear();
  const m = String(sh.getMonth() + 1).padStart(2, '0');
  const d = String(sh.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

class BotService {
  private bots = new Map<string, Bot>();
  private timers = new Map<string, NodeJS.Timeout>();
  private onBotMessage?: (msg: Message & { user: User }, roomId: string) => void;

  // Rolling limiter (in-memory) to enforce emoji ratios at runtime per room.
  private roomEmojiWindow = new Map<
    string,
    { total: number; emoji: number; emojiOnly: number; window: Array<{ e: boolean; eo: boolean }> }
  >();
  private diversityLastLogAt = new Map<string, number>();
  private guardEvalCountByRoom = new Map<string, number>();
  private guardHitCountByRoom = new Map<string, number>();

  private enforceEmojiQuota(roomId: string, input: string, bypass = false): string {
    // 管理员/公告类允许更丰富 emoji，不参与全局限流（否则官方公告风格会被“剥表情”）
    if (bypass) return input.trim();
    const windowSize = 100;
    const emojiMaxRatio = 0.10; // <= 1/10 messages contain emoji
    const emojiOnlyRatioWithinEmoji = 0.20; // ~ 1/5 of emoji-bearing messages are emoji-only

    const raw = input.trim();
    if (!raw) return raw;

    const hasEmoji = containsEmojiLike(raw);
    const emojiOnly = hasEmoji && stripEmojiLike(raw).length === 0;

    const state =
      this.roomEmojiWindow.get(roomId) || { total: 0, emoji: 0, emojiOnly: 0, window: [] as any[] };

    const total = Math.max(1, state.total);
    const emojiRatio = state.emoji / total;
    const emojiOnlyRatio = state.emoji > 0 ? state.emojiOnly / state.emoji : 0;

    let out = raw;
    if (hasEmoji) {
      // Hard cap: once emoji usage exceeds quota, strip emojis from this message.
      if (emojiRatio >= emojiMaxRatio) {
        out = stripEmojiLike(out);
      } else {
        // Within quota: keep emoji-only messages rarer within emoji-bearing ones.
        if (emojiOnly && emojiOnlyRatio >= emojiOnlyRatioWithinEmoji) {
          // Prefer turning emoji-only into plain text instead of adding more emoji-only.
          out = '';
        }
        // Mixed messages within quota are allowed; earlier system prompt already limits count.
      }
    }

    const finalHasEmoji = containsEmojiLike(out);
    const finalEmojiOnly = finalHasEmoji && stripEmojiLike(out).length === 0;

    // Update rolling window counts.
    state.window.push({ e: finalHasEmoji, eo: finalEmojiOnly });
    state.total += 1;
    if (finalHasEmoji) state.emoji += 1;
    if (finalEmojiOnly) state.emojiOnly += 1;
    while (state.window.length > windowSize) {
      const old = state.window.shift()!;
      state.total -= 1;
      if (old.e) state.emoji -= 1;
      if (old.eo) state.emojiOnly -= 1;
    }
    this.roomEmojiWindow.set(roomId, state);

    return out.trim();
  }

  private identityByBotId = new Map<string, BotIdentity>();
  private speakChanceByBotId = new Map<string, number>();
  private punctuationStyleByBotId = new Map<string, PunctuationStyle>();
  private runtimeTuningByBotId = new Map<string, BotRuntimeTuning>();
  private personaIdByBotId = new Map<string, string>(); // runtime bot.id -> persona id (RWA_BOT_XXX)
  private socialGraphByBotId = new Map<string, SocialGraphRuntime>(); // runtime bot.id -> social graph
  private roomLastCrossBotTriggerAt = new Map<string, number>(); // roomId -> ts
  private botLastYieldScreenshotAt = new Map<string, number>(); // botId -> ts
  private roomLastYieldNudgeAt = new Map<string, number>(); // roomId -> ts
  /** 多 Key 分流：槽位决定「主 Key」，失败时再试同池其他 Key */
  private llmGroqSlotByBotId = new Map<string, number>();
  private llmOpenRouterSlotByBotId = new Map<string, number>();
  private llmSiliconFlowSlotByBotId = new Map<string, number>();

  /** 上海日历日 + 当日已出现的机器人发言归一化键（跨房间、含历史消息） */
  private utteranceDayKey = '';
  private utteredKeysToday = new Set<string>();

  private roomLastBotAt = new Map<string, number>(); // roomId -> last bot message time (ms)
  private botLastSentAt = new Map<string, number>(); // botId -> timestamp
  /** 同一主题冷却：roomId -> topicTag -> lastTs */
  private roomTopicLastAt = new Map<string, Map<string, number>>();
  /** 主动插话串行 + 抖动间隔，减轻多 bot 同时打 LLM */
  private ambientQueueTail: Promise<void> = Promise.resolve();
  /**
   * 当 LLM 429/不可用且禁用模板降级时，避免“直接无声”：
   * 记录下一次允许重试的时间点，防止同一 bot 在同一房间被高频调度导致无限排队。
   */
  private llmRetryNextAt = new Map<string, number>();
  /** 仅提示一次：未配置任何 LLM Key 时走内置话术 */
  private loggedFallbackNoLlmKey = false;
  /** 管理员定时播报去重：YYYY-MM-DD:slot:HH:mm */
  private adminBroadcastSentKeys = new Set<string>();

  private personaTopicPools: Record<BotIdentity, PersonaTopicItem[]> | null = null;
  private topicRoundRobinCursor = new Map<string, number>(); // roomId::identity -> idx

  private ensurePersonaTopicPoolsSeeded(): void {
    if (this.personaTopicPools) return;
    const raw = chatService.getBotTopicPools();
    const hasEnough = (k: BotIdentity) => Array.isArray((raw as any)?.[k]) && ((raw as any)?.[k] || []).length >= 12;
    if (hasEnough('beginner') && hasEnough('pro') && hasEnough('wool') && hasEnough('earner') && hasEnough('generic')) {
      this.personaTopicPools = raw as any;
      return;
    }
    const pools = buildPersonaTopicPoolsMinimal();
    chatService.setBotTopicPools(pools as any);
    this.personaTopicPools = pools;
  }

  private scheduleLlmRetry(
    bot: Bot,
    roomId: string,
    opts: { triggeredBy: null | { user: User; content: string; sourceMessageId?: string }; earningsRwa: number | null },
    flags?: { forceBurst?: boolean; chunkyFollowUp?: boolean }
  ): void {
    const replyToHuman = Boolean(opts.triggeredBy);
    const mode = replyToHuman ? 'reply' : 'ambient';
    const key = `${bot.id}:${roomId}:${mode}`;
    const now = Date.now();
    const nextAt = this.llmRetryNextAt.get(key) ?? 0;
    if (now < nextAt) return;

    const base = readEnvInt('BOT_LLM_RETRY_MS', replyToHuman ? 25_000 : 120_000, 5_000, 900_000);
    const jitter = Math.floor(Math.random() * Math.max(1, Math.floor(base * 0.35)));
    const delay = base + jitter;
    this.llmRetryNextAt.set(key, now + delay - 500);

    console.warn(
      `[Bot] ${bot.name}: LLM unavailable and template fallback disabled — scheduled ${mode} retry in ${delay}ms room=${roomId}`
    );
    setTimeout(() => {
      void this.executeBotMessage(bot, roomId, opts, flags).catch(() => {});
    }, delay);
  }

  private pickPersonaTopicRoundRobin(bot: Bot, roomId: string): PersonaTopicItem | null {
    this.ensurePersonaTopicPoolsSeeded();
    const pools = this.personaTopicPools;
    if (!pools) return null;
    const id: BotIdentity = this.identityByBotId.get(bot.id) ?? 'generic';
    const list = pools[id] || pools.generic || [];
    if (!list.length) return null;
    const key = `${roomId}::${id}`;
    const cursor = this.topicRoundRobinCursor.get(key) ?? 0;
    const sorted = [...list].sort((a, b) => a.id.localeCompare(b.id));
    const item = sorted[cursor % sorted.length] || null;
    if (item) this.topicRoundRobinCursor.set(key, cursor + 1);
    return item;
  }

  setMessageCallback(cb: (msg: Message & { user: User }, roomId: string) => void) {
    this.onBotMessage = cb;
  }

  getAllBots(): Bot[] {
    return Array.from(this.bots.values());
  }

  /**
   * Manual admin broadcast trigger (for testing / ops).
   * - weekdayIdx: 0=Mon ... 6=Sun
   * - slot: affects long/medium selection by default
   */
  triggerAdminBroadcastManual(opts: {
    roomIds: string[];
    weekdayIdx: number;
    slot?: AdminBroadcastSlot;
    variant?: AdminBroadcastVariant;
    now?: Date;
    force?: boolean;
  }): { ok: boolean; error?: string; sent: number } {
    const now = opts.now || new Date();
    const weekdayIdx = Math.max(0, Math.min(6, Math.floor(opts.weekdayIdx)));
    const slot: AdminBroadcastSlot = (opts.slot as AdminBroadcastSlot) || 'morning';
    const variant: AdminBroadcastVariant = opts.variant || adminPickVariantBySlot(slot);

    const bot =
      Array.from(this.bots.values()).find((b) => b.role === 'admin_support') ||
      Array.from(this.bots.values()).find((b) => b.role === 'group_owner');
    if (!bot) return { ok: false, error: 'admin bot not found', sent: 0 };

    const pool = ADMIN_BROADCAST_LIBRARY_WEEKLY[slot] || ADMIN_BROADCAST_LIBRARY_WEEKLY.morning;
    const topic = pool[weekdayIdx % pool.length] || pool[0];
    if (!topic) return { ok: false, error: 'broadcast pool empty', sent: 0 };

    const raw = topic[variant] || topic.long || topic.medium || '';
    if (!raw.trim()) return { ok: false, error: 'broadcast body empty', sent: 0 };

    const dateLine = `🗓️ 日期：${formatShanghaiYmd(now)}`;
    const body = `${raw}\n\n${dateLine}\n\n💬 需要我一步步帮你核对操作？点我头像直接咨询。`;

    let sent = 0;
    for (const roomId of opts.roomIds || []) {
      if (!roomId || !chatService.getRoom(roomId)) continue;
      if (opts.force !== true && this.wasSameTextRecently(roomId, bot.userId, body, 15 * 60_000)) continue;
      const msg = this.pushBotChatMessage(roomId, bot, body, 'text');
      if (msg) {
        sent += 1;
        this.rememberUtteranceToday(body);
        this.rememberRoomTopic(roomId, body);
      }
    }
    return { ok: sent > 0, sent };
  }

  getBot(botId: string): Bot | undefined {
    return this.bots.get(botId);
  }

  private async fetchJsonWithTimeout(url: string, timeoutMs = 4000): Promise<any | null> {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), Math.max(800, timeoutMs));
      const res = await fetch(url, { signal: ctrl.signal });
      clearTimeout(t);
      if (!res.ok) return null;
      return await res.json().catch(() => null);
    } catch {
      return null;
    }
  }

  /**
   * 从主后端拉取单地址聚合数据（数据库索引 + portfolio/earnings 等链上同步视图），注入 LLM。
   * - dm：官方客服私聊触发画像
   * - support_sheet：移动端底部在线客服弹层（用户已连接钱包时）
   */
  private async buildUserDataSnapshotForAddress(addr: string, mode: 'dm' | 'support_sheet'): Promise<string> {
    const addrLower = String(addr || '').toLowerCase();
    if (!/^0x[a-f0-9]{40}$/.test(addrLower)) return '';

    const apiBase = String(process.env.BACKEND_API_BASE || 'http://127.0.0.1:3001').replace(/\/$/, '');
    const [allRaw, withdrawRaw, levelRaw, todayYieldRaw, stakesRaw, stakeListRaw, teamRaw, referralOverviewRaw, withdrawListRaw, earningsRaw, portfolioRaw, historyRaw, referralRewardsRaw, referralRewardsDetailRaw] = await Promise.all([
      this.fetchJsonWithTimeout(`${apiBase}/api/data/${addrLower}/all`, 4500),
      this.fetchJsonWithTimeout(`${apiBase}/api/withdraw-v2/${addrLower}`, 4500),
      this.fetchJsonWithTimeout(`${apiBase}/api/user/${addrLower}/level-info`, 4500),
      this.fetchJsonWithTimeout(`${apiBase}/api/data/${addrLower}/today-yield`, 4500),
      this.fetchJsonWithTimeout(`${apiBase}/api/data/${addrLower}/stakes`, 4500),
      this.fetchJsonWithTimeout(`${apiBase}/api/data/${addrLower}/stake-list`, 4500),
      this.fetchJsonWithTimeout(`${apiBase}/api/data/${addrLower}/team`, 4500),
      this.fetchJsonWithTimeout(`${apiBase}/api/data/${addrLower}/referral-network-overview`, 4500),
      this.fetchJsonWithTimeout(`${apiBase}/api/data/${addrLower}/withdraw-list`, 4500),
      this.fetchJsonWithTimeout(`${apiBase}/api/v2/earnings/${addrLower}`, 4500),
      this.fetchJsonWithTimeout(`${apiBase}/api/v2/portfolio/${addrLower}`, 4500),
      this.fetchJsonWithTimeout(`${apiBase}/api/history/${addrLower}`, 4500),
      this.fetchJsonWithTimeout(`${apiBase}/api/referral-rewards/${addrLower}`, 4500),
      this.fetchJsonWithTimeout(`${apiBase}/api/referral-rewards-detail/${addrLower}`, 4500),
    ]);

    const all = allRaw?.success ? allRaw : null;
    const wd = withdrawRaw?.success ? withdrawRaw : null;
    const lv = levelRaw?.success ? levelRaw : null;
    const ty = todayYieldRaw?.success ? todayYieldRaw : null;
    const stakes = stakesRaw?.success ? stakesRaw : null;
    const stakeList = stakeListRaw?.success ? stakeListRaw : null;
    const team = teamRaw?.success ? teamRaw : null;
    const referralOverview = referralOverviewRaw?.success ? referralOverviewRaw : null;
    const withdrawList = withdrawListRaw?.success ? withdrawListRaw : null;
    const earnings = earningsRaw?.success ? earningsRaw : null;
    const portfolio = portfolioRaw?.success ? portfolioRaw : null;
    const history = historyRaw?.success ? historyRaw : null;
    const referralRewards = referralRewardsRaw?.success ? referralRewardsRaw : null;
    const referralRewardsDetail = referralRewardsDetailRaw?.success ? referralRewardsDetailRaw : null;
    if (!all && !wd && !lv && !ty && !stakes && !stakeList && !team && !referralOverview && !withdrawList && !earnings && !portfolio && !history && !referralRewards && !referralRewardsDetail) return '';

    const compactJson = (v: any, max = 900): string => {
      try {
        const s = JSON.stringify(v ?? null);
        if (s.length <= max) return s;
        return `${s.slice(0, max)}...(truncated)`;
      } catch {
        return 'null';
      }
    };
    const toNum = (v: any): number | null => {
      if (v == null) return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };
    const weiToToken = (v: any, decimals = 18): number | null => {
      if (v == null) return null;
      const s = String(v).trim();
      if (!/^-?\d+$/.test(s)) {
        const n = Number(s);
        return Number.isFinite(n) ? n : null;
      }
      const neg = s.startsWith('-');
      const abs = neg ? s.slice(1) : s;
      const padded = abs.padStart(decimals + 1, '0');
      const intPart = padded.slice(0, -decimals);
      const fracPart = padded.slice(-decimals).replace(/0+$/, '');
      const composed = `${neg ? '-' : ''}${intPart}${fracPart ? `.${fracPart}` : ''}`;
      const n = Number(composed);
      return Number.isFinite(n) ? n : null;
    };
    const fmt = (n: number | null, digits = 6): string => {
      if (n == null || !Number.isFinite(n)) return '暂无可用数据';
      return Number(n.toFixed(digits)).toString();
    };
    /** 后台 nodeLevel 1–9 → 对用户统一称 L1–L9（禁止模型再脑补成 V1–V5） */
    const formatNodeTierLabel = (v: any): string => {
      const n = toNum(v);
      if (n == null || !Number.isFinite(n)) return '暂无可用数据';
      const tier = Math.floor(n);
      if (tier < 1 || tier > 9) return '暂无可用数据';
      return `L${tier}`;
    };
    const nodeTierLabel = formatNodeTierLabel(lv?.data?.nodeLevel);
    const toReadableAmount = (v: any): string => {
      const n = toNum(v);
      if (n == null) return '暂无可用数据';
      const maybeWei = Math.abs(n) >= 1e9;
      const human = maybeWei ? n / 1e18 : n;
      return fmt(human, 8);
    };
    const readableStakes = stakes?.data
      ? {
          rwaStaked: toReadableAmount(stakes.data.rwaStaked),
          usdtStaked: toReadableAmount(stakes.data.usdtStaked),
          source: stakes?.source || 'database',
        }
      : null;
    const readableStakeList = Array.isArray(stakeList?.data)
      ? stakeList.data.slice(0, 20).map((x: any) => ({
          stakeId: x?.stakeId ?? null,
          amount: toReadableAmount(x?.amount),
          assetType: x?.assetType ?? null,
          lockPeriod: x?.lockPeriod ?? null,
          timestamp: x?.timestamp ?? null,
          blockNumber: x?.blockNumber ?? null,
          txHash: x?.txHash ?? null,
        }))
      : null;

    const lines: string[] = [];
    if (mode === 'support_sheet') {
      lines.push(
        '=== SUPPORT_SHEET_VERIFIED_USER_DATA (主后端数据库与索引 API；portfolio/earnings 等含链上同步视图) ==='
      );
    } else {
      lines.push('=== PRIVATE_SELF_PROFILE (DM_ONLY) ===');
    }
    lines.push(`address: ${addrLower}`);
    if (wd?.data) {
      lines.push(
        `withdrawOverviewReadable: totalUSD=${wd.data.totalUSD ?? '-'}, yieldAmount=${wd.data.yieldAmount ?? '-'}, usdtPrincipal=${wd.data.usdtPrincipal ?? '-'}, rwaPrincipal=${wd.data.rwaPrincipal ?? '-'}`
      );
    }
    // Normalized numeric summary: bot MUST prefer these human-readable fields.
    const normalized = {
      stakedRwa: weiToToken(stakes?.data?.rwaStaked),
      stakedUsdt: weiToToken(stakes?.data?.usdtStaked),
      todayYieldRwa: toNum(ty?.data?.totalRwa),
      withdrawTotalUsd: toNum(wd?.data?.totalUSD),
      teamVolumeUsdtEq: weiToToken(lv?.data?.teamVolume),
      teamRetainedUsdtEq: weiToToken(lv?.data?.teamRetained),
      nodeLevel: toNum(lv?.data?.nodeLevel),
    };
    lines.push(
      `normalizedSummary: stakedRwa=${fmt(normalized.stakedRwa)}, stakedUsdt=${fmt(normalized.stakedUsdt)}, todayYieldRwa=${fmt(normalized.todayYieldRwa)}, withdrawTotalUsd=${fmt(normalized.withdrawTotalUsd)}, teamVolumeUsdtEq=${fmt(normalized.teamVolumeUsdtEq)}, teamRetainedUsdtEq=${fmt(normalized.teamRetainedUsdtEq)}, nodeLevel=${nodeTierLabel}`
    );
    lines.push('readOnlyPolicy: 你只能读取并解释数据，不能执行任何写入/修改/转账/代操作。');
    lines.push('queryPolicy: 先理解用户自然语言意图，再从最相关字段回答；找不到就明确说暂无可用数据，不要编造。');
    lines.push('amountPolicy: 官方客服所有金额/数量字段必须使用可读值（human-readable），严禁输出原始 wei 大整数或科学计数法。若字段缺失，明确写“暂无可用数据”，不要推算。');
    lines.push(`dataSource.todayYield: ${compactJson(ty?.data, 300)}`);
    lines.push(`dataSource.withdrawV2: ${compactJson(wd?.data, 600)}`);
    lines.push(`dataSource.levelInfo: ${compactJson({ nodeLevel: lv?.data?.nodeLevel ?? null, nodeTierLabel }, 200)}`);
    lines.push(
      'nodeTierWording (HARD): 上列 nodeLevel 为链上/库内整数 1–9，与 L1–L9 一一对应；向用户说明档位时必须使用「L」前缀（如 L1），禁止使用已废弃的 V1–V5 叫法。'
    );
    lines.push(`dataSource.stakesReadable: ${compactJson(readableStakes, 600)}`);
    lines.push(`dataSource.stakeListReadable: ${compactJson(readableStakeList, 1200)}`);
    lines.push(`dataSource.team: ${compactJson({ directReferrals: team?.data?.directReferrals ?? null, teamDownlineCount: team?.data?.teamDownlineCount ?? null }, 240)}`);
    lines.push(`dataSource.referralNetworkOverview: ${compactJson(referralOverview?.data, 1100)}`);
    lines.push(`dataSource.withdrawList: ${compactJson(withdrawList?.data, 1000)}`);
    lines.push(`dataSource.earningsV2: ${compactJson(earnings?.data, 700)}`);
    lines.push(`dataSource.portfolioV2: ${compactJson(portfolio?.data, 700)}`);
    lines.push(`dataSource.history: ${compactJson(history, 900)}`);
    lines.push(`dataSource.referralRewards: ${compactJson(referralRewards, 900)}`);
    lines.push(`dataSource.referralRewardsDetail: ${compactJson(referralRewardsDetail, 900)}`);
    if (mode === 'support_sheet') {
      lines.push(
        'policy: 用户已通过站内连接的钱包标识为本地址本人；仅用本节回答该地址相关问题。缺失字段说明「后台暂无同步记录」并建议核对仪表板与 BSCScan。禁止把本节用于其他地址。'
      );
      lines.push(
        'dataAuthority: 质押/收益/提现/团队/节点等账户事实必须优先引用本节；与知识库冲突时以本节及链上为准；金额一律可读小数，禁止 wei 裸整数。'
      );
    } else {
      lines.push('policy: 只能回答该触发用户本人数据；若请求他人信息，必须拒绝并提示隐私限制。');
    }
    return lines.join('\n');
  }

  /**
   * 仅在“官方客服 + 私聊 + 用户主动触发”时，读取该用户本人画像。
   * 严禁群聊场景注入，避免任何跨用户信息泄露。
   */
  private async buildPrivateSelfProfileBlock(
    roomId: string,
    isAdminBot: boolean,
    triggeredBy: null | { user: User; content: string; sourceMessageId?: string }
  ): Promise<string> {
    if (!isAdminBot || !triggeredBy) return '';
    const room = chatService.getRoom(roomId);
    if (!room || room.type !== 'dm') return '';
    if (!room.memberIds.includes(triggeredBy.user.id)) return '';
    const addr = String(triggeredBy.user.address || '').toLowerCase();
    if (!/^0x[a-f0-9]{40}$/.test(addr)) return '';
    return this.buildUserDataSnapshotForAddress(addr, 'dm');
  }

  private isSelfProfileQuestion(text: string): boolean {
    const t = String(text || '').toLowerCase();
    if (!t) return false;
    const keys = [
      '我现在什么情况',
      '我的情况',
      '帮我看下我',
      '看看我',
      '我的数据',
      '我的余额',
      '我的质押',
      '我的收益',
      '今天收益',
      '今日收益',
      '我今天的收益',
      '帮我查一下我今天的收益',
      '帮我查收益',
      '我的提现',
      'my status',
      'my profile',
      'my balance',
      'my stake',
      'my rewards',
      'my withdraw',
    ];
    if (keys.some((k) => t.includes(k))) return true;
    if (/(我|帮我|给我).*(今天|今日).*(收益|收入|到账|回报)/.test(t)) return true;
    if (/(我|帮我|给我).*(总共|一共|累计|目前|现在).*(质押|收益|收入|提现|推荐|团队|节点|余额|持仓|本金)/.test(t)) {
      return true;
    }
    if (/(我|帮我|给我).*(质押|收益|收入|提现|推荐|团队|节点|余额|持仓|本金).*(多少|几|明细|列表|总额)/.test(t)) {
      return true;
    }
    return false;
  }

  private isStakeMaturityQuestion(text: string): boolean {
    const t = String(text || '').toLowerCase();
    if (!t) return false;
    if (/(多久|什么时候|何时|几号).*(到期|解锁|结束|赎回|可提)/.test(t)) return true;
    if (/(到期|解锁|结束|赎回|可提).*(多久|什么时候|何时|几号)/.test(t)) return true;
    if (/(我的|我现在|帮我|给我).*(质押).*(到期|解锁|结束|赎回|可提)/.test(t)) return true;
    return false;
  }

  private normalizeTsToMs(v: unknown): number | null {
    const n = Number(v);
    if (!Number.isFinite(n) || n <= 0) return null;
    if (n > 1e12) return Math.floor(n);
    if (n > 1e9) return Math.floor(n * 1000);
    return null;
  }

  private async buildDeterministicStakeMaturityReply(
    roomId: string,
    isAdminBot: boolean,
    triggeredBy: null | { user: User; content: string; sourceMessageId?: string }
  ): Promise<string | null> {
    if (!isAdminBot || !triggeredBy) return null;
    const room = chatService.getRoom(roomId);
    if (!room || room.type !== 'dm') return null;
    if (!room.memberIds.includes(triggeredBy.user.id)) return null;
    const addr = String(triggeredBy.user.address || '').toLowerCase();
    if (!/^0x[a-f0-9]{40}$/.test(addr)) return null;

    const apiBase = String(process.env.BACKEND_API_BASE || 'http://127.0.0.1:3001').replace(/\/$/, '');
    const raw = await this.fetchJsonWithTimeout(`${apiBase}/api/data/${addr}/stake-list`, 4500);
    const list = Array.isArray(raw?.data) ? raw.data : [];
    const fmtAmount = (v: unknown): string => {
      const s = String(v ?? '').trim();
      if (!s) return '0';
      const n = Number(s);
      if (!Number.isFinite(n)) return s;
      // stake-list amount is usually base-unit (wei); convert for human display.
      const token = Math.abs(n) >= 1e9 ? n / 1e18 : n;
      const fixed = Number(token.toFixed(8));
      return Number.isFinite(fixed) ? String(fixed) : '0';
    };
    const rows = list
      .filter((x: any) => {
        const lock = Number(x?.lockPeriod);
        const evt = String(x?.assetType || '').toLowerCase();
        return Number.isFinite(lock) && lock > 0 && !/unstake|withdraw|redeem/.test(evt);
      })
      .map((x: any) => {
        const lockDays = Number(x?.lockPeriod);
        const startMs = this.normalizeTsToMs(x?.timestamp);
        if (!startMs || !Number.isFinite(lockDays) || lockDays <= 0) return null;
        const endMs = startMs + Math.floor(lockDays * 24 * 60 * 60 * 1000);
        const now = Date.now();
        const leftDays = Math.ceil((endMs - now) / (24 * 60 * 60 * 1000));
        return {
          amount: fmtAmount(x?.amount),
          asset: String(x?.assetType || 'RWA'),
          lockDays,
          startMs,
          endMs,
          leftDays,
        };
      })
      .filter(Boolean) as Array<{
      amount: string;
      asset: string;
      lockDays: number;
      startMs: number;
      endMs: number;
      leftDays: number;
    }>;

    if (!rows.length) {
      return '我这边暂未查到你的锁仓到期记录（可能当前都是灵活仓，或暂无可用数据）。你可以让我继续按“交易哈希”给你逐笔核对。';
    }

    rows.sort((a, b) => a.endMs - b.endMs);
    const lines = rows.slice(0, 12).map((r, i) => {
      const endText = new Date(r.endMs).toLocaleString('zh-CN', { hour12: false });
      const startText = new Date(r.startMs).toLocaleString('zh-CN', { hour12: false });
      const leftText = r.leftDays <= 0 ? '已到期' : `约 ${r.leftDays} 天后到期`;
      return `- 第${i + 1}笔：${r.amount} ${r.asset}｜锁仓 ${r.lockDays} 天｜开始 ${startText}｜到期 ${endText}（${leftText}）`;
    });

    return [
      '### 你的质押到期时间',
      ...lines,
      '',
      '说明：以上按“开始时间 + 锁仓天数”逐笔计算；若页面与链上有短暂延迟，请以链上最终确认时间为准。',
    ].join('\n');
  }

  private parseNormalizedSummaryFromBlock(block: string): {
    stakedRwa: string;
    stakedUsdt: string;
    todayYieldRwa: string;
    withdrawTotalUsd: string;
    teamVolumeUsdtEq: string;
    teamRetainedUsdtEq: string;
    nodeLevel: string;
  } | null {
    const line = String(block || '')
      .split('\n')
      .find((x) => x.startsWith('normalizedSummary:'));
    if (!line) return null;
    const pick = (k: string) => {
      const m = line.match(new RegExp(`${k}=([^,\\n]+)`));
      return (m?.[1] || '暂无可用数据').trim();
    };
    return {
      stakedRwa: pick('stakedRwa'),
      stakedUsdt: pick('stakedUsdt'),
      todayYieldRwa: pick('todayYieldRwa'),
      withdrawTotalUsd: pick('withdrawTotalUsd'),
      teamVolumeUsdtEq: pick('teamVolumeUsdtEq'),
      teamRetainedUsdtEq: pick('teamRetainedUsdtEq'),
      nodeLevel: pick('nodeLevel'),
    };
  }

  private buildDeterministicSelfProfileReply(n: {
    stakedRwa: string;
    stakedUsdt: string;
    todayYieldRwa: string;
    withdrawTotalUsd: string;
    teamVolumeUsdtEq: string;
    teamRetainedUsdtEq: string;
    nodeLevel: string;
  }): string {
    return [
      '### 账户总览',
      `- 今日收益（RWA）：${n.todayYieldRwa}`,
      `- 节点等级：${n.nodeLevel}`,
      '',
      '### 质押情况',
      `- 当前质押（RWA）：${n.stakedRwa}`,
      `- 当前质押（USDT）：${n.stakedUsdt}`,
      '',
      '### 收益情况',
      `- 今日收益（RWA）：${n.todayYieldRwa}`,
      '- 若与页面不一致，请以页面刷新后的最新数据为准。',
      '',
      '### 提现与赎回',
      `- 累计提现（USD）：${n.withdrawTotalUsd}`,
      '- 暂无可用赎回明细时会显示为“暂无可用数据”。',
      '',
      '### 节点与团队',
      `- 团队体量（USDT等值）：${n.teamVolumeUsdtEq}`,
      `- 团队留存（USDT等值）：${n.teamRetainedUsdtEq}`,
      '',
      '### 下一步建议',
      '- 如需，我可以继续给你拆分“近7天收益变化”和“每笔质押的到期时间”。',
    ].join('\n');
  }

  private appendSupportLinksByIntent(content: string, userText: string): string {
    const q = String(userText || '').toLowerCase();
    const links: string[] = [];
    if (/质押|stake|锁仓/.test(q)) links.push('质押入口: https://rwa.lat/stake');
    if (/提现|赎回|withdraw/.test(q)) links.push('提现入口: https://rwa.lat/withdraw');
    if (/推荐|邀请|团队|节点|referral/.test(q)) links.push('我的网络: https://rwa.lat/node/network');
    if (/收益|收益率|rewards|earning/.test(q)) links.push('收益页: https://rwa.lat/dashboard');
    if (links.length === 0) links.push('帮助中心: https://rwa.lat/help', '知识库: https://rwa.lat/knowledge');
    return `${content}\n\n相关页面:\n- ${links.join('\n- ')}`;
  }

  private enforceStakeNoGasLine(content: string, userText: string): string {
    const q = String(userText || '').toLowerCase();
    if (!/质押|stake|锁仓/.test(q)) return content;
    const hasNoGas = /不需要.*gas|gas.*系统承担|无需.*gas/i.test(content);
    if (hasNoGas) return content;
    return `${content}\n\n说明: 质押操作不需要你额外支付 Gas 费用，Gas 由系统承担。`;
  }

  createBot(name: string, persona: string, avatar?: string): Bot {
    const botAddress = makeDeterministicBotAddress(`${name}:${persona}:${uuid()}`);
    const botUser = chatService.createUser(botAddress, name, 'L1');
    botUser.isBot = true;
    if (avatar) botUser.avatar = avatar;

    const bot: Bot = {
      id: uuid(),
      userId: botUser.id,
      name,
      persona,
      avatar,
      isActive: false,
      role: 'community',
      roomIds: ['room-general'],
      schedule: {
        enabled: false,
        minIntervalMs: 60_000,
        maxIntervalMs: 300_000,
        activeHoursStart: 8,
        activeHoursEnd: 24,
        timezone: 'Asia/Shanghai',
      },
      createdAt: Date.now(),
    };

    const slots = this.assignLlmSlotsForBotIndex(this.bots.size);
    this.bots.set(bot.id, bot);
    this.punctuationStyleByBotId.set(bot.id, 'mixed');
    this.llmGroqSlotByBotId.set(bot.id, slots.g);
    this.llmOpenRouterSlotByBotId.set(bot.id, slots.o);
    this.llmSiliconFlowSlotByBotId.set(bot.id, slots.s);
    return bot;
  }

  private getPunctuation(bot: Bot): PunctuationStyle {
    const base = this.punctuationStyleByBotId.get(bot.id) ?? 'mixed';
    const missP = Number(this.getRuntimeTuning(bot)?.typing_noise_profile?.missing_punctuation_probability);
    if (!Number.isFinite(missP)) return base;
    const p = clampNum(missP, 0, 0.35);
    if (p <= 0.02) return base;
    // Higher missing-punctuation persona should look less "perfectly punctuated".
    if (base === 'formal' && Math.random() < p * 1.6) return 'mixed';
    if (base === 'mixed' && Math.random() < p * 0.9) return 'casual';
    return base;
  }

  private getRuntimeTuning(bot: Bot): BotRuntimeTuning | undefined {
    return this.runtimeTuningByBotId.get(bot.id);
  }

  private getTypingNoiseAmbientProb(bot: Bot): number {
    const p = this.getRuntimeTuning(bot)?.typing_noise_profile?.typo_probability;
    if (!Number.isFinite(p as number)) return readEnvFloat('BOT_TYPO_AMBIENT_P', 0.012, 0, 0.08);
    return clampNum(Number(p), 0, 0.2) * 0.35;
  }

  private getHumanizeEmojiRate(bot: Bot, punct: PunctuationStyle): number {
    const personaP = Number(this.getRuntimeTuning(bot)?.typing_noise_profile?.emoji_probability);
    const base = punct === 'formal' ? 0.05 : 0.12;
    if (!Number.isFinite(personaP)) return base;
    // Keep emoji rare overall but allow per-persona variance to surface.
    return clampNum(Number(personaP), 0, 0.2);
  }

  private getLengthPersonality(bot: Bot): 'short' | 'normal' | 'long' {
    const voice = this.extractPersonaJsonBlock(bot, 'VOICE_JSON') || {};
    const raw = this.extractPersonaJsonBlock(bot, 'BOTSOUL_RAW_JSON') || {};
    const sentenceLength = String(
      (voice as any)?.sentence_length ||
        (raw as any)?.voice?.sentence_length ||
        (raw as any)?.writing_style?.sentence_length ||
        ''
    )
      .trim()
      .toLowerCase();
    if (/话少|极简|一句|短|micro|very_short/.test(sentenceLength)) return 'short';
    if (/话多|长|详细|long|verbose/.test(sentenceLength)) return 'long';

    const pref = String((raw as any)?.writing_style?.message_length_preference || '')
      .trim()
      .toLowerCase();
    if (/话很少|话极少|惜字如金|极简|很短|简短|一句/.test(pref)) return 'short';
    if (/话比较多|爱聊天|中长|较长|愿意分享/.test(pref)) return 'long';
    return 'normal';
  }

  private getSelfRepeatThreshold(bot: Bot): number {
    const t = this.getRuntimeTuning(bot)?.self_repeat_penalty_profile?.semantic_similarity_threshold;
    if (!Number.isFinite(t as number)) return readEnvFloat('BOT_SELF_REPEAT_SIM_THRESHOLD', 0.7, 0.55, 0.92);
    return clampNum(Number(t), 0.55, 0.95);
  }

  private getRoomSemanticWindowMs(bot: Bot): number {
    const mins = this.getRuntimeTuning(bot)?.cross_bot_collision_profile?.room_semantic_cooldown_minutes;
    if (!Number.isFinite(mins as number)) return readEnvInt('BOT_ROOM_SEMANTIC_WINDOW_MS', 240_000, 30_000, 1_800_000);
    return clampNum(Math.round(Number(mins) * 60_000), 30_000, 1_800_000);
  }

  private getTopicCooldownMs(bot: Bot): number {
    const mins = this.getRuntimeTuning(bot)?.cross_bot_collision_profile?.same_topic_cooldown_minutes;
    if (!Number.isFinite(mins as number)) return readEnvInt('BOT_ROOM_TOPIC_COOLDOWN_MS', 180_000, 30_000, 1_800_000);
    return clampNum(Math.round(Number(mins) * 60_000), 30_000, 1_800_000);
  }

  private getTopicFatigueMaxTurns(bot: Bot): number {
    const n = this.getRuntimeTuning(bot)?.topic_fatigue?.same_topic_max_turns;
    if (!Number.isFinite(n as number)) return 4;
    return clampNum(Math.floor(Number(n)), 1, 12);
  }

  private getColdRoomWakeupMs(bot: Bot): number {
    const mins = this.getRuntimeTuning(bot)?.silence_recovery_profile?.cold_room_wakeup_minutes;
    if (Number.isFinite(mins as number)) {
      return clampNum(Math.round(Number(mins) * 60_000), 60_000, 3_600_000);
    }
    const superEco = readEnvInt('BOT_SUPER_ECO_MODE', 1, 0, 1) === 1;
    return readEnvInt('BOT_COLD_ROOM_QUIET_MS', superEco ? 2_400_000 : 1_800_000, 120_000, 3_600_000);
  }

  private getBurstMaxConsecutiveMessages(bot: Bot): number {
    const n = this.getRuntimeTuning(bot)?.burst_style?.max_consecutive_messages;
    if (!Number.isFinite(n as number)) return 2;
    return clampNum(Math.floor(Number(n)), 1, 5);
  }

  private extractPersonaJsonBlock(bot: Bot, blockName: string): Record<string, unknown> | null {
    const src = String(bot.persona || '');
    const pat = new RegExp(`${blockName}\\s*\\([^\\n]*\\):\\n([^\\n]+)`);
    const m = src.match(pat);
    if (!m?.[1]) return null;
    try {
      const parsed = JSON.parse(m[1]);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as Record<string, unknown>;
      return null;
    } catch {
      return null;
    }
  }

  private getPersonaId(bot: Bot): string {
    const fields = this.extractPersonaJsonBlock(bot, 'PERSONA_FIELDS_JSON');
    return String(fields?.id || '').trim();
  }

  private getSocialGraph(bot: Bot): SocialGraphRuntime | null {
    const raw = this.extractPersonaJsonBlock(bot, 'SOCIAL_GRAPH_JSON');
    if (!raw) return null;
    const g: SocialGraphRuntime = {
      referrer: typeof (raw as any).referrer === 'string' ? String((raw as any).referrer) : undefined,
      known_bots: Array.isArray((raw as any).known_bots) ? (raw as any).known_bots.map((x: any) => String(x)) : undefined,
      downlines: Array.isArray((raw as any).downlines) ? (raw as any).downlines.map((x: any) => String(x)) : undefined,
      cross_bot_triggers: Array.isArray((raw as any).cross_bot_triggers) ? (raw as any).cross_bot_triggers : undefined,
    };
    return g;
  }

  private buildPersonaLivingAnchor(bot: Bot, roomId: string): string {
    const raw = this.extractPersonaJsonBlock(bot, 'BOTSOUL_RAW_JSON') || {};
    const profile = ((raw as any).profile || {}) as Record<string, unknown>;
    const name = String(profile.name || '').trim();
    const nick = String(profile.nickname || '').trim();
    const occ = String(profile.occupation || '').trim();
    const city = String(profile.current_location || profile.hometown || '').trim();
    const income = String(profile.monthly_income_range || '').trim();
    const tags = Array.isArray(profile.personality_tags)
      ? profile.personality_tags.map((x) => String(x).trim()).filter(Boolean)
      : [];

    const memorySeedsRaw = Array.isArray((raw as any).memory_seed) ? (raw as any).memory_seed : [];
    const memorySeeds = memorySeedsRaw
      .map((x: any) => {
        if (typeof x === 'string') return x.trim();
        if (x && typeof x === 'object') return String(x.text || x.seed || x.scene || '').trim();
        return '';
      })
      .filter(Boolean);

    const candidates: string[] = [];
    if (memorySeeds.length) {
      candidates.push(...memorySeeds);
    }
    if (city && occ) candidates.push(`我在${city}做${occ}，今天说话就按这个生活节奏来。`);
    if (occ) candidates.push(`我的职业是${occ}，句子里可以带一点这个行当的口语。`);
    if (city) candidates.push(`我常住在${city}，语感和生活细节尽量贴这个地方。`);
    if (income) candidates.push(`我平时收入区间大致是「${income}」，提钱相关时要和这个量级一致。`);
    if (name || nick) candidates.push(`我本人是${nick || name}，口吻要像熟人聊天，不要客服腔。`);
    if (tags.length) candidates.push(`我的人设标签有：${tags.slice(0, 3).join('、')}，句子里可自然带一点。`);
    if (!candidates.length) return '';

    const msgCount = this.getBotTextCountTodayInRoom(bot, roomId);
    const turnBucket = Math.floor(msgCount / 3); // rotate every 3 bot lines
    const seed = ethers.id(`living-anchor:${bot.id}:${roomId}:${turnBucket}`).slice(2, 10);
    const idx = Number.parseInt(seed, 16) % candidates.length;
    return `\nPERSONA_LIVING_ANCHOR (rotate naturally; do not recite):\n- ${candidates[idx]}\n`;
  }

  private isPersonalityExpression(bot: Bot, text: string): boolean {
    const t = String(text || '').trim();
    if (!t) return false;
    const raw = this.extractPersonaJsonBlock(bot, 'BOTSOUL_RAW_JSON') || {};
    const profile = ((raw as any).profile || {}) as Record<string, unknown>;
    const voice = ((raw as any).voice || {}) as Record<string, unknown>;
    const memorySeedsRaw = Array.isArray((raw as any).memory_seed) ? (raw as any).memory_seed : [];

    const phrases = new Set<string>();
    const tags = Array.isArray(profile.personality_tags) ? profile.personality_tags : [];
    for (const x of tags) {
      const s = String(x || '').trim();
      if (s.length >= 2) phrases.add(s);
    }
    const common = Array.isArray((voice as any).common_phrases) ? (voice as any).common_phrases : [];
    for (const x of common) {
      const s = String(x || '').trim();
      if (s.length >= 2) phrases.add(s);
    }
    const occ = String(profile.occupation || '').trim();
    if (occ.length >= 2) phrases.add(occ);
    const dialect = String((voice as any).dialect_hint || '').trim();
    if (dialect.length >= 2) phrases.add(dialect);
    for (const x of memorySeedsRaw) {
      const s =
        typeof x === 'string'
          ? x.trim()
          : x && typeof x === 'object'
            ? String(x.text || x.seed || x.scene || '').trim()
            : '';
      if (s.length >= 2) phrases.add(s.slice(0, 8));
    }

    for (const p of phrases) {
      if (t.includes(p)) return true;
    }
    return false;
  }

  private buildOccupationContextHint(bot: Bot, triggerText: string): string {
    const t = String(triggerText || '');
    if (!t.trim()) return '';
    const raw = this.extractPersonaJsonBlock(bot, 'BOTSOUL_RAW_JSON') || {};
    const profile = ((raw as any).profile || {}) as Record<string, unknown>;
    const occ = String(profile.occupation || '').trim();
    if (!occ) return '';
    const map: Array<{ re: RegExp; triggers: RegExp; inject: string }> = [
      { re: /网约车|司机|代驾/, triggers: /(收益|到账|今天|提现|确认)/, inject: '（我在等单间隙看的）' },
      { re: /流水线|工厂|车间|技工|质检/, triggers: /(昨天|今天|累|下班|收益)/, inject: '（刚下班缓口气看的）' },
      { re: /外卖|骑手/, triggers: /(天气|今天|单子|收益|到账)/, inject: '（趁休息看了眼）' },
    ];
    for (const item of map) {
      if (item.re.test(occ) && item.triggers.test(t)) {
        return `\nOCCUPATION_CONTEXT_HINT: 你的职业是「${occ}」，本条可自然带一句职业场景尾注${item.inject}，但不要生硬。`;
      }
    }
    return '';
  }

  private maybeTriggerCrossBotReply(roomId: string, speakerBot: Bot, speakerText: string): void {
    // Only community bots participate.
    if (speakerBot.role === 'admin_support' || speakerBot.role === 'group_owner') return;
    const room = chatService.getRoom(roomId);
    if (!room) return;

    // Require recent human presence to avoid bot-only loops (same policy as ambient).
    const lastHumanTs = chatService.getLastHumanMessageTimestamp(roomId);
    const ambientRequireRecentHumanMs = readEnvInt('BOT_AMBIENT_REQUIRE_HUMAN_MS', 1_800_000, 60_000, 86_400_000);
    if (lastHumanTs > 0 && Date.now() - lastHumanTs > ambientRequireRecentHumanMs) return;

    // Room-level throttle: at most one cross-bot trigger every ~60-90s.
    const prev = this.roomLastCrossBotTriggerAt.get(roomId) || 0;
    const gap = readEnvInt('BOT_CROSS_BOT_TRIGGER_GAP_MS', 75_000, 15_000, 600_000);
    if (Date.now() - prev < gap) return;

    const speakerPersonaId = this.personaIdByBotId.get(speakerBot.id) || this.getPersonaId(speakerBot);
    if (!speakerPersonaId) return;

    const candidates = Array.from(this.bots.values()).filter((b) => {
      if (!b.isActive) return false;
      if (b.id === speakerBot.id) return false;
      if (b.role === 'admin_support' || b.role === 'group_owner') return false;
      if (!b.roomIds.includes(roomId)) return false;
      // Personal cooldown: don't fire if bot just spoke recently.
      const lastAt = this.botLastSentAt.get(b.id) || 0;
      const minGap = readEnvInt('BOT_CROSS_BOT_BOT_GAP_MS', 140_000, 20_000, 900_000);
      if (Date.now() - lastAt < minGap) return false;
      return true;
    });
    if (!candidates.length) return;

    const scored = candidates
      .map((b) => {
        const g = this.socialGraphByBotId.get(b.id) || this.getSocialGraph(b) || null;
        if (!g) return null;
        const known = new Set([...(g.known_bots || []), ...(g.downlines || [])].map((x) => String(x)));
        const isReferrer = g.referrer && String(g.referrer) === speakerPersonaId;
        const isDownline = (g.downlines || []).some((x) => String(x) === speakerPersonaId);
        const isKnown = known.has(speakerPersonaId);
        if (!isReferrer && !isDownline && !isKnown) return null;

        // Default probabilities; allow per-graph override via cross_bot_triggers if present.
        let p = isReferrer ? 0.5 : isDownline ? 0.35 : 0.22;
        let styleHint = isReferrer
          ? '这是带我进来的熟人/老工友，语气更熟一点，偶尔带一句“当初你带我进来的”。'
          : isDownline
            ? '这是我带进来的新人/下线，像带新人的老大哥，语气更照顾一点。'
            : '这是我认识的群友，语气自然熟络一点。';
        if (Array.isArray(g.cross_bot_triggers)) {
          const hit = g.cross_bot_triggers.find((t) => String(t?.condition || '').includes(speakerPersonaId));
          if (hit && Number.isFinite(hit.respond_probability as number)) {
            p = clampNum(Number(hit.respond_probability), 0, 0.9);
          }
          if (hit?.style) styleHint = String(hit.style);
        }
        const score = (isReferrer ? 3 : isDownline ? 2 : 1) + p;
        return { bot: b, p, score, kind: isReferrer ? 'referrer' : isDownline ? 'downline' : 'known', styleHint };
      })
      .filter(Boolean) as Array<{ bot: Bot; p: number; score: number; kind: string; styleHint: string }>;

    if (!scored.length) return;
    scored.sort((a, b) => b.score - a.score);
    const pick = scored[0]!;
    if (Math.random() > pick.p) return;

    this.roomLastCrossBotTriggerAt.set(roomId, Date.now());
    const delay = 1_800 + Math.floor(Math.random() * 3_600);
    setTimeout(() => {
      // Final check before firing.
      const lastAt = this.botLastSentAt.get(pick.bot.id) || 0;
      if (Date.now() - lastAt < 25_000) return;
      void this.executeBotMessage(
        pick.bot,
        roomId,
        { triggeredBy: null, earningsRwa: null },
        { forceBurst: true, socialTrigger: { kind: pick.kind, speakerPersonaId, speakerText, styleHint: pick.styleHint } }
      ).catch(() => {});
    }, delay);
  }

  private getTypingSplitHabit(bot: Bot): boolean {
    const block = this.extractPersonaJsonBlock(bot, 'TYPING_BEHAVIOR_JSON');
    const v = block?.message_split_habit;
    if (typeof v === 'boolean') return v;
    // Backward compat: reuse burst supports_split_sentences if present.
    return Boolean(this.getRuntimeTuning(bot)?.burst_style?.supports_split_sentences);
  }

  private getTypingSplitMaxChars(bot: Bot): number {
    const block = this.extractPersonaJsonBlock(bot, 'TYPING_BEHAVIOR_JSON');
    const n = Number(block?.max_chars_per_part ?? block?.split_trigger_chars ?? 20);
    if (!Number.isFinite(n)) return 20;
    return clampNum(Math.floor(n), 8, 60);
  }

  private shouldSendYieldScreenshot(
    bot: Bot,
    roomId: string,
    trigger: YieldScreenshotTrigger,
    earningsRwa: number | null,
    askedText?: string
  ): { ok: boolean; amount: number; delayMs: number } {
    if (readEnvInt('BOT_CHAT_BOT_IMAGE_ENABLED', 1, 0, 1) !== 1) {
      return { ok: false, amount: 0, delayMs: 0 };
    }
    const now = Date.now();
    const last = this.botLastYieldScreenshotAt.get(bot.id) || 0;
    const cooldownMin = readEnvInt('BOT_YIELD_SCREENSHOT_COOLDOWN_MIN', 180, 10, 1440);
    if (now - last < cooldownMin * 60_000) return { ok: false, amount: 0, delayMs: 0 };

    const raw = this.extractPersonaJsonBlock(bot, 'BOTSOUL_RAW_JSON') || {};
    const habit = (raw as any).screenshot_share_habit;
    const triggerCfg = ((raw as any).screenshot_trigger || {}) as Record<string, unknown>;
    const enabled = typeof habit === 'boolean' ? habit : readEnvInt('BOT_YIELD_SCREENSHOT_DEFAULT_ON', 1, 0, 1) === 1;
    if (!enabled) return { ok: false, amount: 0, delayMs: 0 };

    const baseP = Number(
      (triggerCfg as any).probability ??
      (trigger === 'yield_just_arrived' ? 0.26 : trigger === 'someone_asks_about_yield' ? 0.18 : 0.12)
    );
    const p = clampNum(Number.isFinite(baseP) ? baseP : 0.18, 0, 0.9);
    if (Math.random() > p) return { ok: false, amount: 0, delayMs: 0 };

    // Enforce daily 8:00+ payout narrative: "yield_just_arrived" only inside earnings window.
    if (trigger === 'yield_just_arrived' && !isInEarningsDistributionWindow(new Date(now))) {
      return { ok: false, amount: 0, delayMs: 0 };
    }
    if (trigger === 'someone_asks_about_yield') {
      const q = String(askedText || '');
      if (!/(收益|回报|到账|日收益|昨天收益|今天收益|投了多少|仓位)/.test(q)) {
        return { ok: false, amount: 0, delayMs: 0 };
      }
    }

    const delaySec = Number((triggerCfg as any).delay_before_send_sec);
    const delayMs = Number.isFinite(delaySec)
      ? clampNum(Math.round(delaySec * 1000), 1200, 20_000)
      : 2200 + Math.floor(Math.random() * 5800);

    const amount = Number.isFinite(earningsRwa as number)
      ? Number(earningsRwa)
      : 9 + Math.floor(Math.random() * 120);
    return { ok: true, amount, delayMs };
  }

  private maybeSendYieldScreenshot(
    bot: Bot,
    roomId: string,
    trigger: YieldScreenshotTrigger,
    earningsRwa: number | null,
    askedText?: string
  ): void {
    const dec = this.shouldSendYieldScreenshot(bot, roomId, trigger, earningsRwa, askedText);
    if (!dec.ok) return;

    const addr = chatService.getUser(bot.userId)?.address || '';
    const shortAddr = addr
      ? `${addr.slice(0, 6)}...${addr.slice(-4)}`
      : `${bot.name.slice(0, 2)}...${bot.name.slice(-1)}`;
    const phoneEnv = String(process.env.BOT_YIELD_SCREENSHOT_PHONE || '').trim().toLowerCase();
    const phoneStatus: PhoneStatusStyle | undefined =
      phoneEnv === 'ios_notch' || phoneEnv === 'ios_dynamic' || phoneEnv === 'android'
        ? phoneEnv
        : undefined;
    const styles: PhoneStatusStyle[] = ['ios_dynamic', 'ios_notch', 'android'];
    const phoneFallback = styles[(bot.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 3) || 0]!;

    let cards: ActivityCardSpec[] | undefined;
    let screenshotPreset: ActivityScreenshotPreset | undefined;
    let faListCount: number | undefined;
    const rawSoul = this.extractPersonaJsonBlock(bot, 'BOTSOUL_RAW_JSON') as Record<string, unknown> | null;
    const fa = rawSoul && typeof rawSoul === 'object' ? (rawSoul as any).fund_activity_screenshot : null;
    const presetEnv = String(process.env.BOT_YIELD_SCREENSHOT_PRESET || '').trim().toLowerCase();
    if (presetEnv === 'ref_a' || presetEnv === 'ref_b' || presetEnv === 'ref_c') {
      screenshotPreset = presetEnv;
    }
    if (fa && typeof fa === 'object') {
      const p = String((fa as any).preset || '').trim().toLowerCase();
      if (p === 'ref_a' || p === 'ref_b' || p === 'ref_c') screenshotPreset = p;
      const lc = Number((fa as any).listCount ?? (fa as any).list_count);
      if (Number.isFinite(lc) && lc > 0) faListCount = Math.round(lc);
    }
    if (fa && Array.isArray((fa as any).cards)) {
      try {
        cards = (fa as any).cards
          .map((c: any) => {
            const k = String(c.kind || 'staking_yield');
            const kind = (
              ['staking_yield', 'staking_rwa', 'withdraw', 'referral_reward'].includes(k) ? k : 'staking_yield'
            ) as ActivityCardSpec['kind'];
            const tagText = c.tagText != null && String(c.tagText).trim() ? String(c.tagText).trim() : undefined;
            const pillPurple = c.pillPurple === true || c.pillPurple === 'true' || c.pill_purple === true;
            return {
              kind,
              time: String(c.time || ''),
              amountLabel: String(c.amountLabel || ''),
              block: String(c.block ?? '—'),
              hashShort: String(c.hashShort || ''),
              ...(tagText ? { tagText } : {}),
              ...(pillPurple ? { pillPurple: true } : {}),
            };
          })
          .filter((c: ActivityCardSpec) => c.time && c.amountLabel);
      } catch {
        cards = undefined;
      }
    }

    // 发图时刻：状态栏 HH:mm 与 ts / statusBarTimeMs 一致（上海时区渲染，见 bot-yield-screenshot）
    const publishedAtMs = Date.now();
    const url = createYieldScreenshotImage({
      botName: bot.name,
      botAddressShort: shortAddr,
      amountRwa: dec.amount,
      ts: publishedAtMs,
      statusBarTimeMs: publishedAtMs,
      trigger,
      phoneStatus: phoneStatus || phoneFallback,
      ...(screenshotPreset ? { preset: screenshotPreset } : {}),
      ...(faListCount != null ? { listCount: faListCount } : {}),
      ...(cards && cards.length ? { cards } : {}),
    });
    if (!url) return;

    this.botLastYieldScreenshotAt.set(bot.id, Date.now());
    setTimeout(() => {
      this.rememberUtteranceToday(url);
      this.pushBotChatMessage(roomId, bot, url, 'image');
    }, dec.delayMs);
  }

  private getReplyMaxChars(bot: Bot, now: Date, replyToHuman: boolean): number {
    const h = getShanghaiHour(now);
    const dist = this.extractPersonaJsonBlock(bot, 'REPLY_LENGTH_DISTRIBUTION_JSON') || {};
    const base = Number(dist?.default_max_chars ?? dist?.max_chars ?? NaN);
    const lp = this.getLengthPersonality(bot);
    const byPersonality = lp === 'short' ? 25 : lp === 'long' ? 100 : 60;
    let maxChars = Number.isFinite(base) ? Math.floor(base) : byPersonality;
    // Time-of-day realism overrides
    if (h >= 23 || h < 6) maxChars = Math.min(maxChars, 34);
    else if (h >= 12 && h < 14) maxChars = Math.min(maxChars, 42);
    else if (h >= 6 && h < 9) maxChars = Math.min(maxChars, 44);
    // If persona prefers micro replies, further clamp.
    const full = this.extractPersonaJsonBlock(bot, 'BOTSOUL_FULL_FIELDS_JSON') as Record<string, unknown> | null;
    const ws = (full && (full as any).writing_style) || null;
    const personaPref = String((ws as any)?.message_length_preference || '');
    if (/micro|短|很短|一句/.test(personaPref)) maxChars = Math.min(maxChars, 26);
    if (replyToHuman) maxChars = Math.min(180, Math.max(36, Math.floor(maxChars * 1.22)));
    return clampNum(maxChars, 16, 180);
  }

  private getPreferredReplyChars(bot: Bot): number {
    const lp = this.getLengthPersonality(bot);
    return lp === 'short' ? 10 : lp === 'long' ? 45 : 25;
  }

  private getBotTextCountToday(bot: Bot): number {
    const since = getShanghaiMidnightUtcMs();
    let count = 0;
    for (const roomId of bot.roomIds) {
      const msgs = chatService.getMessages(roomId, 320);
      for (let i = msgs.length - 1; i >= 0; i--) {
        const m = msgs[i]!;
        if (m.timestamp < since) break;
        if (m.userId === bot.userId && m.type === 'text') count += 1;
      }
    }
    return count;
  }

  private getBotTextCountTodayInRoom(bot: Bot, roomId: string): number {
    const since = getShanghaiMidnightUtcMs();
    const msgs = chatService.getMessages(roomId, 360);
    let count = 0;
    for (let i = msgs.length - 1; i >= 0; i--) {
      const m = msgs[i]!;
      if (m.timestamp < since) break;
      if (m.userId === bot.userId && m.type === 'text') count += 1;
    }
    return count;
  }

  private isColdStartMessage(bot: Bot, roomId: string): boolean {
    return this.getBotTextCountTodayInRoom(bot, roomId) < 3;
  }

  private validateColdStartReply(bot: Bot, reply: string): boolean {
    const raw = this.extractPersonaJsonBlock(bot, 'BOTSOUL_RAW_JSON') || {};
    const profile = ((raw as any).profile || {}) as Record<string, unknown>;
    const occ = String(profile.occupation || '').trim();
    const city = String(profile.current_location || profile.hometown || '').trim();
    const hasOcc = occ.length >= 2 && reply.includes(occ);
    const hasCity = city.length >= 2 && reply.includes(city);
    const hasYield = /\d+(\.\d+)?\s*(rwa|usdt|u)|每天.{0,8}\d+/.test(reply.toLowerCase());
    return hasOcc || hasCity || hasYield;
  }

  private looksThirdPersonSelfReference(bot: Bot, reply: string): boolean {
    const t = String(reply || '').trim();
    if (!t) return false;
    const pf = this.extractPersonaJsonBlock(bot, 'PERSONA_FIELDS_JSON') || {};
    const name = String((pf as any).name || '').trim();
    const nick = String((pf as any).nickname || '').trim();
    const selfNames = Array.from(new Set([name, nick].filter((x) => x && x.length >= 2)));
    for (const n of selfNames) {
      if (new RegExp(`${n}(这边|这儿|这里|本人)`).test(t)) return true;
      if (new RegExp(`^${n}说`).test(t)) return true;
    }
    if (/问你/.test(t) && /我/.test(t)) return true;
    return false;
  }

  private validateInvestAmountReply(bot: Bot, investedUsdt: number | null, reply: string): boolean {
    const t = String(reply || '').trim();
    if (!t) return false;
    // Must answer in first person and avoid "问你" framing.
    if (/问你/.test(t)) return false;
    if (this.looksThirdPersonSelfReference(bot, t)) return false;
    if (typeof investedUsdt === 'number' && Number.isFinite(investedUsdt) && investedUsdt > 0) {
      const n = String(Math.round(investedUsdt));
      if (!new RegExp(`${n}\\s*(u|U|usdt|USDT)?`).test(t)) return false;
    } else {
      // At least include a small number-like anchor (avoid full evasion)
      if (!/\\d/.test(t)) return false;
    }
    // Avoid drifting into yield narrative when only asked amount.
    if (/(每天|日收益|收益每天|一天|发放).{0,8}\\d/.test(t) || /RWA/.test(t)) return false;
    return true;
  }

  private getSilenceReadWithoutReplyRatio(bot: Bot): number {
    const block = this.extractPersonaJsonBlock(bot, 'SILENCE_POLICY_JSON');
    const p = Number(block?.read_without_reply_ratio ?? block?.force_skip_probability);
    if (!Number.isFinite(p)) return 0.52;
    return clampNum(p, 0.2, 0.92);
  }

  private getSilenceMaxReplies5Min(bot: Bot): number {
    const block = this.extractPersonaJsonBlock(bot, 'SILENCE_POLICY_JSON');
    const n = Number(block?.skip_if_already_replied_count_in_5min);
    if (!Number.isFinite(n)) return 2;
    return clampNum(Math.floor(n), 1, 6);
  }

  private hasRepliedTooMuchRecently(bot: Bot, roomId: string): boolean {
    const recent = chatService.getMessages(roomId, 120);
    const now = Date.now();
    const count = recent.filter((m) => m.userId === bot.userId && now - m.timestamp <= 5 * 60_000).length;
    return count >= this.getSilenceMaxReplies5Min(bot);
  }

  private enforceConversationGuard(content: string, isAdminBot: boolean): string {
    return this.enforceConversationGuardWithHits(content, isAdminBot).text;
  }

  private enforceConversationGuardWithHits(
    content: string,
    isAdminBot: boolean
  ): { text: string; triggered: boolean; hits: string[] } {
    if (isAdminBot) return { text: content, triggered: false, hits: [] };
    let t = String(content || '').trim();
    if (!t) return { text: t, triggered: false, hits: [] };
    const hits: string[] = [];
    const banned: Array<{ id: string; re: RegExp }> = [
      { id: 'tail_you_ok', re: /你那边咋样[?？]*/giu },
      { id: 'tail_you_all_ok', re: /你们那边呢[?？]*/giu },
      { id: 'income_generic', re: /收入得看单量和效率/giu },
      { id: 'it_depends', re: /得看个人情况/giu },
      { id: 'refuse_generic', re: /具体多少我就不好说了哈?/giu },
      { id: 'confirm_send', re: /确认数发(?:在)?群里了吗[?？]*/giu },
      { id: 'send_group', re: /发(?:在)?群里了吗[?？]*/giu },
    ];
    for (const { id, re } of banned) {
      if (re.test(t)) hits.push(id);
      t = t.replace(re, '');
    }
    const beforeQ = t;
    // Limit question count to at most 1 to avoid "反问收尾综合征".
    const qMarks = [...t.matchAll(/[?？]/g)].map((m) => m.index ?? -1).filter((i) => i >= 0);
    if (qMarks.length > 1) {
      hits.push('multi_question_marks');
      const keep = qMarks[0]!;
      t = `${t.slice(0, keep + 1)}${t.slice(keep + 1).replace(/[?？]/g, '。')}`;
    }
    if (beforeQ !== t && !hits.includes('multi_question_marks')) hits.push('question_mark_normalize');
    t = t.replace(/\s{2,}/g, ' ').replace(/^[，,、\s]+|[，,、\s]+$/g, '').trim();
    const triggered = hits.length > 0;
    return { text: t, triggered, hits };
  }

  private splitForBurst(bot: Bot, text: string): string[] {
    const supports = this.getTypingSplitHabit(bot);
    if (!supports) return [text];
    const maxN = this.getBurstMaxConsecutiveMessages(bot);
    const t = String(text || '').trim();
    if (t.length < 36) return [text];
    if (t.includes('\n\n')) return [text]; // keep multi-paragraph as-is
    const maxChars = this.getTypingSplitMaxChars(bot);

    const parts = t
      .split(/(?<=[。！？!?…])\s*/u)
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length <= 1) return [text];

    const out: string[] = [];
    let cur = '';
    const flush = () => {
      const c = cur.trim();
      if (c) out.push(c);
      cur = '';
    };
    for (const p of parts) {
      if (!cur) cur = p;
      else if ((cur + p).length <= Math.max(16, maxChars) || cur.length < 10) cur = `${cur}${p}`;
      else {
        flush();
        cur = p;
      }
      if (out.length >= maxN - 1) break;
    }
    flush();
    if (out.length <= 1) return [text];
    // Ensure we never drop trailing text: if we hit maxN early, glue the remainder into the last chunk.
    const joined = out.join('');
    if (joined.length < t.length) {
      out[out.length - 1] = `${out[out.length - 1]}${t.slice(joined.length)}`.trim();
    }
    return out.slice(0, maxN);
  }

  private stripSpeakerPrefixLine(content: string): string {
    const t = String(content || '').trim();
    if (!t) return t;
    // Remove leading "名字:" / "名字：" style role-play prefixes (e.g. "巧姐：...")
    return t.replace(/^\s*[^\n:：]{1,12}\s*[:：]\s*/u, '').trim();
  }

  private sanitizeAmountClaimForQuestion(content: string, question: string, isAdminBot: boolean): string {
    if (isAdminBot) return content;
    const q = String(question || '');
    if (!/投了多少|投了几|仓位|多少u|多少U|多少rwa|多少RWA|买了多少|入了多少/i.test(q)) return content;

    const t = String(content || '');
    // Over-confident big-number brag patterns; force back to persona-safe vague response.
    const hasBigClaim =
      /([1-9]\d{1,}|[1-9]\d*(?:\.\d+)?)\s*(万|亿|w|W)/.test(t) ||
      /\b\d{6,}\b/.test(t);
    if (!hasBigClaim) return content;

    const fallbacks = [
      '我就按自己能承受的范围来，先小额稳着做，不跟别人比仓位。',
      '仓位这块我不爱报具体数，主要看自己的风险承受，先小步走。',
      '我这边是分批做的，不梭哈，金额就不在群里细说了。',
    ];
    return pickRandom(fallbacks);
  }

  private stripProtocolTermsForLivelihoodQuestion(content: string, question: string, mentionForced: boolean): string {
    if (!mentionForced) return content;
    const q = String(question || '');
    const isLivelihoodQuestion =
      /哪里跑|在哪跑|哪片区|收入|单量|订单|跑单|外卖|工资|通勤|收工|下班|天气咋样|天气怎么样|忙不忙/i.test(q);
    if (!isLivelihoodQuestion) return content;

    const forbid = /(确认数|质押|收益|RWA|USDT|链上|充值|提现|锁仓|节点|邀请|推荐|发群里|发在群里|群里确认|发群里了吗|发在群里了吗)/i;
    const lines = String(content || '')
      .split(/\n+/)
      .map((line) => {
        const pieces = line
          .split(/([。！？!?])/u)
          .reduce<string[]>((acc, cur) => {
            if (!cur) return acc;
            if (/^[。！？!?]$/u.test(cur) && acc.length) {
              acc[acc.length - 1] = `${acc[acc.length - 1]}${cur}`;
            } else {
              acc.push(cur);
            }
            return acc;
          }, []);
        const kept = pieces.filter((p) => !forbid.test(p.trim()));
        return kept.join('').trim();
      })
      .filter(Boolean);

    const out = lines.join('\n').trim();
    if (out) {
      // Remove residual tail questions like "发群里了吗？/群里了吗？"
      return out
        .replace(/(?:，|,)?\s*发(?:在)?群里了吗[？?]?/giu, '')
        .replace(/(?:，|,)?\s*群里确认了吗[？?]?/giu, '')
        .replace(/\s{2,}/g, ' ')
        .trim();
    }
    return '我这边就跑日常单，收入看单量和效率，基本按自己的节奏来。';
  }

  private stripProtocolDriftForNonSupportQuestion(content: string, question: string, isAdminBot: boolean): string {
    if (isAdminBot) return content;
    const q = String(question || '').trim();
    if (!q) return content;
    // If the user is explicitly asking protocol/support topics, keep them.
    if (isSupportIntent(q)) return content;
    if (/(确认数|质押|收益|RWA|USDT|链上|充值|提现|锁仓|节点|邀请|推荐)/i.test(q)) return content;

    const forbid = /(确认数|质押|收益|RWA|USDT|链上|充值|提现|锁仓|节点|邀请|推荐|发群里|发在群里|群里确认|发群里了吗|发在群里了吗)/i;
    const lines = String(content || '')
      .split(/\n+/)
      .map((line) => {
        const pieces = line
          .split(/([。！？!?])/u)
          .reduce<string[]>((acc, cur) => {
            if (!cur) return acc;
            if (/^[。！？!?]$/u.test(cur) && acc.length) acc[acc.length - 1] = `${acc[acc.length - 1]}${cur}`;
            else acc.push(cur);
            return acc;
          }, []);
        return pieces.filter((p) => !forbid.test(p.trim())).join('').trim();
      })
      .filter(Boolean);

    const out = lines.join('\n').trim();
    if (out) return out;
    return '我就按自己节奏来，先把日常和手头事做好。';
  }

  private stripCrossBotDriftPhrases(content: string, isAdminBot: boolean): string {
    if (isAdminBot) return content;
    let t = String(content || '').trim();
    if (!t) return t;
    // Remove globally drifted tails that frequently spread across bots.
    t = t
      .replace(/(?:，|,)?\s*确认数发(?:在)?群里了吗[？?]?/giu, '')
      .replace(/(?:，|,)?\s*发(?:在)?群里了吗[？?]?/giu, '')
      .replace(/(?:，|,)?\s*群里确认了吗[？?]?/giu, '')
      // avoid copying other bot mentions in replies
      .replace(/@0x[0-9a-fA-F]{3,40}(?:\.{3}|…)?[0-9a-fA-F]{0,12}/gu, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
    return t;
  }

  private stripGlobalBannedDriftForCommunity(content: string, isAdminBot: boolean): string {
    if (isAdminBot) return content;
    const forbid = /(确认数|发(?:在)?群里|群里确认)/i;
    const lines = String(content || '')
      .split(/\n+/)
      .map((line) => {
        const pieces = line
          .split(/([。！？!?])/u)
          .reduce<string[]>((acc, cur) => {
            if (!cur) return acc;
            if (/^[。！？!?]$/u.test(cur) && acc.length) acc[acc.length - 1] = `${acc[acc.length - 1]}${cur}`;
            else acc.push(cur);
            return acc;
          }, []);
        return pieces.filter((p) => !forbid.test(p.trim())).join('').trim();
      })
      .filter(Boolean);
    const out = lines.join('\n').trim();
    if (out) return out;
    return '我这边就按自己的节奏来，先把眼前的事做好。';
  }

  private diversifyOverusedTailQuestion(
    content: string,
    bot: Bot,
    replyToHuman: boolean,
    mentionForced: boolean,
    isAdminBot: boolean
  ): string {
    if (isAdminBot) return content;
    let t = String(content || '').trim();
    if (!t) return t;

    // Common templated tail questions spreading across bots.
    const tailRe =
      /(你那边咋样[？?]?|你那边收入咋样[？?]?|你们那边咋样[？?]?|你们那边呢[？?]?|你那边呢[？?]?)(?:\s*[😄🙂😊]?)\s*$/u;
    if (!tailRe.test(t)) return t;

    const seed = Number.parseInt(ethers.id(`${bot.id}:${t}`).slice(2, 10), 16);
    const keepQuestionP = mentionForced ? 0.18 : replyToHuman ? 0.25 : 0.32;
    const roll = (seed % 1000) / 1000;
    if (roll > keepQuestionP) {
      // Most of the time: remove tail question and end as statement.
      t = t.replace(tailRe, '').trim();
      t = t.replace(/[，,]\s*$/u, '').trim();
      if (!/[。！？!?]$/u.test(t)) t = `${t}。`;
      return t;
    }

    // Keep minority as question, but rotate to avoid same ending.
    const variants = [
      '你最近忙不忙？',
      '你这两天节奏怎么样？',
      '你那边现在单量还行吗？',
      '你最近是偏忙还是偏闲？',
      '你这边最近状态怎么样？',
    ];
    const v = variants[seed % variants.length]!;
    t = t.replace(tailRe, v).trim();
    return t;
  }

  private getPersonaInvestedUsdt(bot: Bot): number | null {
    const persona = String(bot.persona || '');
    const lines = persona.split('\n');
    const i = lines.findIndex((l) => l.includes('BOTSOUL_FULL_FIELDS_JSON'));
    if (i >= 0 && i + 1 < lines.length) {
      try {
        const obj = JSON.parse(lines[i + 1] || '{}') as any;
        const n = Number(obj?.finance?.current_position?.total_staked_usdt ?? obj?.consistency_locks?.current_total_staked_usdt);
        if (Number.isFinite(n) && n > 0) return Math.round(n);
      } catch {}
    }
    const j = lines.findIndex((l) => l.includes('PERSONA_FIELDS_JSON'));
    if (j >= 0 && j + 1 < lines.length) {
      try {
        const obj = JSON.parse(lines[j + 1] || '{}') as any;
        const n = Number(obj?.invested_total_usdt);
        if (Number.isFinite(n) && n > 0) return Math.round(n);
      } catch {}
    }
    return null;
  }

  private shouldSkipByTopicFatigue(bot: Bot, roomId: string, candidate: string): boolean {
    const fatigueSilence = this.getRuntimeTuning(bot)?.topic_fatigue?.fatigue_silence_probability;
    const p = Number.isFinite(fatigueSilence as number) ? clampNum(Number(fatigueSilence), 0, 0.9) : 0;
    if (p <= 0) return false;

    const tags = extractTopicTags(candidate);
    const now = Date.now();
    const recent = chatService.getMessages(roomId, 30)
      .filter((m) => m.type === 'text' && now - m.timestamp <= 30 * 60_000)
      .slice(-20);
    const maxTurns = this.getTopicFatigueMaxTurns(bot);

    let sameTopicRecent = 0;
    for (let i = recent.length - 1; i >= 0; i--) {
      const m = recent[i]!;
      const u = chatService.getUser(m.userId);
      if (!u?.isBot) continue;
      const mtags = extractTopicTags(m.content);
      if (mtags.some((t) => tags.includes(t))) sameTopicRecent += 1;
      else break;
      if (sameTopicRecent >= maxTurns) break;
    }

    if (sameTopicRecent >= maxTurns) return Math.random() < p;
    return false;
  }

  private botsPerLlmKey(): number {
    return Math.max(1, Math.min(50, Number(process.env.LLM_BOTS_PER_GROQ_KEY || 10)));
  }

  private parseKeyList(multi?: string, single?: string): string[] {
    const raw = String(multi || '')
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const one = String(single || '').trim();
    const out: string[] = [];
    const seen = new Set<string>();
    for (const k of [...(one ? [one] : []), ...raw]) {
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(k);
    }
    return out;
  }

  private getLlmOptsForBot(bot: Bot) {
    const defaultCompat = getDefaultOpenAiCompatKeys();
    const isAdminBot = bot.role === 'admin_support' || bot.role === 'group_owner';
    if (isAdminBot) {
      const adminGroq = this.parseKeyList(
        process.env.ADMIN_GROQ_API_KEYS,
        process.env.ADMIN_GROQ_API_KEY
      );
      const adminOpenRouter = this.parseKeyList(
        process.env.ADMIN_OPENROUTER_API_KEYS,
        process.env.ADMIN_OPENROUTER_API_KEY
      );
      const adminSilicon = this.parseKeyList(
        process.env.ADMIN_SILICONFLOW_API_KEYS,
        process.env.ADMIN_SILICONFLOW_API_KEY
      );
      const adminCompat = this.parseKeyList(
        process.env.ADMIN_OPENAI_COMPAT_API_KEYS,
        process.env.ADMIN_OPENAI_COMPAT_API_KEY
      );
      if (adminGroq.length || adminOpenRouter.length || adminSilicon.length || adminCompat.length) {
        return {
          groqKeysOrder: adminGroq,
          openRouterKeysOrder: adminOpenRouter,
          siliconFlowKeysOrder: adminSilicon,
          openAiCompatKeysOrder: adminCompat.length ? adminCompat : defaultCompat,
        };
      }
    }
    const gSlot = this.llmGroqSlotByBotId.get(bot.id) ?? 0;
    const oSlot = this.llmOpenRouterSlotByBotId.get(bot.id) ?? 0;
    const sSlot = this.llmSiliconFlowSlotByBotId.get(bot.id) ?? 0;
    return {
      groqKeysOrder: buildGroqFailoverOrder(gSlot),
      openRouterKeysOrder: buildOpenRouterFailoverOrder(oSlot),
      siliconFlowKeysOrder: buildSiliconFlowFailoverOrder(sSlot),
      openAiCompatKeysOrder: defaultCompat,
    };
  }

  /**
   * 移动端「官方客服」底部弹层专用 LLM Key：与群聊机器人池隔离，避免 429/额度挤占导致频繁空回复。
   * 若未配置任何 SUPPORT_SHEET_*，则回退为管理员机器人同款 getLlmOptsForBot。
   */
  private getSupportSheetLlmOpts(bot: Bot): {
    groqKeysOrder: string[];
    openRouterKeysOrder: string[];
    siliconFlowKeysOrder: string[];
    openAiCompatKeysOrder: string[];
  } {
    const sheetGroq = this.parseKeyList(
      process.env.SUPPORT_SHEET_GROQ_API_KEYS,
      process.env.SUPPORT_SHEET_GROQ_API_KEY
    );
    const sheetOr = this.parseKeyList(
      process.env.SUPPORT_SHEET_OPENROUTER_API_KEYS,
      process.env.SUPPORT_SHEET_OPENROUTER_API_KEY
    );
    const sheetSf = this.parseKeyList(
      process.env.SUPPORT_SHEET_SILICONFLOW_API_KEYS,
      process.env.SUPPORT_SHEET_SILICONFLOW_API_KEY
    );
    const sheetCompat = this.parseKeyList(
      process.env.SUPPORT_SHEET_OPENAI_COMPAT_API_KEYS,
      process.env.SUPPORT_SHEET_OPENAI_COMPAT_API_KEY
    );
    const base = this.getLlmOptsForBot(bot);
    if (!sheetGroq.length && !sheetOr.length && !sheetSf.length && !sheetCompat.length) {
      return base;
    }
    if (sheetGroq.length || sheetOr.length || sheetSf.length || sheetCompat.length) {
      console.log(
        `[SupportSheet] Dedicated LLM keys: groq=${sheetGroq.length} openrouter=${sheetOr.length} siliconflow=${sheetSf.length} openaicompat=${sheetCompat.length}`
      );
    }
    return {
      groqKeysOrder: sheetGroq.length ? sheetGroq : base.groqKeysOrder!,
      openRouterKeysOrder: sheetOr.length ? sheetOr : base.openRouterKeysOrder!,
      siliconFlowKeysOrder: sheetSf.length ? sheetSf : base.siliconFlowKeysOrder!,
      openAiCompatKeysOrder: sheetCompat.length ? sheetCompat : base.openAiCompatKeysOrder!,
    };
  }

  /** 在把 bot 写入 this.bots 之前调用：用当前 size 作为新 bot 序号 */
  private assignLlmSlotsForBotIndex(botIndex: number): { g: number; o: number; s: number } {
    const per = this.botsPerLlmKey();
    const gN = getGroqKeyCount();
    const oN = getOpenRouterKeyCount();
    const sN = getSiliconFlowKeyCount();
    return {
      g: gN > 0 ? Math.floor(botIndex / per) % gN : 0,
      o: oN > 0 ? Math.floor(botIndex / per) % oN : 0,
      s: sN > 0 ? Math.floor(botIndex / per) % sN : 0,
    };
  }

  private findBotByUserId(userId: string): Bot | undefined {
    for (const b of this.bots.values()) {
      if (b.userId === userId) return b;
    }
    return undefined;
  }

  private sanitizeAdminReplyText(content: string): string {
    let out = String(content || '').trim();
    if (!out) return out;
    out = out
      .replace(/^【官方客服】用户[^\n]*\n?/gm, '')
      .replace(/^【官方客服】[^\n]*\n?/gm, '')
      .replace(/^官方客服[:：]\s*/gm, '')
      .replace(/如果您有任何具体问题，可以随时咨询我们，我们会尽力提供帮助。?/g, '')
      .replace(/建议您查看站内页面的相关说明或公告，?/g, '')
      .replace(/推荐奖励机制可能会根据版本更新而有所变化。?/g, '')
      .replace(/同时，请确保所有操作都通过官方站点进行，以保障您的资产安全。?/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    const lines = out
      .split(/\n+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 4);
    let compact = lines.join('\n');
    if (compact.length > 260) compact = compact.slice(0, 260).replace(/[，、；：\s]+$/g, '') + '…';
    return compact;
  }

  private parseDailyRwaClaim(text: string): number | null {
    const m = String(text || '').match(/每天[^0-9]{0,12}([0-9]+(?:\.[0-9]+)?)\s*(?:块|个|左右|多)?\s*RWA/i);
    if (!m?.[1]) return null;
    const v = Number(m[1]);
    return Number.isFinite(v) ? v : null;
  }

  private parsePrincipalUsdtHint(text: string): number | null {
    const t = String(text || '');
    const m = t.match(/([0-9]{3,7}(?:\.[0-9]+)?)\s*(?:u|usdt|刀|块|元)?/i);
    if (m?.[1]) {
      const n = Number(m[1]);
      if (Number.isFinite(n) && n >= 100 && n <= 2_000_000) return n;
    }
    if (/五千(多一点|多|左右)?/.test(t)) return 5000;
    if (/三千(左右|多)?/.test(t)) return 3000;
    if (/一万(多|左右)?/.test(t)) return 10000;
    return null;
  }

  maybeSendYieldSanityNudge(roomId: string, user: User, content: string, sourceMessageId?: string): void {
    if (!user || user.isBot) return;
    const claimRwa = this.parseDailyRwaClaim(content);
    if (!Number.isFinite(claimRwa as number)) return;
    const principal = this.parsePrincipalUsdtHint(content);
    if (!Number.isFinite(principal as number)) return;
    const principalUsdt = Number(principal);
    const claim = Number(claimRwa);
    const expectedRwa = (principalUsdt * 0.008) / 0.85;
    const ratio = claim > 0 ? expectedRwa / claim : 0;
    if (!(expectedRwa >= 8 && ratio >= 2.2)) return;

    const now = Date.now();
    const prev = this.roomLastYieldNudgeAt.get(roomId) || 0;
    if (now - prev < 10 * 60_000) return;
    this.roomLastYieldNudgeAt.set(roomId, now);

    const adminBot = Array.from(this.bots.values()).find((b) => b.isActive && b.role === 'admin_support');
    if (!adminBot) return;
    const msg =
      `补充一个口径供大家自查：若按日化 0.8%，本金 ${Math.round(principalUsdt)} USDT 的日收益约 ` +
      `${expectedRwa.toFixed(2)} RWA（按 1 RWA≈0.85 USDT 估算）。若与页面差异较大，建议到「质押记录/资金活动」按交易哈希核对。`;
    this.pushBotChatMessage(roomId, adminBot, msg, 'text', sourceMessageId);
  }

  /** 优先：紧挨着你上一条若是机器人则它回；否则最近一条机器人消息的发言者 */
  private pickResponderBotForHuman(roomId: string, humanUserId: string, candidates: Bot[]): Bot {
    if (candidates.length === 1) return candidates[0]!;
    const msgs = chatService.getMessages(roomId, 45);
    if (msgs.length < 2) return pickRandom(candidates);

    const prev = msgs[msgs.length - 2]!;
    const prevUser = chatService.getUser(prev.userId);
    if (prevUser?.isBot) {
      const b = this.findBotByUserId(prev.userId);
      if (b && candidates.some((c) => c.id === b.id)) return b;
    }

    for (let i = msgs.length - 2; i >= 0; i--) {
      const m = msgs[i]!;
      if (m.userId === humanUserId) continue;
      const u = chatService.getUser(m.userId);
      if (u?.isBot) {
        const b = this.findBotByUserId(m.userId);
        if (b && candidates.some((c) => c.id === b.id)) return b;
      }
    }

    return pickRandom(candidates);
  }

  startBot(botId: string): boolean {
    const bot = this.bots.get(botId);
    if (!bot) return false;
    if (bot.isActive) return true;

    bot.isActive = true;
    bot.schedule.enabled = true;
    this.scheduleNext(bot);
    return true;
  }

  stopBot(botId: string): boolean {
    const bot = this.bots.get(botId);
    if (!bot) return false;
    bot.isActive = false;
    bot.schedule.enabled = false;
    const timer = this.timers.get(botId);
    if (timer) clearTimeout(timer);
    this.timers.delete(botId);
    return true;
  }

  updateBot(
    botId: string,
    updates: Partial<Pick<Bot, 'name' | 'persona' | 'avatar' | 'roomIds' | 'schedule' | 'role'>>
  ): Bot | null {
    const bot = this.bots.get(botId);
    if (!bot) return null;
    Object.assign(bot, updates);
    const user = chatService.getUser(bot.userId);
    if (user) {
      if (updates.name) user.nickname = updates.name;
      if (updates.avatar !== undefined) user.avatar = updates.avatar;
    }
    return bot;
  }

  deleteBot(botId: string): boolean {
    this.stopBot(botId);
    this.runtimeTuningByBotId.delete(botId);
    this.identityByBotId.delete(botId);
    this.speakChanceByBotId.delete(botId);
    this.punctuationStyleByBotId.delete(botId);
    this.llmGroqSlotByBotId.delete(botId);
    this.llmOpenRouterSlotByBotId.delete(botId);
    this.llmSiliconFlowSlotByBotId.delete(botId);
    return this.bots.delete(botId);
  }

  triggerBotMessage(botId: string, roomId: string, forceBurst = false): Promise<Message | null> {
    const bot = this.bots.get(botId);
    if (!bot) return Promise.resolve(null);
    return this.executeBotMessage(bot, roomId, { triggeredBy: null, earningsRwa: null }, { forceBurst });
  }

  /**
   * 本机测试：连发多条机器人消息（跳过真人静默与 16s 节流；仍走 LLM/兜底与广播）。
   */
  async triggerBotBurst(roomId: string, maxBots = 15): Promise<{ sent: number; failed: number; errors: string[] }> {
    const list = Array.from(this.bots.values()).filter(
      (b) => b.isActive && b.roomIds.includes(roomId) && b.role !== 'admin_support' && b.role !== 'group_owner'
    );
    const shuffled = shuffleInPlace([...list]);
    const take = shuffled.slice(0, Math.min(maxBots, shuffled.length));
    let sent = 0;
    let failed = 0;
    const errors: string[] = [];
    for (const b of take) {
      try {
        const msg = await this.executeBotMessage(
          b,
          roomId,
          { triggeredBy: null, earningsRwa: null },
          { forceBurst: true }
        );
        if (msg) sent += 1;
        else {
          failed += 1;
          errors.push(`${b.name}: null`);
        }
      } catch (e) {
        failed += 1;
        errors.push(`${b.name}: ${(e as Error).message}`);
      }
      await new Promise((r) => setTimeout(r, 400));
    }
    return { sent, failed, errors };
  }

  /**
   * 真人发消息时调用：每名真人每条消息都会触发 **恰好一次** 机器人接话（无随机跳过；夜间也接，不按作息筛池）。
   * tight/普通 仍影响延迟、选人偏好与早间收益彩蛋；主动插话逻辑仍在 scheduleNext，未改。
   */
  maybeRespondToUserMessage(roomId: string, user: User, content: string, sourceMessageId?: string) {
    const peerQ = isLikelyAtSomeoneQuestion(content);
    const identityQ = isIdentityOrJobQuestion(content);
    const generalQ = isLikelyGeneralQuestion(content);
    const wantsTightReply = peerQ || identityQ || generalQ;

    const now = new Date();
    const earningsMode =
      isInEarningsDistributionWindow(now) && !wantsTightReply ? pickEarningsRwaAmount() : null;

    const room = chatService.getRoom(roomId);
    const isDmRoom = room?.type === 'dm';
    const normalizeMentionToken = (raw: string): string => {
      let t = String(raw || '').trim();
      // common wrappers/punctuation from UI copy/paste
      t = t.replace(/^[\s"'“”‘’()（）【】\[\]<>《》]+/g, '').replace(/[\s"'“”‘’()（）【】\[\]<>《》]+$/g, '');
      // normalize ellipsis variants
      t = t.replace(/\u2026/g, '...'); // … -> ...
      t = t.replace(/\.{4,}/g, '...'); // collapse many dots
      return t.trim();
    };
    const mentionTokens = Array.from(content.matchAll(/@([^\s，。,。！？!?:：；;、]{2,64})/g))
      .map((m) => normalizeMentionToken(String(m[1] || '')))
      .filter(Boolean);

    const resolveMentionedBotAcrossAllRooms = (): Bot | undefined => {
      if (!mentionTokens.length) return undefined;
      const allBots = Array.from(this.bots.values()).filter((b) => b.isActive);
      for (const tok of mentionTokens) {
        if (!/^0x/i.test(tok)) continue;
        const m = tok.match(/^0x([0-9a-fA-F]{3,40})(?:\.{3}([0-9a-fA-F]{1,12}))?$/);
        if (!m) continue;
        const prefix = `0x${m[1]}`.toLowerCase();
        const suffix = (m[2] || '').toLowerCase();
        const candidates = allBots
          .map((b) => ({ b, addr: (chatService.getUser(b.userId)?.address || '').toLowerCase() }))
          .filter((x) => x.addr && x.addr.startsWith(prefix) && (!suffix || x.addr.endsWith(suffix)));
        if (candidates.length === 1) return candidates[0]!.b;
      }
      return undefined;
    };

    const poolAll = Array.from(this.bots.values()).filter((b) => {
      if (!b.isActive) return false;
      const inConfiguredRoom = b.roomIds.includes(roomId);
      const inDmAsMember = !!isDmRoom && chatService.isRoomMember(roomId, b.userId);
      if (!inConfiguredRoom && !inDmAsMember) return false;
      return true;
    });
    if (poolAll.length === 0) return;

    // 真实用户点名 @ 某个机器人：必须由该机器人本人回应（绕过概率/间隔门槛，避免“点名不回”）
    // 支持两类：
    // 1) @机器人昵称（精确匹配）
    // 2) @0x1234…abcd / @0x1234...abcd（地址短写：前缀+后缀匹配）
    const pickMentionedBot = (pool: Bot[]): Bot | undefined => {
      if (!mentionTokens.length) return undefined;

      // First: exact nickname match
      for (const tok of mentionTokens) {
        const exact = pool.find((b) => {
          const nick = chatService.getUser(b.userId)?.nickname || b.name;
          return nick === tok;
        });
        if (exact) return exact;
      }

      // Second: address short-hand match (supports 0x1234…abcd / 0x1234...abcd)
      for (const tok of mentionTokens) {
        if (!/^0x/i.test(tok)) continue;
        const m = tok.match(/^0x([0-9a-fA-F]{3,40})(?:\.{3}([0-9a-fA-F]{1,12}))?$/);
        if (!m) continue;
        const prefix = `0x${m[1]}`.toLowerCase();
        const suffix = (m[2] || '').toLowerCase();

        const candidatesByAddr = pool
          .map((b) => ({ b, addr: (chatService.getUser(b.userId)?.address || '').toLowerCase() }))
          .filter((x) => x.addr && x.addr.startsWith(prefix) && (!suffix || x.addr.endsWith(suffix)));

        if (candidatesByAddr.length === 1) return candidatesByAddr[0]!.b;
        if (candidatesByAddr.length > 1) {
          // Prefer stable pick by nickname as tie-breaker.
          const best = candidatesByAddr
            .sort((a, b) => {
              const an = (chatService.getUser(a.b.userId)?.nickname || a.b.name).localeCompare(
                chatService.getUser(b.b.userId)?.nickname || b.b.name
              );
              return an;
            })[0];
          if (best) return best.b;
        }
      }

      return undefined;
    };

    const mentionedBotAll = pickMentionedBot(poolAll) || resolveMentionedBotAcrossAllRooms();
    // If a bot was explicitly mentioned by address but isn't configured in this room, still allow it to respond (group rooms).
    if (mentionedBotAll && !poolAll.includes(mentionedBotAll) && !isDmRoom) {
      poolAll.push(mentionedBotAll);
    }

    const pool = mentionedBotAll
      ? poolAll
      : poolAll.filter((b) => {
          if (b.role === 'admin_support' || b.role === 'group_owner') return true;
          return this.isBotInActiveRotation(roomId, b);
        });
    if (pool.length === 0) return;

    const mentionedBot = mentionedBotAll;
    const lastBotInRoom = (() => {
      const recent = chatService.getMessages(roomId, 24);
      for (let i = recent.length - 1; i >= 0; i--) {
        const m = recent[i]!;
        const u = chatService.getUser(m.userId);
        if (!u?.isBot) continue;
        const b = Array.from(poolAll).find((x) => x.userId === m.userId);
        if (b) return b;
      }
      return undefined as Bot | undefined;
    })();

    const ownerBot = pool.find((b) => b.role === 'group_owner');
    const adminBot = pool.find((b) => b.role === 'admin_support');
    const routeOwner = ownerBot && shouldRouteToOwnerBot(content);
    const routeAdmin = adminBot && (shouldRouteToAdminBot(content) || !!isDmRoom);

    const hour = getShanghaiHour(new Date());
    const factors = getHumanReplyFactorsByHour(hour);
    const superEco = readEnvInt('BOT_SUPER_ECO_MODE', 1, 0, 1) === 1;
    const baseReplyProb = readEnvFloat('BOT_REPLY_TO_HUMAN_PROB', superEco ? 0.10 : 0.12, 0, 1);
    const replyProb = Math.max(0.01, Math.min(0.35, baseReplyProb * factors.probMult));
    const baseReplyGapMs = readEnvInt('BOT_REPLY_MIN_GAP_MS', superEco ? 220_000 : 180_000, 1_000, 600_000);
    const replyGapMs = Math.max(25_000, Math.floor(baseReplyGapMs * factors.gapMult));
    const roomLast = this.roomLastBotAt.get(roomId) || 0;
    const tooSoon = Date.now() - roomLast < replyGapMs;
    // 被点名：强制回应；仅保留极短的防抖，避免同一秒内连发造成刷屏
    if (!isDmRoom && !mentionedBot && !routeOwner && !routeAdmin) {
      if (tooSoon) return;
      if (Math.random() > replyProb) return;
    }

    // Repeat-question detector: if same user asked same intent recently, force a concrete answer (range or explicit refusal).
    const isRepeatQuestion = (() => {
      const intent = classifySimpleIntent(content);
      if (!intent) return false;
      const recent = chatService.getMessages(roomId, 14);
      const fromSame = recent
        .slice(0, -1)
        .filter((m) => m.userId === user.id && m.type === 'text')
        .map((m) => String(m.content || '').trim())
        .filter(Boolean);
      // If asked twice within recent window with same coarse intent, treat as repeat.
      let hits = 0;
      for (const prev of fromSame.slice(-8)) {
        if (classifySimpleIntent(prev) === intent) hits += 1;
      }
      return hits >= 1;
    })();

    // 若用户 @ 了具体机器人昵称，则优先由该机器人本人回复（带来更强的「被点名就回应」体验）
    let selected: Bot;
    if (mentionedBot) {
      selected = mentionedBot;
      const hardDebounceMs = readEnvInt('BOT_MENTION_HARD_DEBOUNCE_MS', 2_500, 0, 30_000);
      const lastBotAt = this.roomLastBotAt.get(roomId) || 0;
      if (Date.now() - lastBotAt < hardDebounceMs) return;
    } else if (wantsTightReply && lastBotInRoom && lastBotInRoom.role !== 'admin_support' && lastBotInRoom.role !== 'group_owner') {
      // 用户在提问且未@具体机器人时，优先由“上一条发言的机器人”承接，确保只有一个机器人接话且更自然。
      selected = lastBotInRoom;
    } else if (routeOwner) {
      selected = ownerBot!;
    } else if (routeAdmin) {
      selected = adminBot!;
    } else if (wantsTightReply) {
      const nonAdmin = pool.filter((b) => b.role !== 'admin_support' && b.role !== 'group_owner');
      const sub = nonAdmin.length ? nonAdmin : pool;
      selected = this.pickResponderBotForHuman(roomId, user.id, sub);
    } else if (earningsMode !== null) {
      const earner = pool.find(
        (b) => this.identityByBotId.get(b.id) === 'earner' && b.role !== 'admin_support' && b.role !== 'group_owner'
      );
      const pickFrom = pool.filter((b) => b.role !== 'admin_support' && b.role !== 'group_owner');
      selected =
        earner ||
        (pickFrom.length ? pickFrom : pool)[Math.floor(Math.random() * (pickFrom.length || pool.length))]!;
    } else {
      const lastBotId = Array.from(this.botLastSentAt.entries()).sort((a, b) => b[1] - a[1])[0]?.[0];
      const filtered = pool.filter((b) => b.id !== lastBotId && b.role !== 'admin_support' && b.role !== 'group_owner');
      const pickFrom = filtered.length ? filtered : pool.filter((b) => b.role !== 'admin_support' && b.role !== 'group_owner');
      const usePool = pickFrom.length ? pickFrom : pool;
      selected = usePool[Math.floor(Math.random() * usePool.length)]!;
    }

    const runtimeDelay = this.getRuntimeTuning(selected)?.latency_profile;
    const mentionMult = clampNum(Number(runtimeDelay?.mention_priority_multiplier ?? 1), 1, 4);
    const questionMult = clampNum(Number(runtimeDelay?.question_priority_multiplier ?? 1), 1, 4);
    const meanSec = Number(runtimeDelay?.reply_delay_mean_sec ?? NaN);
    const jitterSec = Number(runtimeDelay?.reply_delay_jitter_sec ?? NaN);
    const hasRuntimeDelay = Number.isFinite(meanSec) && Number.isFinite(jitterSec);

    let delayMs = isDmRoom
      ? 180 + Math.floor(Math.random() * 520)
      : wantsTightReply
        ? 700 + Math.floor(Math.random() * 3_800)
        : 1_500 + Math.floor(Math.random() * 7_500);

    if (hasRuntimeDelay) {
      const base = Math.max(120, Math.round(meanSec * 1000));
      const jitter = Math.max(80, Math.round(jitterSec * 1000));
      delayMs = base + Math.floor(Math.random() * jitter);
      if (mentionedBot) delayMs = Math.round(delayMs / mentionMult);
      else if (wantsTightReply) delayMs = Math.round(delayMs / questionMult);
      if (isDmRoom) delayMs = Math.min(delayMs, 900);
    }

    // 官方客服“必回”：在私聊里先秒回一条已接收提示，随后补完整答复。
    if (isDmRoom && selected.role === 'admin_support') {
      this.pushBotChatMessage(
        roomId,
        selected,
        '您好，已收到您的问题。我正在为您核对数据并整理答复，请稍候。',
        'text',
        sourceMessageId && typeof sourceMessageId === 'string' ? sourceMessageId : undefined
      );
    }

    setTimeout(async () => {
      const msg = await this.executeBotMessage(selected, roomId, {
        triggeredBy: {
          user,
          content,
          ...(sourceMessageId ? { sourceMessageId } : {}),
        },
        earningsRwa: earningsMode,
      }, {
        ...(mentionedBot ? { mentionForced: true } : {}),
        ...(isRepeatQuestion ? { repeatQuestion: true } : {}),
      });
      if (!msg && isDmRoom && selected.role === 'admin_support') {
        this.pushBotChatMessage(
          roomId,
          selected,
          '抱歉，刚才响应超时。请再发一次，我会优先处理并给出明确答复。',
          'text',
          sourceMessageId && typeof sourceMessageId === 'string' ? sourceMessageId : undefined
        );
      }
    }, delayMs);
  }

  /** Bootstrap：从数据源加载人设（当前为 botsoul 100 人设）。 */
  bootstrapDefaultBots(): { created: number } {
    const targetCount = BOT_PERSONAS_50.length;
    const existingCommunityBots = Array.from(this.bots.values()).filter(
      (b) => b.role !== 'admin_support' && b.role !== 'group_owner'
    );

    // 若历史状态中是旧 50 人设（或数量不一致），执行一次重建，确保线上切换到最新人设池。
    if (existingCommunityBots.length > 0 && existingCommunityBots.length !== targetCount) {
      for (const b of existingCommunityBots) {
        this.stopBot(b.id);
        this.bots.delete(b.id);
        this.identityByBotId.delete(b.id);
        this.speakChanceByBotId.delete(b.id);
        this.punctuationStyleByBotId.delete(b.id);
        this.runtimeTuningByBotId.delete(b.id);
        this.personaIdByBotId.delete(b.id);
        this.socialGraphByBotId.delete(b.id);
        this.llmGroqSlotByBotId.delete(b.id);
        this.llmOpenRouterSlotByBotId.delete(b.id);
        this.llmSiliconFlowSlotByBotId.delete(b.id);
      }
    }

    if (Array.from(this.bots.values()).some((b) => b.role !== 'admin_support' && b.role !== 'group_owner')) {
      this.ensureAdminSupportBot();
      this.ensureGroupOwnerBot();
      return { created: 0 };
    }

    let created = 0;
    for (let i = 0; i < BOT_PERSONAS_50.length; i++) {
      const b = BOT_PERSONAS_50[i]!;
      const botAddress = makeDeterministicBotAddress(`v2:${b.slug}`);
      const avatarPath = `/chat-bot-icons/${String(b.iconIndex).padStart(2, '0')}.svg`;
      const botUser = chatService.createUser(botAddress, b.name, 'L1');
      botUser.isBot = true;
      botUser.avatar = avatarPath;
      botUser.nickname = b.name;

      const bot: Bot = {
        id: uuid(),
        userId: botUser.id,
        name: b.name,
        persona: b.persona,
        avatar: avatarPath,
        isActive: true,
        roomIds: ['room-general'],
        schedule: {
          enabled: true,
          minIntervalMs: b.schedule.minIntervalMs ?? 200_000,
          maxIntervalMs: b.schedule.maxIntervalMs ?? 450_000,
          activeHoursStart: b.schedule.activeHoursStart ?? 8,
          activeHoursEnd: b.schedule.activeHoursEnd ?? 24,
          timezone: b.schedule.timezone ?? 'Asia/Shanghai',
        },
        createdAt: Date.now(),
      };
      this.bots.set(bot.id, bot);
      this.identityByBotId.set(bot.id, b.identity as BotIdentity);
      this.speakChanceByBotId.set(bot.id, b.speakChance);
      this.punctuationStyleByBotId.set(bot.id, punctuationFromIdentity(b.identity as BotIdentity));
      this.runtimeTuningByBotId.set(bot.id, b.runtimeTuning || {});
      this.personaIdByBotId.set(bot.id, this.getPersonaId(bot));
      const sg = this.getSocialGraph(bot);
      if (sg) this.socialGraphByBotId.set(bot.id, sg);
      const slots = this.assignLlmSlotsForBotIndex(i);
      this.llmGroqSlotByBotId.set(bot.id, slots.g);
      this.llmOpenRouterSlotByBotId.set(bot.id, slots.o);
      this.llmSiliconFlowSlotByBotId.set(bot.id, slots.s);
      this.scheduleNext(bot);
      created += 1;
    }

    chatService.persistChatState();
    this.ensureAdminSupportBot();
    this.ensureGroupOwnerBot();
    return { created };
  }

  /** 与代码库一致的管理员客服人设（每次启动同步到内存中的 admin_support 机器人） */
  private buildAdminSupportPersona(displayName: string): string {
    return `你是 RWA Aura 官方社区管理员「${displayName}」。
职责：官方客服兼客户顾问——准确解答产品与链上操作问题；在合规前提下适度引导用户通过站内真实页面参与质押、关注公告与节点规则、使用「仪表盘 /dashboard」「我的网络 /node/network」等路径自助核对数据；禁止编造「个人中心」「推荐中心」等不存在的页面名。
风格：克制、清晰、负责任；顾问式推荐、不施压、不承诺收益；不编造合约地址与「内部渠道」。
若信息不在已知事实内，明确请用户以站内公告、产品页面与链上数据为准。`;
  }

  /**
   * 官方知识型管理员机器人：确定性地址 + 不接定时主动发言。
   * 环境变量：ADMIN_SUPPORT_BOT_ENABLED=0 关闭；ADMIN_BOT_NAME 昵称；ADMIN_BOT_AVATAR 可选头像路径。
   * 已存在时每次启动仍同步 persona/name，避免长期进程里停留在旧人设。
   */
  ensureAdminSupportBot(): void {
    if (String(process.env.ADMIN_SUPPORT_BOT_ENABLED ?? '1').trim() === '0') return;

    const name = String(process.env.ADMIN_BOT_NAME || 'Aura助手').trim() || 'Aura助手';
    const avatar = String(process.env.ADMIN_BOT_AVATAR || '/chat-bot-icons/01.svg').trim();
    const persona = this.buildAdminSupportPersona(name);

    const existing = Array.from(this.bots.values()).find((b) => b.role === 'admin_support');
    if (existing) {
      existing.name = name;
      existing.persona = persona;
      existing.avatar = avatar;
      const u = chatService.getUser(existing.userId);
      if (u) {
        u.nickname = name;
        u.avatar = avatar;
      }
      console.log(`[Bots] Admin support bot persona synced: ${name} id=${existing.id}`);
      return;
    }

    const addr = makeDeterministicBotAddress('rwa-admin-support-bot:v1');
    const botUser = chatService.createUser(addr, name, 'L1');
    botUser.isBot = true;
    botUser.isAdmin = true;
    botUser.avatar = avatar;

    const bot: Bot = {
      id: uuid(),
      userId: botUser.id,
      name,
      persona,
      avatar: botUser.avatar,
      isActive: true,
      roomIds: ['room-general'],
      role: 'admin_support',
      schedule: {
        enabled: false,
        minIntervalMs: 600_000,
        maxIntervalMs: 900_000,
        activeHoursStart: 0,
        activeHoursEnd: 24,
        timezone: 'Asia/Shanghai',
      },
      createdAt: Date.now(),
    };
    this.bots.set(bot.id, bot);
    this.identityByBotId.set(bot.id, 'pro');
    this.speakChanceByBotId.set(bot.id, 0);
    this.punctuationStyleByBotId.set(bot.id, 'formal');
    const slots = this.assignLlmSlotsForBotIndex(this.bots.size);
    this.llmGroqSlotByBotId.set(bot.id, slots.g);
    this.llmOpenRouterSlotByBotId.set(bot.id, slots.o);
    this.llmSiliconFlowSlotByBotId.set(bot.id, slots.s);
    console.log(`[Bots] Admin support bot ensured: ${name} id=${bot.id}`);
  }

  ensureGroupOwnerBot(): void {
    if (Array.from(this.bots.values()).some((b) => b.role === 'group_owner')) return;
    if (String(process.env.OWNER_BOT_ENABLED ?? '1').trim() === '0') return;

    const name = String(process.env.OWNER_BOT_NAME || '群主').trim() || '群主';
    const addr = makeDeterministicBotAddress('rwa-group-owner-bot:v1');
    const botUser = chatService.createUser(addr, name, 'L9');
    botUser.isBot = true;
    botUser.isAdmin = true;
    botUser.avatar = String(process.env.OWNER_BOT_AVATAR || '/chat-bot-icons/02.svg').trim();

    const persona = `你是 RWA Aura 官方群主「${name}」。你完全了解社区规则、产品规则与风控边界。
职责：给出清晰、准确、可执行的答复；不确定信息明确提醒以站内页面/公告/链上数据为准。
风格：权威、克制、简洁，不灌水，不作收益承诺。`;

    const bot: Bot = {
      id: uuid(),
      userId: botUser.id,
      name,
      persona,
      avatar: botUser.avatar,
      isActive: true,
      roomIds: ['room-general'],
      role: 'group_owner',
      schedule: {
        enabled: false,
        minIntervalMs: 900_000,
        maxIntervalMs: 1_200_000,
        activeHoursStart: 0,
        activeHoursEnd: 24,
        timezone: 'Asia/Shanghai',
      },
      createdAt: Date.now(),
    };
    this.bots.set(bot.id, bot);
    this.identityByBotId.set(bot.id, 'pro');
    this.speakChanceByBotId.set(bot.id, 0);
    this.punctuationStyleByBotId.set(bot.id, 'formal');
    const slots = this.assignLlmSlotsForBotIndex(this.bots.size);
    this.llmGroqSlotByBotId.set(bot.id, slots.g);
    this.llmOpenRouterSlotByBotId.set(bot.id, slots.o);
    this.llmSiliconFlowSlotByBotId.set(bot.id, slots.s);
    console.log(`[Bots] Group owner bot ensured: ${name} id=${bot.id}`);
  }

  // ────────────────────────────────────────────────────────
  private refreshUtteredDayAndMergeHistory() {
    const key = getShanghaiDateKey();
    if (key !== this.utteranceDayKey) {
      this.utteranceDayKey = key;
      this.utteredKeysToday = chatService.collectBotUtteranceKeysSince(getShanghaiMidnightUtcMs());
    }
  }

  private isUtteranceDuplicateToday(normalizedKey: string): boolean {
    return !normalizedKey || this.utteredKeysToday.has(normalizedKey);
  }

  private rememberUtteranceToday(text: string) {
    const k = normalizeUtteranceKey(text);
    if (k) this.utteredKeysToday.add(k);
  }

  /**
   * 房间内语义近似去重：避免多个机器人在短时间内说“一个意思的话”。
   */
  private isSemanticDuplicateInRecentRoom(roomId: string, candidate: string, bot?: Bot): boolean {
    const scanN = readEnvInt('BOT_ROOM_SEMANTIC_SCAN_N', 36, 8, 120);
    const windowMs = bot ? this.getRoomSemanticWindowMs(bot) : readEnvInt('BOT_ROOM_SEMANTIC_WINDOW_MS', 240_000, 30_000, 1_800_000);
    const threshold = readEnvFloat('BOT_ROOM_SEMANTIC_SIM_THRESHOLD', 0.72, 0.55, 0.9);
    const now = Date.now();
    const msgs = chatService.getMessages(roomId, scanN);
    for (let i = msgs.length - 1; i >= 0; i--) {
      const m = msgs[i]!;
      if (m.type !== 'text') continue;
      if (now - m.timestamp > windowMs) continue;
      const u = chatService.getUser(m.userId);
      if (!u?.isBot) continue;
      if (isNearMeaningDuplicate(candidate, m.content, threshold)) return true;
    }
    return false;
  }

  private isTopicCoolingInRoom(roomId: string, candidate: string, bot?: Bot): boolean {
    const cdMs = bot ? this.getTopicCooldownMs(bot) : readEnvInt('BOT_ROOM_TOPIC_COOLDOWN_MS', 180_000, 30_000, 1_800_000);
    const now = Date.now();
    const tags = extractTopicTags(candidate);
    const topicMap = this.roomTopicLastAt.get(roomId);
    if (!topicMap) return false;
    for (const tag of tags) {
      const last = topicMap.get(tag) || 0;
      if (now - last < cdMs) return true;
    }
    return false;
  }

  private countRecentBotTextMatches(roomId: string, re: RegExp, windowMs: number, scanN: number): number {
    const now = Date.now();
    const msgs = chatService.getMessages(roomId, scanN);
    let n = 0;
    for (let i = msgs.length - 1; i >= 0; i--) {
      const m = msgs[i]!;
      if (m.type !== 'text') continue;
      if (now - m.timestamp > windowMs) continue;
      const u = chatService.getUser(m.userId);
      if (!u?.isBot) continue;
      if (re.test(m.content)) n += 1;
    }
    return n;
  }

  /**
   * 动态口头禅黑名单：从最近机器人发言中提取高频短句，避免同类短句继续重复。
   */
  private isOverusedCatchphrase(roomId: string, candidate: string): boolean {
    const windowMs = readEnvInt('BOT_CATCHPHRASE_WINDOW_MS', 600_000, 60_000, 3_600_000);
    const scanN = readEnvInt('BOT_CATCHPHRASE_SCAN_N', 120, 20, 280);
    const minFreq = readEnvInt('BOT_CATCHPHRASE_MIN_FREQ', 3, 2, 10);
    const now = Date.now();
    const msgs = chatService.getMessages(roomId, scanN);
    const freq = new Map<string, number>();

    const splitClauses = (s: string): string[] =>
      String(s || '')
        .split(/[。！？!?；;，,\n]+/)
        .map((x) => x.trim())
        .filter((x) => x.length >= 6 && x.length <= 28);

    for (let i = msgs.length - 1; i >= 0; i--) {
      const m = msgs[i]!;
      if (m.type !== 'text') continue;
      if (now - m.timestamp > windowMs) continue;
      const u = chatService.getUser(m.userId);
      if (!u?.isBot) continue;
      for (const c of splitClauses(m.content)) {
        const k = normalizeUtteranceKey(c);
        if (!k) continue;
        freq.set(k, (freq.get(k) || 0) + 1);
      }
    }

    const hot = new Set<string>();
    for (const [k, n] of freq.entries()) {
      if (n >= minFreq) hot.add(k);
    }
    if (!hot.size) return false;

    const candClauses = splitClauses(candidate);
    for (const c of candClauses) {
      const k = normalizeUtteranceKey(c);
      if (k && hot.has(k)) return true;
    }
    return false;
  }

  /** 单个 bot 自重复冷却：避免同一机器人自己循环复读 */
  private isSelfRepeatingByBot(roomId: string, botUserId: string, candidate: string, bot?: Bot): boolean {
    const windowMs = readEnvInt('BOT_SELF_REPEAT_WINDOW_MS', 1_200_000, 60_000, 7_200_000);
    const scanN = readEnvInt('BOT_SELF_REPEAT_SCAN_N', 60, 10, 240);
    const threshold = bot ? this.getSelfRepeatThreshold(bot) : readEnvFloat('BOT_SELF_REPEAT_SIM_THRESHOLD', 0.7, 0.55, 0.92);
    const now = Date.now();
    const msgs = chatService.getMessages(roomId, scanN);
    let seen = 0;
    for (let i = msgs.length - 1; i >= 0; i--) {
      const m = msgs[i]!;
      if (m.type !== 'text') continue;
      if (m.userId !== botUserId) continue;
      if (now - m.timestamp > windowMs) continue;
      seen += 1;
      if (isNearMeaningDuplicate(candidate, m.content, threshold)) return true;
      if (seen >= 12) break; // only compare against its latest window
    }
    return false;
  }

  private maybeLogDiversityMetrics(roomId: string): void {
    const now = Date.now();
    const last = this.diversityLastLogAt.get(roomId) || 0;
    if (now - last < 60 * 60 * 1000) return;
    this.diversityLastLogAt.set(roomId, now);

    const msgs = chatService.getMessages(roomId, 220).filter((m) => m.type === 'text');
    const botMsgs = msgs.filter((m) => {
      const u = chatService.getUser(m.userId);
      return Boolean(u?.isBot);
    });
    if (botMsgs.length < 12) return;

    const starters = botMsgs
      .map((m) => String(m.content || '').trim())
      .filter(Boolean)
      .map((s) => s.replace(/[，。！？、,.!?;:\s]/g, '').slice(0, 3))
      .filter(Boolean);
    const starterUniqueRatio = starters.length
      ? Number((new Set(starters).size / starters.length).toFixed(3))
      : 0;

    const lengths = botMsgs.map((m) => String(m.content || '').trim().length).filter((n) => n > 0);
    const avg = lengths.reduce((a, b) => a + b, 0) / Math.max(1, lengths.length);
    const variance =
      lengths.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / Math.max(1, lengths.length);

    const occMentions = botMsgs.filter((m) =>
      /(司机|骑手|流水线|工厂|车间|门店|收摊|下班|等单|跑单|接单)/.test(String(m.content || ''))
    ).length;
    const occupationMentionRate = Number((occMentions / Math.max(1, botMsgs.length)).toFixed(3));

    const withEmoji = botMsgs.filter((m) => containsEmojiLike(String(m.content || ''))).length;
    const pEmoji = withEmoji / Math.max(1, botMsgs.length);
    const pPlain = 1 - pEmoji;
    const giniApprox = Number((1 - (pEmoji * pEmoji + pPlain * pPlain)).toFixed(3));
    const evalN = this.guardEvalCountByRoom.get(roomId) || 0;
    const hitN = this.guardHitCountByRoom.get(roomId) || 0;
    const guardTriggerRate = evalN > 0 ? Number((hitN / evalN).toFixed(3)) : 0;

    console.log(
      '[BotDiversityMetrics]',
      JSON.stringify({
        roomId,
        ts: new Date().toISOString(),
        unique_reply_starters_ratio: starterUniqueRatio,
        avg_reply_length_variance: Number(variance.toFixed(2)),
        occupation_mention_rate: occupationMentionRate,
        emoji_distribution_gini: giniApprox,
        guard_trigger_rate: guardTriggerRate,
      })
    );
  }

  /**
   * 生活意象去重：咖啡梗 + 「绿色 UI = 颈部按摩」类跟风胡扯（多 bot 易复制刷屏）
   */
  private isOverusedSmallTalkMotif(
    roomId: string,
    candidate: string,
    context = '',
    replyToHuman = false,
    triggerContent = ''
  ): boolean {
    const coffee = /(咖啡|手冲|拿铁|美式|留咖啡钱)/;
    if (coffee.test(candidate)) {
      if (replyToHuman) return false;
      const windowMs = readEnvInt('BOT_SMALLTALK_MOTIF_WINDOW_MS', 1_200_000, 120_000, 7_200_000);
      const scanN = readEnvInt('BOT_SMALLTALK_MOTIF_SCAN_N', 80, 10, 200);
      const maxCount = readEnvInt('BOT_SMALLTALK_MOTIF_MAX', 1, 0, 8);
      return this.countRecentBotTextMatches(roomId, coffee, windowMs, scanN) > maxCount;
    }

    const massageMeme = /(颈部按摩|做按摩的.{0,6}绿|绿.{0,8}按摩|按摩的绿|绿色.{0,10}颈部)/;
    if (!massageMeme.test(candidate)) return false;

    const trig = String(triggerContent || '');
    const navQ = /(导航|按钮|在哪点|找不到|怎么设置|设置导航|菜单|点哪儿|点哪里)/.test(trig);
    /** 接真人：纯问导航/按钮且对方句子里没有按摩梗 → 允许正常指路（可带「绿色是按钮色」等，不必拦） */
    if (replyToHuman && navQ && !massageMeme.test(trig)) {
      return false;
    }
    /** 接真人：明显在辟谣「绿色≠按摩」或正经指路，不当作跟风梗 */
    const debunkOrGuide =
      replyToHuman &&
      (/(不是|不对|别(闹|扯)|瞎扯|两码事|没关系|别信).{0,22}(按摩|颈|配色|界面|绿色|APP)/.test(candidate) ||
        /(按摩|颈部).{0,8}(不是|不对|没关系|两码事)/.test(candidate) ||
        /(底部|下面|钱包|首页|资金活动|菜单栏|点进|打开).{0,40}(导航|页面|按钮|入口)/.test(candidate));
    if (debunkOrGuide) return false;

    const windowMs = readEnvInt('BOT_MASSAGE_MEME_WINDOW_MS', 900_000, 60_000, 3_600_000);
    const scanN = readEnvInt('BOT_MASSAGE_MEME_SCAN_N', 120, 20, 280);
    const prior = this.countRecentBotTextMatches(roomId, massageMeme, windowMs, scanN);
    if (prior >= 1) return true;
    const ctxHits = (String(context).match(/颈部按摩|按摩的绿|绿色.{0,6}颈|绿.{0,6}按摩|做按摩的绿/g) || []).length;
    /** 上下文中已多次出现才算「梗污染」，避免仅一条就误杀 */
    return ctxHits >= 2;
  }

  /** 提问模板降频：避免“你们那边呢/有啥经验/天气咋样”循环刷屏 */
  private isOverusedQuestionTemplate(roomId: string, candidate: string): boolean {
    if (!/[?？]/.test(candidate)) return false;
    const qTpl =
      /(你们那边呢|你们呢|有啥(经验|方法|建议|技巧)|有什么(经验|方法|建议|技巧)|天气咋样|适合出去走走|确认数.*(咋样|怎么样)|你们平时.*(吗|呢)\??|最近.*(吗|呢)\??)/;
    if (!qTpl.test(candidate)) return false;
    const windowMs = readEnvInt('BOT_QUESTION_TEMPLATE_WINDOW_MS', 300_000, 60_000, 1_800_000);
    const scanN = readEnvInt('BOT_QUESTION_TEMPLATE_SCAN_N', 90, 20, 240);
    const maxCount = readEnvInt('BOT_QUESTION_TEMPLATE_MAX', 2, 0, 10);
    return this.countRecentBotTextMatches(roomId, qTpl, windowMs, scanN) > maxCount;
  }

  /** 组合句冷却：避免“天气+确认数”套话在短时间内重复拼装 */
  private isOverusedWeatherConfirmCombo(roomId: string, candidate: string): boolean {
    const c = String(candidate || '');
    const hasWeather = /(天气|下雨|暴雨|温差|出门|走走|散步)/.test(c);
    const hasConfirm = /(确认数|pending|链上|哈希|确认了心里才踏实|心里才踏实)/.test(c);
    if (!hasWeather || !hasConfirm) return false;
    const combo = /(天气|下雨|暴雨|温差|出门|走走|散步).*(确认数|pending|链上|哈希|心里才踏实)|(确认数|pending|链上|哈希|心里才踏实).*(天气|下雨|暴雨|温差|出门|走走|散步)/;
    const windowMs = readEnvInt('BOT_COMBO_COOLDOWN_WINDOW_MS', 480_000, 60_000, 1_800_000);
    const scanN = readEnvInt('BOT_COMBO_COOLDOWN_SCAN_N', 120, 20, 260);
    const maxCount = readEnvInt('BOT_COMBO_COOLDOWN_MAX', 1, 0, 8);
    return this.countRecentBotTextMatches(roomId, combo, windowMs, scanN) > maxCount;
  }

  private rememberRoomTopic(roomId: string, text: string): void {
    const tags = extractTopicTags(text);
    let topicMap = this.roomTopicLastAt.get(roomId);
    if (!topicMap) {
      topicMap = new Map<string, number>();
      this.roomTopicLastAt.set(roomId, topicMap);
    }
    const now = Date.now();
    for (const tag of tags) topicMap.set(tag, now);
  }

  /**
   * 限制每个房间“参与说话”的活跃 bot 数量，避免 50+ 机器人同时抢话。
   * 采用时间窗口内稳定轮值：窗口内集合稳定，过窗口再平滑轮换。
   */
  private isBotInActiveRotation(roomId: string, bot: Bot, atMs = Date.now()): boolean {
    const cap = readEnvInt('BOT_ACTIVE_ROTATION_SIZE', 20, 4, 30);
    const windowMin = readEnvInt('BOT_ACTIVE_ROTATION_WINDOW_MIN', 90, 30, 720);
    const roomBots = Array.from(this.bots.values()).filter(
      (b) => b.isActive && b.roomIds.includes(roomId) && b.role !== 'admin_support' && b.role !== 'group_owner'
    );
    if (roomBots.length <= cap) return true;
    const windowKey = Math.floor(atMs / (windowMin * 60_000));
    const ranked = [...roomBots]
      .map((b) => {
        const h = ethers.id(`room:${roomId}:w:${windowKey}:bot:${b.id}`).slice(2, 18);
        const score = Number.parseInt(h, 16);
        return { b, score };
      })
      .sort((a, b) => a.score - b.score)
      .slice(0, cap)
      .map((x) => x.b.id);
    return ranked.includes(bot.id);
  }

  private downweightQuestionyFallback(lines: string[], maxQuestionRatio = 0.2): string[] {
    const isQ = (s: string) => /[?？]|(吗|呢|么)$/.test(String(s || '').trim());
    const q: string[] = [];
    const non: string[] = [];
    for (const l of lines) (isQ(l) ? q : non).push(l);
    if (!q.length) return lines;
    const keepQ = Math.max(1, Math.min(q.length, Math.floor((non.length + q.length) * maxQuestionRatio)));
    const qKeep = shuffleInPlace([...q]).slice(0, keepQ);
    return [...non, ...qKeep];
  }

  private getFallbackRawPool(
    bot: Bot,
    opts: { triggeredBy: null | { user: User; content: string }; earningsRwa: number | null },
    at: Date
  ): string[] {
    if (opts.earningsRwa !== null) {
      const n = String(opts.earningsRwa);
      return EARNINGS_FALLBACK_LINES.map((t) => t.replace('{n}', n));
    }
    const id: FallbackId = this.identityByBotId.get(bot.id) ?? 'generic';
    const base = opts.triggeredBy
      ? [...FALLBACK_REPLY[id], ...FALLBACK_REPLY_EXTRA[id]]
      : [...FALLBACK_AMBIENT[id], ...FALLBACK_AMBIENT_EXTRA[id]];
    const rw = opts.triggeredBy ? RW_TOPIC_REPLY : RW_TOPIC_AMBIENT;
    const merged = [...base, ...rw, ...DAILY_CHITCHAT, ...Array.from(MICRO_REPLIES), ...getCalendarExtraFallbackLines(at)];
    return opts.triggeredBy ? merged : this.downweightQuestionyFallback(merged, 0.2);
  }

  private pickStickerUrlUnique(): string | null {
    this.refreshUtteredDayAndMergeHistory();
    const shuffled = shuffleInPlace([...BOT_STICKER_URLS]);
    for (const url of shuffled) {
      if (!isAllowedChatImageUrl(url)) continue;
      if (!this.isUtteranceDuplicateToday(normalizeUtteranceKey(url))) return url;
    }
    return null;
  }

  private pushBotChatMessage(
    roomId: string,
    bot: Bot,
    body: string,
    type: 'text' | 'image',
    replyTo?: string
  ): Message | null {
    const msg = chatService.addMessage(roomId, bot.userId, body, type, replyTo);
    if (msg && this.onBotMessage) {
      const user = chatService.getUser(bot.userId);
      if (user) this.onBotMessage({ ...msg, user }, roomId);
    }
    if (msg && type === 'text') {
      try {
        this.maybeTriggerCrossBotReply(roomId, bot, String(body || ''));
      } catch (e) {
        console.error('[Bot] cross-bot trigger failed:', e);
      }
    }
    return msg;
  }

  private wasSameTextRecently(roomId: string, userId: string, body: string, withinMs: number): boolean {
    const now = Date.now();
    const key = normalizeUtteranceKey(body);
    if (!key) return false;
    const recent = chatService.getMessages(roomId, 12);
    for (let i = recent.length - 1; i >= 0; i--) {
      const m = recent[i]!;
      if (m.userId !== userId) continue;
      if (m.type !== 'text') continue;
      if (now - m.timestamp > withinMs) break;
      if (normalizeUtteranceKey(m.content) === key) return true;
    }
    return false;
  }

  private getAdminBroadcastTimes(): Array<{ slot: AdminBroadcastSlot; hour: number; minute: number; key: string }> {
    // Default: morning / afternoon / night fixed times (Shanghai)
    const raw = String(process.env.BOT_ADMIN_BROADCAST_TIMES || '10:00,15:30,21:30');
    const slots: AdminBroadcastSlot[] = ['morning', 'afternoon', 'night'];
    const pieces = raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 3);
    const out: Array<{ slot: AdminBroadcastSlot; hour: number; minute: number; key: string }> = [];
    for (let i = 0; i < pieces.length; i++) {
      const part = pieces[i]!;
      const m = /^(\d{1,2}):(\d{1,2})$/.exec(part);
      if (!m) continue;
      const hour = Math.max(0, Math.min(23, Number(m[1])));
      const minute = Math.max(0, Math.min(59, Number(m[2])));
      const slot = slots[i]!;
      out.push({ slot, hour, minute, key: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}` });
    }
    return out;
  }

  /** 每分钟调用一次：管理员固定时段发送专业教程/规范播报 */
  runAdminScheduledBroadcastTick(now = new Date()): void {
    if (readEnvInt('BOT_ADMIN_BROADCAST_ENABLED', 1, 0, 1) !== 1) return;
    const { hour, minute } = getShanghaiHourMinute(now);
    const dateKey = getShanghaiDateKey(now);
    const slots = this.getAdminBroadcastTimes();
    if (!slots.length) return;

    const hit = slots.find((s) => s.hour === hour && s.minute === minute);
    if (!hit) return;

    const dedupeKey = `${dateKey}:${hit.slot}:${hit.key}`;
    if (this.adminBroadcastSentKeys.has(dedupeKey)) return;
    this.adminBroadcastSentKeys.add(dedupeKey);

    const bot =
      Array.from(this.bots.values()).find((b) => b.role === 'admin_support') ||
      Array.from(this.bots.values()).find((b) => b.role === 'group_owner');
    if (!bot) return;

    const roomIdsRaw = String(process.env.BOT_ADMIN_BROADCAST_ROOMS || 'room-announcements,room-general');
    const roomIds = roomIdsRaw
      .split(',')
      .map((s) => s.trim())
      .filter((id) => !!id && !!chatService.getRoom(id));
    if (!roomIds.length) return;

    const pool = ADMIN_BROADCAST_LIBRARY_WEEKLY[hit.slot] || ADMIN_BROADCAST_LIBRARY_WEEKLY.morning;
    const weekdayIdx = getShanghaiWeekdayIndex(now);
    const topic = pool[weekdayIdx % pool.length] || pool[0]!;
    const variant = adminPickVariantBySlot(hit.slot);
    const raw = topic[variant] || topic.long;
    const dateLine = `🗓️ 日期：${formatShanghaiYmd(now)}`;
    const body = `${raw}\n\n${dateLine}\n\n💬 需要我一步步帮你核对操作？点我头像直接咨询。`;
    for (const roomId of roomIds) {
      if (this.wasSameTextRecently(roomId, bot.userId, body, 15 * 60_000)) continue;
      const msg = this.pushBotChatMessage(roomId, bot, body, 'text');
      if (msg) {
        this.rememberUtteranceToday(body);
        this.rememberRoomTopic(roomId, body);
      }
    }
  }

  /** 兜底话术：尽量不与当日已有机器人发言完全相同 */
  private pickFallbackLineUnique(
    bot: Bot,
    opts: { triggeredBy: null | { user: User; content: string }; earningsRwa: number | null },
    at = new Date()
  ): string {
    this.refreshUtteredDayAndMergeHistory();
    const flat = this.getFallbackRawPool(bot, opts, at);
    const pool = shuffleInPlace([...flat]);

    const punct = this.getPunctuation(bot);
    const emojiRate = this.getHumanizeEmojiRate(bot, punct);
    const humanizeLine = (raw: string) =>
      raw.length <= 8 || MICRO_REPLIES.has(raw)
        ? humanizeCasualChinese(raw, { mode: 'micro', punctuation: punct, emojiRate })
        : humanizeCasualChinese(raw, { punctuation: punct, emojiRate });

    for (const raw of pool) {
      const h = humanizeLine(raw);
      const k = normalizeUtteranceKey(h);
      if (!this.isUtteranceDuplicateToday(k)) return h;
    }

    for (let i = 0; i < 36; i++) {
      const raw = pickRandom(flat);
      const suffix = i % 4 === 0 ? '' : ` ${i % 7}`;
      const h = humanizeLine(raw + suffix);
      const k = normalizeUtteranceKey(h);
      if (!this.isUtteranceDuplicateToday(k)) return h;
    }

    const salt = `${Date.now()}`.slice(-5) + `${Math.floor(Math.random() * 999)}`;
    const rawPick = pickRandom(flat);
    const base = humanizeLine(rawPick);
    let out = saltUtteranceUnique(base, salt.slice(0, 4));
    out = humanizeLine(out);
    if (this.isUtteranceDuplicateToday(normalizeUtteranceKey(out))) {
      out = saltUtteranceUnique(base, salt);
    }
    return out;
  }

  private scheduleNext(bot: Bot) {
    if (!bot.isActive || !bot.schedule.enabled) return;
    const superEco = readEnvInt('BOT_SUPER_ECO_MODE', 1, 0, 1) === 1;
    const { minIntervalMs, maxIntervalMs } = bot.schedule;
    // superEco 默认更慢一点，降低刷屏与 LLM 压力
    const scale = readEnvFloat('BOT_SCHEDULE_SCALE', superEco ? 1.85 : 1.45, 0.22, 3.2);
    const minAdj = Math.max(superEco ? 125_000 : 95_000, Math.floor(minIntervalMs * scale));
    const maxAdj = Math.max(minAdj + (superEco ? 40_000 : 25_000), Math.floor(maxIntervalMs * scale));
    const span = Math.max(1, maxAdj - minAdj);
    const delay = Math.floor(Math.random() * span) + minAdj;
    const hour = getShanghaiHour(new Date());
    const schedMult = getAmbientScheduleDelayMultiplier(hour, bot.id);
    const delayScaled = Math.max(superEco ? 95_000 : 65_000, Math.floor(delay * schedMult));

    const timer = setTimeout(async () => {
      const hourNow = getShanghaiHour(new Date());
      const mult = readEnvFloat('BOT_SPEAK_CHANCE_MULT', superEco ? 0.26 : 0.30, 0.06, 1.3);
      let chance = Math.min(superEco ? 0.50 : 0.58, (this.speakChanceByBotId.get(bot.id) ?? 0.5) * mult);
      chance = chance * getAmbientSpeakChanceMultiplierByHour(hourNow, bot.id);
      const roomId = bot.roomIds[Math.floor(Math.random() * bot.roomIds.length)];
      if (roomId && bot.role !== 'admin_support' && bot.role !== 'group_owner' && !this.isBotInActiveRotation(roomId, bot)) {
        this.scheduleNext(bot);
        return;
      }
      if (roomId) {
        const sinceHuman = chatService.getMsSinceLastHumanMessage(roomId);
        const coldMs = this.getColdRoomWakeupMs(bot);
        const isColdWakeup = sinceHuman > coldMs && sinceHuman < Number.POSITIVE_INFINITY;
        if (isColdWakeup) {
          chance = Math.min(
            0.98,
            chance * readEnvFloat('BOT_COLD_ROOM_CHANCE_MULT', superEco ? 1.0 : 1.01, 1, 1.8)
          );
        }
      }
      if (roomId && Math.random() <= chance) {
        const now = new Date();
        const earningsRwa = isInEarningsDistributionWindow(now) ? pickEarningsRwaAmount() : null;
        const sinceHuman = chatService.getMsSinceLastHumanMessage(roomId);
        const coldMs = this.getColdRoomWakeupMs(bot);
        const isColdWakeup = sinceHuman > coldMs && sinceHuman < Number.POSITIVE_INFINITY;
        await this.executeBotMessage(bot, roomId, { triggeredBy: null, earningsRwa }, { coldWakeup: isColdWakeup });
      }
      this.scheduleNext(bot);
    }, delayScaled);

    this.timers.set(bot.id, timer);
  }

  private async executeBotMessage(
    bot: Bot,
    roomId: string,
    opts: {
      triggeredBy: null | { user: User; content: string; sourceMessageId?: string };
      earningsRwa: number | null;
    },
    flags?: {
      forceBurst?: boolean;
      chunkyFollowUp?: boolean;
      coldWakeup?: boolean;
      selfInterruptFollowUp?: boolean;
      mentionForced?: boolean;
      repeatQuestion?: boolean;
      socialTrigger?: {
        kind: string;
        speakerPersonaId: string;
        speakerText: string;
        styleHint: string;
      };
    }
  ): Promise<Message | null> {
    const replyToHuman = Boolean(opts.triggeredBy);
    const useAmbientQueue =
      readEnvInt('BOT_AMBIENT_QUEUE_ENABLED', 1, 0, 1) === 1 &&
      !replyToHuman &&
      flags?.forceBurst !== true &&
      flags?.chunkyFollowUp !== true;

    if (!useAmbientQueue) {
      return this.executeBotMessageCore(bot, roomId, opts, flags);
    }

    return new Promise((resolve) => {
      this.ambientQueueTail = this.ambientQueueTail.then(async () => {
        const superEco = readEnvInt('BOT_SUPER_ECO_MODE', 1, 0, 1) === 1;
        const min = readEnvInt('BOT_AMBIENT_QUEUE_MIN_MS', superEco ? 8_500 : 5_500, 0, 120_000);
        const max = readEnvInt('BOT_AMBIENT_QUEUE_MAX_MS', superEco ? 18_000 : 13_000, min, 180_000);
        const gap = min + Math.floor(Math.random() * Math.max(1, max - min + 1));
        await new Promise((r) => setTimeout(r, gap));
        try {
          resolve(await this.executeBotMessageCore(bot, roomId, opts, flags));
        } catch (e) {
          console.error('[Bot] ambient queue task failed:', e);
          resolve(null);
        }
      });
    });
  }

  private async executeBotMessageCore(
    bot: Bot,
    roomId: string,
    opts: {
      triggeredBy: null | { user: User; content: string; sourceMessageId?: string };
      earningsRwa: number | null;
    },
    flags?: {
      forceBurst?: boolean;
      chunkyFollowUp?: boolean;
      coldWakeup?: boolean;
      selfInterruptFollowUp?: boolean;
      mentionForced?: boolean;
      repeatQuestion?: boolean;
      socialTrigger?: {
        kind: string;
        speakerPersonaId: string;
        speakerText: string;
        styleHint: string;
      };
    }
  ): Promise<Message | null> {
    if (!bot.isActive) return null;
    const forceBurst = flags?.forceBurst === true;
    const chunkyFollowUp = flags?.chunkyFollowUp === true;
    const replyToHuman = Boolean(opts.triggeredBy);
    const coldWakeup = flags?.coldWakeup === true && !replyToHuman && !chunkyFollowUp && !forceBurst;
    const mentionForced = flags?.mentionForced === true;
    const repeatQuestion = flags?.repeatQuestion === true;
    const socialTrigger = flags?.socialTrigger;
    const isAdminBot = bot.role === 'admin_support' || bot.role === 'group_owner';
    const privateSelfProfileBlock = await this.buildPrivateSelfProfileBlock(roomId, isAdminBot, opts.triggeredBy);
    const selfProfileAsked = !!(opts.triggeredBy && this.isSelfProfileQuestion(opts.triggeredBy.content));
    const stakeMaturityAsked = !!(opts.triggeredBy && this.isStakeMaturityQuestion(opts.triggeredBy.content));
    const selfYieldAsked = !!(opts.triggeredBy && /(今天|今日).*(收益|收入|到账|回报)|收益.*(今天|今日)/.test(String(opts.triggeredBy.content || '').toLowerCase()));

    /** 管理员机器人只接真人提问，不参与水群/定时插话/连发表情 */
    if (isAdminBot && !opts.triggeredBy && !forceBurst && !chunkyFollowUp) {
      return null;
    }

    /** 接真人话不受作息表限制（否则凌晨群里有问无答） */
    if (!forceBurst && !replyToHuman && !isInActiveHours(bot)) return null;

    if (!forceBurst && !replyToHuman && !chunkyFollowUp && shouldBlockAmbientDeepNight(bot.id, getShanghaiHour(new Date()))) {
      return null;
    }

    const isAmbient = !opts.triggeredBy;
    if (!forceBurst && isAmbient) {
      const sinceHuman = chatService.getMsSinceLastHumanMessage(roomId);
      if (sinceHuman < humanQuietMs()) {
        return null;
      }
      if (!isAdminBot) {
        if (this.hasRepliedTooMuchRecently(bot, roomId)) return null;
        if (Math.random() < this.getSilenceReadWithoutReplyRatio(bot)) return null;
      }
    }

    // 主动插话需错开一小段；接真人话不受此限
    if (!forceBurst && !replyToHuman) {
      const roomLast = this.roomLastBotAt.get(roomId) || 0;
      const ambientGap = readEnvInt('BOT_ROOM_AMBIENT_GAP_MS', 150_000, 10_000, 600_000);
      if (Date.now() - roomLast < ambientGap) return null;
    }

    const prevRoomLast = this.roomLastBotAt.get(roomId);
    const prevBotLast = this.botLastSentAt.get(bot.id);
    const rollbackLocks = () => {
      if (prevRoomLast === undefined) this.roomLastBotAt.delete(roomId);
      else this.roomLastBotAt.set(roomId, prevRoomLast);
      if (prevBotLast === undefined) this.botLastSentAt.delete(bot.id);
      else this.botLastSentAt.set(bot.id, prevBotLast);
    };

    // Soft lock: reserve now
    this.roomLastBotAt.set(roomId, Date.now());
    this.botLastSentAt.set(bot.id, Date.now());

    const punct = this.getPunctuation(bot);
    const now = new Date();
    const investAskedGlobal = Boolean(
      opts.triggeredBy &&
        /投了多少|投了几|多少u|多少U|多少usdt|仓位多少|入了多少|买了多少/i.test(opts.triggeredBy.content || '')
    );
    const investedUsdtGlobal = investAskedGlobal ? this.getPersonaInvestedUsdt(bot) : null;
    let effOpts = opts;
    if (!isInEarningsDistributionWindow(now) && effOpts.earningsRwa !== null) {
      effOpts = { ...effOpts, earningsRwa: null };
    }

    try {
      const personaContextLlmOnly = true;
      const botImageOn = readEnvInt('BOT_CHAT_BOT_IMAGE_ENABLED', 1, 0, 1) === 1;
      const allowSticker = botImageOn && effOpts.earningsRwa === null && !chunkyFollowUp;
      const imageOnlyRoll = allowSticker && !effOpts.triggeredBy && Math.random() < 0.04;
      const imageAfterRoll = allowSticker && !effOpts.triggeredBy && !imageOnlyRoll && Math.random() < 0.04;

      if (imageOnlyRoll) {
        this.refreshUtteredDayAndMergeHistory();
        const url = this.pickStickerUrlUnique();
        if (url) {
          this.rememberUtteranceToday(url);
          await new Promise((r) => setTimeout(r, 500 + Math.random() * 900));
          console.log(`[Bot LLM] Groq/OpenRouter skipped for this turn — sticker-only message (${bot.name})`);
          return this.pushBotChatMessage(roomId, bot, url, 'image');
        }
      }

      const recentWindow = mentionForced ? 8 : replyToHuman ? 10 : 16;
      const recentMessages = chatService.getMessages(roomId, recentWindow);
      const recentLite = recentMessages
        .map((m) => {
          const u = chatService.getUser(m.userId);
          const name = u?.nickname || 'Unknown';
          const isHuman = Boolean(u && !u.isBot);
          const content = m.type === 'image' ? `[图片] ${m.content}` : m.content;
          return { name, isHuman, content: String(content || '') };
        })
        .filter((x) => x.content.trim().length > 0);
      const { context: ctxRaw } = compressRecentChatContext(recentLite, {
        maxRawMsgs: readEnvInt('BOT_CONTEXT_MAX_RAW_HISTORY_MSGS', replyToHuman ? 20 : 26, 8, 80),
        alwaysKeepLastN: readEnvInt('BOT_CONTEXT_ALWAYS_KEEP_LAST_N', replyToHuman ? 8 : 10, 4, 18),
      });
      let context = ctxRaw;
      const contextCap = mentionForced ? 1_050 : replyToHuman ? 1_350 : 2_100;
      if (context.length > contextCap) context = context.slice(-contextCap);
      const humanStyleHint = buildRoomHumanStyleHint(recentLite);
      const hasQuestionMark = (s: string) => /[?？]/.test(s);
      const latestHumanQuestion = (() => {
        // 真人优先：只看最近的人类问句，避免机器人互相抛问句形成空转
        for (let i = recentLite.length - 1; i >= 0; i--) {
          const row = recentLite[i];
          if (!row?.isHuman) continue;
          const c = (row.content || '').trim();
          if (!c) continue;
          if (hasQuestionMark(c)) return c;
        }
        return '';
      })();
      const contextLogicHintAmbient =
        '你这条没有接住群里刚刚的问题（像自说自话/只顾抛问题）。请重写：先用 1-2 句回答上文里最近那个问句（引用其中 1-2 个关键词），再结合 PERSONA 给出你的观点/经历；如果话题在聊收益/质押，再自然带上你人设里的日收益率/每日粗算收益。是否反问可自由，但不要只抛新问题。不要公告腔。';
      const ambientNoQuestionHint =
        '当前没有明确的真人问句可接。请改写成“陈述句为主”的自然短句（分享一个具体近况/细节），不要再用追问句带节奏。';

      const room = chatService.getRoom(roomId);
      const calendarBlock = describeCalendarForLlm(now);
      const shHour = getShanghaiHour(now);
      const recentBotStreak = recentMessages
        .slice(-6)
        .filter((m) => m.type === 'text')
        .map((m) => {
          const u = chatService.getUser(m.userId);
          return u?.isBot ? 'b' : 'h';
        });
      const botCnt = recentBotStreak.filter((x) => x === 'b').length;
      const humanCnt = recentBotStreak.filter((x) => x === 'h').length;
      const lastHumanTs = chatService.getLastHumanMessageTimestamp(roomId);
      const ambientRequireRecentHumanMs = readEnvInt('BOT_AMBIENT_REQUIRE_HUMAN_MS', 1_800_000, 60_000, 86_400_000);
      if (!replyToHuman && !chunkyFollowUp && !forceBurst) {
        // Hard realism guard: 若曾有真人、但太久无真人，则停止主动插话（防机器人空转）。从未有真人则允许暖场。
        if (lastHumanTs > 0 && Date.now() - lastHumanTs > ambientRequireRecentHumanMs) {
          rollbackLocks();
          return null;
        }
        // Hard realism guard: avoid bot-only streaks.
        if (botCnt >= 4 && humanCnt <= 1) {
          rollbackLocks();
          return null;
        }
      }

      const earningsLine =
        effOpts.earningsRwa !== null
          ? `【仅早间发放窗口】在接下来的发言里自然提到：我今天到账大约 ${effOpts.earningsRwa} RWA（数字须在 9-300 内，语气口语）。`
          : '';

      let triggerLine = '';
      const superEco = readEnvInt('BOT_SUPER_ECO_MODE', 1, 0, 1) === 1;
      // 主动插话：优先走“话题池”（更像群里正常聊天），少量概率才日常闲聊；避免总聊天气
      const ambientDailyRatio = readEnvFloat('BOT_AMBIENT_DAILY_CHAT_RATIO', superEco ? 0.06 : 0.10, 0, 0.95);
      const ambientDailyMode = !effOpts.triggeredBy && !chunkyFollowUp && Math.random() < ambientDailyRatio;
      const extractPersonaField = (label: string): string => {
        const persona = String(bot.persona || '');
        const m = persona.match(new RegExp(`${label}：([^\\n]+)`));
        return String(m?.[1] || '').trim();
      };
      const personaOcc = extractPersonaField('职业/身份') || extractPersonaField('职业') || '';
      const pf = this.extractPersonaJsonBlock(bot, 'PERSONA_FIELDS_JSON') || {};
      const anchorLine = (() => {
        if (isAdminBot) return '';
        const name = String((pf as any).name || bot.name || '').trim();
        const nick = String((pf as any).nickname || '').trim();
        const occ = String((pf as any).occupation || personaOcc || '').trim();
        const inv = Number((pf as any).invested_total_usdt || 0) || 0;
        const y = String((pf as any).daily_yield_oral || '').trim();
        const bits: string[] = [];
        if (name) bits.push(`你叫${name}${nick && nick !== name ? `（常用称呼${nick}）` : ''}`);
        if (occ) bits.push(`你是${occ}`);
        if (inv > 0) bits.push(`你投了约${inv} USDT`);
        if (y) bits.push(`你的人设口语收益说法是「${y}」`);
        if (!bits.length) return '';
        return `\nCORE_PERSONA_ANCHOR (always prioritize; do not output):\n- ${bits.join('；')}\n`;
      })();
      const livingAnchorLine = isAdminBot ? '' : this.buildPersonaLivingAnchor(bot, roomId);
      const coldStartCountToday = isAdminBot ? 999 : this.getBotTextCountTodayInRoom(bot, roomId);
      const coldStartActive = !isAdminBot && this.isColdStartMessage(bot, roomId);

      if (personaContextLlmOnly) {
        if (effOpts.triggeredBy) {
          triggerLine = `对方刚发言：${effOpts.triggeredBy.user.nickname}: ${effOpts.triggeredBy.content}\n请先准确回应这条发言，再按你的人设自然补充一句。`;
        } else if (latestHumanQuestion) {
          triggerLine = `最近真人问题：${latestHumanQuestion}\n请按你的人设接住这个问题并自然回应。`;
        } else {
          triggerLine = '请仅基于最近聊天上下文，用你的人设自然发一条简短消息；不要脱离上下文自说自话。';
        }
      } else if (effOpts.triggeredBy) {
        const qc = effOpts.triggeredBy.content;
        const isLivelihoodQuestion =
          /哪里跑|在哪跑|哪片区|收入|单量|订单|跑单|外卖|工资|通勤|收工|下班|天气咋样|天气怎么样|忙不忙/i.test(qc);
        if (isAdminBot) {
          const jobQ = isIdentityOrJobQuestion(qc) || isLikelyAtSomeoneQuestion(qc);
          const introAdmin = jobQ
            ? `\n对方在问「你是谁/做啥的」：说明你是官方社区值班助手「${bot.name}」，负责解答规则与操作问题；不要说自己是普通路人群友。`
            : '';
          triggerLine = `【官方客服】用户 ${effOpts.triggeredBy.user.nickname}：「${effOpts.triggeredBy.content}」\n请先判断问题类型（规则/操作/风险/节点/推荐/链上确认等），用与用户引号内发言相同的主要自然语言作答（遵循 LANGUAGE_OUTPUT：界面 locale 已知且消息过短时优先 locale）；不得编造合约地址与保本收益。说明规则时尽量写出可核对数字（如锁仓 30/90/180/360 天对应约 0.8%/1.04%/1.28%/1.6% 日收益，活动档可到约 2.0%）；先接住对方上文里的具体点，再作答。如语境合适，可用一句澄清式提问收尾。节点档位仅使用 L1–L9（与快照中 nodeLevel 整数 1–9 对应），禁止再说 V1–V5。${introAdmin}${privateSelfProfileBlock ? `\n\n${privateSelfProfileBlock}` : ''}`;
        } else {
          const needSelfIntro =
            isIdentityOrJobQuestion(qc) ||
            isLikelyAtSomeoneQuestion(qc) ||
            /我在问你|问你呢|不是问小张|不是问别人|我问的是你/i.test(qc);
          const asksInvestAmount = /投了多少|投了几|多少u|多少U|多少usdt|仓位多少|入了多少|买了多少/i.test(qc);
          const investedUsdt = this.getPersonaInvestedUsdt(bot);
          const needQuestionAnswer = needSelfIntro || isLikelyGeneralQuestion(qc);
          const introBlock = needSelfIntro
            ? `\n【必须回应】对方在问你是谁/做啥的/在不在等：你就是被点名的那个人，请用第一人称回答。\n- 必须按 PERSONA 自报：姓名/称呼 + 职业（若 PERSONA 有职业就必须使用，不要泛化成“分享知识/帮忙解答”）。\n- 禁止把别人的名字（例如“小张/楼上/他”）当成你自己，也不要编造第三人称人物。\n- 回答 1-2 句即可，口语。\n- 禁止说你是 AI/机器人/助手。${personaOcc ? `\n【硬约束】你的职业（来自人设）=「${personaOcc}」，回答必须与此一致。` : ''}`
            : needQuestionAnswer
              ? `\n【接话】对方在提问或接话题：结合 PERSONA 用口语直接回应，别敷衍成纯「收到」。`
              : '';
          const livelihoodBlock =
            mentionForced && isLivelihoodQuestion
              ? `\n【生活问答隔离】本轮只回答对方的生活/工作问题（如跑单地点、收入节奏、下班时间、天气）。\n- 禁止主动引入“确认数/质押/收益/RWA/USDT/链上/充值/提现”等协议术语。\n- 若对方没问投资，不要追加投资相关追问。`
              : '';
          const mentionBlock = mentionForced
            ? `\n【被点名场景】你是被 @ 的对象：必须优先回应对方问题；不要被其他机器人插话（例如“小张…”）带偏。`
            : '';
          const investBlock = asksInvestAmount
            ? `\n【投资金额硬约束】对方在问你的投入金额（不是问职业）。` +
              `${investedUsdt ? `你的人设已知总投入约 ${investedUsdt} USDT。` : ''}\n` +
              `- 第一行必须直接回答“投了多少/仓位多少”，尽量一句话。\n` +
              `- 禁止先聊职业、工作、天气、日收益；禁止答非所问。\n` +
              `${investedUsdt ? `- 建议形态：差不多${investedUsdt}u左右。` : '- 若无精确锚点，也要给保守数值范围，不要回避。'}`
            : '';
          triggerLine = `刚有人发言：${effOpts.triggeredBy.user.nickname}: ${effOpts.triggeredBy.content}\n请像微信群一样自然接话：先理解对方在说什么，再用 PERSONA 口吻回应；可短可稍长，别整段复述对方原话。若对方在聊收益/质押/对比，你需要引用自己人设的日收益率/每日粗算收益来回应（不要另编矛盾数字）；若对方只是日常聊天，则不必硬塞数字。可以顺势反问一句，但不是硬性要求。${mentionBlock}${introBlock}${livelihoodBlock}${investBlock}`;
        }
      } else {
        if (ambientDailyMode) {
          triggerLine = latestHumanQuestion
            ? `群里安静了一会，但最近真人问了问题：「${latestHumanQuestion}」。请先用 1-2 句回答这个问题，再决定是否顺带补一句你的近况；不要只提新问题。`
            : `群里安静了一会：请发一条自然的日常闲聊短句，但避免反复聊天气。` +
              `更像真人随口一句（工作/生活小细节/轻吐槽/近况都行），不要公告腔，也不要像客服话术。`;
        } else {
          const topic = !isAdminBot ? this.pickPersonaTopicRoundRobin(bot, roomId) : null;
          const topicBlock = topic
            ? `【话题池轮值】主题：${topic.title}\n要求：${topic.prompt}\n注意：必须符合 PERSONA（允许俏皮/粗鲁/俗气只在你的人设本来就会这么说时才用）。`
            : `请发一条自然短句，但不要总聊天气；尽量从“操作步骤/常见卡点/反诈提醒/邀请推广注意事项”等切入，并抛一个问题带出对话。`;
          triggerLine =
            `群里刚安静一会：如果上文真人提了问题，你必须先接住并回答那个问题（不要只抛新问题）；然后再发一条能引发回复的消息（先给一个具体点，再抛一个问题）。\n` +
            `${topicBlock}\n` +
            `字数：12–90 字为主，偶尔可两三行；不要像公告。若聊到质押/收益/对比，可自然带一句 PERSONA 里的日收益率与两项粗算每日收益（RWA+USDT），并配以问句。`;
        }
      }

      if (chunkyFollowUp) {
        triggerLine = buildChunkyFollowUpUserPrompt(bot.name, context);
        if (flags?.selfInterruptFollowUp) {
          triggerLine += `\n【补充方式】更像真人“打断补充/补一句”：短、碎、口语；允许一句自我修正（如“我刚想起来…”“补一句…”），不要长篇大论。`;
        }
      }

      if (coldWakeup) {
        const sr = this.getRuntimeTuning(bot)?.silence_recovery_profile;
        const lenBias = String(sr?.wakeup_message_length_bias || '').trim();
        const qP = sr?.wakeup_question_probability;
        const allowQ = Number.isFinite(qP as number) ? Math.random() < clampNum(Number(qP), 0, 1) : false;
        const lenRule =
          lenBias === 'short'
            ? '字数倾向：10–30 字为主，像“冒个泡/补一句”，不要小作文。'
            : lenBias === 'long'
              ? '字数倾向：40–120 字，带一点具体生活细节，但别写公告。'
              : '字数倾向：12–80 字，自然口语。';
        const qRule = allowQ
          ? '结尾可以带一个轻问句引导（不要模板提问），例如“你那边卡在哪一步？”'
          : '尽量用陈述句收尾（不强行提问），更像真人随口补一句。';
        triggerLine = `【冷房唤醒】群里一段时间没人说话了，你可以自然冒个泡，但不要像机器人硬暖场。\n${lenRule}\n${qRule}\n\n${triggerLine}`;
      }

      if (socialTrigger && !replyToHuman && !chunkyFollowUp) {
        triggerLine =
          `【跨BOT关系触发】刚发言的人（persona=${socialTrigger.speakerPersonaId}）和你是熟人关系：${socialTrigger.kind}。\n` +
          `- 你要像真人一样“顺手接一句”，别写长篇，不要像客服。\n` +
          `- 风格提示：${socialTrigger.styleHint}\n` +
          `- 对方刚说的大意：${socialTrigger.speakerText}\n` +
          `- 你可以轻轻回应/补充一个小细节/轻吐槽；不要抛模板问句。\n\n` +
          triggerLine;
      }
      const occCtxHint = isAdminBot ? '' : this.buildOccupationContextHint(bot, `${context}\n${triggerLine}`);

      const punctPersonaLine =
        punct === 'formal'
          ? '你打字习惯：标点相对完整，常用逗号、句号，读起来像认真打字。'
          : punct === 'casual'
            ? '你打字习惯：偏手机快打，句末标点常省略，逗号偶尔用空格代替。'
            : '你打字习惯：标点有时省、有时用，别像模板一样整齐。';

      const liveBlock = isAdminBot ? '' : buildLiveStatePromptBlock(bot.id);
      const currentStateFrame = (() => {
        if (isAdminBot) return '';
        const h = getShanghaiHour(now);
        if (h >= 23 || h < 6) return 'CURRENT_STATE_FRAME: 现在偏晚，语气更短更轻，不要连续追问。';
        if (h >= 6 && h < 9) return 'CURRENT_STATE_FRAME: 现在早晨，语气务实，优先一句到两句。';
        if (h >= 12 && h < 14) return 'CURRENT_STATE_FRAME: 现在午间，像碎片时间看群，回复宜短。';
        if (h >= 18 && h < 22) return 'CURRENT_STATE_FRAME: 现在晚间，允许稍微展开一点生活细节。';
        return 'CURRENT_STATE_FRAME: 保持普通日常状态，先答后说。';
      })();
      const addressingBlock =
        effOpts.triggeredBy && !chunkyFollowUp && !isAdminBot
          ? `\n${buildAddressingLine(effOpts.triggeredBy.user.nickname)}`
          : effOpts.triggeredBy && !chunkyFollowUp && isAdminBot
            ? `\nADDRESSING: 可自然称呼对方「${effOpts.triggeredBy.user.nickname}」，保持官方客服语气。`
            : '';

      const lengthRule =
        isAdminBot && effOpts.triggeredBy
          ? `- Output ONLY the message content. 官方解答：信息密度优先，可分段或分点；避免空话与「收到+小额」式复读；不确定处明确说以站内页面与链上为准。`
          : effOpts.triggeredBy
            ? `- Output ONLY the message content. Length: 可短可稍长；避免整段小作文。`
            : `- Output ONLY the message content. 【主动发言】优先写 12–80 字的一小段口语；偶尔可以更短，但禁止全群都是「收到/明白+小额+查看详情」式客服套话。`;
      const maxChars = !isAdminBot ? this.getReplyMaxChars(bot, now, replyToHuman) : 999;
      const preferredChars = !isAdminBot ? this.getPreferredReplyChars(bot) : 36;
      const maxCharsRule =
        !isAdminBot && maxChars < 999
          ? `- LENGTH_CONSTRAINT: 当前这条尽量不超过 ${maxChars} 个字；本 bot 的常态舒适长度约 ${preferredChars} 字。`
          : '';
      const coldStartDiversityRule =
        !isAdminBot && coldStartCountToday < 3
          ? `\n- COLD_START_DIVERSITY_RULE: 这是你今天前3条发言之一。必须带个人特色，不要通用套话；必须包含以下其一：职业场景 OR 地点 OR 你自己的收益/仓位锚点。`
          : '';

      const ambientAntiTemplate =
        !effOpts.triggeredBy && !isAdminBot
          ? `
- 【主动发言】禁止整句只用「收到/明白/好滴/嗯 + 小额/查看详情/先看规则/对页面」这类无信息量的复读；须有人设气息，但用「动作/场景/情绪/半句吐槽」即可，不要为了凑具体而整句自报「我在XX市做XX + 收益几块RWA」——除非上文有人在点名问你的工作地/工种/收益。
- 【主动发言】少用或不用 emoji；不要用 🔍👍🫡 连续堆叠装热络。`
          : '';
      const ambientMotifRule =
        !effOpts.triggeredBy && !isAdminBot
          ? '\n- 【主动发言】最近多条消息若已提到咖啡/手冲，则本条禁止再提该意象，换其他日常话题。'
          : '';
      const massageCtxHits = (String(context).match(/颈部按摩|按摩的绿|绿色.{0,6}颈|绿.{0,6}按摩|做按摩的绿/g) || [])
        .length;
      const massageMemePromptRule =
        massageCtxHits >= 2 && !isAdminBot
          ? `\n- 【群聊卫生】上下文已多次出现把「绿色/配色」硬扯成「按摩/颈部按摩」的跟风句。禁止继续玩该梗；APP 配色与按摩无关。若有人在问导航/按钮，用「底部栏、钱包、资金活动入口」等具体指路，不要编段子。\n`
          : '';

      const topicBiasLine = personaContextLlmOnly
        ? '- Topic bias: follow recent context only; do not inject unrelated protocol topics.'
        : !effOpts.triggeredBy && ambientDailyMode
          ? '- Topic bias: 本条优先日常聊天（生活琐事/工作近况/轻松吐槽）；可轻触业务但别变成教程。'
          : '- Topic bias: prefer 质押(staking)、充值(on-ramp/top-up)、收益规则与节奏、赎回与确认数——贴合 RWA 协议聊天场景。';

      const numbersAndDialogueRules = isAdminBot
        ? `- 数字与接话：多用可核对数字（锁仓天数、档位百分比、确认数等），少空话；先对准用户上文再答；如合适以澄清式提问收尾。`
        : `- 数字与对话：不要为了凑数字而生硬堆数字。仅当话题在聊收益/质押/对比/金额时，才优先用具体数字来回应；此时必须牢记并引用 PERSONA 中的「日收益率」与「每日粗算 RWA、USDT」两项，勿另编矛盾数字。若是日常闲聊，可完全不提收益数字。回应真人时必先接住上文关键词再用人设回答；是否反问可自由，但不要只抛问题不回应。`;

      const memoryLines = botMemoryService.getMemoryLinesForPrompt(
        bot.id,
        roomId,
        `${context}\n${triggerLine}`,
        isAdminBot ? 3 : 5
      );
      const memoryBlock =
        memoryLines.length > 0
          ? `LONG_TERM_MEMORY (use naturally, do not recite):\n${memoryLines.join('\n')}`
          : 'LONG_TERM_MEMORY: (none)';
      const fewShotBlock = (() => {
        const block = `FEW_SHOT_EXAMPLES (learn the style; do NOT output these):
【错误示范 - 禁止】
用户问：收入大概多少？
❌ 哈哈哈，收入嘛得看单量和效率，你那边咋样？😄

【正确示范 - 要求】
用户问：收入大概多少？
✅ 我这边最近一个月平均一万二左右吧
✅ 不稳定，好的时候一万五，差的时候一万不到
✅ 这个不太好说（明确拒绝，不反问）

【错误示范 - 禁止】
问：投了多少？
❌ 这个得看个人情况，你那边投了多少？😄

【正确示范 - 要求】
问：投了多少？
✅ 五千左右
✅ 五千多一点，不想细说`;
        if (isAdminBot) return '';
        const coreBudget = 3_200;
        const reserveForReply = 260;
        const estCore = bot.persona.length + context.length + triggerLine.length + calendarBlock.length + memoryBlock.length + 900;
        const available = coreBudget - reserveForReply - estCore;
        return available > 420 ? block : '';
      })();

      const coreRules = (() => {
        if (isAdminBot) {
          return [
            '- 输出仅回复正文；信息密度优先，可分点；不确定处明确说以站内页面与链上为准。',
            '- 禁止按钮腔：不说“查看详情/点击查看/点我查看”。',
            '- 先对准用户原话再答；必要时可用澄清式追问收尾（最多 1 个问句）。',
          ].join('\n');
        }
        return [
          '- 输出仅回复正文；像微信群真人口语，不要客服腔；禁止自称 AI/机器人。',
          '- 严格保持人设一致（身份/职业/地点/说话习惯）；不要编造不存在的人名关系。',
          '- 接话要先“答到点上”，再决定是否追问；整条最多 1 个问句，禁止固定反问收尾。',
          '- 禁止按钮腔：不说“查看详情/点击查看/点我查看”，改成口语“看公告/对一下页面/按条款”。',
          '- 少表情：通常不带；需要时最多 1-2 个且放末尾，禁止连发。',
        ].join('\n');
      })();

      const extendedRules = (() => {
        if (isAdminBot) return '';
        const extra: string[] = [];
        extra.push('- 中文标点与断句要符合你的打字习惯（formal/casual/mixed），别全员同款。');
        extra.push('- 禁止与当天任何机器人发言完全一致；若撞句必须换表达。');
        extra.push('- 遵守日历收益窗口：非窗口别写“今天到账多少 RWA”。');
        return extra.join('\n');
      })();
      const rulesBlock = `CORE_RULES (highest priority):\n${coreRules}\n\nEXT_RULES (apply if not conflicting with core):\n${extendedRules || '(none)'}`;

      const personaForPrompt = (() => {
        // Keep the prompt small enough for low-context providers (OpenRouter free tier, etc).
        // We do NOT change bot.persona itself (source of truth for parsing); only what we feed into the LLM.
        const fields = this.extractPersonaJsonBlock(bot, 'PERSONA_FIELDS_JSON') || {};
        const full = this.extractPersonaJsonBlock(bot, 'BOTSOUL_FULL_FIELDS_JSON') || {};
        const raw = this.extractPersonaJsonBlock(bot, 'BOTSOUL_RAW_JSON') || {};
        const rawMin = {
          id: (raw as any).id,
          display: (raw as any).display,
          profile: (raw as any).profile,
          consistency_locks: (raw as any).consistency_locks,
          finance: (raw as any).finance,
          writing_style: (raw as any).writing_style,
          voice: (raw as any).voice,
          memory_seed: (raw as any).memory_seed,
          v6_runtime: (raw as any).v6_runtime,
        };
        const intro = String(bot.persona || '').split('\n').slice(0, 14).join('\n');
        return [
          intro,
          '',
          'PERSONA_FIELDS_JSON (source of truth; do not contradict; do not output this block):',
          JSON.stringify(fields),
          '',
          'BOTSOUL_FULL_FIELDS_JSON (read all fields before answering; do not output this block):',
          JSON.stringify(full),
          '',
          'BOTSOUL_RAW_MIN_JSON (compressed; use as higher-priority truth when conflicts; do not output this block):',
          JSON.stringify(rawMin),
        ].join('\n');
      })();

      const systemPrompt = `You are "${bot.name}", a real community participant in the RWA Aura protocol chat.

PERSONA:
${personaForPrompt}

IMPORTANT_PERSONA_GROUNDING:
- Before writing any reply, you MUST first read PERSONA_FIELDS_JSON (inside PERSONA) and treat it as the only source of truth for: name/nickname/occupation/archetype identity.
- Before writing any reply, you MUST also read BOTSOUL_FULL_FIELDS_JSON completely (language style, runtime behavior, schedule-related tendencies) and keep your wording aligned.
- Before writing any reply, you MUST read BOTSOUL_RAW_MIN_JSON (compressed raw truth). If BOTSOUL_FULL_FIELDS_JSON and BOTSOUL_RAW_MIN_JSON conflict, BOTSOUL_RAW_MIN_JSON wins.
- Never invent third-person characters (e.g. 小张/他) as your own identity. Do not prepend speaker labels like "小张:".
- If asked "你是干啥的/做什么工作", answer using occupation from PERSONA_FIELDS_JSON in first person.
- If asked about your investment amount/position ("投了多少/仓位多少"), do NOT fabricate large numbers. Only state exact amount when PERSONA explicitly contains that amount; otherwise answer conservatively without exact big numbers.
- PROCESS ORDER (mandatory): (1) read PERSONA_FIELDS_JSON + BOTSOUL_FULL_FIELDS_JSON + BOTSOUL_RAW_MIN_JSON; (2) read recent context and target question; (3) answer naturally in persona voice.
- BOT-TO-BOT DIALOGUE REALISM:
- In group chats, keep conversational continuity with the latest 1-2 turns. Prefer replying to the most recent speaker/topic instead of starting unrelated lines.
- If the counterpart is a familiar contact from your persona graph (or clearly someone you often interact with), you may use a natural nickname/callout (e.g., “强哥/小谢/峰哥”) occasionally.
- Nickname usage should be sparse and natural: usually 0-1 nickname per message; do not force nickname every turn.
- Never fabricate relationship labels or names that do not appear in persona/context.

${punctPersonaLine}

${liveBlock}
${currentStateFrame}
${anchorLine}
${livingAnchorLine}
${occCtxHint}
${addressingBlock}
${humanStyleHint}
${memoryBlock}

CALENDAR_AND_POLICY (Shanghai time):
${calendarBlock}

${fewShotBlock}

RULES:
${lengthRule}
${maxCharsRule}
${topicBiasLine}
${numbersAndDialogueRules}
${rulesBlock}
${repeatQuestion && !isAdminBot ? '\n- REPEAT_QUESTION_HARD_RULE: 用户刚刚已经问过同类问题了。你必须给出具体答案：有锚点则给区间/近似数；不想说就直接说“这个我不想透露/我不方便说”，但绝对禁止再次用“得看情况/不好说/看个人情况”来回避，更不许反问对方。\n' : ''}
${ambientAntiTemplate}
${ambientMotifRule}
${massageMemePromptRule}
${isAdminBot ? '' : '- 生活闲聊：天气提醒要因果成立（下雨→带伞；暴晒→遮阳/防晒），不要把「热」和「带伞」硬绑。'}
${isAdminBot ? '' : '- 回复用户：仅当对方明确问你是谁/做什么/在哪/收益多少时，才用“城市+职业+收益锚点”作答；否则别主动甩简历。'}
${coldStartDiversityRule}

${isAdminBot ? `\n${ADMIN_SUPPORT_KNOWLEDGE}\n\n${ADMIN_SUPPORT_INSTRUCTIONS}\n` : ''}
ROOM:
${room?.name || roomId} - ${room?.description || ''}`;

      const userPrompt = isAdminBot
        ? `Recent chat:\n${context}\n\n${triggerLine}\n${earningsLine}\n${privateSelfProfileBlock ? `\n${privateSelfProfileBlock}\n` : '\n'}\nProvide a professional, accurate answer as ${bot.name}. Do not use 查看详情 or other app-button clichés.${selfProfileAsked && privateSelfProfileBlock ? '\n\nFORMAT_REQUIRED: 用 5 段小标题输出，顺序固定为「账户总览」「质押情况」「收益情况」「提现与赎回」「节点与团队」。每段 1-3 条要点，若缺数据写“暂无可用数据”。末尾追加 1 条“下一步建议”。\n\nAMOUNT_REQUIRED: 只使用 PRIVATE_SELF_PROFILE 的 normalizedSummary 字段回答金额/数量，禁止输出原始大整数（wei）。' : ''}${selfYieldAsked && privateSelfProfileBlock ? '\n\nYIELD_REQUIRED: 用户在问“今天收益”。必须优先引用 PRIVATE_SELF_PROFILE.normalizedSummary.todayYieldRwa；若缺失，明确写“暂无可用数据”，禁止使用固定模板比例或自行估算。' : ''}`
        : `Recent chat:\n${context}\n\n${triggerLine}\n${earningsLine}\n\nWrite the next message as ${bot.name}. Vary length; default short. Do not use the phrase 查看详情 or similar button-copy. 若本条是在聊收益/质押/金额：请用 PERSONA 里的日收益率与每日粗算收益自然回应（勿另编矛盾数字）。若只是日常聊天：不要硬塞收益数字。`;

      let messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ];

      this.refreshUtteredDayAndMergeHistory();

      const preCap = readEnvInt('BOT_PRE_LLM_DELAY_CAP_MS', 12_000, 0, 60_000);
      await new Promise((r) =>
        setTimeout(
          r,
          computePreLlmDelayMs({
            replyToHuman,
            contextCharLen: context.length + triggerLine.length,
            capMs: preCap,
          })
        )
      );

      const punctHint =
        punct === 'formal'
          ? '标点可保留逗号句号。'
          : punct === 'casual'
            ? '可以更口语、标点少一点。'
            : '标点有时省有时用。';
      const rephraseHint = `这条和今天群里已经出现过的话太像或完全重复了，请换完全不同的说法；可以更短，${punctHint}不要照搬模板；多数不要表情。`;
      const semanticHint =
        '这条和刚才群里机器人发言“一个意思”了，请换角度重写，不要同义复读；必须引入新的信息点或新的生活细节。';
      const topicCooldownHint =
        '这条话题在本群刚刚已经有人说过了，请换一个不同主题（例如从规则换成日常，或从收益换成操作细节），避免同主题连发。';
      const questionTemplateHint =
        '这条提问模板在本群刚被多次使用（如“你们那边呢/有啥经验/天气咋样”）。请改写成“先给1句具体回答 + 1句你自己的近况/细节”，不要再复用同款问法。';
      const comboCooldownHint =
        '这条“天气+确认数”组合在本群刚被反复出现。请改写为单一主题：要么聊生活近况，要么聊链上确认；并补一个你自己的具体细节（职业/场景/动作），不要再两者硬拼。';
      const catchphraseHint =
        '这条里有本群最近高频口头禅短句（模板味太重）。请完全换表达：保留原意但换句式、换词，不要复用“确认了心里才踏实/先对一下页面条款”等高频句。';
      const selfRepeatHint =
        '你和你自己最近发言太像了（自重复）。请换表达角度，至少替换核心句式与关键词，不要再复用你刚说过的句型。';
      const motifHint =
        '最近群里已经有人反复提到咖啡/手冲，请不要再提这些词。改成其他日常意象（通勤、天气、收工、吃饭、店里客流、睡眠状态等）。';
      const massageMemeHint =
        '这条在跟风「绿色=颈部按摩」类胡扯梗，或与按摩硬扯 UI 配色。请完全重写：不要出现按摩/颈部等词；若上文在问导航/按钮，用一两句具体指路（底部栏、钱包入口、资金活动卡片等）；否则就聊你的人设日常或质押相关，别玩梗。';
      const lowValueHint =
        '这条用了群里高频低质量口头禅（如“口头不算数”等），请完全重写，给出自然且有信息量的表达。';
      const timeContextHint =
        '你这句话与当前上海时间不一致（如白天说“刚下夜班/夜班很累”）。请按当前时段重写，保持自然。';
      const weatherLogicHint =
        '你把「天热/有点热」和「出门带伞」硬绑在一起容易穿帮：防雨要讲下雨/阵雨；若是怕晒要讲「遮阳伞/防晒」，不要只说「热就带伞」。请改写成因果关系成立的天气提醒，或改成防晒/补水等更贴切的说法。';
      const jobYieldStackHint =
        '对方没点名问你在哪上班、做什么、收益具体多少，不要一句话叠「城市+工种+RWA/USDT 数字」，像硬广自嗨。请重写：只顺势接群里气氛（例如认同「挺稳」、补一句中性近况），非答题场景不要自报完整简历。';
      const contextLogicHint =
        '你这条回复没有接住上文（像自说自话）。请重写：必须引用对方原话里的 1-2 个关键词或具体细节（金额/币种/步骤/卡点/网络等），先针对性回答；若对方在聊收益/质押/金额对比，则引用 PERSONA 的日收益率/每日粗算收益来回应（勿另编矛盾数字）；若是日常闲聊则不必塞数字；是否反问可自由但不要只抛问题。不要跑题，也不要改变 PERSONA。';
      const answerFirstHardHint =
        '你这条像“只提问不回答”。请重写：必须先给出至少一句明确回答（陈述句，不是反问），再决定要不要补一个追问。禁止连续只问不答。';
      const coldStartHardHint =
        '这是你今天在本房间的前3条发言之一，必须可辨识地带上个人特征。请重写并至少满足其一：出现你的职业场景词、出现你所在地点、或出现你自己的收益/仓位数字锚点。不要空泛套话。';

      const antiShallowHint = isAdminBot
        ? '上一条有效信息不足或过于敷衍。请基于 PROJECT_FACTS 与 CALENDAR 给出更具体、可执行的说明；仍不确定则说明以站内页面与链上为准，勿堆叠套话。'
        : '上一条像客服复读/套话，禁止以「收到/明白/好滴/嗯」起头再接「小额/查看详情/页面/规则」这种无信息组合。请重写 1～2 句，必须包含 PERSONA 里至少一个具体细节（职业、地点、习惯、口头禅），少用或不用 emoji。';

      const llmOpts = this.getLlmOptsForBot(bot);
      const lp = this.getLengthPersonality(bot);
      const tokenBias = lp === 'short' ? -40 : lp === 'long' ? 80 : 0;
      const firstTokBase = chunkyFollowUp ? 160 : isAdminBot && replyToHuman ? 420 : replyToHuman ? 280 : 240;
      const retryTokBase = chunkyFollowUp ? 180 : isAdminBot && replyToHuman ? 340 : replyToHuman ? 300 : 260;
      const firstTok = clampNum(firstTokBase + tokenBias, 120, 520);
      const retryTok = clampNum(retryTokBase + tokenBias, 140, 520);
      const emojiRate = this.getHumanizeEmojiRate(bot, punct);
      let content = '';
      let rawLlm = await tryLlmChatCompletion(messages, firstTok, llmOpts);
      let sawNonEmptyModelReply = false;
      let lastLlmPieceForHuman = '';

      const investAsked = Boolean(
        effOpts.triggeredBy &&
          !isAdminBot &&
          /投了多少|投了几|多少u|多少U|多少usdt|仓位多少|入了多少|买了多少/i.test(effOpts.triggeredBy.content)
      );
      const investedUsdtForCheck = investAsked ? this.getPersonaInvestedUsdt(bot) : null;

      const maxDedupeAttempts = replyToHuman ? 6 : 5;
      for (let attempt = 0; attempt < maxDedupeAttempts; attempt++) {
        let piece = (rawLlm || '').trim();
        if (piece) sawNonEmptyModelReply = true;
        if (!piece) break;
        piece = isAdminBot
          ? piece
          : piece.length <= 14
            ? humanizeCasualChinese(piece, { mode: 'micro', punctuation: punct, emojiRate })
            : humanizeCasualChinese(piece, { punctuation: punct, emojiRate });

        if (!replyToHuman && !chunkyFollowUp && latestHumanQuestion && hasQuestionMark(latestHumanQuestion)) {
          // 真人优先：主动插话必须先“回答到点上”，否则重试
          if (!looksContextualEnough(piece, latestHumanQuestion, context)) {
            messages = [...messages, { role: 'assistant', content: piece }, { role: 'user', content: contextLogicHintAmbient }];
            rawLlm = await tryLlmChatCompletion(messages, retryTok, llmOpts);
            continue;
          }
          if (!hasAnswerShape(piece)) {
            messages = [...messages, { role: 'assistant', content: piece }, { role: 'user', content: answerFirstHardHint }];
            rawLlm = await tryLlmChatCompletion(messages, retryTok, llmOpts);
            continue;
          }
          if (isQuestionHeavyNoAnswer(piece)) {
            messages = [...messages, { role: 'assistant', content: piece }, { role: 'user', content: answerFirstHardHint }];
            rawLlm = await tryLlmChatCompletion(messages, retryTok, llmOpts);
            continue;
          }
        }
        if (!replyToHuman && !chunkyFollowUp && !latestHumanQuestion && /[?？]/.test(piece)) {
          messages = [...messages, { role: 'assistant', content: piece }, { role: 'user', content: ambientNoQuestionHint }];
          rawLlm = await tryLlmChatCompletion(messages, retryTok, llmOpts);
          continue;
        }
        if (piece.length > Math.max(18, Math.floor(maxChars * 1.1)) && !chunkyFollowUp && !isAdminBot) {
          messages = [
            ...messages,
            { role: 'assistant', content: piece },
            { role: 'user', content: `这条太长了，请压到 ${maxChars} 字以内，口语短句优先。` },
          ];
          rawLlm = await tryLlmChatCompletion(messages, retryTok, llmOpts);
          continue;
        }
        if (investAsked && !chunkyFollowUp && !this.validateInvestAmountReply(bot, investedUsdtForCheck, piece)) {
          messages = [
            ...messages,
            { role: 'assistant', content: piece },
            {
              role: 'user',
              content:
                `对方只在问“你投了多少/仓位多少”。请重写：第一句直接给出投入金额（接近 ${investedUsdtForCheck ?? '你的锚点'}），用第一人称；不要解释日收益，不要扯职业背景，不要写“问你”。全条控制在 20 字左右。`,
            },
          ];
          rawLlm = await tryLlmChatCompletion(messages, retryTok, llmOpts);
          continue;
        }
        if (coldStartActive && !chunkyFollowUp && !this.validateColdStartReply(bot, piece)) {
          messages = [...messages, { role: 'assistant', content: piece }, { role: 'user', content: coldStartHardHint }];
          rawLlm = await tryLlmChatCompletion(messages, retryTok, llmOpts);
          continue;
        }
        if (!chunkyFollowUp && isShallowRoboticAckLine(piece)) {
          messages = [...messages, { role: 'assistant', content: piece }, { role: 'user', content: antiShallowHint }];
          rawLlm = await tryLlmChatCompletion(messages, retryTok, llmOpts);
          continue;
        }
        if (!chunkyFollowUp && isBannedLowValuePhrase(piece) && !this.isPersonalityExpression(bot, piece)) {
          messages = [...messages, { role: 'assistant', content: piece }, { role: 'user', content: lowValueHint }];
          rawLlm = await tryLlmChatCompletion(messages, retryTok, llmOpts);
          continue;
        }
        if (!chunkyFollowUp && isTimeContextContradiction(piece, shHour)) {
          messages = [...messages, { role: 'assistant', content: piece }, { role: 'user', content: timeContextHint }];
          rawLlm = await tryLlmChatCompletion(messages, retryTok, llmOpts);
          continue;
        }
        if (!isAdminBot && !chunkyFollowUp && isHotWeatherUmbrellaMistake(piece)) {
          messages = [...messages, { role: 'assistant', content: piece }, { role: 'user', content: weatherLogicHint }];
          rawLlm = await tryLlmChatCompletion(messages, retryTok, llmOpts);
          continue;
        }
        if (!isAdminBot && !chunkyFollowUp && isUnsolicitedJobPlaceYieldStack(piece, effOpts.triggeredBy?.content)) {
          messages = [...messages, { role: 'assistant', content: piece }, { role: 'user', content: jobYieldStackHint }];
          rawLlm = await tryLlmChatCompletion(messages, retryTok, llmOpts);
          continue;
        }
        if (
          replyToHuman &&
          effOpts.triggeredBy?.content &&
          !looksContextualEnough(piece, effOpts.triggeredBy.content, context)
        ) {
          messages = [...messages, { role: 'assistant', content: piece }, { role: 'user', content: contextLogicHint }];
          rawLlm = await tryLlmChatCompletion(messages, retryTok, llmOpts);
          continue;
        }
        if (replyToHuman && effOpts.triggeredBy?.content && /[?？]/.test(effOpts.triggeredBy.content) && !hasAnswerShape(piece)) {
          messages = [...messages, { role: 'assistant', content: piece }, { role: 'user', content: answerFirstHardHint }];
          rawLlm = await tryLlmChatCompletion(messages, retryTok, llmOpts);
          continue;
        }
        if (replyToHuman && effOpts.triggeredBy?.content && /[?？]/.test(effOpts.triggeredBy.content) && isQuestionHeavyNoAnswer(piece)) {
          messages = [...messages, { role: 'assistant', content: piece }, { role: 'user', content: answerFirstHardHint }];
          rawLlm = await tryLlmChatCompletion(messages, retryTok, llmOpts);
          continue;
        }
        if (!chunkyFollowUp && this.isSemanticDuplicateInRecentRoom(roomId, piece, bot) && !this.isPersonalityExpression(bot, piece)) {
          messages = [...messages, { role: 'assistant', content: piece }, { role: 'user', content: semanticHint }];
          rawLlm = await tryLlmChatCompletion(messages, retryTok, llmOpts);
          continue;
        }
        if (!replyToHuman && !chunkyFollowUp && this.isTopicCoolingInRoom(roomId, piece, bot)) {
          messages = [...messages, { role: 'assistant', content: piece }, { role: 'user', content: topicCooldownHint }];
          rawLlm = await tryLlmChatCompletion(messages, retryTok, llmOpts);
          continue;
        }
        if (
          !chunkyFollowUp &&
          this.isOverusedSmallTalkMotif(roomId, piece, context, replyToHuman, effOpts.triggeredBy?.content || '') &&
          !this.isPersonalityExpression(bot, piece)
        ) {
          const hint = /颈部按摩|按摩的绿|绿色.{0,6}颈|绿.{0,6}按摩|做按摩的绿/.test(piece)
            ? massageMemeHint
            : motifHint;
          messages = [...messages, { role: 'assistant', content: piece }, { role: 'user', content: hint }];
          rawLlm = await tryLlmChatCompletion(messages, retryTok, llmOpts);
          continue;
        }
        if (!replyToHuman && !chunkyFollowUp && this.isOverusedQuestionTemplate(roomId, piece)) {
          messages = [...messages, { role: 'assistant', content: piece }, { role: 'user', content: questionTemplateHint }];
          rawLlm = await tryLlmChatCompletion(messages, retryTok, llmOpts);
          continue;
        }
        if (!replyToHuman && !chunkyFollowUp && this.isOverusedWeatherConfirmCombo(roomId, piece)) {
          messages = [...messages, { role: 'assistant', content: piece }, { role: 'user', content: comboCooldownHint }];
          rawLlm = await tryLlmChatCompletion(messages, retryTok, llmOpts);
          continue;
        }
        if (
          !replyToHuman &&
          !chunkyFollowUp &&
          this.isOverusedCatchphrase(roomId, piece) &&
          !this.isPersonalityExpression(bot, piece)
        ) {
          messages = [...messages, { role: 'assistant', content: piece }, { role: 'user', content: catchphraseHint }];
          rawLlm = await tryLlmChatCompletion(messages, retryTok, llmOpts);
          continue;
        }
        if (!replyToHuman && !chunkyFollowUp && this.isSelfRepeatingByBot(roomId, bot.userId, piece, bot)) {
          messages = [...messages, { role: 'assistant', content: piece }, { role: 'user', content: selfRepeatHint }];
          rawLlm = await tryLlmChatCompletion(messages, retryTok, llmOpts);
          continue;
        }

        // Contradiction detector: if reply conflicts with locked persona facts, force rewrite with hint.
        if (!isAdminBot) {
          const full = this.extractPersonaJsonBlock(bot, 'BOTSOUL_FULL_FIELDS_JSON') as Record<string, unknown> | null;
          const hint = detectContradictionHint(piece, full);
          if (hint) {
            messages = [
              ...messages,
              { role: 'assistant', content: piece },
              {
                role: 'user',
                content:
                  `你这条出现人设穿帮/自相矛盾：${hint}\n` +
                  `请立刻重写：保持口语自然、尽量短；不要解释“我刚才说错了”，只输出改正后的回复正文。`,
              },
            ];
            rawLlm = await tryLlmChatCompletion(messages, retryTok, llmOpts);
            continue;
          }
        }

        if (replyToHuman) lastLlmPieceForHuman = piece;

        const ukey = normalizeUtteranceKey(piece);
        if (!this.isUtteranceDuplicateToday(ukey)) {
          content = piece;
          break;
        }
        messages = [...messages, { role: 'assistant', content: piece }, { role: 'user', content: rephraseHint }];
        rawLlm = await tryLlmChatCompletion(messages, retryTok, llmOpts);
      }

      /** 接真人：必须来自 LLM，禁止用语料库 fallback；去重全撞时仍用最后一次模型输出 */
      if (!content.trim() && replyToHuman && lastLlmPieceForHuman.trim()) {
        console.warn(
          `[Bot LLM] ${bot.name}: reply-to-human: using last LLM line despite same-day dedupe collision`
        );
        content = lastLlmPieceForHuman.trim();
      }

      if (!content.trim() && replyToHuman && effOpts.triggeredBy) {
        const emergency: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = isAdminBot
          ? [
              {
                role: 'system',
                content: `你是官方社区助手；回复语言遵循 ADMIN_SUPPORT_INSTRUCTIONS 的 LANGUAGE_OUTPUT。\n${ADMIN_SUPPORT_KNOWLEDGE}\n\n${ADMIN_SUPPORT_INSTRUCTIONS}\n\n人设摘要：\n${bot.persona.slice(0, 2_500)}`,
              },
              {
                role: 'user',
                content: `用户问题：「${effOpts.triggeredBy.content}」\n请作答；不确定则说明以站内与链上为准。`,
              },
            ]
          : [
              {
                role: 'system',
                content: `你是微信群里的真实用户，用简短中文回复对方。必须结合人设（姓名、职业、语气），禁止自称 AI/机器人。人设：\n${bot.persona.slice(0, 3_500)}`,
              },
              {
                role: 'user',
                content: `对方刚说：「${effOpts.triggeredBy.content}」\n请直接回复，一两句或多句均可。`,
              },
            ];
        const rawEm = await tryLlmChatCompletion(emergency, isAdminBot ? 320 : 220, llmOpts);
        const em = (rawEm || '').trim();
        if (em) {
          content = isAdminBot
            ? em.trim()
            : em.length <= 14
              ? humanizeCasualChinese(em, { mode: 'micro', punctuation: punct, emojiRate })
              : humanizeCasualChinese(em, { punctuation: punct, emojiRate });
        }
      }

      if (isAdminBot && content.trim()) {
        content = this.sanitizeAdminReplyText(content);
      }

      if (!content.trim()) {
        this.scheduleLlmRetry(bot, roomId, opts, flags);
        rollbackLocks();
        return null;
      }

      let finalContent = sanitizeAmbientNoiseTokens(sanitizeLinkLikeMarkup(sanitizeLlmStockPhrases(content)));
      finalContent = collapseRepeatedClauses(finalContent);
      finalContent = sanitizeYieldClaimRanges(finalContent);
      finalContent = finalContent.replace(/^\s*@0x[0-9a-fA-F]{3,40}(?:\.{3}|…)?[0-9a-fA-F]{0,12}\s*/u, '').trim();
      // LLM 有时会把别人的名字当成说话人前缀（如 “小张: …”），统一剥离，防止错位。
      finalContent = this.stripSpeakerPrefixLine(finalContent);
      finalContent = this.stripCrossBotDriftPhrases(finalContent, isAdminBot);
      finalContent = this.stripGlobalBannedDriftForCommunity(finalContent, isAdminBot);
      const beforeGuard = finalContent;
      const guard = this.enforceConversationGuardWithHits(finalContent, isAdminBot);
      this.guardEvalCountByRoom.set(roomId, (this.guardEvalCountByRoom.get(roomId) || 0) + 1);
      if (guard.triggered) this.guardHitCountByRoom.set(roomId, (this.guardHitCountByRoom.get(roomId) || 0) + 1);
      finalContent = guard.text;
      finalContent = this.diversifyOverusedTailQuestion(finalContent, bot, replyToHuman, mentionForced, isAdminBot);
      if (effOpts.triggeredBy?.content) {
        finalContent = this.stripProtocolDriftForNonSupportQuestion(
          finalContent,
          effOpts.triggeredBy.content,
          isAdminBot
        );
        finalContent = this.stripProtocolTermsForLivelihoodQuestion(
          finalContent,
          effOpts.triggeredBy.content,
          mentionForced
        );
        finalContent = this.sanitizeAmountClaimForQuestion(finalContent, effOpts.triggeredBy.content, isAdminBot);
      }
      if (!replyToHuman && isTemplateyQuestionSpam(finalContent)) {
        rollbackLocks();
        return null;
      }
      if (isBannedLowValuePhrase(finalContent) && !this.isPersonalityExpression(bot, finalContent)) {
        rollbackLocks();
        return null;
      }
      if (isTimeContextContradiction(finalContent, shHour)) {
        rollbackLocks();
        return null;
      }
      if (!isAdminBot && isHotWeatherUmbrellaMistake(finalContent)) {
        rollbackLocks();
        return null;
      }
      if (!isAdminBot && isUnsolicitedJobPlaceYieldStack(finalContent, effOpts.triggeredBy?.content)) {
        rollbackLocks();
        return null;
      }
      if (!replyToHuman && !isAdminBot) {
        const typoP = this.getTypingNoiseAmbientProb(bot);
        finalContent = maybeApplyCasualTypoAmbient(finalContent, typoP);
      }
      if (!replyToHuman && this.shouldSkipByTopicFatigue(bot, roomId, finalContent)) {
        rollbackLocks();
        return null;
      }
      if (!replyToHuman && this.isSemanticDuplicateInRecentRoom(roomId, finalContent, bot) && !this.isPersonalityExpression(bot, finalContent)) {
        rollbackLocks();
        return null;
      }
      if (!replyToHuman && this.isTopicCoolingInRoom(roomId, finalContent, bot)) {
        rollbackLocks();
        return null;
      }
      if (
        this.isOverusedSmallTalkMotif(
          roomId,
          finalContent,
          context,
          replyToHuman,
          effOpts.triggeredBy?.content || ''
        ) &&
        !this.isPersonalityExpression(bot, finalContent)
      ) {
        rollbackLocks();
        return null;
      }
      if (!replyToHuman && this.isOverusedQuestionTemplate(roomId, finalContent)) {
        rollbackLocks();
        return null;
      }
      if (!replyToHuman && this.isOverusedWeatherConfirmCombo(roomId, finalContent)) {
        rollbackLocks();
        return null;
      }
      if (!replyToHuman && this.isOverusedCatchphrase(roomId, finalContent) && !this.isPersonalityExpression(bot, finalContent)) {
        rollbackLocks();
        return null;
      }
      if (!replyToHuman && this.isSelfRepeatingByBot(roomId, bot.userId, finalContent, bot)) {
        rollbackLocks();
        return null;
      }

      finalContent = this.enforceEmojiQuota(roomId, finalContent, isAdminBot);
      if (isAdminBot && effOpts.triggeredBy) {
        finalContent = this.enforceStakeNoGasLine(finalContent, effOpts.triggeredBy.content);
        finalContent = this.appendSupportLinksByIntent(finalContent, effOpts.triggeredBy.content);
      }
      if (!finalContent.trim()) {
        rollbackLocks();
        return null;
      }
      if (investAskedGlobal && !isAdminBot && !this.validateInvestAmountReply(bot, investedUsdtGlobal, finalContent)) {
        // Deterministic guardrail for "你投了多少": never allow answer drift to occupation/small-talk.
        if (typeof investedUsdtGlobal === 'number' && Number.isFinite(investedUsdtGlobal) && investedUsdtGlobal > 0) {
          finalContent = `差不多${Math.round(investedUsdtGlobal)}u左右`;
        } else {
          finalContent = '我这边大概几千u仓位';
        }
      }
      if (coldStartActive && !this.validateColdStartReply(bot, finalContent)) {
        rollbackLocks();
        return null;
      }

      // Quality log: observe how much we rely on guards (high hit-rate => prompt not strong enough).
      if (!isAdminBot) {
        const log = {
          botPersonaId: this.getPersonaId(bot),
          botId: bot.id,
          roomId,
          ts: new Date().toISOString(),
          original_reply: beforeGuard,
          after_guard: finalContent,
          guard_triggered: guard.triggered,
          guard_rules_hit: guard.hits,
          was_silenced: false,
          reply_length: finalContent.length,
          repeat_question: repeatQuestion,
          mention_forced: mentionForced,
        };
        if (guard.triggered) console.log('[BotReplyQuality]', JSON.stringify(log));
      }

      await new Promise((r) => setTimeout(r, 700 + Math.random() * 1800));

      const replyRef =
        effOpts.triggeredBy?.sourceMessageId && typeof effOpts.triggeredBy.sourceMessageId === 'string'
          ? effOpts.triggeredBy.sourceMessageId
          : undefined;
      const segsRaw = !isAdminBot && !chunkyFollowUp ? this.splitForBurst(bot, finalContent) : [finalContent];
      const segs =
        replyToHuman && segsRaw.length > 2 ? [segsRaw[0]!, segsRaw.slice(1).join('')] : segsRaw;

      let msg: Message | null = null;
      for (let i = 0; i < segs.length; i++) {
        const piece = segs[i]!;
        if (!piece.trim()) continue;
        this.rememberUtteranceToday(piece);
        this.rememberRoomTopic(roomId, piece);
        const ref = i === 0 ? replyRef : undefined;
        const pushed = this.pushBotChatMessage(roomId, bot, piece, 'text', ref);
        if (i === 0) msg = pushed;
        if (pushed) this.maybeLogDiversityMetrics(roomId);
        if (i < segs.length - 1) {
          await new Promise((r) => setTimeout(r, 280 + Math.floor(Math.random() * 820)));
        }
      }

      if (msg) {
        botMemoryService.rememberFromTurn(
          bot.id,
          roomId,
          effOpts.triggeredBy?.content || null,
          segs.join('\n')
        );
        // Dynamic yield screenshot behavior (scheme B): image is generated at runtime and sent via uploads URL.
        if (!isAdminBot) {
          if (effOpts.earningsRwa !== null) {
            this.maybeSendYieldScreenshot(bot, roomId, 'yield_just_arrived', effOpts.earningsRwa, effOpts.triggeredBy?.content);
          } else if (effOpts.triggeredBy?.content && /(收益|回报|到账|日收益|投了多少|仓位)/.test(effOpts.triggeredBy.content)) {
            this.maybeSendYieldScreenshot(bot, roomId, 'someone_asks_about_yield', null, effOpts.triggeredBy.content);
          } else if (!replyToHuman && /(到账|恭喜|牛|稳|起飞|可以啊)/.test(String(context || ''))) {
            this.maybeSendYieldScreenshot(bot, roomId, 'celebrating_together', null);
          }
        }
      }

      // burst follow-up: per-persona preferred, fallback env if absent
      const burst = this.getRuntimeTuning(bot)?.burst_style;
      const burstP = Number.isFinite(burst?.multi_message_probability as number)
        ? clampNum(Number(burst?.multi_message_probability), 0, 0.85)
        : readEnvFloat('BOT_CHUNKY_FOLLOWUP_P', 0.02, 0, 0.35);
      const maxConsec = this.getBurstMaxConsecutiveMessages(bot);
      const sentCount = segs.length;
      const remainingBudget = Math.max(0, maxConsec - sentCount);
      const remaining = replyToHuman ? Math.min(1, remainingBudget) : remainingBudget;
      const selfIntP = Number.isFinite(burst?.self_interrupt_probability as number)
        ? clampNum(Number(burst?.self_interrupt_probability), 0, 0.95)
        : 0;
      if (msg && !isAdminBot && remaining > 0 && !chunkyFollowUp && Math.random() < burstP) {
        const followN = Math.min(remaining, 1 + Math.floor(Math.random() * remaining));
        for (let i = 0; i < followN; i++) {
          const delay = 650 + Math.floor(Math.random() * 1_600) + i * (520 + Math.floor(Math.random() * 880));
          const selfInterruptFollowUp = Math.random() < selfIntP;
          setTimeout(() => {
            this.executeBotMessage(
              bot,
              roomId,
              { triggeredBy: null, earningsRwa: null },
              { chunkyFollowUp: true, forceBurst: true, selfInterruptFollowUp }
            ).catch(() => {});
          }, delay);
        }
      }

      if (imageAfterRoll && msg) {
        await new Promise((r) => setTimeout(r, 450 + Math.random() * 750));
        const url = this.pickStickerUrlUnique();
        if (url) {
          this.rememberUtteranceToday(url);
          this.pushBotChatMessage(roomId, bot, url, 'image');
        }
      }

      return msg;
    } catch (err) {
      console.error('[Bot] executeBotMessageCore failed:', err);
      this.scheduleLlmRetry(bot, roomId, opts, flags);
      if (replyToHuman) rollbackLocks();
      return null;
    }
  }

  /**
   * 移动端菜单「官方客服」底部弹层：与群聊房间解耦，复用管理员机器人知识库与 LLM 路由。
   */
  async generateOfficialSupportSheetReply(params: {
    walletAddress: string;
    nickname: string;
    userMessage: string;
    history: Array<{ role: 'user' | 'assistant'; content: string }>;
    /** 前端界面语言：与 LANGUAGE_OUTPUT 配合，短消息/模糊语言时优先此 locale */
    locale?: string;
  }): Promise<{ reply: string | null; error?: string }> {
    this.ensureAdminSupportBot();
    const bot = Array.from(this.bots.values()).find((b) => b.isActive && b.role === 'admin_support');
    if (!bot) {
      return { reply: null, error: 'admin_support_unavailable' };
    }

    const now = new Date();
    const calendarBlock = describeCalendarForLlm(now);
    const nick = String(params.nickname || '用户').trim() || '用户';
    const uiLocale = String(params.locale || '').trim().slice(0, 12);
    const w = String(params.walletAddress || '').trim();
    const addrShort =
      w.length > 12 ? `${w.slice(0, 6)}…${w.slice(-4)}` : w.length > 0 ? w : '（匿名访客，未连接钱包）';

    let sheetUserData = '';
    const wNorm = w.toLowerCase();
    if (/^0x[a-f0-9]{40}$/.test(wNorm)) {
      try {
        sheetUserData = await this.buildUserDataSnapshotForAddress(wNorm, 'support_sheet');
      } catch (e) {
        console.warn('[support/sheet] backend snapshot failed:', e);
      }
    }

    const systemPrompt = `You are "${bot.name}", the official RWA Aura community support assistant (1:1 help sheet, not a group chat).

PERSONA:
${bot.persona}

CALENDAR_AND_POLICY (Shanghai time):
${calendarBlock}

${ADMIN_SUPPORT_KNOWLEDGE}

${ADMIN_SUPPORT_INSTRUCTIONS}

${SUPPORT_KNOWLEDGE_ARTICLE_LINK_INDEX}
${buildSupportFeedbackHintsForPrompt()}

SHEET_CONTEXT:
- User context (for tone only; do not repeat full address unless they ask security questions): ${addrShort}
- Address the user as「${nick}」when natural.
- UI locale hint from client (may be empty): ${uiLocale || 'none'} — use with LANGUAGE_OUTPUT above when the latest user message is too short or ambiguous.

${sheetUserData ? `${sheetUserData}\n\n` : ''}RULES:
- Output ONLY the reply body (no meta preamble). Apply LANGUAGE_OUTPUT from ADMIN_SUPPORT_INSTRUCTIONS; do not default to Chinese only because knowledge snippets are Chinese.
- Ground UI directions in APP_PAGES_AND_ROUTES (no「个人中心」「推荐中心」); apply DUAL_ROLE: ethical, brief encouragement to stake via /stake and use official pages when appropriate.
- Be concise but actionable; prefer short paragraphs or bullets for procedures.
- When a knowledge article clearly matches the question, add one short "further reading" line in the SAME language as your reply, with 1–3 Markdown links using paths like /knowledge?article=<slug> from KNOWLEDGE_BASE_DEEP_LINKS only (no invented slugs).
- FORMATTING (HARD for this sheet): Do not use Markdown bold (no **asterisks**). Use plain text, optional Unicode bullets (• ‣), and 2–5 tasteful emojis per reply (e.g. 📌 💡 ✅) to mark sections—never a solid wall of emojis. When naming a page, put the route as a separate token (e.g. 打开质押页 /stake) so the client can turn /stake into a tap link.
- If SUPPORT_SHEET_VERIFIED_USER_DATA appears above: for this wallet's stakes, yields, withdrawals, team, node level, or balances, prioritize that server snapshot (DB + chain-synced APIs); combine with the knowledge base; never invent amounts; if snapshot is empty say so and point to Dashboard + BSCScan with tx hash.
- Node tiers: use L1–L9 wording only (see nodeTierWording in snapshot). Never say V1–V5 for node levels.
- Do not output internal scaffolding tags (ADDRESSING:, FORMAT_REQUIRED:, AMOUNT_REQUIRED:, etc.).
- Never ask for seed phrases/private keys; refuse remote control requests.
`;

    const hist = params.history
      .slice(-10)
      .map((h) => {
        const role = h.role === 'user' ? '用户' : bot.name;
        return `${role}: ${String(h.content || '').trim()}`;
      })
      .filter((line) => line.length > 4);

    const userPrompt = `Conversation so far:
${hist.length ? hist.join('\n') : '(empty)'}

Latest message (${nick}):
${String(params.userMessage || '').trim()}

Provide a professional, accurate answer in the language chosen per LANGUAGE_OUTPUT. If something is unknown, say so and point to in-app pages, announcements, or on-chain records.`;

    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    const llmOpts = this.getSupportSheetLlmOpts(bot);
    const sheetTok = Math.max(
      320,
      Math.min(900, parseInt(String(process.env.SUPPORT_SHEET_MAX_TOKENS || '720'), 10) || 720)
    );
    let raw = await tryLlmChatCompletion(messages, sheetTok, llmOpts);
    raw = String(raw || '').trim();
    if (!raw) {
      await new Promise((r) => setTimeout(r, 700));
      raw = String((await tryLlmChatCompletion(messages, sheetTok, llmOpts)) || '').trim();
    }
    if (!raw) {
      return { reply: null, error: 'empty_model_reply' };
    }
    const cleaned = this.enforceConversationGuard(raw, true);
    const merged = (cleaned.trim() || raw).trim();
    return { reply: this.stripSupportSheetMarkdownBold(merged).trim() || merged };
  }

  /** 官方客服弹层：去掉 ** 粗体标记，避免移动端显示噪点 */
  private stripSupportSheetMarkdownBold(s: string): string {
    let t = String(s || '');
    t = t.replace(/\*\*([^*]+?)\*\*/g, '$1');
    t = t.replace(/\*\*/g, '');
    return t;
  }
}

export const botService = new BotService();

