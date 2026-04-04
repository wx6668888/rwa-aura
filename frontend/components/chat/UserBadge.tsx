'use client';

import React, { useMemo } from 'react';
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

export default function UserBadge({ user, size = 'md', showLevel = true }: UserBadgeProps) {
  const config = LEVEL_CONFIG[user.nodeLevel] || LEVEL_CONFIG.L1;
  const isElite = config.tier === 'elite';
  const isHigh = config.tier === 'high' || isElite;

  const sizeClasses = {
    sm: { badge: 'text-[9px] px-1 py-[1px]', name: 'text-[11px]', tag: 'text-[8px] px-[3px]' },
    md: { badge: 'text-[10px] px-1.5 py-[2px]', name: 'text-[13px]', tag: 'text-[9px] px-1' },
    lg: { badge: 'text-xs px-2 py-0.5', name: 'text-sm', tag: 'text-[10px] px-1.5' },
  }[size];

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
        className={`font-semibold truncate max-w-[140px] leading-none ${sizeClasses.name}`}
        style={{ color: isHigh ? config.color : 'var(--text-primary)' }}
      >
        {user.nickname}
      </span>

      {user.isBot && (
        <span className={`rounded font-mono font-medium leading-none ${sizeClasses.tag}`}
          style={{ background: '#8b5cf620', color: '#8b5cf6', border: '1px solid #8b5cf630' }}>
          BOT
        </span>
      )}
      {user.isAdmin && (
        <span className={`rounded font-mono font-medium leading-none ${sizeClasses.tag}`}
          style={{ background: '#00f5d420', color: '#00f5d4', border: '1px solid #00f5d430' }}>
          MOD
        </span>
      )}
    </div>
  );
}

/** Avatar circle with level-colored ring */
export function UserAvatar({ user, size = 32 }: { user: ChatUser; size?: number }) {
  const config = LEVEL_CONFIG[user.nodeLevel] || LEVEL_CONFIG.L1;
  const initial = user.nickname?.[0]?.toUpperCase() || '?';
  const isElite = config.tier === 'elite';

  return (
    <div
      className={`relative flex-shrink-0 rounded-full flex items-center justify-center font-heading font-bold select-none
        ${isElite ? 'animate-pulse' : ''}`}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        background: `linear-gradient(135deg, ${config.color}20, ${config.color}08)`,
        border: `1.5px solid ${config.color}50`,
        color: config.color,
        boxShadow: isElite ? config.glow : undefined,
      }}
    >
      {initial}
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
