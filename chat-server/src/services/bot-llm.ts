// ============================================================
// RWA Aura Chat — LLM：Groq / SiliconFlow / OpenRouter / 讯飞星火 MaaS（可配置尝试顺序）
// ============================================================

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

export type LlmProviderId = 'groq' | 'siliconflow' | 'openrouter' | 'xfyun';

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
const OPENROUTER_KEYS = parseApiKeyList(
  process.env.OPENROUTER_API_KEYS,
  process.env.OPENROUTER_API_KEY || process.env.CLAUDE_API_KEY
);
const SILICONFLOW_KEYS = parseApiKeyList(
  process.env.SILICONFLOW_API_KEYS,
  process.env.SILICONFLOW_API_KEY
);

function parseProviderOrderRaw(): LlmProviderId[] {
  const raw = String(
    process.env.LLM_PROVIDER_ORDER || 'groq,siliconflow,openrouter,xfyun'
  )
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const allowed = new Set<LlmProviderId>(['groq', 'siliconflow', 'openrouter', 'xfyun']);
  const out: LlmProviderId[] = [];
  for (const p of raw) {
    const q = (p === 'gemini' ? 'xfyun' : p) as LlmProviderId;
    if (allowed.has(q)) out.push(q);
  }
  return out.length > 0 ? out : ['groq', 'siliconflow', 'openrouter', 'xfyun'];
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
  groqConfigured: boolean;
  openRouterConfigured: boolean;
  siliconFlowConfigured: boolean;
  xfyunConfigured: boolean;
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

export function getLlmHealth(): LlmHealth {
  const groqConfigured = GROQ_KEYS.length > 0;
  const openRouterConfigured = OPENROUTER_KEYS.length > 0;
  const siliconFlowConfigured = SILICONFLOW_KEYS.length > 0;
  const xfyunConfigured = isXfyunSparkConfigured();
  const tryOrder: LlmProviderId[] = [];
  for (const p of getEffectiveProviderOrder()) {
    if (p === 'groq' && groqConfigured) tryOrder.push('groq');
    if (p === 'siliconflow' && siliconFlowConfigured) tryOrder.push('siliconflow');
    if (p === 'openrouter' && openRouterConfigured) tryOrder.push('openrouter');
    if (p === 'xfyun' && xfyunConfigured) tryOrder.push('xfyun');
  }
  return {
    groqConfigured,
    openRouterConfigured,
    siliconFlowConfigured,
    xfyunConfigured,
    groqKeyCount: GROQ_KEYS.length,
    openRouterKeyCount: OPENROUTER_KEYS.length,
    siliconFlowKeyCount: SILICONFLOW_KEYS.length,
    tryOrder,
    fallbackTemplatesAvailable: true,
    groqSucceededThisProcess,
  };
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

  const order = getEffectiveProviderOrder();

  for (const provider of order) {
    if (provider === 'groq' && groqOrder.length > 0) {
      for (let ki = 0; ki < groqOrder.length; ki++) {
        const key = groqOrder[ki]!;
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
              `[Bot LLM] Groq OK (first success this process) model=${GROQ_MODEL} key=${maskKey(key)} idx=${ki}`
            );
          }
          return out;
        } catch (e) {
          const err = (e as Error).message;
          lastError = `[Groq ${maskKey(key)}] ${err}`;
          console.warn('[Bot LLM] Groq failed:', maskKey(key), err);
        }
      }
    }

    if (provider === 'siliconflow' && sfOrder.length > 0) {
      for (let ki = 0; ki < sfOrder.length; ki++) {
        const key = sfOrder[ki]!;
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
        }
      }
    }

    if (provider === 'openrouter' && orOrder.length > 0) {
      for (let ki = 0; ki < orOrder.length; ki++) {
        const key = orOrder[ki]!;
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
      }
    }
  }

  const anyConfigured =
    GROQ_KEYS.length > 0 ||
    SILICONFLOW_KEYS.length > 0 ||
    OPENROUTER_KEYS.length > 0 ||
    isXfyunSparkConfigured();

  if (!anyConfigured) {
    if (!loggedMissingLlmKeys) {
      loggedMissingLlmKeys = true;
      console.warn(
        '[Bot LLM] 未配置任何 LLM（GROQ / SILICONFLOW / OPENROUTER / 讯飞 XFYUN_*）— 仅使用内置话术。'
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
