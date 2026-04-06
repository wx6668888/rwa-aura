// ============================================================
// RWA Aura Chat — Bot Engine（LLM + 无网兜底话术）
// ============================================================
import { ethers } from 'ethers';
import { v4 as uuid } from 'uuid';
import { chatService } from './chat-service';
import {
  tryLlmChatCompletion,
  getLlmHealth,
  buildGroqFailoverOrder,
  buildOpenRouterFailoverOrder,
  buildSiliconFlowFailoverOrder,
  getGroqKeyCount,
  getOpenRouterKeyCount,
  getSiliconFlowKeyCount,
} from './bot-llm';
import { BOT_PERSONAS_50 } from '../data/bot-personas-50';
import { humanizeCasualChinese, saltUtteranceUnique, type PunctuationStyle } from './bot-humanize';
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

type BotIdentity = 'beginner' | 'pro' | 'wool' | 'earner' | 'generic';
type FallbackId = BotIdentity;

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

/** 真人安静满此时间后，机器人才会「主动插话」；可由 BOT_HUMAN_QUIET_MS 调小以提高活跃度 */
function humanQuietMs(): number {
  return readEnvInt('BOT_HUMAN_QUIET_MS', 240_000, 20_000, 600_000);
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

function isNearMeaningDuplicate(a: string, b: string, threshold: number): boolean {
  const aa = normalizeForSemanticSim(a);
  const bb = normalizeForSemanticSim(b);
  if (!aa || !bb) return false;
  if (aa === bb) return true;
  if (aa.length >= 10 && bb.length >= 10 && (aa.includes(bb) || bb.includes(aa))) return true;
  const score = jaccard(toBigrams(aa), toBigrams(bb));
  return score >= threshold;
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

// 7-day rotation per slot (Mon..Sun), one item per day per slot.
const ADMIN_BROADCAST_LIBRARY_WEEKLY: Record<AdminBroadcastSlot, string[]> = {
  morning: [
    '【周一·晨间教程】先确认 3 件事：① 钱包网络为 BSC；② 预留少量 BNB 作为 Gas；③ 当前页面规则与金额无误。先小额试一笔，再做大额操作。',
    '【周二·晨间教程】连接钱包只做签名验证（不扣资产）。若连接失败，优先在钱包内置浏览器打开站点，再检查授权弹窗和网络。',
    '【周三·晨间教程】TRON 充值请严格按页面给出的专属地址与倒计时转账；避免复用历史地址，避免超时后再打款。',
    '【周四·晨间教程】充值前核对链与币种：TRC20-USDT 走 TRON，BEP20 走 BSC。跨链误转通常无法自动追回。',
    '【周五·晨间教程】准备大额前先做一次 1-5 USDT 小额验证，确认链路、到账与页面状态都正常，再放大金额。',
    '【周六·晨间教程】地址校验建议“三段法”：前 6 位、中段、后 4 位，避免复制时被剪贴板劫持篡改。',
    '【周日·晨间教程】每次操作前先看公告与帮助中心最新规则，参数可能更新；以站内最新页面与链上结果为准。',
  ],
  afternoon: [
    '【周一·午后教程】质押标准顺序：输入金额 -> 授权（首次）-> 确认质押。提交后等待链上确认，不要重复连点。',
    '【周二·午后教程】收益核对建议看两处：仪表盘仓位/收益 + 链上哈希。若有延迟，先等待确认块后再判断异常。',
    '【周三·午后教程】提现前先确认：可提余额、冷却时间、手续费口径。建议先小额测试，确认链路后再做大额。',
    '【周四·午后教程】Pending 期间不要重复提交同类型交易，重复提交可能导致多笔手续费或状态混乱。',
    '【周五·午后教程】若交易长时间未确认，先检查钱包 Gas 设置与链拥堵情况，再决定是否替换/加速交易。',
    '【周六·午后教程】质押后建议记录：时间、金额、哈希、页面快照。后续核账和排查会更高效。',
    '【周日·午后教程】到期与赎回请按页面步骤逐项确认，避免“同时操作多笔”导致读数误解。',
  ],
  night: [
    '【周一·夜间风控】夜间操作建议降频：每笔前核对地址、金额、网络三项；遇到 Pending 先等确认，不重复提交。',
    '【周二·夜间安全】官方不会私聊索要私钥、助记词、验证码。凡是“代操作/代转账/保本收益”都按高风险处理。',
    '【周三·夜间复盘】今天若做过充值/质押/提现，建议记录哈希、金额、时间，便于后续核账与异常排查。',
    '【周四·夜间安全】谨防“仿站链接”和“客服私聊跳转”。只从站内入口进入页面，不点来路不明短链接。',
    '【周五·夜间风控】转账前先核对收款链路与地址归属，再次确认币种精度与数量，避免手误导致不可逆损失。',
    '【周六·夜间复盘】若当日多次操作，建议按时间线复盘每笔状态：发起、上链、确认、到账，确保闭环。',
    '【周日·夜间提醒】休市/低活跃时段更要慢操作，先看规则再点击；不确定就先问管理员，不抢一步。',
  ],
};

function getShanghaiWeekdayIndex(now: Date): number {
  // Monday=0 ... Sunday=6
  const sh = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Shanghai' }));
  const d = sh.getDay(); // Sunday=0 ... Saturday=6
  return d === 0 ? 6 : d - 1;
}

class BotService {
  private bots = new Map<string, Bot>();
  private timers = new Map<string, NodeJS.Timeout>();
  private onBotMessage?: (msg: Message & { user: User }, roomId: string) => void;

  private identityByBotId = new Map<string, BotIdentity>();
  private speakChanceByBotId = new Map<string, number>();
  private punctuationStyleByBotId = new Map<string, PunctuationStyle>();
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
  /** 仅提示一次：未配置任何 LLM Key 时走内置话术 */
  private loggedFallbackNoLlmKey = false;
  /** 管理员定时播报去重：YYYY-MM-DD:slot:HH:mm */
  private adminBroadcastSentKeys = new Set<string>();

  setMessageCallback(cb: (msg: Message & { user: User }, roomId: string) => void) {
    this.onBotMessage = cb;
  }

  getAllBots(): Bot[] {
    return Array.from(this.bots.values());
  }

  getBot(botId: string): Bot | undefined {
    return this.bots.get(botId);
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
    return this.punctuationStyleByBotId.get(bot.id) ?? 'mixed';
  }

  private botsPerLlmKey(): number {
    return Math.max(1, Math.min(50, Number(process.env.LLM_BOTS_PER_GROQ_KEY || 10)));
  }

  private getLlmOptsForBot(bot: Bot) {
    const gSlot = this.llmGroqSlotByBotId.get(bot.id) ?? 0;
    const oSlot = this.llmOpenRouterSlotByBotId.get(bot.id) ?? 0;
    const sSlot = this.llmSiliconFlowSlotByBotId.get(bot.id) ?? 0;
    return {
      groqKeysOrder: buildGroqFailoverOrder(gSlot),
      openRouterKeysOrder: buildOpenRouterFailoverOrder(oSlot),
      siliconFlowKeysOrder: buildSiliconFlowFailoverOrder(sSlot),
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

    const candidates = Array.from(this.bots.values()).filter((b) => b.isActive && b.roomIds.includes(roomId));
    if (candidates.length === 0) return;
    /** 接真人一律用全池；夜间活跃机器人少，不能再按作息过滤否则无人可回 */
    const pool = candidates;

    const ownerBot = pool.find((b) => b.role === 'group_owner');
    const adminBot = pool.find((b) => b.role === 'admin_support');
    const routeOwner = ownerBot && shouldRouteToOwnerBot(content);
    const routeAdmin = adminBot && shouldRouteToAdminBot(content);

    const hour = getShanghaiHour(new Date());
    const factors = getHumanReplyFactorsByHour(hour);
    const superEco = readEnvInt('BOT_SUPER_ECO_MODE', 1, 0, 1) === 1;
    const baseReplyProb = readEnvFloat('BOT_REPLY_TO_HUMAN_PROB', superEco ? 0.14 : 0.17, 0, 1);
    const replyProb = Math.max(0.02, Math.min(0.55, baseReplyProb * factors.probMult));
    const baseReplyGapMs = readEnvInt('BOT_REPLY_MIN_GAP_MS', superEco ? 165_000 : 135_000, 1_000, 600_000);
    const replyGapMs = Math.max(25_000, Math.floor(baseReplyGapMs * factors.gapMult));
    const roomLast = this.roomLastBotAt.get(roomId) || 0;
    const tooSoon = Date.now() - roomLast < replyGapMs;
    if (!routeOwner && !routeAdmin) {
      if (tooSoon) return;
      if (Math.random() > replyProb) return;
    }

    let selected: Bot;
    if (routeOwner) {
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

    const delayMs = wantsTightReply
      ? 700 + Math.floor(Math.random() * 3_800)
      : 1_500 + Math.floor(Math.random() * 7_500);

    setTimeout(async () => {
      await this.executeBotMessage(selected, roomId, {
        triggeredBy: {
          user,
          content,
          ...(sourceMessageId ? { sourceMessageId } : {}),
        },
        earningsRwa: earningsMode,
      });
    }, delayMs);
  }

  /** Bootstrap：50 个不同人设（仅内存；用户行由确定性地址复用） */
  bootstrapDefaultBots(): { created: number } {
    if (this.bots.size > 0) {
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

  /**
   * 官方知识型管理员机器人：确定性地址 + 不接定时主动发言。
   * 环境变量：ADMIN_SUPPORT_BOT_ENABLED=0 关闭；ADMIN_BOT_NAME 昵称；ADMIN_BOT_AVATAR 可选头像路径。
   */
  ensureAdminSupportBot(): void {
    if (Array.from(this.bots.values()).some((b) => b.role === 'admin_support')) return;
    if (String(process.env.ADMIN_SUPPORT_BOT_ENABLED ?? '1').trim() === '0') return;

    const name = String(process.env.ADMIN_BOT_NAME || 'Aura助手').trim() || 'Aura助手';
    const addr = makeDeterministicBotAddress('rwa-admin-support-bot:v1');
    const botUser = chatService.createUser(addr, name, 'L1');
    botUser.isBot = true;
    botUser.avatar = String(process.env.ADMIN_BOT_AVATAR || '/chat-bot-icons/01.svg').trim();

    const persona = `你是 RWA Aura 官方社区管理员「${name}」。
职责：用准确、专业、易懂的中文解答用户关于产品、协议与链上操作的疑问。
风格：克制、清晰、负责任；不作收益承诺；不编造合约地址与「内部渠道」。
若信息不在已知事实内，明确请用户以站内公告、产品页面与链上数据为准。`;

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
  private isSemanticDuplicateInRecentRoom(roomId: string, candidate: string): boolean {
    const scanN = readEnvInt('BOT_ROOM_SEMANTIC_SCAN_N', 36, 8, 120);
    const windowMs = readEnvInt('BOT_ROOM_SEMANTIC_WINDOW_MS', 240_000, 30_000, 1_800_000);
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

  private isTopicCoolingInRoom(roomId: string, candidate: string): boolean {
    const cdMs = readEnvInt('BOT_ROOM_TOPIC_COOLDOWN_MS', 180_000, 30_000, 1_800_000);
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

  /** 生活意象去重：避免整屏都在“咖啡/手冲/留咖啡钱” */
  private isOverusedSmallTalkMotif(roomId: string, candidate: string): boolean {
    const motif = /(咖啡|手冲|拿铁|美式|留咖啡钱)/;
    if (!motif.test(candidate)) return false;
    const windowMs = readEnvInt('BOT_SMALLTALK_MOTIF_WINDOW_MS', 1_200_000, 120_000, 7_200_000);
    const scanN = readEnvInt('BOT_SMALLTALK_MOTIF_SCAN_N', 80, 10, 200);
    const maxCount = readEnvInt('BOT_SMALLTALK_MOTIF_MAX', 1, 0, 8);
    return this.countRecentBotTextMatches(roomId, motif, windowMs, scanN) > maxCount;
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
    return [...base, ...rw, ...DAILY_CHITCHAT, ...Array.from(MICRO_REPLIES), ...getCalendarExtraFallbackLines(at)];
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
    return msg;
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
    const body = pool[weekdayIdx % pool.length] || pool[0]!;
    for (const roomId of roomIds) {
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
    const humanizeLine = (raw: string) =>
      raw.length <= 8 || MICRO_REPLIES.has(raw)
        ? humanizeCasualChinese(raw, { mode: 'micro', punctuation: punct })
        : humanizeCasualChinese(raw, { punctuation: punct });

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
    const scale = readEnvFloat('BOT_SCHEDULE_SCALE', superEco ? 1.55 : 1.28, 0.22, 3.2);
    const minAdj = Math.max(superEco ? 125_000 : 95_000, Math.floor(minIntervalMs * scale));
    const maxAdj = Math.max(minAdj + (superEco ? 40_000 : 25_000), Math.floor(maxIntervalMs * scale));
    const span = Math.max(1, maxAdj - minAdj);
    const delay = Math.floor(Math.random() * span) + minAdj;
    const hour = getShanghaiHour(new Date());
    const schedMult = getAmbientScheduleDelayMultiplier(hour, bot.id);
    const delayScaled = Math.max(superEco ? 95_000 : 65_000, Math.floor(delay * schedMult));

    const timer = setTimeout(async () => {
      const hourNow = getShanghaiHour(new Date());
      const mult = readEnvFloat('BOT_SPEAK_CHANCE_MULT', superEco ? 0.42 : 0.46, 0.06, 1.3);
      let chance = Math.min(superEco ? 0.50 : 0.58, (this.speakChanceByBotId.get(bot.id) ?? 0.5) * mult);
      chance = chance * getAmbientSpeakChanceMultiplierByHour(hourNow, bot.id);
      const roomId = bot.roomIds[Math.floor(Math.random() * bot.roomIds.length)];
      if (roomId) {
        const sinceHuman = chatService.getMsSinceLastHumanMessage(roomId);
        const coldMs = readEnvInt('BOT_COLD_ROOM_QUIET_MS', superEco ? 2_400_000 : 1_800_000, 120_000, 3_600_000);
        if (sinceHuman > coldMs && sinceHuman < Number.POSITIVE_INFINITY) {
          chance = Math.min(
            0.98,
            chance * readEnvFloat('BOT_COLD_ROOM_CHANCE_MULT', superEco ? 1.0 : 1.01, 1, 1.8)
          );
        }
      }
      if (roomId && Math.random() <= chance) {
        const now = new Date();
        const earningsRwa = isInEarningsDistributionWindow(now) ? pickEarningsRwaAmount() : null;
        await this.executeBotMessage(bot, roomId, { triggeredBy: null, earningsRwa });
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
    flags?: { forceBurst?: boolean; chunkyFollowUp?: boolean }
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
    flags?: { forceBurst?: boolean; chunkyFollowUp?: boolean }
  ): Promise<Message | null> {
    if (!bot.isActive) return null;
    const forceBurst = flags?.forceBurst === true;
    const chunkyFollowUp = flags?.chunkyFollowUp === true;
    const replyToHuman = Boolean(opts.triggeredBy);
    const isAdminBot = bot.role === 'admin_support' || bot.role === 'group_owner';

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
    }

    // 主动插话需错开一小段；接真人话不受此限
    if (!forceBurst && !replyToHuman) {
      const roomLast = this.roomLastBotAt.get(roomId) || 0;
      const ambientGap = readEnvInt('BOT_ROOM_AMBIENT_GAP_MS', 45_000, 3_000, 120_000);
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
    let effOpts = opts;
    if (!isInEarningsDistributionWindow(now) && effOpts.earningsRwa !== null) {
      effOpts = { ...effOpts, earningsRwa: null };
    }

    try {
      const allowSticker = effOpts.earningsRwa === null && !chunkyFollowUp;
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

      const recentMessages = chatService.getMessages(roomId, 12);
      const context = recentMessages
        .map((m) => {
          const u = chatService.getUser(m.userId);
          const name = u?.nickname || 'Unknown';
          if (m.type === 'image') return `${name}: [图片] ${m.content}`;
          return `${name}: ${m.content}`;
        })
        .join('\n');

      const room = chatService.getRoom(roomId);
      const calendarBlock = describeCalendarForLlm(now);
      const shHour = getShanghaiHour(now);

      const earningsLine =
        effOpts.earningsRwa !== null
          ? `【仅早间发放窗口】在接下来的发言里自然提到：我今天到账大约 ${effOpts.earningsRwa} RWA（数字须在 9-300 内，语气口语）。`
          : '';

      let triggerLine = '';
      const superEco = readEnvInt('BOT_SUPER_ECO_MODE', 1, 0, 1) === 1;
      const ambientDailyRatio = readEnvFloat('BOT_AMBIENT_DAILY_CHAT_RATIO', superEco ? 0.14 : 0.20, 0, 0.95);
      const ambientDailyMode = !effOpts.triggeredBy && !chunkyFollowUp && Math.random() < ambientDailyRatio;
      if (effOpts.triggeredBy) {
        const qc = effOpts.triggeredBy.content;
        if (isAdminBot) {
          const jobQ = isIdentityOrJobQuestion(qc) || isLikelyAtSomeoneQuestion(qc);
          const introAdmin = jobQ
            ? `\n对方在问「你是谁/做啥的」：说明你是官方社区值班助手「${bot.name}」，负责解答规则与操作问题；不要说自己是普通路人群友。`
            : '';
          triggerLine = `【官方客服】用户 ${effOpts.triggeredBy.user.nickname}：「${effOpts.triggeredBy.content}」\n请先判断问题类型（规则/操作/风险/节点/推荐/链上确认等），用准确中文作答；不得编造合约地址与保本收益。${introAdmin}`;
        } else {
          const needSelfIntro =
            isIdentityOrJobQuestion(qc) || isLikelyAtSomeoneQuestion(qc);
          const needQuestionAnswer = needSelfIntro || isLikelyGeneralQuestion(qc);
          const introBlock = needSelfIntro
            ? `\n【必须回应】对方在问群友是谁、做什么、在不在等：请严格按 PERSONA 里的姓名、职业、现居地等简短自报（一两句即可）。禁止说你是 AI/机器人/助手。`
            : needQuestionAnswer
              ? `\n【接话】对方在提问或接话题：结合 PERSONA 用口语直接回应，别敷衍成纯「收到」。`
              : '';
          triggerLine = `刚有人发言：${effOpts.triggeredBy.user.nickname}: ${effOpts.triggeredBy.content}\n请像微信群一样自然接话；可短可稍长，别整段复述对方原话。必要时可顺着上下文反问一句，带出对话感。${introBlock}`;
        }
      } else {
        triggerLine = ambientDailyMode
          ? `群里安静了一会：请发一条自然的日常闲聊短句（天气、收工、吃饭、通勤、门店生意、今天状态都可），语气像真人，不要硬扯业务，也不要像客服话术。`
          : `群里刚安静一会：请发一条自然短句。多围绕质押、充值、收益规则与操作节奏（遵守 CALENDAR 里收益数字禁令）。约一半时间只用几个字到一行；另一半可以两三行。不要每条都带 emoji。`;
      }

      if (chunkyFollowUp) {
        triggerLine = buildChunkyFollowUpUserPrompt(bot.name, context);
      }

      const punctPersonaLine =
        punct === 'formal'
          ? '你打字习惯：标点相对完整，常用逗号、句号，读起来像认真打字。'
          : punct === 'casual'
            ? '你打字习惯：偏手机快打，句末标点常省略，逗号偶尔用空格代替。'
            : '你打字习惯：标点有时省、有时用，别像模板一样整齐。';

      const liveBlock = isAdminBot ? '' : buildLiveStatePromptBlock(bot.id);
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

      const ambientAntiTemplate =
        !effOpts.triggeredBy && !isAdminBot
          ? `
- 【主动发言】禁止整句只用「收到/明白/好滴/嗯 + 小额/查看详情/先看规则/对页面」这类无信息量的复读；必须带至少一个与人设相关的具体点（职业、城市、近况、习惯、半句吐槽）。
- 【主动发言】少用或不用 emoji；不要用 🔍👍🫡 连续堆叠装热络。`
          : '';
      const ambientMotifRule =
        !effOpts.triggeredBy && !isAdminBot
          ? '\n- 【主动发言】最近多条消息若已提到咖啡/手冲，则本条禁止再提该意象，换其他日常话题。'
          : '';

      const topicBiasLine =
        !effOpts.triggeredBy && ambientDailyMode
          ? '- Topic bias: 本条优先日常聊天（生活琐事/工作近况/轻松吐槽）；可轻触业务但别变成教程。'
          : '- Topic bias: prefer 质押(staking)、充值(on-ramp/top-up)、收益规则与节奏、赎回与确认数——贴合 RWA 协议聊天场景。';

      const systemPrompt = `You are "${bot.name}", a real community participant in the RWA Aura protocol chat.

PERSONA:
${bot.persona}

${punctPersonaLine}

${liveBlock}
${addressingBlock}

CALENDAR_AND_POLICY (Shanghai time):
${calendarBlock}

RULES:
${lengthRule}
${topicBiasLine}
- Sound ${isAdminBot ? 'professional, clear, and approachable (official assistant). Avoid slang filler' : 'human and casual'} (NEVER say you're a bot/AI).
- MUST follow PERSONA strictly: tone, identity, occupation and speaking habit must stay consistent. Do not drift into another persona.
- Prefer Chinese if the recent chat is mostly Chinese.
- 中文标点与断句必须与上一段「打字习惯」一致；不要所有人设都用同一种无标点风格。
- Do NOT copy or closely paraphrase any line you already produced in this conversation turn; each retry must be clearly different wording.
- Your message must NOT be identical (same characters/spaces) to anything any bot has already posted today anywhere—vary wording.
- Follow CALENDAR_AND_POLICY strictly for yield-related wording outside/inside the morning distribution window.
- No investment advice; keep it casual product/chat experience.
- 禁止使用「查看详情」「点击查看」「点我查看」等 App/按钮腔；用口语如「看公告」「对一下页面」「条款里写得清楚」。
- Emoji: usually NO emoji; only rarely add one if it fits (most messages plain text).
${ambientAntiTemplate}
${ambientMotifRule}
- When replying to a user: 仅当对方明确问你是谁/做什么时，才透露个人信息（姓名/职业/城市等）；平时接话不要主动自报身份，但语气必须符合 PERSONA。

${isAdminBot ? `\n${ADMIN_SUPPORT_KNOWLEDGE}\n\n${ADMIN_SUPPORT_INSTRUCTIONS}\n` : ''}
ROOM:
${room?.name || roomId} - ${room?.description || ''}`;

      const userPrompt = isAdminBot
        ? `Recent chat:\n${context}\n\n${triggerLine}\n${earningsLine}\n\nProvide a professional, accurate answer as ${bot.name}. Do not use 查看详情 or other app-button clichés.`
        : `Recent chat:\n${context}\n\n${triggerLine}\n${earningsLine}\n\nWrite the next message as ${bot.name}. Vary length; default short. Do not use the phrase 查看详情 or similar button-copy.`;

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
      const motifHint =
        '最近群里已经有人反复提到咖啡/手冲，请不要再提这些词。改成其他日常意象（通勤、天气、收工、吃饭、店里客流、睡眠状态等）。';
      const lowValueHint =
        '这条用了群里高频低质量口头禅（如“口头不算数”等），请完全重写，给出自然且有信息量的表达。';
      const timeContextHint =
        '你这句话与当前上海时间不一致（如白天说“刚下夜班/夜班很累”）。请按当前时段重写，保持自然。';

      const antiShallowHint = isAdminBot
        ? '上一条有效信息不足或过于敷衍。请基于 PROJECT_FACTS 与 CALENDAR 给出更具体、可执行的说明；仍不确定则说明以站内页面与链上为准，勿堆叠套话。'
        : '上一条像客服复读/套话，禁止以「收到/明白/好滴/嗯」起头再接「小额/查看详情/页面/规则」这种无信息组合。请重写 1～2 句，必须包含 PERSONA 里至少一个具体细节（职业、地点、习惯、口头禅），少用或不用 emoji。';

      const llmOpts = this.getLlmOptsForBot(bot);
      const firstTok = chunkyFollowUp ? 120 : isAdminBot && replyToHuman ? 420 : 180;
      const retryTok = chunkyFollowUp ? 150 : isAdminBot && replyToHuman ? 340 : 220;
      let content = '';
      let rawLlm = await tryLlmChatCompletion(messages, firstTok, llmOpts);
      let sawNonEmptyModelReply = false;
      let lastLlmPieceForHuman = '';

      const maxDedupeAttempts = replyToHuman ? 6 : 5;
      for (let attempt = 0; attempt < maxDedupeAttempts; attempt++) {
        let piece = (rawLlm || '').trim();
        if (piece) sawNonEmptyModelReply = true;
        if (!piece) break;
        piece =
          piece.length <= 14
            ? humanizeCasualChinese(piece, { mode: 'micro', punctuation: punct })
            : humanizeCasualChinese(piece, { punctuation: punct });

        if (!chunkyFollowUp && isShallowRoboticAckLine(piece)) {
          messages = [...messages, { role: 'assistant', content: piece }, { role: 'user', content: antiShallowHint }];
          rawLlm = await tryLlmChatCompletion(messages, retryTok, llmOpts);
          continue;
        }
        if (!chunkyFollowUp && isBannedLowValuePhrase(piece)) {
          messages = [...messages, { role: 'assistant', content: piece }, { role: 'user', content: lowValueHint }];
          rawLlm = await tryLlmChatCompletion(messages, retryTok, llmOpts);
          continue;
        }
        if (!chunkyFollowUp && isTimeContextContradiction(piece, shHour)) {
          messages = [...messages, { role: 'assistant', content: piece }, { role: 'user', content: timeContextHint }];
          rawLlm = await tryLlmChatCompletion(messages, retryTok, llmOpts);
          continue;
        }
        if (!chunkyFollowUp && this.isSemanticDuplicateInRecentRoom(roomId, piece)) {
          messages = [...messages, { role: 'assistant', content: piece }, { role: 'user', content: semanticHint }];
          rawLlm = await tryLlmChatCompletion(messages, retryTok, llmOpts);
          continue;
        }
        if (!replyToHuman && !chunkyFollowUp && this.isTopicCoolingInRoom(roomId, piece)) {
          messages = [...messages, { role: 'assistant', content: piece }, { role: 'user', content: topicCooldownHint }];
          rawLlm = await tryLlmChatCompletion(messages, retryTok, llmOpts);
          continue;
        }
        if (!replyToHuman && !chunkyFollowUp && this.isOverusedSmallTalkMotif(roomId, piece)) {
          messages = [...messages, { role: 'assistant', content: piece }, { role: 'user', content: motifHint }];
          rawLlm = await tryLlmChatCompletion(messages, retryTok, llmOpts);
          continue;
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
                content: `你是官方社区助手，用专业中文回答。\n${ADMIN_SUPPORT_KNOWLEDGE}\n\n${ADMIN_SUPPORT_INSTRUCTIONS}\n\n人设摘要：\n${bot.persona.slice(0, 2_500)}`,
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
          content =
            em.length <= 14
              ? humanizeCasualChinese(em, { mode: 'micro', punctuation: punct })
              : humanizeCasualChinese(em, { punctuation: punct });
        }
      }

      if (!content.trim()) {
        if (replyToHuman) {
          console.warn(
            `[Bot LLM] ${bot.name}: reply-to-human: all LLM providers failed or empty — no template fallback per policy`
          );
          rollbackLocks();
          return null;
        }
        const superEco = readEnvInt('BOT_SUPER_ECO_MODE', 1, 0, 1) === 1;
        if (superEco) {
          rollbackLocks();
          return null;
        }
        if (sawNonEmptyModelReply) {
          console.warn(
            `[Bot LLM] ${bot.name}: LLM returned text but all variants collided with same-day dedupe — using template fallback.`
          );
        }
        content = this.pickFallbackLineUnique(bot, effOpts, now);
        const h = getLlmHealth();
        if (h.tryOrder.length === 0 && !this.loggedFallbackNoLlmKey) {
          console.warn(
            '[Bot] 未配置任何 LLM（GROQ / SILICONFLOW / OPENROUTER / 讯飞 XFYUN），使用内置中文话术。'
          );
          this.loggedFallbackNoLlmKey = true;
        }
      }

      let finalContent = sanitizeLlmStockPhrases(content);
      if (isBannedLowValuePhrase(finalContent)) {
        rollbackLocks();
        return null;
      }
      if (isTimeContextContradiction(finalContent, shHour)) {
        rollbackLocks();
        return null;
      }
      if (!replyToHuman && !isAdminBot) {
        const typoP = readEnvFloat('BOT_TYPO_AMBIENT_P', 0.012, 0, 0.08);
        finalContent = maybeApplyCasualTypoAmbient(finalContent, typoP);
      }
      if (!replyToHuman && this.isSemanticDuplicateInRecentRoom(roomId, finalContent)) {
        rollbackLocks();
        return null;
      }
      if (!replyToHuman && this.isTopicCoolingInRoom(roomId, finalContent)) {
        rollbackLocks();
        return null;
      }
      if (!replyToHuman && this.isOverusedSmallTalkMotif(roomId, finalContent)) {
        rollbackLocks();
        return null;
      }

      this.rememberUtteranceToday(finalContent);
      this.rememberRoomTopic(roomId, finalContent);

      await new Promise((r) => setTimeout(r, 700 + Math.random() * 1800));

      const replyRef =
        effOpts.triggeredBy?.sourceMessageId && typeof effOpts.triggeredBy.sourceMessageId === 'string'
          ? effOpts.triggeredBy.sourceMessageId
          : undefined;
      const msg = this.pushBotChatMessage(roomId, bot, finalContent, 'text', replyRef);

      const chunkyP = readEnvFloat('BOT_CHUNKY_FOLLOWUP_P', 0.02, 0, 0.35);
      if (msg && !effOpts.triggeredBy && !chunkyFollowUp && Math.random() < chunkyP) {
        setTimeout(() => {
          this.executeBotMessage(bot, roomId, { triggeredBy: null, earningsRwa: null }, { chunkyFollowUp: true }).catch(
            () => {}
          );
        }, 650 + Math.floor(Math.random() * 1_400));
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
      if (replyToHuman) rollbackLocks();
      return null;
    }
  }
}

export const botService = new BotService();

