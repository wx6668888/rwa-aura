// ============================================================
// RWA Aura Chat — LLM：Anthropic Claude / OpenAI 兼容代理 / Groq / SiliconFlow / OpenRouter / 讯飞星火 MaaS（可配置尝试顺序）
// ============================================================

import Anthropic from '@anthropic-ai/sdk';
import { isXfyunSparkConfigured, xfyunSparkChatCompletion } from './xfyun-spark-ws';

const GROQ_MODEL = String(process.env.GROQ_MODEL || 'llama-3.3-70b-versatile').trim();
const GROQ_BASE = 'https://api.groq.com/openai/v1';

const OPENROUTER_BASE_URL = String(process.env.OPENROUTER_BASE_URL || '').trim();
const OPENROUTER_BASE = (OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1').replace(/\/+$/, '');
const OPENROUTER_MODEL = String(process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini').trim();

const SILICONFLOW_BASE = String(
  process.env.SILICONFLOW_BASE_URL || 'https://api.siliconflow.cn/v1'
).replace(/\/+$/, '');
const SILICONFLOW_MODEL = String(
  process.env.SILICONFLOW_MODEL || 'Qwen/Qwen2.5-7B-Instruct'
).trim();

/** 任意 OpenAI Chat Completions 兼容网关（如 Codex 代理 https://code.newcli.com/codex/v1） */
const OPENAI_COMPAT_BASE = String(process.env.LLM_OPENAI_COMPAT_BASE_URL || '')
  .trim()
  .replace(/\/+$/, '');
const OPENAI_COMPAT_MODEL = String(process.env.LLM_OPENAI_COMPAT_MODEL || 'gpt-5').trim();
const OPENAI_COMPAT_KEYS = parseApiKeyList(
  process.env.LLM_OPENAI_COMPAT_API_KEYS,
  process.env.LLM_OPENAI_COMPAT_API_KEY
);

/** 原生 Anthropic API（密钥形如 sk-ant-api03-… / sk-ant-oat01-…），与 OpenAI 兼容网关无关 */
const ANTHROPIC_MODEL = String(process.env.ANTHROPIC_MODEL || 'claude-3-5-haiku-20241022').trim();
const ANTHROPIC_KEYS = (() => {
  const base = parseApiKeyList(process.env.ANTHROPIC_API_KEYS, process.env.ANTHROPIC_API_KEY);
  const legacy = String(process.env.CLAUDE_API_KEY || '').trim();
  if (legacy.startsWith('sk-ant') && !base.includes(legacy)) return [legacy, ...base];
  return base;
})();

export type LlmProviderId =
  | 'anthropic'
  | 'openaicompat'
  | 'groq'
  | 'siliconflow'
  | 'openrouter'
  | 'xfyun';

/** 逗号或换行分隔多个 Key；与单 Key 环境变量合并、去重 */
function parseApiKeyList(multi: string | undefined, single: string | undefined): string[] {
  const raw = String(multi || '')
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const one = String(single || '').trim();
  const out: string[] = [];
  const seen = new Set<string>();
  for (const k of [...(one ? [one] : []), ...raw]) {
    if (!seen.has(k)) {
      seen.add(k);
      out.push(k);
    }
  }
  return out;
}

const GROQ_KEYS = parseApiKeyList(process.env.GROQ_API_KEYS, process.env.GROQ_API_KEY);
/** OpenRouter 使用 sk-or-*；勿把 sk-ant-*（Anthropic 原生）填进此处 */
const OPENROUTER_KEYS = parseApiKeyList(
  process.env.OPENROUTER_API_KEYS,
  process.env.OPENROUTER_API_KEY
);
const SILICONFLOW_KEYS = parseApiKeyList(
  process.env.SILICONFLOW_API_KEYS,
  process.env.SILICONFLOW_API_KEY
);

type ProviderCooldown = { untilMs: number; reason: string };
const providerCooldown = new Map<LlmProviderId, ProviderCooldown>();

function setProviderCooldown(provider: LlmProviderId, ms: number, reason: string) {
  const dur = Math.max(0, Math.floor(ms));
  if (dur <= 0) return;
  const untilMs = Date.now() + dur;
  const prev = providerCooldown.get(provider);
  if (!prev || prev.untilMs < untilMs) providerCooldown.set(provider, { untilMs, reason });
}

function isProviderCoolingDown(provider: LlmProviderId): boolean {
  const cd = providerCooldown.get(provider);
  if (!cd) return false;
  if (cd.untilMs <= Date.now()) {
    providerCooldown.delete(provider);
    return false;
  }
  return true;
}

function parseRetryAfterMsFromErrorMessage(msg: string): number | null {
  // e.g. "Please try again in 34m35.328s" or "Please try again in 10.72s"
  const m = msg.match(/try again in\s+(\d+)m(\d+(?:\.\d+)?)s/i);
  if (m) {
    const min = Number(m[1]);
    const sec = Number(m[2]);
    if (Number.isFinite(min) && Number.isFinite(sec)) return Math.max(5_000, Math.floor((min * 60 + sec) * 1000));
  }
  const s = msg.match(/try again in\s+(\d+(?:\.\d+)?)s/i);
  if (s) {
    const sec = Number(s[1]);
    if (Number.isFinite(sec)) return Math.max(5_000, Math.floor(sec * 1000));
  }
  return null;
}

function isRateLimitErrorMessage(msg: string): boolean {
  const s = String(msg || '');
  return /429\b/.test(s) || /rate limit/i.test(s) || /tpm limit/i.test(s) || /tpd/i.test(s);
}

/** 未设置 LLM_PROVIDER_ORDER 时：Groq → Anthropic（若已配置 sk-ant）→ OpenAI 兼容 → 其余 */
function fallbackProviderOrder(): LlmProviderId[] {
  const out: LlmProviderId[] = ['groq'];
  if (ANTHROPIC_KEYS.length > 0) out.push('anthropic');
  if (isOpenAiCompatConfigured()) out.push('openaicompat');
  out.push('siliconflow', 'openrouter', 'xfyun');
  return dedupeOrder(out);
}

/**
 * 已配置 OpenAI 兼容渠道时，若顺序里尚未包含 openaicompat，则插在 groq 之后（满足「Groq 失败再走 GPT」）。
 * 若未配置 groq，则置于队首。
 */
function ensureGroqThenOpenAiCompatFailover(order: LlmProviderId[]): LlmProviderId[] {
  if (!isOpenAiCompatConfigured() || order.includes('openaicompat')) return dedupeOrder(order);
  const gi = order.indexOf('groq');
  if (gi >= 0) {
    return dedupeOrder([...order.slice(0, gi + 1), 'openaicompat', ...order.slice(gi + 1)]);
  }
  return dedupeOrder(['openaicompat', ...order]);
}

function parseProviderOrderRaw(): LlmProviderId[] {
  const envOrder = String(process.env.LLM_PROVIDER_ORDER ?? '').trim();
  const allowed = new Set<LlmProviderId>([
    'anthropic',
    'openaicompat',
    'groq',
    'siliconflow',
    'openrouter',
    'xfyun',
  ]);

  let base: LlmProviderId[];
  if (envOrder.length > 0) {
    const raw = envOrder
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    const out: LlmProviderId[] = [];
    for (const p of raw) {
      const q = (p === 'gemini' ? 'xfyun' : p) as LlmProviderId;
      if (allowed.has(q)) out.push(q);
    }
    base = out.length > 0 ? dedupeOrder(out) : fallbackProviderOrder();
  } else {
    base = fallbackProviderOrder();
  }

  /** 已配置 sk-ant 时，即使用户在 LLM_PROVIDER_ORDER 里漏写 anthropic，也插在 groq 之后参与 failover */
  const withAnthropic = ensureAnthropicAfterGroq(base);
  return ensureGroqThenOpenAiCompatFailover(withAnthropic);
}

function ensureAnthropicAfterGroq(order: LlmProviderId[]): LlmProviderId[] {
  if (ANTHROPIC_KEYS.length === 0 || order.includes('anthropic')) return dedupeOrder(order);
  const gi = order.indexOf('groq');
  if (gi >= 0) {
    return dedupeOrder([...order.slice(0, gi + 1), 'anthropic', ...order.slice(gi + 1)]);
  }
  return dedupeOrder(['anthropic', ...order]);
}

function isOpenAiCompatConfigured(): boolean {
  return OPENAI_COMPAT_BASE.length > 0 && OPENAI_COMPAT_KEYS.length > 0;
}

function isAnthropicConfigured(): boolean {
  return ANTHROPIC_KEYS.length > 0;
}

function dedupeOrder(order: LlmProviderId[]): LlmProviderId[] {
  const seen = new Set<string>();
  return order.filter((p) => {
    if (seen.has(p)) return false;
    seen.add(p);
    return true;
  });
}

export function getEffectiveProviderOrder(): LlmProviderId[] {
  return dedupeOrder(parseProviderOrderRaw());
}

export type LlmHealth = {
  anthropicConfigured: boolean;
  openAiCompatConfigured: boolean;
  groqConfigured: boolean;
  openRouterConfigured: boolean;
  siliconFlowConfigured: boolean;
  xfyunConfigured: boolean;
  anthropicKeyCount: number;
  openAiCompatKeyCount: number;
  groqKeyCount: number;
  openRouterKeyCount: number;
  siliconFlowKeyCount: number;
  tryOrder: LlmProviderId[];
  fallbackTemplatesAvailable: true;
  groqSucceededThisProcess: boolean;
};

let groqSucceededThisProcess = false;
let loggedMissingLlmKeys = false;

export function getGroqKeyCount(): number {
  return GROQ_KEYS.length;
}

export function getOpenRouterKeyCount(): number {
  return OPENROUTER_KEYS.length;
}

export function getSiliconFlowKeyCount(): number {
  return SILICONFLOW_KEYS.length;
}

/**
 * 按「主 Key 槽位」生成尝试顺序：先用自己的主 Key，再轮询同池其他 Key（抗 429）。
 * slot 一般为 bootstrap 时 floor(botIndex / LLM_BOTS_PER_GROQ_KEY) % keyCount
 */
export function buildGroqFailoverOrder(slot: number): string[] {
  if (GROQ_KEYS.length === 0) return [];
  const n = GROQ_KEYS.length;
  const start = ((slot % n) + n) % n;
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    out.push(GROQ_KEYS[(start + i) % n]!);
  }
  return out;
}

export function buildOpenRouterFailoverOrder(slot: number): string[] {
  if (OPENROUTER_KEYS.length === 0) return [];
  const n = OPENROUTER_KEYS.length;
  const start = ((slot % n) + n) % n;
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    out.push(OPENROUTER_KEYS[(start + i) % n]!);
  }
  return out;
}

