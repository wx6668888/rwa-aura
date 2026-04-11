import fs from 'fs';
import path from 'path';
import { createHash, randomUUID } from 'crypto';
import { CHAT_UPLOAD_DIR } from '../config/paths';

/**
 * 三种预设与参考截图对齐：
 * - ref_a：图1 — 9 条；质押 RWA / 提现 RWA 灵活本金 / 质押 RWA；副标题「区块链浏览器」；状态栏 iOS 刘海。
 * - ref_b：图2 — 19 条；早间质押收益 + 质押 + 再一笔收益 + 灵活提现 + 推荐；状态栏 iOS 灵动岛。
 * - ref_c：图3 — 15 条；连续三日 08:00 质押收益 + 推荐收益；状态栏 iOS 刘海。
 *
 * 环境变量：
 * - BOT_YIELD_SCREENSHOT_BROWSER=1：在状态栏下增加一行「× | RWA Protocol · rwa.lat」模拟内置浏览器顶条。
 * 真机像素级截图需 Playwright 等另行接入（见对话说明），本模块仍为 SVG。
 */
export type ActivityScreenshotPreset = 'ref_a' | 'ref_b' | 'ref_c';

export type PhoneStatusStyle = 'ios_dynamic' | 'ios_notch' | 'android';

export type ActivityCardKind = 'staking_yield' | 'staking_rwa' | 'withdraw' | 'referral_reward';

export type ActivityCardSpec = {
  kind: ActivityCardKind;
  time: string;
  amountLabel: string;
  block: string;
  hashShort: string;
  tagText?: string;
  pillPurple?: boolean;
};

export type RenderInput = {
  botName: string;
  botAddressShort: string;
  amountRwa: number;
  ts: number;
  trigger: 'yield_just_arrived' | 'someone_asks_about_yield' | 'celebrating_together';
  cards?: ActivityCardSpec[];
  phoneStatus?: PhoneStatusStyle;
  listCount?: number;
  preset?: ActivityScreenshotPreset;
  /**
   * 顶部状态栏 HH:mm 所用毫秒时间戳；不传则使用 ts。
   * 应与「发图/消息发布时间」一致（通常为同一时刻的 Date.now() 或消息 createdAt）。
   */
  statusBarTimeMs?: number;
};

const C = {
  voidBlack: '#05050a',
  surface1: '#0d0d14',
  plasma: '#00f5d4',
  plasmaMuted: 'rgba(0,245,212,0.75)',
  textPrimary: '#f1f5f9',
  textSecondary: '#64748b',
  borderSheet: 'rgba(0,245,212,0.12)',
  pillGreenBg: 'rgba(16,185,129,0.18)',
  pillGreenText: '#10b981',
  pillPurpleBg: 'rgba(139,92,246,0.18)',
  pillPurpleText: '#a78bfa',
  amtOrange: '#f97316',
  pillLimeBg: 'rgba(132,204,22,0.18)',
  pillLimeText: '#84cc16',
};

const FONT_SANS = "'Noto Sans CJK SC','PingFang SC','Microsoft YaHei',system-ui,sans-serif";
const FONT_MONO = "'Noto Sans Mono CJK SC','DejaVu Sans Mono',monospace";

const SUBTITLE_BLOCKCHAIN = '钱包相关的链上资金变动，链接在区块链浏览器中打开。';
const SUBTITLE_EXPLORER = '钱包相关的链上资金变动，链接在区块浏览器中打开。';

function escapeXml(s: string): string {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function hashSeed(parts: string): number {
  return Math.abs(parts.split('').reduce((a, c) => (a * 33 + c.charCodeAt(0)) >>> 0, 5381));
}

/** 与链上 Tx 风格一致：SHA-256 派生，避免 LCG 全 0 / 规律弱的问题 */
function shortTxHash(entropy: string, cardIndex: number, preset: ActivityScreenshotPreset): string {
  const hex = createHash('sha256')
    .update(`rwa-fund-activity|${preset}|${entropy}|card:${cardIndex}|v2`)
    .digest('hex');
  const head = hex.slice(0, 8);
  const tail = hex.slice(-6);
  return `0x${head}...${tail}`;
}

function fmtShanghaiAtHms(ts: number, hour: number, minute: number, second: number): string {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = fmt.formatToParts(new Date(ts));
  const mm = parts.find((p) => p.type === 'month')?.value ?? '01';
  const dd = parts.find((p) => p.type === 'day')?.value ?? '01';
  return `${mm}/${dd} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`;
}

/** 状态栏时钟：与 statusBarTimeMs / ts 同一时刻，固定 Asia/Shanghai（与资金活动卡片时区一致） */
function fmtStatusBarClockShanghai(ms: number): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Shanghai',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    hourCycle: 'h23',
  } as Intl.DateTimeFormatOptions).formatToParts(new Date(ms));
  const hh = parts.find((p) => p.type === 'hour')?.value ?? '00';
  const mm = parts.find((p) => p.type === 'minute')?.value ?? '00';
  return `${hh.padStart(2, '0')}:${mm.padStart(2, '0')}`;
}

