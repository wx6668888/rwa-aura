'use client';

import React from 'react';
import { ChatUser } from './chat-context';

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
  user: ChatUser;
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
  const config = LEVEL_CONFIG[user.nodeLevel] || LEVEL_CONFIG.L1;
  const isElite = config.tier === 'elite';
  const isHigh = config.tier === 'high' || isElite;

  const sizeClasses = {
    sm: { badge: 'text-[9px] px-1 py-[1px]', name: 'text-[11px]', tag: 'text-[8px] px-[3px]' },
    md: { badge: 'text-[10px] px-1.5 py-[2px]', name: 'text-[13px]', tag: 'text-[9px] px-1' },
    lg: { badge: 'text-xs px-2 py-0.5', name: 'text-sm', tag: 'text-[10px] px-1.5' },
  }[size];
  const isOwner = user.isBot && user.isAdmin;

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
          {user.nodeLevel}
        </span>
      )}

      <span
        className={`font-semibold truncate leading-none ${sizeClasses.name} font-mono max-w-[min(200px,72vw)]`}
        style={{ color: isHigh ? config.color : 'var(--text-primary)' }}
        title={user.address && user.address.startsWith('0x') ? user.address : undefined}
      >
        {user.nickname?.trim() || shortWalletAddress(user.address)}
      </span>
      {user.isAdmin && (
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

/** Avatar circle with level-colored ring；机器人可带 /chat-bot-icons/*.svg */
export function UserAvatar({ user, size = 32 }: { user: ChatUser; size?: number }) {
  const config = LEVEL_CONFIG[user.nodeLevel] || LEVEL_CONFIG.L1;
  const addr = (user.address || '').toLowerCase();
  const botMark =
    user.isBot && addr.startsWith('0x') && addr.length >= 4
      ? addr.slice(2, 4).toUpperCase()
      : null;
  const initial = botMark ?? (user.isBot ? '?' : user.nickname?.[0]?.toUpperCase() || '?');
  const isElite = config.tier === 'elite';

  const iconSrc =
    user.avatar && (user.avatar.startsWith('/') || user.avatar.startsWith('http'))
      ? user.avatar
      : null;

  return (
    <div
      className={`relative flex-shrink-0 rounded-full flex items-center justify-center font-heading font-bold select-none overflow-hidden
        ${isElite ? 'animate-pulse' : ''}`}
      style={{
        width: size,
        height: size,
        fontSize: size * (user.isBot && !iconSrc ? 0.3 : 0.4),
        background: `linear-gradient(135deg, ${config.color}20, ${config.color}08)`,
        border: `1.5px solid ${config.color}50`,
        color: config.color,
        boxShadow: isElite ? config.glow : undefined,
      }}
    >
      {iconSrc ? (
        // Lucide SVG 默认深色描边，在暗色底上提亮
        <img
          src={iconSrc}
          alt=""
          className="object-contain pointer-events-none"
          style={{
            width: Math.round(size * 0.62),
            height: Math.round(size * 0.62),
            filter: 'brightness(0) invert(1) opacity(0.88)',
          }}
          draggable={false}
        />
      ) : (
        initial
      )}
      {user.isOnline && (
        <div
          className="absolute -bottom-[1px] -right-[1px] rounded-full border-2"
          style={{
            width: size * 0.3,
            height: size * 0.3,
            background: '#10b981',
            borderColor: 'var(--void-black)',
          }}
        />
      )}
    </div>
  );
}
