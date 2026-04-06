'use client';

import React from 'react';
import { useChat } from './chat-context';
import { useLocale } from '@/components/locale-provider';
import { useTranslation } from '@/lib/i18n';

export default function RoomList(
  {
    closeMobileSidebar,
    onOpenWallet,
  }: { closeMobileSidebar?: () => void; onOpenWallet?: () => void } = {}
) {
  const { rooms, activeRoomId, setActiveRoom, isConnected, createGroupRoom, isAuthenticated } = useChat();
  const { locale } = useLocale();
  const { t } = useTranslation(locale);
  const [search, setSearch] = React.useState('');
  const [showNewGroup, setShowNewGroup] = React.useState(false);
  const [newName, setNewName] = React.useState('');
  const [newDesc, setNewDesc] = React.useState('');
  const [createErr, setCreateErr] = React.useState('');
  const [creating, setCreating] = React.useState(false);

  const submitNewGroup = async () => {
    if (!newName.trim()) {
      setCreateErr(t('chat.newGroupError'));
      return;
    }
    setCreateErr('');
    setCreating(true);
    try {
      await createGroupRoom(newName.trim(), newDesc.trim());
      setShowNewGroup(false);
      closeMobileSidebar?.();
      setNewName('');
      setNewDesc('');
    } catch (e: unknown) {
      setCreateErr(e instanceof Error ? e.message : t('chat.failedToConnect'));
    } finally {
      setCreating(false);
    }
  };

  const stripRoomPrefix = (name: string) => name.replace(/^[\p{Emoji}\s]+/u, '');

  const getRoomDisplayName = (room: { id: string; name: string }) => {
    switch (room.id) {
      case 'room-general':
        return t('chat.roomGeneral');
      case 'room-announcements':
        return t('chat.roomAnnouncements');
      case 'room-staking':
        return t('chat.roomStaking');
      case 'room-trading':
        return t('chat.roomTrading');
      case 'room-vip':
        return t('chat.roomVip');
      default:
        return stripRoomPrefix(room.name || '');
    }
  };

  return (
    <div className="flex flex-col h-full bg-surface-1 min-h-0">
      {/* Brand header */}
      <div className="px-4 pt-5 pb-3">
        <div className="flex items-center gap-2.5 mb-1">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center font-heading font-bold text-sm text-white"
            style={{ background: 'linear-gradient(135deg, #0d9488, #0f766e)', border: '1px solid rgba(255,255,255,0.2)' }}
          >
            R
          </div>
          <div>
            <h2 className="text-[13px] font-heading font-bold text-text-primary leading-none">RWA Aura</h2>
            <p className="text-[10px] text-text-secondary mt-0.5 font-mono">{t('chat.community')}</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 pb-2">
        <div className="relative">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-disabled" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder={t('chat.search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-surface-2 border border-border-subtle rounded-lg pl-8 pr-3 py-1.5 text-[12px] text-text-primary placeholder-text-disabled
              focus:outline-none focus:border-plasma-cyan/30 focus:ring-1 focus:ring-plasma-cyan/10 transition-all"
          />
        </div>
      </div>

      {/* Section label + new group */}
      <div className="px-4 pt-2 pb-1 flex items-center justify-between gap-2">
        <span className="text-[10px] font-mono font-semibold text-text-disabled uppercase tracking-[0.12em]">{t('chat.channels')}</span>
        {isAuthenticated && (
          <button
            type="button"
            onClick={() => {
              setCreateErr('');
              setShowNewGroup(true);
            }}
            className="text-[10px] font-mono px-2 py-1 rounded-md bg-[#0d9488] text-white border border-white/15 hover:bg-[#0f766e] transition-colors shrink-0"
          >
            + {t('chat.newGroup')}
          </button>
        )}
      </div>

      {showNewGroup && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl border border-border-subtle bg-surface-1 p-4 shadow-2xl max-h-[85dvh] overflow-y-auto overscroll-contain">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-heading font-semibold text-text-primary">{t('chat.newGroupTitle')}</h3>
              <button
                type="button"
                onClick={() => setShowNewGroup(false)}
                className="text-[11px] text-text-secondary hover:text-text-primary"
              >
                {t('chat.newGroupCancel')}
              </button>
            </div>
            <label className="block text-[10px] text-text-disabled mb-1 font-mono uppercase">{t('chat.newGroupName')}</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={t('chat.newGroupNamePh')}
              className="w-full bg-surface-2 border border-border-subtle rounded-lg px-3 py-2 text-[13px] text-text-primary mb-3 focus:outline-none focus:border-plasma-cyan/30"
            />
            <label className="block text-[10px] text-text-disabled mb-1 font-mono uppercase">{t('chat.newGroupDesc')}</label>
            <textarea
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder={t('chat.newGroupDescPh')}
              rows={2}
              className="w-full bg-surface-2 border border-border-subtle rounded-lg px-3 py-2 text-[13px] text-text-primary mb-3 resize-none focus:outline-none focus:border-plasma-cyan/30"
            />
            {createErr && <p className="text-[11px] text-danger mb-2">{createErr}</p>}
            <button
              type="button"
              disabled={creating}
              onClick={() => void submitNewGroup()}
              className="w-full py-2.5 rounded-xl font-medium text-[13px] bg-[#0d9488] text-white border border-white/15 hover:bg-[#0f766e] disabled:opacity-50"
            >
              {creating ? t('chat.connecting') : t('chat.newGroupCreate')}
            </button>
          </div>
        </div>
      )}

      {/* Room list */}
      <div className="flex-1 overflow-y-auto px-2 pb-2 scrollbar-thin scrollbar-thumb-white/5 scrollbar-track-transparent">
        {rooms
          .filter((r) => {
            if (!search) return true;
            const dn = getRoomDisplayName(r).toLowerCase();
            return dn.includes(search.toLowerCase());
          })
          .map((room) => {
          const isActive = room.id === activeRoomId;
          const displayName = getRoomDisplayName(room);
          return (
            <button
              type="button"
              key={room.id}
              onClick={() => {
                setActiveRoom(room.id);
                closeMobileSidebar?.();
              }}
              className={`w-full text-left px-2.5 py-2 rounded-lg transition-all duration-150 flex items-center gap-2.5 group mb-[2px]
                ${isActive
                  ? 'bg-[#0f766e] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]'
                  : 'text-text-secondary hover:bg-surface-2 hover:text-text-primary'
                }`}
            >
              {/* Channel icon */}
              <div className={`w-7 h-7 rounded-md flex items-center justify-center text-[13px] flex-shrink-0 transition-all
                ${isActive
                  ? ''
                  : 'opacity-50 group-hover:opacity-80'}`}
                style={isActive ? {
                  background: 'rgba(255,255,255,0.14)',
                  border: '1px solid rgba(255,255,255,0.28)',
                  color: '#fff',
                } : {
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                {room.type === 'channel' ? '#' : room.icon || '#'}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className={`text-[12px] font-medium truncate leading-none ${isActive ? 'text-white' : ''}`}>
                  {displayName}
                </div>
                {room.type === 'channel' && (
                  <div
                    className={`mt-1 font-mono text-[9px] ${isActive ? 'text-white/65' : 'text-text-disabled'}`}
                  >
                    {t('chat.readOnly')}
                  </div>
                )}
              </div>

              {/* Active indicator */}
              {isActive && (
                <div className="h-4 w-1 rounded-full bg-white/90" />
              )}
            </button>
          );
        })}
      </div>

      {/* Connection status */}
      <div className="px-4 py-3 border-t border-border-subtle">
        {isAuthenticated && (
          <button
            type="button"
            onClick={() => onOpenWallet?.()}
            className="mb-3 h-9 w-full rounded-lg border border-white/15 bg-[#0d9488] text-[12px] font-medium text-white transition-colors hover:bg-[#0f766e]"
          >
            {t('chat.redWalletTitle')}
          </button>
        )}
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-success animate-pulse' : 'bg-danger'}`} />
          <span className="text-[10px] font-mono text-text-disabled">
            {isConnected ? t('chat.connected') : t('chat.disconnected')}
          </span>
        </div>
      </div>
    </div>
  );
}