function resolvePreset(input: RenderInput, seed: number): ActivityScreenshotPreset {
  if (input.preset === 'ref_a' || input.preset === 'ref_b' || input.preset === 'ref_c') return input.preset;
  const m = seed % 3;
  if (m === 0) return 'ref_a';
  if (m === 1) return 'ref_b';
  return 'ref_c';
}

function presetDefaultPhone(p: ActivityScreenshotPreset): PhoneStatusStyle {
  if (p === 'ref_b') return 'ios_dynamic';
  return 'ios_notch';
}

function modalSubtitleForPreset(p: ActivityScreenshotPreset): string {
  return p === 'ref_a' ? SUBTITLE_BLOCKCHAIN : SUBTITLE_EXPLORER;
}

function listCountForPreset(p: ActivityScreenshotPreset): number {
  if (p === 'ref_a') return 9;
  if (p === 'ref_b') return 19;
  return 15;
}

/** 图1：9 条、三卡 — 区块号与时间与参考图一致 */
function cardsPresetRefA(input: RenderInput, preset: ActivityScreenshotPreset): ActivityCardSpec[] {
  const e = `${input.botName}|${input.ts}|${input.amountRwa}`;
  return [
    {
      kind: 'staking_rwa',
      time: '04/02 05:20:59',
      amountLabel: '+500.00 RWA',
      block: '#90064640',
      hashShort: shortTxHash(e, 0, preset),
    },
    {
      kind: 'withdraw',
      time: '04/02 05:18:23',
      amountLabel: '-1600.00 RWA',
      block: '#90064293',
      hashShort: shortTxHash(e, 1, preset),
      tagText: '提现 RWA 灵活本金',
      pillPurple: true,
    },
    {
      kind: 'staking_rwa',
      time: '04/02 04:30:57',
      amountLabel: '+500.00 RWA',
      block: '#90058016',
      hashShort: shortTxHash(e, 2, preset),
    },
  ];
}

/** 图2：19 条、五卡 — 早间收益 + 质押 + 再一笔收益 + 灵活提现 + 推荐 */
function cardsPresetRefB(input: RenderInput, preset: ActivityScreenshotPreset): ActivityCardSpec[] {
  const seed = hashSeed(`${input.botName}:${input.amountRwa}:${input.ts}`);
  const rwa = Number(input.amountRwa.toFixed(2));
  const t0 = input.ts;
  const tOffset = (days: number, h: number, m: number, s: number) =>
    fmtShanghaiAtHms(t0 - days * 24 * 60 * 60 * 1000, h, m, s);
  const blockBase = 90_400_000 + (seed % 800_000);
  const secondary = Number(Math.max(1, rwa * 0.92).toFixed(2));
  const referralAmt = Number((4.7 + (seed % 12) / 10).toFixed(2));
  const e = `${input.botName}|${input.ts}|${input.amountRwa}`;
  return [
    {
      kind: 'staking_yield',
      time: fmtShanghaiAtHms(t0, 8, 0, 0),
      amountLabel: `+${rwa.toFixed(2)} RWA`,
      block: '—',
      hashShort: shortTxHash(e, 0, preset),
    },
    {
      kind: 'staking_rwa',
      time: tOffset(1, 10, 24, 18),
      amountLabel: '+200.00 RWA',
      block: `#${blockBase}`,
      hashShort: shortTxHash(e, 1, preset),
    },
    {
      kind: 'staking_yield',
      time: tOffset(2, 8, 0, 0),
      amountLabel: `+${secondary.toFixed(2)} RWA`,
      block: '—',
      hashShort: shortTxHash(e, 2, preset),
    },
    {
      kind: 'withdraw',
      time: tOffset(3, 16, 53, 30),
      amountLabel: '-1600.00 RWA',
      block: `#${blockBase - 201_000}`,
      hashShort: shortTxHash(e, 3, preset),
      tagText: '提现 RWA 灵活本金',
      pillPurple: true,
    },
    {
      kind: 'referral_reward',
      time: tOffset(4, 19, 42, 11),
      amountLabel: `+${referralAmt.toFixed(2)} USDT`,
      block: `#${blockBase - 88_888}`,
      hashShort: shortTxHash(e, 4, preset),
    },
  ];
}