export function buildSiliconFlowFailoverOrder(slot: number): string[] {
  if (SILICONFLOW_KEYS.length === 0) return [];
  const n = SILICONFLOW_KEYS.length;
  const start = ((slot % n) + n) % n;
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    out.push(SILICONFLOW_KEYS[(start + i) % n]!);
  }
  return out;
}

function maskKey(k: string): string {
  if (k.length <= 12) return '***';
  return `${k.slice(0, 6)}…${k.slice(-4)}`;
}

export function getOpenAiCompatKeyCount(): number {
  return OPENAI_COMPAT_KEYS.length;
}

/** 供 BotService 组装管理员 / 弹层专用 Key 池时的默认兼容渠道 Key 列表 */
export function getDefaultOpenAiCompatKeys(): string[] {
  return OPENAI_COMPAT_KEYS;
}

export function getLlmHealth(): LlmHealth {
  const anthropicConfigured = isAnthropicConfigured();
  const groqConfigured = GROQ_KEYS.length > 0;
  const openRouterConfigured = OPENROUTER_KEYS.length > 0;
  const siliconFlowConfigured = SILICONFLOW_KEYS.length > 0;
  const openAiCompatConfigured = isOpenAiCompatConfigured();
  const xfyunConfigured = isXfyunSparkConfigured();
  const tryOrder: LlmProviderId[] = [];
  for (const p of getEffectiveProviderOrder()) {
    if (p === 'anthropic' && anthropicConfigured) tryOrder.push('anthropic');
    if (p === 'openaicompat' && openAiCompatConfigured) tryOrder.push('openaicompat');
    if (p === 'groq' && groqConfigured) tryOrder.push('groq');
    if (p === 'siliconflow' && siliconFlowConfigured) tryOrder.push('siliconflow');
    if (p === 'openrouter' && openRouterConfigured) tryOrder.push('openrouter');
    if (p === 'xfyun' && xfyunConfigured) tryOrder.push('xfyun');
  }
  return {
    anthropicConfigured,
    openAiCompatConfigured,
    groqConfigured,
    openRouterConfigured,
    siliconFlowConfigured,
    xfyunConfigured,
    anthropicKeyCount: ANTHROPIC_KEYS.length,
    openAiCompatKeyCount: OPENAI_COMPAT_KEYS.length,
    groqKeyCount: GROQ_KEYS.length,
    openRouterKeyCount: OPENROUTER_KEYS.length,
    siliconFlowKeyCount: SILICONFLOW_KEYS.length,
    tryOrder,
    fallbackTemplatesAvailable: true,
    groqSucceededThisProcess,
  };
}

