/**
 * 聊天 HTTP / WebSocket 基址。
 * - 浏览器：默认走同源相对路径 `/api/chat/*`，由 next.config rewrites 反代到 chat-server（3002）。
 * - 可显式设置 NEXT_PUBLIC_CHAT_API / NEXT_PUBLIC_CHAT_WS 覆盖。
 */
export function chatHttpUrl(path: string): string {
  const p = path.startsWith('/api/chat') ? path : `/api/chat/${path.replace(/^\//, '')}`;
  if (typeof window !== 'undefined') {
    const override = process.env.NEXT_PUBLIC_CHAT_API?.trim();
    if (override) {
      return `${override.replace(/\/$/, '')}${p}`;
    }
    return p;
  }
  const base = (process.env.NEXT_PUBLIC_CHAT_API || 'http://127.0.0.1:3002').replace(/\/$/, '');
  return `${base}${p}`;
}

export function chatSocketUrl(): string {
  if (typeof window !== 'undefined') {
    const override = process.env.NEXT_PUBLIC_CHAT_WS?.trim();
    if (override) return override.replace(/\/$/, '');
    const apiOverride = process.env.NEXT_PUBLIC_CHAT_API?.trim();
    if (apiOverride) return apiOverride.replace(/\/$/, '');
    return window.location.origin;
  }
  return (process.env.NEXT_PUBLIC_CHAT_WS || process.env.NEXT_PUBLIC_CHAT_API || 'http://127.0.0.1:3002').replace(
    /\/$/,
    ''
  );
}

/** GET /api/chat/auth/message — 校验响应，避免 message 为空时 signMessage(null) 触发 ethers INVALID_ARGUMENT */
export async function fetchChatAuthSigningMessage(): Promise<string> {
  const url = chatHttpUrl('auth/message');
  const res = await fetch(url);
  const text = await res.text();
  let data: { message?: unknown; error?: string };
  try {
    data = JSON.parse(text) as { message?: unknown; error?: string };
  } catch {
    throw new Error(
      `聊天认证接口返回非 JSON。请确认域名下 /api/chat 指向聊天服务（当前请求：${url}）。正文前 120 字：${text.slice(0, 120)}`
    );
  }
  if (!res.ok) {
    throw new Error(data?.error || `聊天认证接口 HTTP ${res.status}`);
  }
  const message = data.message;
  if (typeof message !== 'string' || message.length === 0) {
    throw new Error(
      '服务器未返回有效的 message 字段。常见原因：反向代理把 /api/chat 转到了错误的后端；请检查 Nginx location /api/chat/ 是否指向聊天服务或 Next（含 rewrites）。'
    );
  }
  return message;
}
