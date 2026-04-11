'use client';

import React, { useRef, useEffect, useMemo } from 'react';
import { useChat, ChatMessage } from './chat-context';
import { MessageGroup, DateSeparator } from './MessageBubble';
import ChatInput from './ChatInput';
import { ChatToast, useToast } from './ChatToast';
import { useLocale } from '@/components/locale-provider';
import { useTranslation } from '@/lib/i18n';
import { getBaseDisplayedMemberCount } from '@/lib/chat-member-display';
import { chatHttpUrl } from '@/lib/chat-api';
import { chatAuthHeadersReady } from '@/lib/chat-auth-storage';
import { ChatMembersModal } from './ChatMembersModal';

/** Group consecutive messages from same user within 5 minutes */
function groupMessages(messages: ChatMessage[]): { type: 'messages' | 'date'; data: any }[] {
  const result: { type: 'messages' | 'date'; data: any }[] = [];
  let currentGroup: ChatMessage[] = [];
  let lastDate = '';

  messages.forEach((msg) => {
    const msgDate = new Date(msg.timestamp).toDateString();

    // Date separator
    if (msgDate !== lastDate) {
      if (currentGroup.length) {
        result.push({ type: 'messages', data: [...currentGroup] });
        currentGroup = [];
      }
      result.push({ type: 'date', data: msg.timestamp });
      lastDate = msgDate;
    }

    // Group by user + 5min window
    const lastMsg = currentGroup[currentGroup.length - 1];
    if (lastMsg && lastMsg.userId === msg.userId && msg.timestamp - lastMsg.timestamp < 5 * 60 * 1000) {
      currentGroup.push(msg);
    } else {
      if (currentGroup.length) {
        result.push({ type: 'messages', data: [...currentGroup] });
      }
      currentGroup = [msg];
    }
  });

  if (currentGroup.length) {
    result.push({ type: 'messages', data: [...currentGroup] });
  }

  return result;
}

