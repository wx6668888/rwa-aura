'use client';

import React from 'react';
import { useChat, type ChatMessage, type ChatUser } from './chat-context';
import { ChatUserAvatarThumb } from './UserBadge';
import { useLocale } from '@/components/locale-provider';
import { useTranslation } from '@/lib/i18n';
import { chatHttpUrl } from '@/lib/chat-api';
import { chatAuthHeadersReady } from '@/lib/chat-auth-storage';
import { fetchWithTimeout } from '@/lib/fetch-with-timeout';

export default function RoomList(
  {
    closeMobileSidebar,
    onOpenWallet,
  }: { closeMobileSidebar?: () => void; onOpenWallet?: () => void } = {}
) {
  const OFFICIAL_SUPPORT_BOT_ADDRESS = '0xe28c687a9ae85d9145defc1d78961bd3567ffec7';
  const {
    rooms,
    activeRoomId,
    setActiveRoom,
    createGroupRoom,
    openDmByAddress,
    isAuthenticated,
    jumpToMessage,
    getAuthHeaders,
  } = useChat();
  const { locale } = useLocale();
  const { t } = useTranslation(locale);
  const [search, setSearch] = React.useState('');
  const [showNewGroup, setShowNewGroup] = React.useState(false);
  const [newName, setNewName] = React.useState('');
  const [newDesc, setNewDesc] = React.useState('');
  const [createErr, setCreateErr] = React.useState('');
  const [creating, setCreating] = React.useState(false);
  const [messageHits, setMessageHits] = React.useState<
    Array<{ message: ChatMessage; room: { id: string; name: string } }>
  >([]);
  const [msgSearchLoading, setMsgSearchLoading] = React.useState(false);

  const [userSearchResults, setUserSearchResults] = React.useState<ChatUser[]>([]);
  const [userSearchLoading, setUserSearchLoading] = React.useState(false);
  const [dmAdding, setDmAdding] = React.useState(false);
  const [dmAddError, setDmAddError] = React.useState('');
  const [dmPeerByRoomId, setDmPeerByRoomId] = React.useState<Record<string, ChatUser>>({});
  const [postCreateInvite, setPostCreateInvite] = React.useState<string | null>(null);

  const addressQuery = search.trim();
  const isAddressQuery =
    addressQuery.toLowerCase().startsWith('guest_') || /^0x[a-fA-F0-9]{6,40}$/.test(addressQuery);
  const shortAddr = React.useCallback((address: string) => {
    const a = (address || '').trim().toLowerCase();
    if (!a.startsWith('0x') || a.length < 12) return a || '—';
    return `${a.slice(0, 6)}…${a.slice(-4)}`;
  }, []);

  React.useEffect(() => {
    const q = search.trim();
    if (/^0x[a-fA-F0-9]{6,40}$/.test(q) || q.toLowerCase().startsWith('guest_')) {
      setMessageHits([]);
      return;
    }
    if (q.length < 2 || !isAuthenticated) {
      setMessageHits([]);
      return;
    }
    const headers = getAuthHeaders();
    if (!chatAuthHeadersReady(headers)) {
      setMessageHits([]);
      return;
    }
    const id = window.setTimeout(() => {
      void (async () => {
        setMsgSearchLoading(true);
        try {
          const res = await fetchWithTimeout(
            chatHttpUrl(`search/messages?q=${encodeURIComponent(q)}&limit=30`),
            { headers, timeoutMs: 22000 }
          );
          const data = await res.json().catch(() => ({}));
          setMessageHits(Array.isArray(data?.results) ? data.results : []);
        } catch {
          setMessageHits([]);
        } finally {
          setMsgSearchLoading(false);
        }
      })();
    }, 350);
    return () => clearTimeout(id);
  }, [search, isAuthenticated, getAuthHeaders]);

  React.useEffect(() => {
    const q = search.trim();
    const headers = getAuthHeaders();

    // Address mode: search user -> start DM
    if (q.length < 6 || !isAuthenticated || !isAddressQuery) {
      setUserSearchResults([]);
      setUserSearchLoading(false);
      return;
    }
    if (!chatAuthHeadersReady(headers)) {
      setUserSearchResults([]);
      return;
    }

    const id = window.setTimeout(() => {
      void (async () => {
        setDmAddError('');
        setUserSearchLoading(true);
        try {
          const res = await fetchWithTimeout(
            chatHttpUrl(`users/search?address=${encodeURIComponent(q)}&limit=5`),
            { headers, timeoutMs: 22000 }
          );
          const data = await res.json().catch(() => ({}));
          setUserSearchResults(Array.isArray(data?.users) ? data.users : []);
        } catch {
          setUserSearchResults([]);
        } finally {
          setUserSearchLoading(false);
        }
      })();
    }, 350);

    return () => clearTimeout(id);
  }, [search, isAuthenticated, isAddressQuery, getAuthHeaders]);

  const submitNewGroup = async () => {
    if (!newName.trim()) {
      setCreateErr(t('chat.newGroupError'));
      return;
    }
    setCreateErr('');
    setCreating(true);
    try {
      const room = await createGroupRoom(newName.trim(), newDesc.trim());
      setPostCreateInvite((room.inviteCode || '').trim() || null);
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
    if ((room as any).type === 'dm') {
      const peer = dmPeerByRoomId[room.id];
      if (peer?.address?.toLowerCase() === OFFICIAL_SUPPORT_BOT_ADDRESS) {
        return locale === 'en' ? 'Official Support' : '官方客服';
      }
      if (peer?.address) return shortAddr(peer.address);
    }
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

  React.useEffect(() => {
    if (!isAuthenticated) return;
    const dmRooms = rooms.filter((r) => r.type === 'dm');
    if (dmRooms.length === 0) return;
    const headers = getAuthHeaders();
    if (!chatAuthHeadersReady(headers)) return;
    const selfAddr = String(headers['x-wallet-address'] || '').toLowerCase();
    void (async () => {
      const entries = await Promise.all(
        dmRooms.map(async (room) => {
          try {
            const res = await fetchWithTimeout(chatHttpUrl(`rooms/${room.id}/members`), { headers, timeoutMs: 22000 });
            if (!res.ok) return null;
            const data = await res.json().catch(() => ({} as any));
            const members = Array.isArray(data?.members) ? (data.members as ChatUser[]) : [];
            const peer = members.find((m) => String(m.address || '').toLowerCase() !== selfAddr);
            if (!peer) return null;
            return [room.id, peer] as const;
          } catch {
            return null;
          }
        })
      );
      const next: Record<string, ChatUser> = {};
      for (const item of entries) {
        if (!item) continue;
        next[item[0]] = item[1];
      }
      setDmPeerByRoomId((prev) => ({ ...prev, ...next }));
    })();
  }, [rooms, isAuthenticated, getAuthHeaders]);

  const officialGeneralRoom = rooms.find((r) => r.id === 'room-general');
  const myRooms = rooms.filter((r) => {
    if (r.type === 'group') return true;
    if (r.type === 'dm') {
      const peer = dmPeerByRoomId[r.id];
      if (peer?.address?.toLowerCase() === OFFICIAL_SUPPORT_BOT_ADDRESS) return false;
      return true;
    }
    return false;
  });

  const qLow = search.trim().toLowerCase();
  const officialLabel = officialGeneralRoom ? getRoomDisplayName(officialGeneralRoom) : t('chat.roomGeneral');
  const showOfficialRow =
    isAuthenticated &&
    !isAddressQuery &&
    (!search.trim() || officialLabel.toLowerCase().includes(qLow));

  const filteredMyRooms = myRooms.filter((r) => {
    if (!search.trim() || isAddressQuery) return true;
    return getRoomDisplayName(r).toLowerCase().includes(qLow);
  });

  return (
    <div className="flex h-full min-h-0 flex-col bg-surface-1">
      <div className="px-3 pb-2 pt-3">
        <div className="relative">
          <svg
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-disabled"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder={t('chat.search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="chat-dapp-input w-full rounded-lg border border-border-subtle bg-surface-2 py-1.5 pl-8 pr-3 text-text-primary placeholder-text-disabled transition-all focus:border-plasma-cyan/30 focus:outline-none focus:ring-1 focus:ring-plasma-cyan/10"
          />
        </div>
        {isAuthenticated ? (
          <button
            type="button"
            onClick={() => {
              setCreateErr('');
              setPostCreateInvite(null);
              setShowNewGroup(true);
            }}
            className="mt-2 w-full rounded-lg border border-white/15 bg-[#0d9488] py-2 text-[12px] font-medium text-white transition-colors hover:bg-[#0f766e]"
          >
            + {t('chat.newGroup')}
          </button>
        ) : null}
      </div>

      {showNewGroup && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl border border-border-subtle bg-surface-1 p-4 shadow-2xl max-h-[85dvh] overflow-y-auto overscroll-contain">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-heading font-semibold text-text-primary">{t('chat.newGroupTitle')}</h3>
              <button
                type="button"
                onClick={() => {
                  setShowNewGroup(false);
                  setPostCreateInvite(null);
                }}
                className="text-[11px] text-text-secondary hover:text-text-primary"
              >
                {postCreateInvite ? t('chat.inviteClose') : t('chat.newGroupCancel')}
              </button>
            </div>
            {postCreateInvite ? (
              <div className="space-y-3">
                <p className="text-[12px] text-text-secondary leading-snug">{t('chat.groupCreatedInvite')}</p>
                <div className="flex items-center gap-2 rounded-lg border border-border-subtle bg-surface-2 px-3 py-2.5">
                  <code className="flex-1 min-w-0 text-[13px] font-mono text-plasma-cyan tracking-wide break-all">{postCreateInvite}</code>
                  <button
                    type="button"
                    className="shrink-0 text-[10px] font-mono px-2 py-1 rounded-md bg-[#0d9488] text-white border border-white/15"
                    onClick={() => void navigator.clipboard.writeText(postCreateInvite)}
                  >
                    {t('chat.inviteCopy')}
                  </button>
                </div>
                <button
                  type="button"
                  className="w-full text-[12px] font-medium py-2.5 rounded-lg bg-[#0d9488] text-white border border-white/15"
                  onClick={() => {
                    setShowNewGroup(false);
                    setPostCreateInvite(null);
                    closeMobileSidebar?.();
                  }}
                >
                  {t('chat.inviteDone')}
                </button>
              </div>
            ) : (
              <>
            <label className="block text-[10px] text-text-disabled mb-1 font-mono uppercase">{t('chat.newGroupName')}</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={t('chat.newGroupNamePh')}
              className="chat-dapp-input mb-3 w-full rounded-lg border border-border-subtle bg-surface-2 px-3 py-2 text-text-primary focus:border-plasma-cyan/30 focus:outline-none"
            />
            <label className="block text-[10px] text-text-disabled mb-1 font-mono uppercase">{t('chat.newGroupDesc')}</label>
            <textarea
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder={t('chat.newGroupDescPh')}
              rows={2}
              className="chat-dapp-input mb-3 w-full resize-none rounded-lg border border-border-subtle bg-surface-2 px-3 py-2 text-text-primary focus:border-plasma-cyan/30 focus:outline-none"
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
              </>
            )}
          </div>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/5">
        {showOfficialRow ? (
          <button
            type="button"
            onClick={() => {
              setActiveRoom('room-general');
              closeMobileSidebar?.();
            }}
            className={`group mb-1 flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-all duration-150 ${
              activeRoomId === 'room-general'
                ? 'bg-[#0f766e] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]'
                : 'text-text-secondary hover:bg-surface-2 hover:text-text-primary'
            }`}
          >
            <div
              className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-[13px] transition-all ${
                activeRoomId === 'room-general' ? '' : 'opacity-50 group-hover:opacity-80'
              }`}
              style={
                activeRoomId === 'room-general'
                  ? {
                      background: 'rgba(255,255,255,0.14)',
                      border: '1px solid rgba(255,255,255,0.28)',
                      color: '#fff',
                    }
                  : {
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border-subtle)',
                    }
              }
            >
              #
            </div>
            <div className="min-w-0 flex-1">
              <div
                className={`truncate text-[12px] font-medium leading-none ${
                  activeRoomId === 'room-general' ? 'text-white' : ''
                }`}
              >
                {officialLabel}
              </div>
            </div>
            {activeRoomId === 'room-general' ? <div className="h-4 w-1 shrink-0 rounded-full bg-white/90" /> : null}
          </button>
        ) : null}

        {!isAddressQuery && isAuthenticated ? (
          <>
            <div className="px-1 pb-1 pt-1 text-[10px] font-mono font-semibold uppercase tracking-[0.12em] text-text-disabled">
              {t('chat.sidebarMyGroups')}
            </div>
            {filteredMyRooms.map((room) => {
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
                  className={`group mb-[2px] flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-all duration-150 ${
                    isActive
                      ? 'bg-[#0f766e] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]'
                      : 'text-text-secondary hover:bg-surface-2 hover:text-text-primary'
                  }`}
                >
                  <div
                    className={`flex h-7 w-7 flex-shrink-0 items-center justify-center text-[13px] transition-all ${
                      isActive ? '' : 'opacity-50 group-hover:opacity-80'
                    }`}
                    style={
                      isActive
                        ? {
                            background: 'rgba(255,255,255,0.14)',
                            border: '1px solid rgba(255,255,255,0.28)',
                            color: '#fff',
                          }
                        : {
                            background: 'var(--surface-2)',
                            border: '1px solid var(--border-subtle)',
                          }
                    }
                  >
                    {room.type === 'dm' ? (
                      dmPeerByRoomId[room.id]?.address ? (
                        <ChatUserAvatarThumb
                          user={dmPeerByRoomId[room.id]!}
                          size={28}
                          roundedClassName="rounded-md"
                          className="bg-transparent"
                        />
                      ) : (
                        <span>{room.icon || '💬'}</span>
                      )
                    ) : (
                      room.icon || '#'
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className={`truncate text-[12px] font-medium leading-none ${isActive ? 'text-white' : ''}`}>
                      {displayName}
                    </div>
                    {room.type === 'dm' && dmPeerByRoomId[room.id]?.address ? (
                      <div
                        className={`mt-1 font-mono text-[9px] ${isActive ? 'text-white/65' : 'text-text-disabled'}`}
                      >
                        {shortAddr(dmPeerByRoomId[room.id]!.address)}
                      </div>
                    ) : null}
                  </div>
                  {isActive ? <div className="h-4 w-1 shrink-0 rounded-full bg-white/90" /> : null}
                </button>
              );
            })}
          </>
        ) : null}

        {!isAddressQuery && search.trim().length >= 2 && isAuthenticated && (
          <div className="mt-3 border-t border-border-subtle/80 pt-2 px-1">
            <div className="text-[10px] font-mono font-semibold text-text-disabled uppercase tracking-[0.12em] mb-1.5">
              {t('chat.searchMessagesLabel')}
            </div>
            {msgSearchLoading && (
              <p className="text-[10px] text-text-disabled font-mono px-1 py-1">…</p>
            )}
            {!msgSearchLoading && messageHits.length === 0 && (
              <p className="text-[10px] text-text-disabled px-1 py-0.5">{t('chat.searchNoResults')}</p>
            )}
            {!msgSearchLoading &&
              messageHits.map(({ message: m, room: r }) => {
                const preview =
                  m.type === 'image' ? `[${t('chat.imageSoon')}]` : (m.content || '').replace(/\s+/g, ' ').trim();
                const short = preview.length > 72 ? `${preview.slice(0, 72)}…` : preview;
                const roomLabel =
                  r.id === 'room-general'
                    ? t('chat.roomGeneral')
                    : r.id === 'room-announcements'
                      ? t('chat.roomAnnouncements')
                      : r.id === 'room-staking'
                        ? t('chat.roomStaking')
                        : r.id === 'room-trading'
                          ? t('chat.roomTrading')
                          : r.id === 'room-vip'
                            ? t('chat.roomVip')
                            : stripRoomPrefix(r.name || r.id);
                return (
                  <button
                    key={`${m.roomId}-${m.id}`}
                    type="button"
                    onClick={() => {
                      void jumpToMessage(m.roomId, m.id);
                      closeMobileSidebar?.();
                    }}
                    className="w-full text-left rounded-lg px-2 py-1.5 mb-1 hover:bg-surface-2 transition-colors"
                  >
                    <div className="text-[10px] font-mono text-plasma-cyan/90 truncate"># {roomLabel}</div>
                    <div className="text-[11px] text-text-secondary line-clamp-2 mt-0.5">{short}</div>
                  </button>
                );
              })}
          </div>
        )}

        {isAddressQuery && isAuthenticated && (
          <div className="mt-3 border-t border-border-subtle/80 pt-2 px-1">
            <div className="text-[10px] font-mono font-semibold text-text-disabled uppercase tracking-[0.12em] mb-1.5">
              Users
            </div>
            {userSearchLoading && <p className="text-[10px] text-text-disabled font-mono px-1 py-1">…</p>}
            {!userSearchLoading && userSearchResults.length === 0 && search.trim().length >= 6 && (
              <p className="text-[10px] text-text-disabled px-1 py-0.5">No user found</p>
            )}
            {dmAddError && <p className="text-[11px] text-danger mt-2 mb-0.5 px-1">{dmAddError}</p>}
            {!userSearchLoading && userSearchResults.length > 0 && (
              <div className="flex flex-col gap-1.5 mt-2 px-1 pb-1">
                {userSearchResults.map((u) => (
                  <div key={u.id} className="flex items-center gap-2.5">
                    <ChatUserAvatarThumb user={u} size={28} />
                    <div className="min-w-0 flex-1">
                      <div className="text-[12px] font-medium truncate">{u.nickname || u.address}</div>
                      <div className="text-[10px] font-mono text-text-disabled truncate">{u.address}</div>
                    </div>
                    <button
                      type="button"
                      disabled={dmAdding}
                      onClick={async () => {
                        setDmAddError('');
                        setDmAdding(true);
                        try {
                          await openDmByAddress(u.address);
                          closeMobileSidebar?.();
                        } catch (e: unknown) {
                          setDmAddError(e instanceof Error ? e.message : 'Failed to open DM');
                        } finally {
                          setDmAdding(false);
                        }
                      }}
                      className="text-[10px] font-mono px-2 py-1 rounded-md bg-[#0d9488] text-white border border-white/15 hover:bg-[#0f766e] transition-colors shrink-0 disabled:opacity-50"
                    >
                      发起私聊
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {isAddressQuery && !isAuthenticated && search.trim().length >= 6 && (
          <p className="mt-2 px-1 text-[10px] text-text-disabled">{t('chat.searchLoginHint')}</p>
        )}
      </div>

      <div className="shrink-0 border-t border-border-subtle px-3 py-3">
        {isAuthenticated ? (
          <button
            type="button"
            onClick={() => onOpenWallet?.()}
            className="h-9 w-full rounded-lg border border-white/15 bg-[#0d9488] text-[12px] font-medium text-white transition-colors hover:bg-[#0f766e]"
          >
            {t('chat.redWalletTitle')}
          </button>
        ) : null}
      </div>
    </div>
  );
}