/** 图3：15 条、四卡 — 三日 08:00 同额收益 + 推荐（区块/时间对齐参考） */
function cardsPresetRefC(input: RenderInput, preset: ActivityScreenshotPreset): ActivityCardSpec[] {
  const t0 = input.ts;
  const d0 = fmtShanghaiAtHms(t0, 8, 0, 0);
  const d1 = fmtShanghaiAtHms(t0 - 1 * 24 * 60 * 60 * 1000, 8, 0, 0);
  const d2 = fmtShanghaiAtHms(t0 - 3 * 24 * 60 * 60 * 1000, 8, 0, 0);
  const dRef = fmtShanghaiAtHms(t0 - 6 * 24 * 60 * 60 * 1000, 21, 17, 54);
  const e = `${input.botName}|${input.ts}|${input.amountRwa}`;
  return [
    {
      kind: 'staking_yield',
      time: d0,
      amountLabel: '+23.40 RWA',
      block: '—',
      hashShort: shortTxHash(e, 0, preset),
    },
    {
      kind: 'staking_yield',
      time: d1,
      amountLabel: '+23.40 RWA',
      block: '—',
      hashShort: shortTxHash(e, 1, preset),
    },
    {
      kind: 'staking_yield',
      time: d2,
      amountLabel: '+23.40 RWA',
      block: '—',
      hashShort: shortTxHash(e, 2, preset),
    },
    {
      kind: 'referral_reward',
      time: dRef,
      amountLabel: '+5.10 USDT',
      block: '#90575739',
      hashShort: shortTxHash(e, 3, preset),
    },
  ];
}

function defaultCardsForPreset(input: RenderInput, preset: ActivityScreenshotPreset): ActivityCardSpec[] {
  switch (preset) {
    case 'ref_a':
      return cardsPresetRefA(input, preset);
    case 'ref_b':
      return cardsPresetRefB(input, preset);
    case 'ref_c':
      return cardsPresetRefC(input, preset);
    default:
      return cardsPresetRefB(input, 'ref_b');
  }
}

function pillLabelByKind(kind: ActivityCardKind): string {
  switch (kind) {
    case 'staking_yield':
      return '质押收益（RWA）';
    case 'staking_rwa':
      return '质押 RWA';
    case 'withdraw':
      return '提现 USDT';
    case 'referral_reward':
      return '推荐收益';
    default:
      return '';
  }
}

function resolvePillStyle(card: ActivityCardSpec): { bg: string; fg: string } {
  if (card.kind === 'withdraw' && card.pillPurple) {
    return { bg: C.pillPurpleBg, fg: C.pillPurpleText };
  }
  switch (card.kind) {
    case 'staking_yield':
      return { bg: C.pillGreenBg, fg: C.pillGreenText };
    case 'staking_rwa':
      return { bg: C.pillPurpleBg, fg: C.pillPurpleText };
    case 'withdraw':
      return { bg: 'rgba(249,115,22,0.18)', fg: C.amtOrange };
    case 'referral_reward':
      return { bg: C.pillLimeBg, fg: C.pillLimeText };
    default:
      return { bg: '#334155', fg: C.textPrimary };
  }
}

function amountColor(card: ActivityCardSpec): string {
  if (card.kind === 'withdraw' && card.pillPurple) return C.amtOrange;
  switch (card.kind) {
    case 'staking_yield':
      return C.pillGreenText;
    case 'staking_rwa':
      return C.pillPurpleText;
    case 'withdraw':
      return C.amtOrange;
    case 'referral_reward':
      return C.pillLimeText;
    default:
      return C.textSecondary;
  }
}

function iconFilter(x: number, y: number, color: string): string {
  return `<g transform="translate(${x},${y})" fill="none" stroke="${color}" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" opacity="0.5">
  <path d="M2 4.5h12l-5 5.2v4.3l-2 1v-5.3L2 4.5z"/>
</g>`;
}

