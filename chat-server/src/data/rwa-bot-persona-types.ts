/**
 * 详细机器人人设（RWA Aura 社群 LLM 与兜底话术身份锚点）
 */
import type { BotSchedule } from '../models/types';

/** 与 bot-service 兜底池 identity 一致 */
export type BotArchetypeIdentity = 'beginner' | 'pro' | 'wool' | 'earner' | 'generic';

export interface BotRuntimeTuning {
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
}

export interface BotPersonaRow {
  slug: string;
  name: string;
  identity: BotArchetypeIdentity;
  persona: string;
  speakChance: number;
  schedule: Partial<BotSchedule>;
  /** 1–50 → /chat-bot-icons/01.svg … */
  iconIndex: number;
  runtimeTuning?: BotRuntimeTuning;
}
export interface RwabotKnowledgeBase {
  staking_rules: {
    '30_days': string;
    '90_days': string;
    '180_days': string;
    '360_days': string;
    special_vip: string;
  };
  token_logic: string;
}

export interface RwabotIdentity {
  name: string;
  gender: string;
  age: number;
  hometown: string;
  current_location: string;
  occupation: string;
  company: string;
  education: string;
  family_status: string;
  device_info: string;
}

export interface RwabotFinancialData {
  /** 群内展示用缩略 */
  wallet_address: string;
  /** 链上确定性地址（与 id 绑定，供后台/对账） */
  wallet_address_full: string;
  staking_amount_rwa: number;
  staking_amount_usdt: number;
  staking_date: string;
  lockup_period: 30 | 90 | 180 | 360;
  lock_period_days: 30 | 90 | 180 | 360;
  daily_roi: string;
  /** 若为 true，daily_roi 应为 2.0% 特权档 */
  is_vip_yield: boolean;
  acquisition_channel: string;
  motivation: string;
  investment_style: string;
}

export interface RwabotBehavior {
  active_time_slots: string[];
  response_speed: string;
  online_frequency: string;
}

export interface RwabotLinguistics {
  chat_style: string;
  common_phrases: string[];
  favorite_emojis: string[];
  dialect_hint: string;
}

export interface RwabotSocialAttributes {
  referral_count: number;
  community_role: string;
  hobbies: string[];
  market_reaction: string;
}

export type RwabotChatPersonality = 'chatter' | 'cold' | 'contrarian' | 'neutral';

export interface RwabotDetailedPersona {
  id: string;
  display_name: string;
  identity: RwabotIdentity;
  financial_data: RwabotFinancialData;
  behavior: RwabotBehavior;
  linguistics: RwabotLinguistics;
  social_attributes: RwabotSocialAttributes;
  knowledge_base: RwabotKnowledgeBase;
  _meta: {
    archetype: BotArchetypeIdentity;
    chat_personality: RwabotChatPersonality;
    speak_chance: number;
    schedule_min_ms: number;
    schedule_max_ms: number;
  };
}

export const RWA_STAKING_RULES: RwabotKnowledgeBase['staking_rules'] = {
  '30_days': '0.8% / 日',
  '90_days': '1.04% / 日',
  '180_days': '1.28% / 日',
  '360_days': '1.6% / 日',
  special_vip: '2.0% / 日 (限时活动或特定额度)',
};

export const RWA_TOKEN_LOGIC = '1 RWA = 0.85 USDT (锚定现实资产价值)';

/** 仅数字与小数点，不含 %（避免与模板拼接出 %%） */
export function roiForLockup(days: 30 | 90 | 180 | 360, vip: boolean): string {
  if (vip) return '2.0';
  if (days === 30) return '0.8';
  if (days === 90) return '1.04';
  if (days === 180) return '1.28';
  return '1.6';
}

export function usdtFromRwa(rwa: number): number {
  return Math.round(rwa * 0.85 * 100) / 100;
}
