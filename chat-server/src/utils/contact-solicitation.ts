/**
 * Detect off-platform private contact solicitation (QQ / WeChat / Telegram / etc.).
 * Conservative: avoid matching unrelated English words; Chinese phrases are explicit.
 */

const CN_PATTERNS: RegExp[] = [
  /微信/i,
  /威信/i,
  /薇信/i,
  /企\s*鹅\s*号/i,
  /扣\s*扣/i,
  /加\s*qq/i,
  /qq\s*号/i,
  /qq\s*群/i,
  /私\s*聊/i,
  /拉\s*群/i,
  /留\s*联系/i,
  /联系方式/i,
  /加我/i,
  /加\s*v/i,
  /私\s*v/i,
  /v\s*我/i,
  /v\s*信/i,
  /抖音号/i,
  /抖\s*音\s*号/i,
  /快手号/i,
  /快\s*手\s*号/i,
];

/** ASCII / mixed tokens (word boundaries where applicable) */
const ASCII_PATTERNS: RegExp[] = [
  /\bqq\s*[:：]?\s*[0-9０-９]/i,
  /\bvx\b/i,
  /\bwx\b/i,
  /\bwechat\b/i,
  /\btg\b/i,
  /\btelegram\b/i,
  /\bwhatsapp\b/i,
  /\bdiscord\b/i,
  /\bsignal\b/i,
  /\btiktok\b/i,
];

/** 中国大陆手机号（仅数字串中匹配 11 位），与微信/威信/vx 等同句出现时视为拉私下联系方式 */
const WECHAT_HINT = /微信|威信|薇信|加微|联系微|聯繫微|找我微|\bvx\b/i;

function hasCnMobileDigits(s: string): boolean {
  const digits = s.replace(/\D/g, '');
  return /1[3-9]\d{9}/.test(digits);
}

/** 手机号 + 微信类关键词 同一条消息内同时出现 */
function hasPhoneWithWechatHint(s: string): boolean {
  if (!WECHAT_HINT.test(s)) return false;
  return hasCnMobileDigits(s);
}

export function textContainsOffPlatformContactSolicitation(raw: string): boolean {
  const s = typeof raw === 'string' ? raw : '';
  if (!s.trim()) return false;
  if (CN_PATTERNS.some((re) => re.test(s))) return true;
  const lower = s.toLowerCase();
  if (ASCII_PATTERNS.some((re) => re.test(lower))) return true;
  if (hasPhoneWithWechatHint(s)) return true;
  return false;
}