function iconExternal(x: number, y: number, color: string): string {
  return `<g transform="translate(${x},${y})" fill="none" stroke="${color}" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M10 2h2.5V6"/><path d="M6 10L12 4"/><path d="M12 8v3.5a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1H8"/>
</g>`;
}

function iconClose(x: number, y: number): string {
  return `<g transform="translate(${x},${y})" stroke="${C.textSecondary}" stroke-width="1.5" stroke-linecap="round">
  <path d="M4 4l8 8"/><path d="M12 4L4 12"/>
</g>`;
}

/** 可选：模拟 Safari / 内置浏览器顶条（BOT_YIELD_SCREENSHOT_BROWSER=1） */
function drawInAppBrowserBar(yTop: number, w: number): string {
  const h = 44;
  return `<g>
  <rect x="0" y="${yTop}" width="${w}" height="${h}" fill="#141418"/>
  <line x1="0" y1="${yTop + h - 0.5}" x2="${w}" y2="${yTop + h - 0.5}" stroke="#2a2a30" stroke-width="1"/>
  <text x="18" y="${yTop + 28}" fill="#fafafa" font-size="20" font-family="${FONT_SANS}" font-weight="400">×</text>
  <line x1="46" y1="${yTop + 12}" x2="46" y2="${yTop + 32}" stroke="#3f3f46" stroke-width="1"/>
  <text x="58" y="${yTop + 27}" fill="#a1a1aa" font-size="13" font-family="${FONT_SANS}" font-weight="500">${escapeXml('RWA Protocol · rwa.lat')}</text>
</g>`;
}

/** iOS 风格蜂窝 4 格（略圆角竖条） */
function iconCellular(x: number, y: number, color: string): string {
  return `<g transform="translate(${x},${y})" fill="${color}">
  <rect x="0" y="7" width="3.2" height="5" rx="1"/>
  <rect x="4.5" y="5" width="3.2" height="7" rx="1"/>
  <rect x="9" y="3" width="3.2" height="9" rx="1"/>
  <rect x="13.5" y="1" width="3.2" height="11" rx="1"/>
</g>`;
}

function iconWifi(x: number, y: number, color: string): string {
  return `<g transform="translate(${x},${y})" fill="none" stroke="${color}" stroke-width="1.3" stroke-linecap="round">
  <path d="M8 11c2.5-2.2 5.5-2.2 8 0"/>
  <path d="M5.5 8.5c3.6-3.1 8.4-3.1 12 0"/>
  <path d="M3 6c5-4.3 11-4.3 16 0"/>
</g>`;
}

function iconBattery(x: number, y: number, pct: number, charging: boolean, stroke: string): string {
  const fillW = Math.max(2, Math.round((16 * pct) / 100));
  const bolt = charging
    ? `<path d="M7 2 L4.5 6.5h3.2l-1.6 5.5 5.5-6.4H8.2l1.1-3.6z" fill="#fbbf24" stroke="none" transform="translate(1,1.5) scale(0.5)"/>`
    : '';
  return `<g transform="translate(${x},${y})">
  <rect x="0" y="2" width="22" height="11.5" rx="2.8" fill="none" stroke="${stroke}" stroke-width="1"/>
  <rect x="23" y="4.5" width="1.8" height="6" rx="0.4" fill="${stroke}"/>
  <rect x="2" y="4" width="${fillW}" height="7.5" rx="1.2" fill="${pct < 20 ? '#f87171' : '#4ade80'}"/>
  ${bolt}
</g>`;
}

type StatusBarOpts = { batteryPct: number; charging: boolean; clock: string };

