/**
 * 机器人人设数据源（已切换为 botsoul 100 人设）。
 *
 * 历史变量名 BOT_PERSONAS_50 为兼容 bot-service 现有导入路径保留，
 * 实际返回 100 条人设。
 */
export type { BotArchetypeIdentity, BotPersonaRow } from './rwa-bot-persona-types';
import fs from 'fs';
import path from 'path';
import type { BotPersonaRow, BotArchetypeIdentity } from './rwa-bot-persona-types';

type RawBotSoul = {
  id?: string;
  display?: {
    display_name?: string;
    avatar_index?: number;
  };
  profile?: {
    name?: string;
    nickname?: string;
    occupation?: string;
    personality_tags?: string[];
  };
  orchestration?: {
    max_messages_per_hour?: number;
    max_messages_per_day?: number;
    cooldown_sec?: number;
  };
  writing_style?: {
    message_length_preference?: string;
  };
  consistency_locks?: {
    current_total_staked_usdt?: number;
  };
  finance?: {
    current_position?: {
      total_staked_usdt?: number;
      daily_yield_oral?: string;
    };
  };
  v6_runtime?: {
    session_goal_weights?: {
      social_bonding?: number;
      risk_control?: number;
      seek_information?: number;
      show_progress?: number;
    };
    runtime_quota_alignment?: {
      max_messages_per_hour?: number;
      max_messages_per_day?: number;
      cooldown_sec?: number;
    };
    latency_profile?: {
      reply_delay_mean_sec?: number;
      reply_delay_jitter_sec?: number;
      mention_priority_multiplier?: number;
      question_priority_multiplier?: number;
      busy_state_delay_multiplier?: number;
    };
    burst_style?: {
      multi_message_probability?: number;
      max_consecutive_messages?: number;
      supports_split_sentences?: boolean;
      self_interrupt_probability?: number;
    };
    typing_noise_profile?: {
      typo_probability?: number;
      missing_punctuation_probability?: number;
      filler_word_probability?: number;
      emoji_probability?: number;
    };
    topic_fatigue?: {
      same_topic_max_turns?: number;
      fatigue_silence_probability?: number;
      fatigue_topic_shift_probability?: number;
    };
    self_repeat_penalty_profile?: {
      semantic_similarity_threshold?: number;
      cooldown_minutes?: number;
      hard_block_same_sentence_hours?: number;
    };
    cross_bot_collision_profile?: {
      room_semantic_cooldown_minutes?: number;
      same_topic_cooldown_minutes?: number;
      template_reuse_block_count?: number;
    };
    silence_recovery_profile?: {
      cold_room_wakeup_minutes?: number;
      wakeup_message_length_bias?: 'short' | 'medium' | 'long';
      wakeup_question_probability?: number;
    };
  };
  conversation_guard?: Record<string, unknown>;
  voice?: Record<string, unknown>;
  state_injection_template?: Record<string, unknown>;
  silence_policy?: Record<string, unknown>;
  social_graph?: Record<string, unknown>;
  money_story_fragments?: Record<string, unknown>;
  typing_behavior?: Record<string, unknown>;
  reply_length_distribution?: Record<string, unknown>;
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function normalizeIdentity(raw: RawBotSoul): BotArchetypeIdentity {
  const occ = String(raw.profile?.occupation || '');
  const tags = (raw.profile?.personality_tags || []).join(' ');
  const lenPref = String(raw.writing_style?.message_length_preference || '');
  const t = `${occ} ${tags} ${lenPref}`;
  if (/老板|主管|店长|包工头|车队长|经纪|卖家/.test(t)) return 'earner';
  if (/财务|法务|程序|会计|护士|审计|研究|规则/.test(t)) return 'pro';
  if (/学生|新手|小白|兼职|宝妈/.test(t)) return 'beginner';
  if (/外卖|骑手|主播|气氛|聊天|活跃/.test(t)) return 'wool';

  const goals = raw.v6_runtime?.session_goal_weights;
  if (goals) {
    const social = Number(goals.social_bonding || 0);
    const risk = Number(goals.risk_control || 0);
    const seek = Number(goals.seek_information || 0);
    if (social >= 0.4) return 'wool';
    if (risk >= 0.42 || seek >= 0.42) return 'pro';
  }
  return 'generic';
}

function buildSpeakChance(raw: RawBotSoul): number {
  const q = raw.v6_runtime?.runtime_quota_alignment || raw.orchestration || {};
  const perHour = Number(q.max_messages_per_hour || raw.orchestration?.max_messages_per_hour || 4);
  const perDay = Number(q.max_messages_per_day || raw.orchestration?.max_messages_per_day || 24);
  const cdSec = Number(q.cooldown_sec || raw.orchestration?.cooldown_sec || 160);
  const delay = Number(raw.v6_runtime?.latency_profile?.reply_delay_mean_sec || 2.4);

  let s = 0.09 + (perHour / 20) + (perDay / 220) - (cdSec / 2600) - (delay / 30);
  s = clamp(s, 0.07, 0.24);
  return Math.round(s * 1000) / 1000;
}

function buildSchedule(raw: RawBotSoul): BotPersonaRow['schedule'] {
  const q = raw.v6_runtime?.runtime_quota_alignment || raw.orchestration || {};
  const cdSec = Number(q.cooldown_sec || raw.orchestration?.cooldown_sec || 160);
  const perHour = Number(q.max_messages_per_hour || raw.orchestration?.max_messages_per_hour || 4);

  const minIntervalMs = clamp(Math.round(cdSec * 1000 * (1.15 + (8 - perHour) * 0.06)), 120_000, 420_000);
  const maxIntervalMs = clamp(minIntervalMs + 120_000 + Math.round((10 - perHour) * 12_000), minIntervalMs + 90_000, 720_000);

  return {
    minIntervalMs,
    maxIntervalMs,
    activeHoursStart: 7,
    activeHoursEnd: 24,
    timezone: 'Asia/Shanghai',
  };
}

function buildPersonaText(raw: RawBotSoul): string {
  const name = String(raw.profile?.name || raw.display?.display_name || raw.id || '群友');
  const nick = String(raw.profile?.nickname || name);
  const occ = String(raw.profile?.occupation || '普通群友');
  const identity = normalizeIdentity(raw);
  const v6 = raw.v6_runtime || {};
  const latency = v6.latency_profile || {};
  const quota = v6.runtime_quota_alignment || raw.orchestration || {};
  const burst = v6.burst_style || {};
  const topicFatigue = v6.topic_fatigue || {};
  const typingNoise = v6.typing_noise_profile || {};
  const conversationGuard = raw.conversation_guard || {};
  const voice = raw.voice || {};
  const stateInjectionTemplate = raw.state_injection_template || {};
  const silencePolicy = raw.silence_policy || {};
  const socialGraph = raw.social_graph || {};
  const moneyStoryFragments = raw.money_story_fragments || {};
  const typingBehavior = raw.typing_behavior || {};
  const replyLengthDistribution = raw.reply_length_distribution || {};

  const personaFields = {
    id: String(raw.id || ''),
    name,
    nickname: nick,
    occupation: occ,
    archetype_identity: identity,
    invested_total_usdt:
      Number(raw.finance?.current_position?.total_staked_usdt ?? raw.consistency_locks?.current_total_staked_usdt ?? 0) || 0,
    daily_yield_oral: String(raw.finance?.current_position?.daily_yield_oral || ''),
  };
  const fullFields = {
    id: String(raw.id || ''),
    display: raw.display || {},
    profile: raw.profile || {},
    consistency_locks: raw.consistency_locks || {},
    finance: raw.finance || {},
    orchestration: raw.orchestration || {},
    writing_style: raw.writing_style || {},
    conversation_guard: raw.conversation_guard || {},
    voice: raw.voice || {},
    state_injection_template: raw.state_injection_template || {},
    silence_policy: raw.silence_policy || {},
    social_graph: raw.social_graph || {},
    money_story_fragments: raw.money_story_fragments || {},
    typing_behavior: raw.typing_behavior || {},
    reply_length_distribution: raw.reply_length_distribution || {},
    v6_runtime: raw.v6_runtime || {},
  };
  const rawAllFields = raw as unknown as Record<string, unknown>;

  return [
    `你是群聊里的真实用户「${name}」（常用称呼：${nick}）。`,
    `职业/身份：${occ}。`,
    `你的互动风格：${identity}。`,
    `回复节奏：平均延迟约 ${String(latency.reply_delay_mean_sec ?? 2.5)} 秒，抖动约 ${String(latency.reply_delay_jitter_sec ?? 1.2)} 秒，遵循真人聊天习惯。`,
    `频率约束：每小时不超过 ${String(quota.max_messages_per_hour ?? raw.orchestration?.max_messages_per_hour ?? 4)} 条，每日不超过 ${String(quota.max_messages_per_day ?? raw.orchestration?.max_messages_per_day ?? 24)} 条。`,
    `连发习惯：连续发言上限 ${String(burst.max_consecutive_messages ?? 2)} 条，偶发连发概率约 ${String(burst.multi_message_probability ?? 0.12)}。`,
    `话题疲劳：同主题连续约 ${String(topicFatigue.same_topic_max_turns ?? 4)} 轮后更容易沉默或换话题。`,
    `打字噪声：错字概率约 ${String(typingNoise.typo_probability ?? 0.03)}，缺标点概率约 ${String(typingNoise.missing_punctuation_probability ?? 0.08)}。`,
    '保持与既有人设一致，不要自称 AI/机器人，不要做保本承诺。',
    '',
    'PERSONA_FIELDS_JSON (source of truth; do not contradict; do not output this block):',
    JSON.stringify(personaFields),
    '',
    'BOTSOUL_FULL_FIELDS_JSON (read all fields before answering; do not output this block):',
    JSON.stringify(fullFields),
    '',
    'CONVERSATION_GUARD_JSON (anti-template/anti-evasion runtime hints; do not output this block):',
    JSON.stringify(conversationGuard),
    '',
    'VOICE_JSON (tone/slang/emoji hints; do not output this block):',
    JSON.stringify(voice),
    '',
    'STATE_INJECTION_TEMPLATE_JSON (time/activity/mood scaffold; do not output this block):',
    JSON.stringify(stateInjectionTemplate),
    '',
    'SILENCE_POLICY_JSON (when to skip replies; do not output this block):',
    JSON.stringify(silencePolicy),
    '',
    'SOCIAL_GRAPH_JSON (cross-bot relation hints; do not output this block):',
    JSON.stringify(socialGraph),
    '',
    'MONEY_STORY_FRAGMENTS_JSON (short money-story fragments; do not output this block):',
    JSON.stringify(moneyStoryFragments),
    '',
    'TYPING_BEHAVIOR_JSON (message split / typo habits; do not output this block):',
    JSON.stringify(typingBehavior),
    '',
    'REPLY_LENGTH_DISTRIBUTION_JSON (length preference; do not output this block):',
    JSON.stringify(replyLengthDistribution),
    '',
    'BOTSOUL_RAW_JSON (FULL, ALL FIELDS, source of truth; must read before answering; do not output this block):',
    JSON.stringify(rawAllFields),
  ].join('\n');
}

function botsoulDir(): string {
  return path.resolve(process.cwd(), 'botsoul');
}

function extractBotIdNumber(id: string): number {
  const m = /^RWA_BOT_(\d{3})$/.exec(id);
  if (!m) return Number.MAX_SAFE_INTEGER;
  return Number(m[1]);
}

function chooseCanonicalById(files: string[]): Map<string, string> {
  const byId = new Map<string, string[]>();
  for (const file of files) {
    try {
      const raw = JSON.parse(fs.readFileSync(file, 'utf-8')) as RawBotSoul;
      const id = String(raw.id || '');
      if (!/^RWA_BOT_\d{3}$/.test(id)) continue;
      const list = byId.get(id) || [];
      list.push(file);
      byId.set(id, list);
    } catch {
      // ignore broken files
    }
  }

  const out = new Map<string, string>();
  for (const [id, list] of byId.entries()) {
    const exact = list.find((f) => new RegExp(`${id}\\.txt$`).test(path.basename(f)));
    out.set(id, exact || list.sort()[0]!);
  }
  return out;
}

function loadBotsoulPersonas100(): BotPersonaRow[] {
  const dir = botsoulDir();
  const all = fs
    .readdirSync(dir)
    .filter((f) => /^RWA_BOT_\d{3}.*\.txt$/.test(f))
    .map((f) => path.join(dir, f));

  const canonical = chooseCanonicalById(all);
  const rows: BotPersonaRow[] = [];

  for (const [id, file] of canonical.entries()) {
    const raw = JSON.parse(fs.readFileSync(file, 'utf-8')) as RawBotSoul;
    const n = extractBotIdNumber(id);
    if (!Number.isFinite(n) || n < 1 || n > 100) continue;

    const iconIndex = ((n - 1) % 50) + 1;
    const displayName =
      String(raw.display?.display_name || '').trim() ||
      String(raw.profile?.nickname || '').trim() ||
      String(raw.profile?.name || '').trim() ||
      id;

    rows.push({
      slug: `p${String(n).padStart(3, '0')}`,
      name: displayName,
      identity: normalizeIdentity(raw),
      persona: buildPersonaText(raw),
      speakChance: buildSpeakChance(raw),
      schedule: buildSchedule(raw),
      iconIndex,
      runtimeTuning: raw.v6_runtime,
    });
  }

  return rows.sort((a, b) => a.slug.localeCompare(b.slug));
}

export const BOT_PERSONAS_50: BotPersonaRow[] = loadBotsoulPersonas100();