export default function ChatRoom() {
  const OFFICIAL_SUPPORT_BOT_ADDRESS = '0xe28c687a9ae85d9145defc1d78961bd3567ffec7';
  const {
    messages,
    activeRoomId,
    rooms,
    currentUser,
    typingUsers,
    isAuthenticated,
    loadMoreMessages,
    getAuthHeaders,
    jumpTargetMessageId,
    clearJumpTarget,
  } = useChat();
  const { locale } = useLocale();
  const { t } = useTranslation(locale);
  const scrollRef = useRef<HTMLDivElement>(null);
  const skipAutoScrollBottomRef = useRef(false);
  const activeRoom = rooms.find((r) => r.id === activeRoomId);
  const grouped = useMemo(() => groupMessages(messages), [messages]);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const { toasts, addToast, removeToast } = useToast();
  const [memberModalOpen, setMemberModalOpen] = React.useState(false);
  const [mentionText, setMentionText] = React.useState('');
  const baseMemberDisplay = useMemo(
    () => getBaseDisplayedMemberCount(activeRoom),
    [activeRoom?.id, activeRoom?.memberIds?.length]
  );
  const [memberDisplayBump, setMemberDisplayBump] = React.useState(0);
  const [activeDmPeer, setActiveDmPeer] = React.useState<null | { nickname: string; address: string; avatar?: string }>(null);

  React.useEffect(() => {
    setMemberDisplayBump(0);
  }, [activeRoomId]);

  React.useEffect(() => {
    if (!activeRoomId || !isAuthenticated) return;
    const tick = () => {
      setMemberDisplayBump((b) => b + Math.floor(Math.random() * 5) + 1);
    };
    const id = window.setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [activeRoomId, isAuthenticated]);

  const displayedMemberCount = baseMemberDisplay + memberDisplayBump;

  const shortAddr = React.useCallback((address: string) => {
    const a = (address || '').trim().toLowerCase();
    if (!a.startsWith('0x') || a.length < 12) return a || '—';
    return `${a.slice(0, 6)}…${a.slice(-4)}`;
  }, []);

  React.useEffect(() => {
    setActiveDmPeer(null);
    if (!activeRoomId || !activeRoom || activeRoom.type !== 'dm' || !currentUser?.id) return;
    const headers = getAuthHeaders();
    if (!chatAuthHeadersReady(headers)) return;
    const selfAddr = String(headers['x-wallet-address'] || '').toLowerCase();
    void (async () => {
      try {
        const res = await fetch(chatHttpUrl(`rooms/${activeRoomId}/members`), { headers });
        if (!res.ok) return;
        const data = await res.json().catch(() => ({} as any));
        const members = Array.isArray(data?.members) ? data.members : [];
        const peer = members.find((m: any) => String(m?.address || '').toLowerCase() !== selfAddr);
        if (!peer) return;
        setActiveDmPeer({
          nickname: String(peer.nickname || '').trim(),
          address: String(peer.address || '').trim().toLowerCase(),
          avatar: typeof peer.avatar === 'string' ? peer.avatar : undefined,
        });
      } catch {}
    })();
  }, [activeRoomId, activeRoom, currentUser?.id, getAuthHeaders]);

  const getRoomDisplayName = (room: typeof activeRoom) => {
    if (!room) return '';
    if (room.type === 'dm') {
      if (activeDmPeer?.address === OFFICIAL_SUPPORT_BOT_ADDRESS) {
        return locale === 'en' ? 'Official Support' : '官方客服';
      }
      if (activeDmPeer?.address) return shortAddr(activeDmPeer.address);
      return room.name || 'DM';
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
        return (room.name || '').replace(/^[\p{Emoji}\s]+/u, '');
    }
  };

  const getRoomDisplayDescription = (room: typeof activeRoom) => {
    if (!room) return '';
    if (room.type === 'dm') {
      if (activeDmPeer?.address === OFFICIAL_SUPPORT_BOT_ADDRESS) {
        return locale === 'en' ? 'Direct private chat with official assistant' : '与官方助手一对一私聊';
      }
      return activeDmPeer?.nickname || activeDmPeer?.address || (locale === 'en' ? 'Direct Message' : '私聊');
    }
    switch (room.id) {
      case 'room-general':
        return t('chat.roomGeneralDesc');
      case 'room-announcements':
        return t('chat.roomAnnouncementsDesc');
      case 'room-staking':
        return t('chat.roomStakingDesc');
      case 'room-trading':
        return t('chat.roomTradingDesc');
      case 'room-vip':
        return t('chat.roomVipDesc');
      default:
        return room.description || '';
    }
  };

  /** 仅在新消息追加时滚到底；加载历史（prepend）时跳过，避免与保持视口冲突导致整页抖动 */
  useEffect(() => {
    if (jumpTargetMessageId) {
      return;
    }
    if (skipAutoScrollBottomRef.current) {
      skipAutoScrollBottomRef.current = false;
      return;
    }
    const el = scrollRef.current;
    if (el) {
      // 只有当用户“本来就在底部附近”时才自动滚到底
      // 否则用户可能正在看更早消息，强制滚到底会造成“像刷新/跳动”的错觉。
      const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      const nearBottomThresholdPx = 160;
      if (distFromBottom <= nearBottomThresholdPx) {
        el.scrollTop = el.scrollHeight;
      }
    }
  }, [messages, jumpTargetMessageId]);

  /** 从搜索结果跳转：滚动到目标消息 */
  useEffect(() => {
    if (!jumpTargetMessageId) return;
    const id = window.setTimeout(() => {
      const el = document.querySelector(`[data-message-id="${jumpTargetMessageId}"]`);
      el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      clearJumpTarget();
    }, 120);
    return () => clearTimeout(id);
  }, [messages, jumpTargetMessageId, clearJumpTarget]);

  // 滚动到顶部触发加载更多
  const handleScroll = React.useCallback(async () => {
    const el = scrollRef.current;
    if (!el) return;

    if (loadingMore) return;
    if (el.scrollTop < 60) {
      setLoadingMore(true);
      const prevHeight = el.scrollHeight;
      skipAutoScrollBottomRef.current = true;
      await loadMoreMessages();
      requestAnimationFrame(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight - prevHeight;
        }
      });
      setLoadingMore(false);
    }
  }, [loadingMore, loadMoreMessages]);

  if (!isAuthenticated) {
    return (
      <div className="flex-1 flex items-center justify-center bg-void-black">
        <div className="text-center max-w-xs">
          <div className="w-16 h-16 mx-auto mb-5 rounded-2xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #00f5d415, #8b5cf615)', border: '1px solid #00f5d420' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#00f5d4" strokeWidth="1.5">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <h3 className="text-lg font-heading font-bold text-text-primary mb-2">{t('chat.connectWalletTitle')}</h3>
          <p className="text-[12px] text-text-secondary leading-relaxed mb-1">
            {t('chat.connectWalletHint')}
          </p>
          <p className="text-[11px] text-text-disabled">{t('chat.noGasFees')}</p>
        </div>
      </div>
    );
  }

  if (!activeRoom) {
    return (
      <div className="flex-1 flex items-center justify-center bg-void-black">
        <div className="text-center">
          <div className="text-[11px] text-text-disabled font-mono">{t('chat.selectChannel')}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-void-black">
      {/* Channel header */}
      <div className="h-12 px-4 flex items-center justify-between border-b border-border-subtle bg-surface-1/50 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <span className="text-text-disabled font-mono text-lg">#</span>
          <div>
            <h3 className="text-[13px] font-heading font-semibold text-text-primary leading-none">
              {getRoomDisplayName(activeRoom)}
            </h3>
            <p className="text-[10px] text-text-disabled mt-0.5 leading-none truncate max-w-[200px]">
              {getRoomDisplayDescription(activeRoom)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMemberModalOpen(true)}
            className="flex items-center gap-1.5 text-[10px] text-text-disabled font-mono hover:text-text-secondary transition-colors rounded-md px-1 -mr-1 py-0.5 hover:bg-surface-2/80"
            aria-label={t('chat.memberListOpenAria')}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            {displayedMemberCount.toLocaleString(
              locale === 'zh' ? 'zh-CN' : locale === 'ko' ? 'ko-KR' : 'en-US'
            )}
          </button>

          <button type="button" className="w-7 h-7 rounded-md hover:bg-surface-2 flex items-center justify-center text-text-disabled hover:text-text-secondary transition-colors" aria-hidden>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Messages area */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto overscroll-y-contain scrollbar-thin scrollbar-thumb-white/5 scrollbar-track-transparent min-h-0 touch-pan-y"
      >
        {/* 加载更多指示 */}
        {loadingMore && (
          <div className="flex justify-center py-3">
            <div className="w-4 h-4 border-2 border-plasma-cyan/30 border-t-plasma-cyan rounded-full animate-spin" />
          </div>
        )}
        {/* Welcome banner */}
        {messages.length === 0 && (
          <div className="px-4 pt-8 pb-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3 text-2xl"
              style={{ background: 'linear-gradient(135deg, #00f5d415, #8b5cf615)', border: '1px solid #00f5d420' }}>
              #
            </div>
            <h2 className="text-xl font-heading font-bold text-text-primary mb-1">
              {t('chat.welcomeTo', {
                channel: getRoomDisplayName(activeRoom),
              })}
            </h2>
            <p className="text-[12px] text-text-secondary">
              {t('chat.startOfConversation', { description: getRoomDisplayDescription(activeRoom) || '—' })}
            </p>
          </div>
        )}

        {/* Message groups */}
        <div className="pb-2">
          {grouped.map((item, i) => {
            if (item.type === 'date') {
              return <DateSeparator key={`date-${i}`} timestamp={item.data} />;
            }
            const msgs = item.data as ChatMessage[];
            return (
              <MessageGroup
                key={msgs[0].id}
                messages={msgs}
                isOwn={msgs[0].userId === currentUser?.id}
                onToast={addToast}
                onMentionUser={(u) => {
                  const target = (u.nickname || '').trim();
                  if (!target) return;
                  setMentionText(`@${target}`);
                }}
              />
            );
          })}
        </div>

        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <div className="flex items-center gap-2 px-4 pb-2">
            <div className="flex gap-[3px]">
              {[0, 1, 2].map((i) => (
                <div key={i} className="w-[5px] h-[5px] rounded-full bg-plasma-cyan/60 animate-bounce"
                  style={{ animationDelay: `${i * 150}ms`, animationDuration: '1s' }} />
              ))}
            </div>
            <span className="text-[10px] text-text-disabled font-mono">{t('chat.typing')}</span>
          </div>
        )}
      </div>

      <div className="flex flex-shrink-0 flex-col border-t border-border-subtle/60 bg-void-black/95 backdrop-blur-sm">
        <ChatInput
          onToast={addToast}
          channelName={getRoomDisplayName(activeRoom)}
          mentionText={mentionText}
          onMentionConsumed={() => setMentionText('')}
        />
      </div>
      <ChatToast toasts={toasts} onRemove={removeToast} />

      {activeRoom && (
        <ChatMembersModal
          open={memberModalOpen}
          onClose={() => setMemberModalOpen(false)}
          roomId={activeRoom.id}
          selfId={currentUser?.id}
          getAuthHeaders={getAuthHeaders}
          title={t('chat.memberListTitle', { channel: getRoomDisplayName(activeRoom) })}
          labels={{
            loading: t('chat.memberListLoading'),
            empty: t('chat.memberListEmpty'),
            you: t('chat.memberListYou'),
            hint: t('chat.memberListHint'),
            close: t('chat.memberListClose'),
          }}
        />
      )}
    </div>
  );
}