/** iOS 顶栏：左时间 · 中灵动岛/刘海胶囊 · 右 蜂窝 + 5G + Wi‑Fi + 电量（自右向左排布，避免重叠） */
function drawIOSStatusBar(w: number, y0: number, o: StatusBarOpts, island: 'notch' | 'dynamic'): string {
  const { batteryPct, charging, clock } = o;
  const cx = w / 2;
  const ink = '#f5f5f7';
  const inkMuted = '#a1a1aa';
  const islandW = island === 'dynamic' ? 126 : 121;
  const islandH = island === 'dynamic' ? 35 : 33;
  const islandRx = islandH / 2;
  const r = w - 12;
  const pctLabel = `${batteryPct}%`;
  return `<g>
  <text x="27" y="${y0 + 30}" fill="${ink}" font-size="17" font-family="${FONT_SANS}" font-weight="600">${escapeXml(clock)}</text>
  <rect x="${cx - islandW / 2}" y="${y0 + 8}" width="${islandW}" height="${islandH}" rx="${islandRx}" fill="#000000" stroke="#27272a" stroke-width="0.5"/>
  ${iconCellular(r - 112, y0 + 11, ink)}
  <text x="${r - 78}" y="${y0 + 27}" text-anchor="end" fill="${inkMuted}" font-size="11" font-family="${FONT_SANS}" font-weight="700">5G</text>
  ${iconWifi(r - 66, y0 + 12, inkMuted)}
  <text x="${r - 36}" y="${y0 + 26}" text-anchor="end" fill="${inkMuted}" font-size="10" font-family="${FONT_MONO}" font-weight="600">${escapeXml(pctLabel)}</text>
  ${iconBattery(r - 30, y0 + 10, batteryPct, charging, inkMuted)}
</g>`;
}

function drawStatusBar(style: PhoneStatusStyle, w: number, y0: number, o: StatusBarOpts): string {
  const { batteryPct, charging, clock } = o;
  const sig = '#a1a1aa';
  if (style === 'android') {
    return `<g transform="translate(0,${y0})">
  <text x="18" y="26" fill="${C.textPrimary}" font-size="15" font-family="${FONT_SANS}" font-weight="600">${escapeXml(clock)}</text>
  <text x="${w - 118}" y="25" fill="${sig}" font-size="11" font-family="${FONT_SANS}" font-weight="700">5G</text>
  ${iconCellular(w - 104, 10, sig)}
  ${iconWifi(w - 78, 9, sig)}
  <text x="${w - 52}" y="25" text-anchor="end" fill="${sig}" font-size="11" font-family="${FONT_MONO}" font-weight="600">${batteryPct}</text>
  ${iconBattery(w - 40, 8, batteryPct, charging, sig)}
</g>`;
  }
  if (style === 'ios_notch') {
    return drawIOSStatusBar(w, y0, o, 'notch');
  }
  return drawIOSStatusBar(w, y0, o, 'dynamic');
}

function estimateTextWidth(len: number): number {
  return len * 11 + 20;
}

function drawCard(x: number, y: number, w: number, card: ActivityCardSpec): string {
  const pillStyle = resolvePillStyle(card);
  const amtCol = amountColor(card);
  const rawLabel = (card.tagText || '').trim() || pillLabelByKind(card.kind);
  const label = escapeXml(rawLabel);
  const tim = escapeXml(card.time);
  const amt = escapeXml(card.amountLabel);
  const blk = escapeXml(card.block);
  const hx = escapeXml(card.hashShort);
  const isBlockLink = card.block.startsWith('#');
  const pillW = Math.min(w - 100, Math.max(72, estimateTextWidth(rawLabel.length)));
  const pillH = 22;
  const pillRy = 11;
  const blockLabel = '区块:';
  const blockValueX = x + 52;
  const linkIconX = blockValueX + Math.min(120, blk.length * 6.5) + 4;

  return `<g>
  <rect x="${x}" y="${y}" width="${w}" height="118" rx="16" ry="16" fill="url(#cardBgGrad)" stroke="${C.borderSheet}" stroke-width="1"/>
  <text x="${x + 16}" y="${y + 20}" fill="${C.textSecondary}" font-size="12" font-family="${FONT_MONO}">${tim}</text>
  <rect x="${x + 16}" y="${y + 28}" width="${pillW}" height="${pillH}" rx="${pillRy}" fill="${pillStyle.bg}"/>
  <text x="${x + 28}" y="${y + 43}" fill="${pillStyle.fg}" font-size="11" font-family="${FONT_SANS}" font-weight="600">${label}</text>
  <text x="${x + w - 16}" y="${y + 43}" text-anchor="end" fill="${amtCol}" font-size="13" font-family="${FONT_MONO}" font-weight="600">${amt}</text>
  <text x="${x + 16}" y="${y + 72}" fill="${C.textSecondary}" font-size="12" font-family="${FONT_SANS}">${escapeXml(blockLabel)}</text>
  <text x="${blockValueX}" y="${y + 72}" fill="${isBlockLink ? C.plasma : C.textSecondary}" font-size="12" font-family="${FONT_MONO}" font-weight="${isBlockLink ? '600' : '400'}">${blk}</text>
  ${isBlockLink ? iconExternal(linkIconX, y + 61, C.plasma) : ''}
  <text x="${x + 16}" y="${y + 98}" fill="${C.textSecondary}" font-size="11" font-family="${FONT_MONO}">${hx}</text>
  ${iconExternal(x + w - 30, y + 87, C.textSecondary)}
</g>`;
}

