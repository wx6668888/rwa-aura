// 讯飞星辰 MaaS 推理 — WebSocket 流式对话（鉴权见通用 URL 说明）
// https://www.xfyun.cn/doc/spark/general_url_authentication.html
// https://www.xfyun.cn/doc/spark/%E6%8E%A8%E7%90%86%E6%9C%8D%E5%8A%A1-websocket.html

import { createHmac, randomUUID } from 'crypto';

const DEFAULT_WS = 'wss://maas-api.cn-huabei-1.xf-yun.com/v1.1/chat';

function getXfyunEnv() {
  const appId = String(process.env.XFYUN_APP_ID || '').trim();
  const apiKey = String(process.env.XFYUN_API_KEY || '').trim();
  const apiSecret = String(process.env.XFYUN_API_SECRET || '').trim();
  const domain = String(process.env.XFYUN_DOMAIN || 'xopqwen35v35b').trim();
  const wsUrl = String(process.env.XFYUN_WS_URL || DEFAULT_WS).trim();
  const enableThinking =
    String(process.env.XFYUN_ENABLE_THINKING || 'false').toLowerCase() === 'true';
  const patchIdRaw = String(process.env.XFYUN_PATCH_ID || '').trim();
  return { appId, apiKey, apiSecret, domain, wsUrl, enableThinking, patchIdRaw };
}

export function isXfyunSparkConfigured(): boolean {
  const { appId, apiKey, apiSecret } = getXfyunEnv();
  return Boolean(appId && apiKey && apiSecret);
}

/** 按讯飞「通用 URL 鉴权」生成带 query 的 wss 地址 */
export function buildXfyunAuthWsUrl(): string {
  const { apiKey, apiSecret, wsUrl } = getXfyunEnv();
  if (!apiKey || !apiSecret) throw new Error('XFYUN_API_KEY / XFYUN_API_SECRET 未配置');

  const base = wsUrl.split('?')[0]!;
  const u = new URL(base);
  const host = u.hostname;
  const path = u.pathname || '/v1.1/chat';
  const date = new Date().toUTCString();
  const requestLine = `GET ${path} HTTP/1.1`;
  const tmp = `host: ${host}\ndate: ${date}\n${requestLine}`;

  const signature = createHmac('sha256', apiSecret).update(tmp, 'utf8').digest('base64');
  const authorizationOrigin = `api_key="${apiKey}", algorithm="hmac-sha256", headers="host date request-line", signature="${signature}"`;
  const authorization = Buffer.from(authorizationOrigin, 'utf8').toString('base64');

  const params = new URLSearchParams();
  params.set('authorization', authorization);
  params.set('date', date);
  params.set('host', host);
  return `${base}?${params.toString()}`;
}

type SparkMsg = { role: string; content: string };

/**
 * 单次连接、单条请求：流式拼接 assistant 文本后关闭（符合文档：须等回复完成再发下一问；60s 无数据会断连）。
 */
export async function xfyunSparkChatCompletion(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  maxTokens: number
): Promise<string> {
  const WS = globalThis.WebSocket;
  if (typeof WS !== 'function') {
    throw new Error('当前 Node 版本无 globalThis.WebSocket，请使用 Node 22+');
  }

  const { appId, domain, enableThinking, patchIdRaw } = getXfyunEnv();
  if (!appId) throw new Error('XFYUN_APP_ID 未配置');

  const text: SparkMsg[] = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const header: Record<string, unknown> = {
    app_id: appId,
    uid: randomUUID().replace(/-/g, '').slice(0, 32),
  };
  if (patchIdRaw) {
    header.patch_id = [patchIdRaw];
  }

  const mt = Math.max(1, Math.min(8192, Math.floor(maxTokens) || 512));
  const body = {
    header,
    parameter: {
      chat: {
        domain,
        temperature: 0.9,
        top_k: 4,
        max_tokens: mt,
        auditing: 'default',
        search_disable: true,
        enable_thinking: enableThinking,
      },
    },
    payload: {
      message: { text },
    },
  };

  const url = buildXfyunAuthWsUrl();
  const timeoutMs = Math.max(
    15_000,
    Math.min(180_000, Number(process.env.XFYUN_WS_TIMEOUT_MS || 120_000))
  );

  return new Promise((resolve, reject) => {
    let settled = false;
    let buf = '';

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      try {
        ws.close();
      } catch {
        /* ignore */
      }
      reject(new Error(`XFYUN WebSocket timeout ${timeoutMs}ms`));
    }, timeoutMs);

    const ws = new WS(url) as {
      send(data: string): void;
      close(): void;
      onopen: (() => void) | null;
      onmessage: ((ev: { data: unknown }) => void) | null;
      onerror: ((ev: Event) => void) | null;
      onclose: (() => void) | null;
    };

    const finish = (err?: Error, textOut?: string) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        ws.close();
      } catch {
        /* ignore */
      }
      if (err) reject(err);
      else resolve((textOut || '').trim());
    };

    ws.onerror = () => {
      finish(new Error('XFYUN WebSocket error'));
    };

    ws.onmessage = (ev: { data: unknown }) => {
      const raw =
        typeof ev.data === 'string'
          ? ev.data
          : ev.data instanceof ArrayBuffer
            ? Buffer.from(ev.data).toString('utf8')
            : String(ev.data);
      let json: unknown;
      try {
        json = JSON.parse(raw);
      } catch {
        return;
      }
      const o = json as {
        header?: { code?: number; message?: string; status?: number };
        payload?: {
          choices?: {
            text?: Array<{ content?: string }>;
          };
        };
      };
      const code = o.header?.code;
      const msg = o.header?.message || '';
      const st = o.header?.status;

      if (code !== undefined && code !== 0 && code !== 10019) {
        finish(new Error(`XFYUN ${code} ${msg}`));
        return;
      }

      const texts = o.payload?.choices?.text;
      if (Array.isArray(texts)) {
        for (const t of texts) {
          if (typeof t?.content === 'string') buf += t.content;
        }
      }

      if (st === 2) {
        if (!buf.trim()) finish(new Error('XFYUN empty model response'));
        else finish(undefined, buf);
      }
    };

    ws.onopen = () => {
      ws.send(JSON.stringify(body));
    };

    ws.onclose = () => {
      if (!settled) {
        if (buf.trim()) finish(undefined, buf);
        else finish(new Error('XFYUN WebSocket closed without usable response'));
      }
    };
  });
}
