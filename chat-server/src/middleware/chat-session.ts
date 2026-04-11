import { createHmac, timingSafeEqual } from 'crypto';

function getSecret(): string {
  const s = process.env.CHAT_SESSION_SECRET?.trim();
  if (s && s.length >= 16) return s;
  console.warn(
    '[chat-session] CHAT_SESSION_SECRET missing or too short; using insecure dev default. Set CHAT_SESSION_SECRET in production.'
  );
  return 'rwa-chat-session-dev-only-change-me';
}

function ttlMs(): number {
  const days = Math.max(1, Math.min(365, parseInt(String(process.env.CHAT_SESSION_TTL_DAYS || '90'), 10) || 90));
  return days * 24 * 60 * 60 * 1000;
}

type Payload = { v: 1; addr: string; exp: number };

/**
 * HMAC 会话令牌：登录/换票成功后下发，后续 REST 与 WebSocket 可用其代替每次签名校验。
 */
export function issueChatSessionToken(address: string): string {
  const addr = String(address || '').trim().toLowerCase();
  const exp = Date.now() + ttlMs();
  const payloadJson = JSON.stringify({ v: 1, addr, exp } satisfies Payload);
  const payload = Buffer.from(payloadJson, 'utf8').toString('base64url');
  const sig = createHmac('sha256', getSecret()).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function verifyChatSessionToken(token: string): string | null {
  if (!token || typeof token !== 'string') return null;
  const i = token.lastIndexOf('.');
  if (i <= 0) return null;
  const payload = token.slice(0, i);
  const sig = token.slice(i + 1);
  const expected = createHmac('sha256', getSecret()).update(payload).digest('base64url');
  try {
    const a = Buffer.from(sig, 'utf8');
    const b = Buffer.from(expected, 'utf8');
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  try {
    const json = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Payload;
    if (json.v !== 1 || typeof json.addr !== 'string' || typeof json.exp !== 'number') return null;
    if (Date.now() > json.exp) return null;
    return json.addr;
  } catch {
    return null;
  }
}