function ensureCardHashes(
  cards: ActivityCardSpec[],
  entropy: string,
  preset: ActivityScreenshotPreset
): ActivityCardSpec[] {
  return cards.map((c, i) => {
    const h = (c.hashShort || '').trim();
    const ok = /^0x[0-9a-f]{6,12}\.\.\.[0-9a-f]{4,8}$/i.test(h);
    return { ...c, hashShort: ok ? h : shortTxHash(`${entropy}|${i}`, i, preset) };
  });
}

function buildSvg(input: RenderInput): string {
  const W = 390;
  const H = 844;
  const seed = hashSeed(`${input.botName}:${input.amountRwa}:${input.ts}`);
  const preset = resolvePreset(input, seed);
  const phoneStyle: PhoneStatusStyle = input.phoneStatus ?? presetDefaultPhone(preset);
  const listCount = input.listCount ?? listCountForPreset(preset);
  const subtitle = modalSubtitleForPreset(preset);

  let cards = (input.cards && input.cards.length > 0 ? input.cards : defaultCardsForPreset(input, preset)).slice(0, 6);
  const entropy = `${input.botName}|${input.botAddressShort}|${input.ts}|${input.amountRwa}`;
  cards = ensureCardHashes(cards, entropy, preset);

  const STATUS_H = 48;
  const showBrowser = String(process.env.BOT_YIELD_SCREENSHOT_BROWSER || '').trim() === '1';
  const browserH = showBrowser ? 44 : 0;
  const topChrome = STATUS_H + browserH;
  const bottomReserve = 54;
  const usableH = H - topChrome - bottomReserve;
  const modalH = Math.max(420, Math.floor(usableH * 0.82));
  const modalY = topChrome + Math.max(10, Math.floor((usableH - modalH) / 2));
  const modalX = 14;
  const modalW = W - modalX * 2;
  const modalRx = 26;
  const padInner = 18;
  const ix = modalX + padInner;
  const innerW = modalW - padInner * 2;
  const sheetTop = modalY + 12;
  const filterBottom = sheetTop + 154;
  const cardsStartY = filterBottom + 8;
  const cardGap = 8;
  const rowH = 118 + cardGap;
  const maxCards = Math.max(1, Math.min(cards.length, Math.floor((modalY + modalH - 16 - cardsStartY) / rowH)));
  cards = cards.slice(0, maxCards);

  let cardsSvg = '';
  let cy = cardsStartY;
  for (const c of cards) {
    cardsSvg += drawCard(ix, cy, innerW, c);
    cy += rowH;
  }

  const barMs = input.statusBarTimeMs ?? input.ts;
  const clock = fmtStatusBarClockShanghai(barMs);
  const batteryPct = 42 + (seed % 54);
  const charging = seed % 4 !== 0;
  const statusBar = drawStatusBar(phoneStyle, W, 10, { batteryPct, charging, clock });
  const browserSvg = showBrowser ? drawInAppBrowserBar(STATUS_H, W) : '';

  const debugPreset = process.env.BOT_YIELD_SCREENSHOT_DEBUG === '1' ? ` ${preset}` : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="sheetGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${C.surface1}"/>
      <stop offset="50%" stop-color="#0a0a10"/>
      <stop offset="100%" stop-color="${C.surface1}"/>
    </linearGradient>
    <linearGradient id="cardBgGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="rgba(13,13,20,0.95)"/>
      <stop offset="100%" stop-color="rgba(19,19,30,0.6)"/>
    </linearGradient>
    <linearGradient id="leftBar" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${C.plasma}"/>
      <stop offset="100%" stop-color="${C.plasma}" stop-opacity="0.2"/>
    </linearGradient>
    <clipPath id="modalClip">
      <rect x="${modalX}" y="${modalY}" width="${modalW}" height="${modalH}" rx="${modalRx}" ry="${modalRx}"/>
    </clipPath>
  </defs>
  <rect width="${W}" height="${H}" fill="#000000"/>
  ${statusBar}
  ${browserSvg}
  <rect x="0" y="${topChrome}" width="${W}" height="${H - topChrome}" fill="rgba(0,0,0,0.58)"/>
  <rect x="${modalX}" y="${modalY}" width="${modalW}" height="${modalH}" rx="${modalRx}" ry="${modalRx}" fill="url(#sheetGrad)" stroke="${C.borderSheet}" stroke-width="1.2"/>
  <line x1="${modalX}" y1="${modalY + 1}" x2="${modalX + modalW}" y2="${modalY + 1}" stroke="${C.plasma}" stroke-opacity="0.18" stroke-width="1"/>

  <g clip-path="url(#modalClip)">
  <rect x="${ix + 18}" y="${sheetTop + 6}" width="2" height="32" rx="1" fill="url(#leftBar)"/>
  <text x="${ix + 28}" y="${sheetTop + 18}" fill="${C.plasmaMuted}" font-size="11" font-family="${FONT_SANS}" font-weight="600" letter-spacing="0.22em">ACTIVITY</text>
  ${iconClose(modalX + modalW - padInner - 28, sheetTop + 2)}
  <text x="${ix + 28}" y="${sheetTop + 44}" fill="${C.textPrimary}" font-size="17" font-family="${FONT_SANS}" font-weight="700">资金活动</text>
  <text x="${ix + 28}" y="${sheetTop + 70}" fill="${C.textSecondary}" font-size="12" font-family="${FONT_SANS}">${escapeXml(subtitle)}</text>

  <rect x="${ix}" y="${sheetTop + 86}" width="${innerW}" height="1" fill="${C.plasma}" fill-opacity="0.08"/>

  ${iconFilter(ix + 2, sheetTop + 96, C.plasma)}
  <text x="${ix + 26}" y="${sheetTop + 113}" fill="${C.textSecondary}" font-size="12" font-family="${FONT_SANS}" font-weight="500" letter-spacing="0.06em">按类型筛选</text>
  <rect x="${ix + 118}" y="${sheetTop + 96}" width="168" height="36" rx="18" fill="rgba(10,10,16,0.8)" stroke="${C.borderSheet}" stroke-width="1"/>
  <text x="${ix + 138}" y="${sheetTop + 119}" fill="${C.textPrimary}" font-size="13" font-family="${FONT_SANS}">全部</text>
  <path d="M ${ix + 268} ${sheetTop + 108} l3.5 3.5 l3.5-3.5" fill="none" stroke="${C.textSecondary}" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="${ix + innerW - 4}" y="${sheetTop + 118}" text-anchor="end" fill="${C.textSecondary}" font-size="12" font-family="${FONT_MONO}">${listCount} 条</text>

  <rect x="${modalX}" y="${filterBottom}" width="${modalW}" height="${modalY + modalH - filterBottom}" fill="rgba(5,5,10,0.38)"/>
  ${cardsSvg}
  </g>

  <rect x="${(W - 134) / 2}" y="${H - 12}" width="134" height="5" rx="2.5" fill="#f8fafc" opacity="0.55"/>

  ${
    process.env.BOT_YIELD_SCREENSHOT_DEBUG === '1'
      ? `<text x="${ix}" y="${H - 28}" fill="#475569" font-size="10" font-family="${FONT_MONO}">debug ${escapeXml(phoneStyle)}${escapeXml(debugPreset)}</text>`
      : ''
  }
</svg>`;
}

export function createYieldScreenshotImage(input: RenderInput): string | null {
  try {
    fs.mkdirSync(CHAT_UPLOAD_DIR, { recursive: true });
    const file = `activity-${Date.now()}-${randomUUID().slice(0, 8)}.svg`;
    const abs = path.join(CHAT_UPLOAD_DIR, file);
    fs.writeFileSync(abs, buildSvg(input), 'utf8');
    return `/api/chat/uploads/${file}`;
  } catch (e) {
    console.error('[YieldScreenshot] create failed:', e);
    return null;
  }
}

export function createFundActivityScreenshot(
  input: Omit<RenderInput, 'trigger'> & { trigger?: RenderInput['trigger'] }
): string | null {
  return createYieldScreenshotImage({
    ...input,
    trigger: input.trigger || 'yield_just_arrived',
  });
}