async function anthropicNativeChat(opts: {
  apiKey: string;
  model: string;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  maxTokens: number;
}): Promise<string> {
  const client = new Anthropic({ apiKey: opts.apiKey });
  const systemChunks: string[] = [];
  const msgOut: Anthropic.MessageParam[] = [];
  for (const m of opts.messages) {
    if (m.role === 'system') {
      systemChunks.push(m.content);
    } else {
      msgOut.push({ role: m.role, content: m.content });
    }
  }
  if (msgOut.length === 0) {
    msgOut.push({ role: 'user', content: 'Hello' });
  }
  const maxTok = Math.min(Math.max(opts.maxTokens, 64), 4096);
  const res = await client.messages.create({
    model: opts.model,
    max_tokens: maxTok,
    system: systemChunks.length > 0 ? systemChunks.join('\n\n') : undefined,
    messages: msgOut,
  });
  const textBlock = res.content.find((b) => b.type === 'text');
  const text = textBlock && textBlock.type === 'text' ? textBlock.text : '';
  if (!String(text).trim()) throw new Error('Empty model response');
  return String(text).trim();
}

async function openAiCompatibleChat(opts: {
  baseUrl: string;
  apiKey: string;
  model: string;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  maxTokens: number;
  extraHeaders?: Record<string, string>;
}): Promise<string> {
  const base = opts.baseUrl.replace(/\/+$/, '');
  const url = `${base}/chat/completions`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${opts.apiKey}`,
      'Content-Type': 'application/json',
      ...opts.extraHeaders,
    },
    body: JSON.stringify({
      model: opts.model,
      messages: opts.messages,
      max_tokens: opts.maxTokens,
      temperature: 0.9,
      top_p: 0.95,
    }),
  });
  const data: unknown = await res.json().catch(() => ({}));
  const errObj = data as { error?: { message?: string } };
  if (!res.ok) {
    const msg =
      typeof errObj?.error?.message === 'string' ? errObj.error.message : JSON.stringify(data);
    throw new Error(`${res.status} ${msg}`);
  }
  const choices = (data as { choices?: Array<{ message?: { content?: string } }> })?.choices;
  const content = choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('Empty model response');
  }
  return content.trim();
}

export type LlmCompletionOpts = {
  groqKeysOrder?: string[];
  openRouterKeysOrder?: string[];
  siliconFlowKeysOrder?: string[];
  /** 覆盖默认 LLM_OPENAI_COMPAT_* Key 池（管理员 / 官方客服弹层可单独配） */
  openAiCompatKeysOrder?: string[];
};

/**
 * 按 LLM_PROVIDER_ORDER 依次尝试各提供商；HTTP 类提供商内按 Key 池故障转移。讯飞为单应用凭证（无多 Key 轮询）。
 */
export async function tryLlmChatCompletion(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  maxTokens: number,
  opts?: LlmCompletionOpts
): Promise<string | null> {
  let lastError: string | null = null;

  const groqOrder =
    opts?.groqKeysOrder && opts.groqKeysOrder.length > 0 ? opts.groqKeysOrder : GROQ_KEYS;
  const sfOrder =
    opts?.siliconFlowKeysOrder && opts.siliconFlowKeysOrder.length > 0
      ? opts.siliconFlowKeysOrder
      : SILICONFLOW_KEYS;
  const orOrder =
    opts?.openRouterKeysOrder && opts.openRouterKeysOrder.length > 0
      ? opts.openRouterKeysOrder
      : OPENROUTER_KEYS;
  const compatOrder =
    opts?.openAiCompatKeysOrder && opts.openAiCompatKeysOrder.length > 0
      ? opts.openAiCompatKeysOrder
      : OPENAI_COMPAT_KEYS;

  const order = getEffectiveProviderOrder();

  for (const provider of order) {
    if (isProviderCoolingDown(provider)) continue;
    // Fail-fast policy: try each provider once, then immediately switch to next.
    // This prevents getting stuck cycling many keys on a provider with persistent errors (e.g. token-limit/402).
    if (provider === 'anthropic' && ANTHROPIC_KEYS.length > 0) {
      const key = ANTHROPIC_KEYS[0]!;
      try {
        const out = await anthropicNativeChat({
          apiKey: key,
          model: ANTHROPIC_MODEL,
          messages,
          maxTokens,
        });
        console.log(`[Bot LLM] Anthropic OK model=${ANTHROPIC_MODEL} key=${maskKey(key)}`);
        return out;
      } catch (e) {
        const err = (e as Error).message;
        lastError = `[Anthropic ${maskKey(key)}] ${err}`;
        console.warn('[Bot LLM] Anthropic failed:', maskKey(key), err);
        if (isRateLimitErrorMessage(err)) {
          setProviderCooldown('anthropic', parseRetryAfterMsFromErrorMessage(err) ?? 45_000, err.slice(0, 160));
        }
      }
    }

    if (provider === 'openaicompat' && OPENAI_COMPAT_BASE && compatOrder.length > 0) {
      const key = compatOrder[0]!;
      try {
        const out = await openAiCompatibleChat({
          baseUrl: OPENAI_COMPAT_BASE,
          apiKey: key,
          model: OPENAI_COMPAT_MODEL,
          messages,
          maxTokens,
        });
        console.log(
          `[Bot LLM] OpenAI-compat OK model=${OPENAI_COMPAT_MODEL} key=${maskKey(key)} base=${OPENAI_COMPAT_BASE.slice(0, 32)}…`
        );
        return out;
      } catch (e) {
        const err = (e as Error).message;
        lastError = `[OpenAI-compat ${maskKey(key)}] ${err}`;
        console.warn('[Bot LLM] OpenAI-compat failed:', maskKey(key), err);
        if (isRateLimitErrorMessage(err)) {
          setProviderCooldown('openaicompat', parseRetryAfterMsFromErrorMessage(err) ?? 45_000, err.slice(0, 160));
        }
      }
    }

    if (provider === 'groq' && groqOrder.length > 0) {
      const key = groqOrder[0]!;
      try {
        const out = await openAiCompatibleChat({
          baseUrl: GROQ_BASE,
          apiKey: key,
          model: GROQ_MODEL,
          messages,
          maxTokens,
        });
        if (!groqSucceededThisProcess) {
          groqSucceededThisProcess = true;
          console.log(
            `[Bot LLM] Groq OK (first success this process) model=${GROQ_MODEL} key=${maskKey(key)} idx=0`
          );
        }
        return out;
      } catch (e) {
        const err = (e as Error).message;
        lastError = `[Groq ${maskKey(key)}] ${err}`;
        console.warn('[Bot LLM] Groq failed:', maskKey(key), err);
        if (isRateLimitErrorMessage(err)) {
          const wait = parseRetryAfterMsFromErrorMessage(err) ?? 45_000;
          setProviderCooldown('groq', wait, err.slice(0, 160));
        }
      }
    }

    if (provider === 'siliconflow' && sfOrder.length > 0) {
      const key = sfOrder[0]!;
      try {
        return await openAiCompatibleChat({
          baseUrl: SILICONFLOW_BASE,
          apiKey: key,
          model: SILICONFLOW_MODEL,
          messages,
          maxTokens,
        });
      } catch (e) {
        const err = (e as Error).message;
        lastError = `[SiliconFlow ${maskKey(key)}] ${err}`;
        console.warn('[Bot LLM] SiliconFlow failed:', maskKey(key), err);
        if (isRateLimitErrorMessage(err)) {
          setProviderCooldown('siliconflow', 45_000, err.slice(0, 160));
        }
      }
    }

    if (provider === 'openrouter' && orOrder.length > 0) {
      const key = orOrder[0]!;
      try {
        return await openAiCompatibleChat({
          baseUrl: OPENROUTER_BASE,
          apiKey: key,
          model: OPENROUTER_MODEL,
          messages,
          maxTokens,
          extraHeaders: {
            'HTTP-Referer': 'https://rwa.lat',
            'X-Title': 'RWA Aura Chat Bots',
          },
        });
      } catch (e) {
        const err = (e as Error).message;
        lastError = `[OpenRouter ${maskKey(key)}] ${err}`;
        console.warn('[Bot LLM] OpenRouter failed:', maskKey(key), err);
        if (isRateLimitErrorMessage(err)) {
          setProviderCooldown('openrouter', 45_000, err.slice(0, 160));
        }
      }
    }

    if (provider === 'xfyun' && isXfyunSparkConfigured()) {
      try {
        return await xfyunSparkChatCompletion(messages, maxTokens);
      } catch (e) {
        const err = (e as Error).message;
        lastError = `[XFYUN] ${err}`;
        console.warn('[Bot LLM] XFYUN failed:', err);
        if (isRateLimitErrorMessage(err)) setProviderCooldown('xfyun', 60_000, err.slice(0, 160));
        else setProviderCooldown('xfyun', 20_000, err.slice(0, 160));
      }
    }
  }

  const anyConfigured =
    isAnthropicConfigured() ||
    isOpenAiCompatConfigured() ||
    GROQ_KEYS.length > 0 ||
    SILICONFLOW_KEYS.length > 0 ||
    OPENROUTER_KEYS.length > 0 ||
    isXfyunSparkConfigured();

  if (!anyConfigured) {
    if (!loggedMissingLlmKeys) {
      loggedMissingLlmKeys = true;
      console.warn(
        '[Bot LLM] 未配置任何 LLM（ANTHROPIC_API_KEY / LLM_OPENAI_COMPAT_* / GROQ / SILICONFLOW / OPENROUTER / 讯飞 XFYUN_*）— 仅使用内置话术。'
      );
    }
  } else {
    console.warn(
      '[Bot LLM] All configured providers/keys failed or returned unusable response.',
      lastError || ''
    );
  }

  return null;
}
