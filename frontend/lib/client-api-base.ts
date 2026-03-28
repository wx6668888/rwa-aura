/**
 * 浏览器内调用自建 API 的基址（不含末尾 /）。
 * 配置的 URL 与当前页**不同源**时返回 ''，走同源 `/api/*`（Nginx → 后端）。
 */
export function getBrowserApiBase(): string {
  if (typeof window === 'undefined') return '';
  const raw = (process.env.NEXT_PUBLIC_RELAYER_URL || process.env.NEXT_PUBLIC_API_URL || '')
    .trim()
    .replace(/\/$/, '');
  if (!raw) return '';
  try {
    if (new URL(raw).origin === window.location.origin) return raw;
    return '';
  } catch {
    return '';
  }
}

/** 中继专用（仅读 NEXT_PUBLIC_RELAYER_URL）；跨子域时同样回落到同源 /api */
export function getBrowserRelayerBase(): string {
  if (typeof window === 'undefined') {
    return (process.env.NEXT_PUBLIC_RELAYER_URL || '').trim().replace(/\/$/, '');
  }
  const raw = (process.env.NEXT_PUBLIC_RELAYER_URL || '').trim().replace(/\/$/, '');
  if (!raw) return '';
  try {
    if (new URL(raw).origin === window.location.origin) return raw;
    return '';
  } catch {
    return '';
  }
}
