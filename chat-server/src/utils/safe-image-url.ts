/**
 * 聊天图片 URL 白名单（防 SSRF / 内网探测）
 */
const EXTRA_HOSTS = (process.env.CHAT_IMAGE_HOSTS || '')
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

const BUILTIN_HOSTS = [
  'cdn.jsdelivr.net',
  'fastly.jsdelivr.net',
  'gcore.jsdelivr.net',
  'picsum.photos',
  'i.imgur.com',
];

const ALL_HOSTS = new Set([...BUILTIN_HOSTS, ...EXTRA_HOSTS]);

const MAX_URL_LEN = 512;

/** 同源聊天上传目录（仅路径，无 ..） */
function isChatUploadPath(s: string): boolean {
  if (!s.startsWith('/api/chat/uploads/')) return false;
  if (s.includes('..') || s.includes('\\')) return false;
  return /^\/api\/chat\/uploads\/[a-zA-Z0-9._-]+$/.test(s);
}

export function isAllowedChatImageUrl(raw: string): boolean {
  const s = raw.trim();
  if (!s || s.length > MAX_URL_LEN) return false;
  if (isChatUploadPath(s)) return true;
  let u: URL;
  try {
    u = new URL(s);
  } catch {
    return false;
  }
  if (u.protocol !== 'https:') return false;
  if (isChatUploadPath(u.pathname)) return true;
  const host = u.hostname.toLowerCase();
  if (ALL_HOSTS.has(host)) return true;
  if (host === 'localhost' || host.endsWith('.local')) return false;
  return false;
}
