'use client';

import React from 'react';
import { ChatUser } from './chat-context';
import {
  getChatDicebearDataUri,
  localCalendarDateKey,
  shouldUseDicebearAvatar,
} from '@/lib/chat-dicebear-avatar';

function useAvatarDayKey(): string {
  const [dayKey, setDayKey] = React.useState(() => localCalendarDateKey());
  React.useEffect(() => {
    const sync = () => setDayKey(localCalendarDateKey());
    const id = window.setInterval(sync, 60_000);
    const onVis = () => {
      if (document.visibilityState === 'visible') sync();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);
  return dayKey;
}

type AvatarImgResolved =
  | { kind: 'img'; src: string; invert: boolean; contain: boolean }
  | { kind: 'none' };

/** 与真人相同：社区机器人用 adventurer（地址 seed + 日盐）；官方/群主机器人保留自定义图 */
function shouldUseAdventurerDicebear(user: ChatUser): boolean {
  if (user.isBot && user.isAdmin) return false;
  const av = (user.avatar || '').trim();
  if (av.startsWith('http') || av.startsWith('/api/')) return false;
  if (user.isBot && !user.isAdmin) return true;
  return shouldUseDicebearAvatar({ isBot: false, avatar: user.avatar });
}

function resolveChatUserAvatarImage(user: ChatUser, dayKey: string): AvatarImgResolved {
  const av = (user.avatar || '').trim();
  const customRemote = av.startsWith('http') || av.startsWith('/api/');

  if (user.isBot && user.isAdmin) {
    if (customRemote) return { kind: 'img', src: av, invert: false, contain: false };
    if (av.startsWith('/'))
      return { kind: 'img', src: av, invert: true, contain: true };
    return { kind: 'none' };
  }

  if (shouldUseAdventurerDicebear(user)) {
    const addr = (user.address || '').trim() || 'guest';
    return { kind: 'img', src: getChatDicebearDataUri(addr, dayKey), invert: false, contain: false };
  }
  if (av && (av.startsWith('/') || av.startsWith('http'))) {
    return { kind: 'img', src: av, invert: false, contain: false };
  }
  return { kind: 'none' };
}

export type ChatAvatarUserLike = Pick<ChatUser, 'address' | 'nickname' | 'avatar' | 'isBot' | 'isAdmin'>;

/** 列表/侧栏用小方头像：DiceBear 或站内图，与 UserAvatar 规则一致 */
export function ChatUserAvatarThumb({
  user,
  size = 28,
  className = '',
  roundedClassName = 'rounded-lg',
}: {
  user: ChatAvatarUserLike;
  size?: number;
  className?: string;
  roundedClassName?: string;
}) {
  const dayKey = useAvatarDayKey();
  const safe: ChatUser = {
    id: 'thumb',
    address: user.address || '',
    nickname: user.nickname || '',
    avatar: user.avatar,
    nodeLevel: 'L1',
    isBot: user.isBot,
    isAdmin: Boolean(user.isAdmin),
    isOnline: false,
  };
  const resolved = resolveChatUserAvatarImage(safe, dayKey);
  const initial = user.isBot
    ? (user.address || '').toLowerCase().startsWith('0x') && (user.address || '').length >= 4
      ? (user.address || '').slice(2, 4).toUpperCase()
      : '?'
    : (user.nickname?.[0] || user.address?.[0] || '?').toUpperCase();

  return (
    <div
      className={`flex-shrink-0 overflow-hidden flex items-center justify-center ${roundedClassName} ${className}`}
      style={{
        width: size,
        height: size,
        background:
          resolved.kind === 'none'
            ? 'linear-gradient(135deg, #0d9488, #0f766e)'
            : 'transparent',
      }}
    >
      {resolved.kind === 'img' ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={resolved.src}
          alt=""
          className={resolved.contain ? 'w-full h-full object-contain pointer-events-none' : 'w-full h-full object-cover pointer-events-none'}
          style={
            resolved.invert
              ? {
                  filter: 'brightness(0) invert(1) opacity(0.88)',
                }
              : undefined
          }
          draggable={false}
        />
      ) : (
        <span className="text-[11px] font-bold text-white leading-none">{initial}</span>
      )}
    </div>
  );
}

const LEVEL_CONFIG: Record<string, { name: string; icon: string; color: string; glow: string; tier: 'base' | 'mid' | 'high' | 'elite' }> = {
  L1: { name: 'Quantum',   icon: '\u26A1', color: '#64748b', glow: '0 0 6px #64748b40', tier: 'base' },
  L2: { name: 'Particle',  icon: '\uD83D\uDD2C', color: '#f59e0b', glow: '0 0 8px #f59e0b40', tier: 'base' },
  L3: { name: 'Photon',    icon: '\u2728', color: '#f59e0b', glow: '0 0 8px #f59e0b50', tier: 'mid' },
  L4: { name: 'Starship',  icon: '\uD83D\uDEF8', color: '#f59e0b', glow: '0 0 10px #f59e0b60', tier: 'mid' },
  L5: { name: 'Comet',     icon: '\u2604\uFE0F', color: '#00f5d4', glow: '0 0 10px #00f5d460', tier: 'mid' },
  L6: { name: 'Planet',    icon: '\uD83E\uDE90', color: '#00f5d4', glow: '0 0 12px #00f5d470', tier: 'high' },
  L7: { name: 'Star',      icon: '\u2B50', color: '#00f5d4', glow: '0 0 14px #00f5d480', tier: 'high' },
  L8: { name: 'Nebula',    icon: '\uD83C\uDF0C', color: '#8b5cf6', glow: '0 0 16px #8b5cf690', tier: 'elite' },
  L9: { name: 'Supernova', icon: '\uD83D\uDCAB', color: '#8b5cf6', glow: '0 0 20px #8b5cf6a0', tier: 'elite' },
};

interface UserBadgeProps {
  user?: ChatUser | null;
  size?: 'sm' | 'md' | 'lg';
  showLevel?: boolean;
}

/** 机器人消息区展示：短地址（后台 nickname 仍为角色名，仅管理端可见） */
export function shortWalletAddress(addr: string): string {
  const a = (addr || '').trim().toLowerCase();
  if (!a.startsWith('0x') || a.length < 12) return a || '0x…';
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

export default function UserBadge({ user, size = 'md', showLevel = true }: UserBadgeProps) {
  const safeUser: ChatUser = user || {
    id: 'unknown',
    address: '',
    nickname: 'Unknown',
    nodeLevel: 'L1',
    isBot: false,
    isAdmin: false,
    isOnline: false,
  };
  const config = LEVEL_CONFIG[safeUser.nodeLevel] || LEVEL_CONFIG.L1;
  const isElite = config.tier === 'elite';
  const isHigh = config.tier === 'high' || isElite;

  const sizeClasses = {
    sm: { badge: 'text-[9px] px-1 py-[1px]', name: 'text-[11px]', tag: 'text-[8px] px-[3px]' },
    md: { badge: 'text-[10px] px-1.5 py-[2px]', name: 'text-[13px]', tag: 'text-[9px] px-1' },
    lg: { badge: 'text-xs px-2 py-0.5', name: 'text-sm', tag: 'text-[10px] px-1.5' },
  }[size];
  const isOwner = safeUser.isBot && safeUser.isAdmin;

  return (
    <div className="flex items-center gap-1">
      {showLevel && (
        <span
          className={`inline-flex items-center gap-[2px] rounded-md font-mono font-semibold leading-none
            ${sizeClasses.badge} ${isElite ? 'animate-pulse' : ''}`}
          style={{
            background: `linear-gradient(135deg, ${config.color}15, ${config.color}08)`,
            color: config.color,
            border: `1px solid ${config.color}30`,
            boxShadow: isHigh ? config.glow : undefined,
          }}
        >
          {safeUser.nodeLevel}
        </span>
      )}

      <span
        className={`font-semibold truncate leading-none ${sizeClasses.name} font-mono max-w-[min(200px,72vw)]`}
        style={{ color: isHigh ? config.color : 'var(--text-primary)' }}
        title={safeUser.address && safeUser.address.startsWith('0x') ? safeUser.address : undefined}
      >
        {safeUser.nickname?.trim() || shortWalletAddress(safeUser.address)}
      </span>
      {safeUser.isAdmin && (
        <span
          className={`rounded font-mono font-medium leading-none text-white ${sizeClasses.tag}`}
          style={
            isOwner
              ? {
                  background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
                  border: '1px solid rgba(255,255,255,0.35)',
                  boxShadow: '0 0 10px rgba(245,158,11,0.35)',
                }
              : { background: '#0d9488', border: '1px solid rgba(255,255,255,0.25)' }
          }
        >
          {isOwner ? '👑 OWNER' : 'MOD'}
        </span>
      )}
    </div>
  );
}

/** Avatar circle：无外层描边；真人/社区机器人 DiceBear adventurer；官方机器人可保留 SVG */
export function UserAvatar({ user, size = 32 }: { user?: ChatUser | null; size?: number }) {
  const dayKey = useAvatarDayKey();
  const safeUser: ChatUser = user || {
    id: 'unknown',
    address: '',
    nickname: 'Unknown',
    nodeLevel: 'L1',
    isBot: false,
    isAdmin: false,
    isOnline: false,
  };
  const config = LEVEL_CONFIG[safeUser.nodeLevel] || LEVEL_CONFIG.L1;
  const addr = (safeUser.address || '').toLowerCase();
  const botMark =
    safeUser.isBot && addr.startsWith('0x') && addr.length >= 4
      ? addr.slice(2, 4).toUpperCase()
      : null;
  const initial = botMark ?? (safeUser.isBot ? '?' : safeUser.nickname?.[0]?.toUpperCase() || '?');
  const isElite = config.tier === 'elite';
  const isAdmin = Boolean(safeUser.isAdmin);

  const resolved = React.useMemo(
    () => resolveChatUserAvatarImage(safeUser, dayKey),
    [dayKey, safeUser.address, safeUser.avatar, safeUser.id, safeUser.isBot, safeUser.isAdmin, safeUser.nickname]
  );

  const showLevelTint = resolved.kind === 'none';
  return (
    <div
      className={`relative flex-shrink-0 rounded-full flex items-center justify-center font-heading font-bold select-none overflow-hidden
        ${isElite ? 'animate-pulse' : ''}`}
      style={{
        width: size,
        height: size,
        fontSize: size * (safeUser.isBot && resolved.kind === 'none' ? 0.3 : 0.4),
        background: showLevelTint ? `linear-gradient(135deg, ${config.color}20, ${config.color}08)` : 'transparent',
        color: config.color,
        boxShadow: isElite && showLevelTint ? config.glow : undefined,
      }}
    >
      {resolved.kind === 'img' ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={resolved.src}
          alt=""
          className={`pointer-events-none ${resolved.contain ? 'object-contain' : 'object-cover w-full h-full'}`}
          style={
            resolved.contain
              ? {
                  width: Math.round(size * 0.62),
                  height: Math.round(size * 0.62),
                  filter: resolved.invert ? 'brightness(0) invert(1) opacity(0.88)' : undefined,
                }
              : resolved.invert
                ? { filter: 'brightness(0) invert(1) opacity(0.88)' }
                : undefined
          }
          draggable={false}
        />
      ) : (
        initial
      )}
      {isAdmin && (
        <div
          className="absolute -top-[2px] -right-[2px] rounded-full flex items-center justify-center"
          style={{
            width: Math.max(14, Math.round(size * 0.34)),
            height: Math.max(14, Math.round(size * 0.34)),
            background: 'linear-gradient(135deg, #00f5d4, #8b5cf6)',
            border: '2px solid var(--void-black)',
            boxShadow: '0 0 10px rgba(0,245,212,0.25)',
            fontSize: Math.max(9, Math.round(size * 0.18)),
            lineHeight: 1,
            color: '#06141a',
          }}
          title="官方/管理员"
        >
          ✓
        </div>
      )}
    </div>
  );
}
