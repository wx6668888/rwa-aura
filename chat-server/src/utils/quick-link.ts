/** 站内快捷链接白名单（聊天消息 metadata.quickLink.path） */
const ALLOWED_EXACT = new Set([
  '/',
  '/stake',
  '/withdraw',
  '/swap',
  '/dashboard',
  '/lucky',
  '/calculator',
  '/knowledge',
  '/announcements',
  '/referral-network',
  '/dividend',
  '/nodes',
  '/market',
  '/governance',
  '/help',
  '/analytics',
  '/about',
  '/chat',
  '/security',
  '/privacy',
  '/terms',
]);

export function isAllowedQuickLinkPath(raw: string): boolean {
  if (typeof raw !== 'string') return false;
  const p = raw.trim().split('?')[0].split('#')[0];
  if (!p.startsWith('/') || p.includes('..') || p.includes('//')) return false;
  if (ALLOWED_EXACT.has(p)) return true;
  if (p.startsWith('/announcements/')) return true;
  return false;
}
