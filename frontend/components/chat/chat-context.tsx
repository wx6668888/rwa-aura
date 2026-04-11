'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAccount } from 'wagmi';
import { io, Socket } from 'socket.io-client';
import { chatHttpUrl, chatSocketUrl, fetchChatAuthSigningMessage } from '@/lib/chat-api';
import { fetchWithTimeout } from '@/lib/fetch-with-timeout';
import {
  readPersistedChatAuth,
  writePersistedChatAuth,
  clearPersistedChatAuth,
} from '@/lib/chat-auth-storage';

// ─── Types ─────────────────────────────────────────────
export type NodeLevel = 'L1' | 'L2' | 'L3' | 'L4' | 'L5' | 'L6' | 'L7' | 'L8' | 'L9';
export type ChatCurrency = 'USDT' | 'RWA';

export interface ChatUser {
  id: string;
  address: string;
  nickname: string;
  avatar?: string;
  nodeLevel: NodeLevel;
  isBot: boolean;
  isAdmin: boolean;
  isOnline: boolean;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  userId: string;
  content: string;
  type: 'text' | 'image' | 'system' | 'chain-event' | 'redpacket';
  replyTo?: string;
  timestamp: number;
  edited: boolean;
  metadata?: {
    redPacketId?: string;
    totalAmount?: number;
    remainingAmount?: number;
    totalCount?: number;
    remainingCount?: number;
    status?: 'active' | 'finished' | 'expired' | 'refunded';
    expiresAt?: number;
    refundedAmount?: number;
    greeting?: string;
    senderId?: string;
    claimRecords?: Array<{
      userId: string;
      nickname: string;
      amount: number;
      claimedAt: number;
    }>;
    quickLink?: { path: string; label?: string };
  };
  user: ChatUser;
}

export interface ChatRoom {
  id: string;
  name: string;
  description: string;
  type: 'group' | 'channel' | 'dm';
  icon?: string;
  memberIds: string[];
  isPublic: boolean;
}

interface ChatContextType {
  // State
  isConnected: boolean;
  isAuthenticated: boolean;
  isAuthRestoring: boolean;
  currentUser: ChatUser | null;
  rooms: ChatRoom[];
  activeRoomId: string | null;
  messages: ChatMessage[];
  typingUsers: string[];
  lastActionError: string | null;
  walletAddress: string;
  walletEscrow: Record<ChatCurrency, number>;
  walletWithdrawn: Record<ChatCurrency, number>;
  walletLoading: boolean;

  // Actions
  login: (address: string, signer: any) => Promise<void>;
  /** 已持有会话令牌或签名时建立会话（令牌有效期内无需再调钱包签名） */
  establishSession: (address: string, creds: { signature?: string; sessionToken?: string }) => Promise<void>;
  logout: () => void;
  setActiveRoom: (roomId: string) => void;
  sendMessage: (
    content: string,
    replyTo?: string,
    messageType?: 'text' | 'image',
    opts?: { metadata?: Record<string, unknown> }
  ) => void;
  /** 发送带站内链接的卡片消息，成功后当前页跳转到 path */
  sendQuickLink: (path: string, label: string) => void;
  /** 相册图片上传 → 返回同源路径（如 /api/chat/uploads/xxx），失败返回 null */
  uploadChatImage: (file: File) => Promise<string | null>;
  createRedPacket: (
    totalAmount: number,
    totalCount: number,
    greeting: string | undefined,
    currency: 'USDT' | 'RWA'
  ) => void;
  claimRedPacket: (packetId: string) => Promise<number | null>;
  getRedPacketRecords: (packetId: string) => Promise<Array<{ userId: string; nickname: string; amount: number; claimedAt: number }>>;
  sendTyping: () => void;
  loadMoreMessages: () => void;
  /** 从搜索结果跳转到某条消息所在上下文 */
  jumpToMessage: (roomId: string, messageId: string) => Promise<void>;
  jumpTargetMessageId: string | null;
  clearJumpTarget: () => void;
  getAuthHeaders: () => Record<string, string>;
  clearActionError: () => void;
  createGroupRoom: (name: string, description: string) => Promise<ChatRoom>;
  /** 按地址创建/打开 1v1 私聊（返回房间，且会切换到该房间） */
  openDmByAddress: (peerAddress: string) => Promise<ChatRoom | null>;
  fetchWalletBalances: () => Promise<void>;
  withdrawWallet: (currency: ChatCurrency, amount: number) => Promise<{ txHash: string }>;
  updateMyNickname: (nickname: string) => Promise<ChatUser>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { address: wagmiAddress, isConnected: wagmiConnected } = useAccount();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthRestoring, setIsAuthRestoring] = useState(true);
  const [currentUser, setCurrentUser] = useState<ChatUser | null>(null);
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [lastActionError, setLastActionError] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState('');
  const [walletEscrow, setWalletEscrow] = useState<Record<ChatCurrency, number>>({ USDT: 0, RWA: 0 });
  const [walletWithdrawn, setWalletWithdrawn] = useState<Record<ChatCurrency, number>>({ USDT: 0, RWA: 0 });
  const [walletLoading, setWalletLoading] = useState(false);
  const [jumpTargetMessageId, setJumpTargetMessageId] = useState<string | null>(null);
  const signatureRef = useRef<string>('');
  const sessionTokenRef = useRef<string>('');
  const addressRef = useRef<string>('');
  const socketRef = useRef<Socket | null>(null);
  const activeRoomIdRef = useRef<string | null>(null);
  const lastManualReconnectAttemptRef = useRef(0);
  const reconnectSyncTimerRef = useRef<number | null>(null);
  const lastSocketConnectAtRef = useRef(0);
  const lastMessagesReloadAtRef = useRef(0);
  const currentUserRef = useRef<ChatUser | null>(null);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  useEffect(() => {
    socketRef.current = socket;
  }, [socket]);

  useEffect(() => {
    activeRoomIdRef.current = activeRoomId;
  }, [activeRoomId]);

  const authHeadersFromRefs = () => {
    const headers: Record<string, string> = {};
    if (!addressRef.current) return headers;
    headers['x-wallet-address'] = addressRef.current;
    if (sessionTokenRef.current) headers['x-chat-session'] = sessionTokenRef.current;
    else if (signatureRef.current) headers['x-wallet-signature'] = signatureRef.current;
    return headers;
  };

  // ─── Load rooms ────────────────────────────────────
  const loadRooms = useCallback(async () => {
    try {
      const headers = authHeadersFromRefs();
      const res = await fetchWithTimeout(chatHttpUrl('rooms'), { timeoutMs: 22000, headers });
      const data = await res.json();
      const incoming = Array.isArray(data?.rooms) ? data.rooms : [];
      setRooms((prev) => {
        const activeId = activeRoomIdRef.current;
        if (!activeId) return incoming;
        const hasActive = incoming.some((r: any) => r?.id === activeId);
        if (hasActive) return incoming;
        const prevActive = prev.find((r) => r.id === activeId);
        return prevActive ? [prevActive, ...incoming] : incoming;
      });
    } catch (err) {
      console.error('Failed to load rooms:', err);
    }
  }, []);

  // ─── Load messages ─────────────────────────────────
  const loadMessages = useCallback(async (roomId: string) => {
    try {
      // 后端 messages 接口需要 x-wallet-*（否则会 401，导致 messages 被置空，看起来像聊天记录被清空）
      const headers = authHeadersFromRefs();

      const res = await fetchWithTimeout(chatHttpUrl(`rooms/${roomId}/messages?limit=50`), {
        timeoutMs: 22000,
        headers,
      })
      const data = await res.json();
      setMessages(data.messages || []);
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  }, []);

  const ensureSocketReady = useCallback((s: Socket | null): boolean => {
    if (!s) {
      setLastActionError('聊天连接不可用，请刷新页面后重试');
      return false;
    }
    if (s.connected) return true;
    setLastActionError('正在重连聊天服务，请稍后重试');
    const now = Date.now();
    if (now - lastManualReconnectAttemptRef.current < 1200) {
      return false;
    }
    lastManualReconnectAttemptRef.current = now;
    try {
      s.connect();
    } catch {
      // no-op: keep friendly error message above
    }
    return false;
  }, []);

  const saveAuth = useCallback(
    (auth: { address: string; signature?: string; sessionToken?: string }) => {
      const prev = readPersistedChatAuth();
      const next = {
        address: auth.address,
        signature: auth.signature !== undefined ? auth.signature : prev?.signature,
        sessionToken: auth.sessionToken !== undefined ? auth.sessionToken : prev?.sessionToken,
      };
      if (!next.signature && !next.sessionToken) return;
      writePersistedChatAuth(next);
    },
    []
  );

  const clearSavedAuth = useCallback(() => {
    clearPersistedChatAuth();
  }, []);

  const connectWithCredentials = useCallback(
    async (address: string, creds: { signature?: string; sessionToken?: string }, persist: boolean) => {
      try {
        const addr = (address ?? '').trim();
        if (!addr) {
          throw new Error('缺少钱包地址');
        }
        const isGuest = addr.toLowerCase().startsWith('guest_');
        const stIn = typeof creds.sessionToken === 'string' ? creds.sessionToken.trim() : '';
        const sigIn = typeof creds.signature === 'string' ? creds.signature.trim() : '';

        if (!isGuest) {
          if (!stIn && (!sigIn || !sigIn.startsWith('0x'))) {
            throw new Error('签名无效或已损坏，请重新连接钱包登录');
          }
        } else if (!stIn && sigIn !== 'guest') {
          throw new Error('访客登录参数无效');
        }

        const sameAddr = addressRef.current.toLowerCase() === addr.toLowerCase();
        const tokenMatch = !!stIn && sessionTokenRef.current === stIn;
        const sigGuestMatch =
          isGuest && !stIn && !sessionTokenRef.current && sigIn === 'guest' && signatureRef.current === 'guest';
        const sigWalletMatch =
          !isGuest &&
          !stIn &&
          !sessionTokenRef.current &&
          !!sigIn &&
          signatureRef.current === sigIn;
        const alreadySession =
          sameAddr &&
          (tokenMatch || sigGuestMatch || sigWalletMatch) &&
          socketRef.current?.connected &&
          currentUserRef.current;
        if (alreadySession) {
          if (persist) {
            const prev = readPersistedChatAuth();
            saveAuth({
              address: addr,
              signature: sigIn.startsWith('0x') ? sigIn : prev?.signature,
              sessionToken: sessionTokenRef.current || stIn || prev?.sessionToken,
            });
          }
          return;
        }

        socketRef.current?.disconnect();
        setSocket(null);
        setIsConnected(false);

        addressRef.current = addr;

        const loginBody: Record<string, string> = { address: addr };
        if (stIn) loginBody.sessionToken = stIn;
        else loginBody.signature = sigIn;

        let loginRes: Response;
        try {
          loginRes = await fetchWithTimeout(chatHttpUrl('auth/login'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(loginBody),
            timeoutMs: 22000,
          });
        } catch (e: unknown) {
          const name = e instanceof Error ? e.name : '';
          if (name === 'AbortError') {
            throw new Error('连接聊天服务超时，请检查网络或关闭 VPN 后重试。');
          }
          throw e;
        }
        if (!loginRes.ok) {
          const err = await loginRes.json().catch(() => ({ error: 'Login failed' }));
          if (loginRes.status === 401) {
            clearSavedAuth();
          }
          throw new Error(err?.error || 'Login failed');
        }
        const data = await loginRes.json();
        const user = data.user;
        const nextTok = typeof data.sessionToken === 'string' ? data.sessionToken : stIn;
        sessionTokenRef.current = nextTok && nextTok.length > 8 ? nextTok : '';
        if (isGuest) {
          signatureRef.current = sessionTokenRef.current ? '' : 'guest';
        } else {
          signatureRef.current = sigIn.startsWith('0x') ? sigIn : sessionTokenRef.current ? '' : '';
        }

        setCurrentUser(user);
        setIsAuthenticated(true);
        if (persist) {
          const prev = readPersistedChatAuth();
          saveAuth({
            address: addr,
            signature: sigIn.startsWith('0x') ? sigIn : prev?.address?.toLowerCase() === addr.toLowerCase() ? prev?.signature : undefined,
            sessionToken: sessionTokenRef.current || undefined,
          });
        }

        const wsAuth: Record<string, string> = { address: addr };
        if (sessionTokenRef.current) wsAuth.sessionToken = sessionTokenRef.current;
        else wsAuth.signature = signatureRef.current || sigIn;

        const s = io(chatSocketUrl(), {
          path: '/chat-ws',
          auth: wsAuth,
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionAttempts: Infinity,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 8000,
        });

      s.on('connect', () => {
        setIsConnected(true);
        console.log('[Chat] WebSocket connected');
        const now = Date.now();
        const reconnectBurst = now - lastSocketConnectAtRef.current < 2500;
        lastSocketConnectAtRef.current = now;
        if (reconnectSyncTimerRef.current) {
          window.clearTimeout(reconnectSyncTimerRef.current);
        }
        reconnectSyncTimerRef.current = window.setTimeout(() => {
          const currentRoomId = activeRoomIdRef.current;
          if (!currentRoomId) return;
          s.emit('room:join', currentRoomId, (ok: boolean) => {
            if (!ok) return;
            const ts = Date.now();
            if (ts - lastMessagesReloadAtRef.current < 2500) return;
            lastMessagesReloadAtRef.current = ts;
            void loadMessages(currentRoomId);
          });
        }, reconnectBurst ? 1200 : 180);
      });

      s.on('disconnect', () => {
        setIsConnected(false);
        console.log('[Chat] WebSocket disconnected');
      });

      s.on('message:new', (msg: ChatMessage) => {
        if (activeRoomIdRef.current && msg.roomId !== activeRoomIdRef.current) return;
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      });

      s.on('message:edit', (msg: Partial<ChatMessage> & { id: string }) => {
        if (activeRoomIdRef.current && msg.roomId && msg.roomId !== activeRoomIdRef.current) return;
        setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, ...msg } as ChatMessage : m)));
      });

      s.on('user:typing', (userId: string, roomId: string) => {
        if (activeRoomIdRef.current && roomId && roomId !== activeRoomIdRef.current) return;
        setTypingUsers((prev) => {
          if (prev.includes(userId)) return prev;
          const next = [...prev, userId];
          setTimeout(() => {
            setTypingUsers((p) => p.filter((id) => id !== userId));
          }, 3000);
          return next;
        });
      });

      setSocket(s);
      await loadRooms();
      if (s && !s.connected) {
        s.connect();
      }
    } catch (err) {
      console.error('Login failed:', err);
      throw err;
    }
  }, [loadRooms, saveAuth, clearSavedAuth]);

  // ─── Login with wallet ─────────────────────────────
  const login = useCallback(
    async (address: string, signer: any) => {
      const addr = (address ?? '').trim();
      let signature = '';
      if (signer) {
        const cached = readPersistedChatAuth();
        if (cached && cached.address.toLowerCase() === addr.toLowerCase()) {
          if (cached.sessionToken && cached.sessionToken.length > 8) {
            await connectWithCredentials(
              cached.address,
              { sessionToken: cached.sessionToken, signature: cached.signature },
              true
            );
            return;
          }
          if (cached.signature?.startsWith('0x')) {
            await connectWithCredentials(cached.address, { signature: cached.signature }, true);
            return;
          }
        }
        const message = await fetchChatAuthSigningMessage();
        signature = await signer.signMessage(message);
        if (typeof signature !== 'string' || !signature.startsWith('0x')) {
          throw new Error('钱包未返回有效签名，请换浏览器或暂时关闭冲突的扩展后重试。');
        }
      } else {
        signature = 'guest';
      }
      await connectWithCredentials(addr, { signature }, true);
    },
    [connectWithCredentials]
  );

  const establishSession = useCallback(
    async (address: string, creds: { signature?: string; sessionToken?: string }) => {
      await connectWithCredentials(address, creds, true);
    },
    [connectWithCredentials]
  );

  // ─── Logout ────────────────────────────────────────
  const logout = useCallback(() => {
    if (reconnectSyncTimerRef.current) {
      window.clearTimeout(reconnectSyncTimerRef.current);
      reconnectSyncTimerRef.current = null;
    }
    socketRef.current?.disconnect();
    setSocket(null);
    setIsConnected(false);
    setIsAuthenticated(false);
    setCurrentUser(null);
    setMessages([]);
    setRooms([]);
    setActiveRoomId(null);
    signatureRef.current = '';
    sessionTokenRef.current = '';
    addressRef.current = '';
    clearSavedAuth();
  }, [clearSavedAuth]);

  // ─── Set active room ──────────────────────────────
  const setActiveRoom = useCallback((roomId: string) => {
    activeRoomIdRef.current = roomId;
    setActiveRoomId(roomId);
    if (socket) {
      // 先 join 再拉取，避免 membership 尚未写入导致 REST 拉不到消息
      socket.emit('room:join', roomId, (ok: boolean) => {
        if (ok) void loadMessages(roomId);
      });
    } else {
      void loadMessages(roomId);
    }
  }, [socket, loadMessages]);

  // ─── Send message ─────────────────────────────────
  const sendMessage = useCallback(
    (
      content: string,
      replyTo?: string,
      messageType?: 'text' | 'image',
      opts?: { metadata?: Record<string, unknown> }
    ) => {
      if (!activeRoomId || !content.trim()) return;
      if (!ensureSocketReady(socket)) return;
      let acked = false;
      const ackTimer = window.setTimeout(() => {
        if (!acked) {
          setLastActionError('消息发送超时，请重试');
        }
      }, 8000);
      socket.emit(
        'message:send',
        {
          roomId: activeRoomId,
          content,
          replyTo,
          messageType: messageType === 'image' ? 'image' : undefined,
          metadata: opts?.metadata,
        },
        (ack: any) => {
          acked = true;
          window.clearTimeout(ackTimer);
          if (!ack?.ok) {
            const code = ack?.errorCode;
            setLastActionError(
              code === 'OFF_PLATFORM_CONTACT'
                ? 'OFF_PLATFORM_CONTACT'
                : ack?.error || 'Send message failed'
            );
          } else {
            setLastActionError(null);
          }
        }
      );
    },
    [socket, activeRoomId, ensureSocketReady]
  );

  const sendQuickLink = useCallback(
    (path: string, label: string) => {
      if (!activeRoomId || !label.trim()) return;
      if (!ensureSocketReady(socket)) return;
      const content = label.trim();
      socket.emit(
        'message:send',
        {
          roomId: activeRoomId,
          content,
          metadata: { quickLink: { path, label: content } },
        },
        (ack: any) => {
          if (!ack?.ok) {
            const code = ack?.errorCode;
            setLastActionError(
              code === 'OFF_PLATFORM_CONTACT'
                ? 'OFF_PLATFORM_CONTACT'
                : ack?.error || 'Send failed'
            );
          } else {
            setLastActionError(null);
          }
        }
      );
    },
    [socket, activeRoomId, ensureSocketReady]
  );

  const createRedPacket = useCallback(
    (totalAmount: number, totalCount: number, greeting: string | undefined, currency: 'USDT' | 'RWA') => {
    if (!activeRoomId) return;
      if (!ensureSocketReady(socket)) return;
      socket.emit(
        'redpacket:create',
        { roomId: activeRoomId, totalAmount, totalCount, greeting, currency },
        (ack: any) => {
          if (!ack?.ok) {
            const code = ack?.errorCode;
            setLastActionError(
              code === 'OFF_PLATFORM_CONTACT'
                ? 'OFF_PLATFORM_CONTACT'
                : ack?.error || 'Create red packet failed'
            );
          } else {
            setLastActionError(null);
          }
        }
      );
    },
    [socket, activeRoomId, ensureSocketReady]
  );

  const claimRedPacket = useCallback(async (packetId: string): Promise<number | null> => {
    if (!socket) return null;
    return new Promise((resolve) => {
      socket.emit('redpacket:claim', { packetId }, (ack: any) => {
        if (!ack?.ok) {
          setLastActionError(ack?.error || 'Claim red packet failed');
          resolve(null);
          return;
        }
        setLastActionError(null);
        resolve(Number(ack?.data?.amount || 0));
      });
    });
  }, [socket]);

  const getRedPacketRecords = useCallback(async (packetId: string) => {
    try {
      const headers = authHeadersFromRefs();
      const res = await fetch(chatHttpUrl(`redpackets/${packetId}/records`), { headers });
      if (!res.ok) return [];
      const data = await res.json();
      return data?.records || [];
    } catch {
      return [];
    }
  }, []);

  const fetchWalletBalances = useCallback(async () => {
    try {
      if (!addressRef.current || (!sessionTokenRef.current && !signatureRef.current)) return;
      setWalletLoading(true);
      setLastActionError(null);
      const headers = authHeadersFromRefs();
      const res = await fetch(chatHttpUrl('wallet/balances'), { headers });
      if (!res.ok) throw new Error('Failed to load wallet balances');
      const data = await res.json();
      setWalletAddress(data.walletAddress || '');
      setWalletEscrow(data.balances || { USDT: 0, RWA: 0 });
      setWalletWithdrawn(data.withdrawn || { USDT: 0, RWA: 0 });
    } catch (e: any) {
      setLastActionError(e?.message || 'Failed to load wallet balances');
    } finally {
      setWalletLoading(false);
    }
  }, []);

  const withdrawWallet = useCallback(
    async (currency: ChatCurrency, amount: number): Promise<{ txHash: string }> => {
      if (!addressRef.current || (!sessionTokenRef.current && !signatureRef.current)) {
        throw new Error('Not authenticated');
      }
      setLastActionError(null);
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...authHeadersFromRefs(),
      };
      const res = await fetch(chatHttpUrl('wallet/withdraw'), {
        method: 'POST',
        headers,
        body: JSON.stringify({ currency, amount }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data?.error === 'string' ? data.error : 'Withdraw failed');
      }
      await fetchWalletBalances();
      return { txHash: data.txHash || '' };
    },
    [fetchWalletBalances]
  );

  // ─── Typing indicator ─────────────────────────────
  const sendTyping = useCallback(() => {
    if (!activeRoomId) return;
    if (!socket?.connected) return;
    socket.emit('user:typing', activeRoomId);
  }, [socket, activeRoomId]);

  // ─── Load more ─────────────────────────────────────
  const loadMoreMessages = useCallback(async () => {
    if (!activeRoomId || messages.length === 0) return;
    const oldest = messages[0]?.timestamp;
    try {
      const headers = authHeadersFromRefs();

      const res = await fetch(
        chatHttpUrl(`rooms/${activeRoomId}/messages?limit=50&before=${oldest}`),
        { headers }
      );
      const data = await res.json();
      setMessages((prev) => [...(data.messages || []), ...prev]);
    } catch (err) {
      console.error('Failed to load more:', err);
    }
  }, [activeRoomId, messages]);

  const clearJumpTarget = useCallback(() => setJumpTargetMessageId(null), []);

  const jumpToMessage = useCallback(
    async (roomId: string, messageId: string) => {
      setJumpTargetMessageId(null);
      setActiveRoomId(roomId);
      socketRef.current?.emit('room:join', roomId, () => {});
      try {
        const headers = authHeadersFromRefs();

        const res = await fetchWithTimeout(
          chatHttpUrl(`rooms/${roomId}/messages/around/${messageId}?limit=50`),
          {
            timeoutMs: 22000,
            headers,
          }
        )
        const data = await res.json();
        setMessages(data.messages || []);
        setJumpTargetMessageId(messageId);
      } catch (err) {
        console.error('jumpToMessage failed:', err);
        await loadMessages(roomId);
      }
    },
    [loadMessages]
  );

  const getAuthHeaders = useCallback((): Record<string, string> => {
    const h = authHeadersFromRefs();
    if (!h['x-wallet-address'] || (!h['x-chat-session'] && !h['x-wallet-signature'])) {
      return {};
    }
    return h;
  }, []);

  const clearActionError = useCallback(() => {
    setLastActionError(null);
  }, []);

  const uploadChatImage = useCallback(
    async (file: File): Promise<string | null> => {
      const headers = getAuthHeaders();
      if (!headers['x-wallet-address'] || (!headers['x-chat-session'] && !headers['x-wallet-signature'])) {
        setLastActionError('Not authenticated');
        return null;
      }
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(typeof r.result === 'string' ? r.result : '');
        r.onerror = () => reject(new Error('read failed'));
        r.readAsDataURL(file);
      });
      if (!dataUrl.startsWith('data:image/')) {
        setLastActionError('Please choose an image file');
        return null;
      }
      try {
        const res = await fetch(chatHttpUrl('upload/image'), {
          method: 'POST',
          headers: {
            ...headers,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ imageBase64: dataUrl }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || typeof data?.url !== 'string') {
          setLastActionError(typeof data?.error === 'string' ? data.error : 'Image upload failed');
          return null;
        }
        setLastActionError(null);
        return data.url as string;
      } catch {
        setLastActionError('Image upload failed');
        return null;
      }
    },
    [getAuthHeaders]
  );

  const createGroupRoom = useCallback(
    async (name: string, description: string) => {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      };
      if (!headers['x-wallet-address'] || (!headers['x-chat-session'] && !headers['x-wallet-signature'])) {
        throw new Error('Not authenticated');
      }
      const res = await fetch(chatHttpUrl('rooms'), {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: name.trim(),
          description: (description || '').trim(),
          type: 'group',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data?.error === 'string' ? data.error : 'Failed to create group');
      }
      const room = data.room as ChatRoom | undefined;
      if (!room?.id) {
        throw new Error('Invalid server response');
      }
      await loadRooms();
      setActiveRoom(room.id);
      return room;
    },
    [getAuthHeaders, loadRooms, setActiveRoom]
  );

  // ─── DM Open by address ─────────────────────────────
  const openDmByAddress = useCallback(
    async (peerAddress: string) => {
      const addr = (peerAddress || '').trim();
      if (!addr) throw new Error('peerAddress required');

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      };
      if (!headers['x-wallet-address'] || (!headers['x-chat-session'] && !headers['x-wallet-signature'])) {
        throw new Error('Not authenticated');
      }

      const res = await fetch(chatHttpUrl('dm/open'), {
        method: 'POST',
        headers,
        body: JSON.stringify({ peerAddress: addr }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.room?.id) {
        throw new Error(typeof data?.error === 'string' ? data.error : 'Failed to open DM');
      }

      const room = data.room as ChatRoom;
      setRooms((prev) => (prev.some((r) => r.id === room.id) ? prev : [room, ...prev]));
      setActiveRoom(room.id);
      void loadRooms();
      return room;
    },
    [getAuthHeaders, loadRooms, setActiveRoom]
  );

  const updateMyNickname = useCallback(
    async (nickname: string) => {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      };
      if (!headers['x-wallet-address'] || (!headers['x-chat-session'] && !headers['x-wallet-signature'])) {
        throw new Error('Not authenticated');
      }
      const res = await fetch(chatHttpUrl('me/nickname'), {
        method: 'PUT',
        headers,
        body: JSON.stringify({ nickname }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.user) {
        throw new Error(typeof data?.error === 'string' ? data.error : 'Failed to update nickname');
      }
      const next = data.user as ChatUser;
      setCurrentUser(next);
      setMessages((prev) =>
        prev.map((m) => (m.userId === next.id ? { ...m, user: { ...m.user, nickname: next.nickname } } : m))
      );
      return next;
    },
    [getAuthHeaders]
  );

  // 默认进「官方群」：房间 API 可能按 id/时间戳排序把公告频道放在前面，不能盲选 rooms[0]
  useEffect(() => {
    if (rooms.length > 0 && !activeRoomId) {
      const preferred =
        rooms.find((r) => r.id === 'room-general')?.id ||
        rooms.find((r) => r.type === 'group' && r.id !== 'room-announcements')?.id ||
        rooms[0]?.id;
      if (preferred) setActiveRoom(preferred);
    }
  }, [rooms, activeRoomId, setActiveRoom]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { socket?.disconnect(); };
  }, [socket]);

  const logoutRef = useRef(logout);
  logoutRef.current = logout;

  /** 已连钱包与持久化会话地址不一致：清缓存并登出（访客 guest_ 不因连接钱包被踢） */
  useEffect(() => {
    if (!wagmiConnected || !wagmiAddress) return;
    const p = readPersistedChatAuth();
    if (!p) return;
    if (p.address.toLowerCase().startsWith('guest_')) return;
    if (p.address.toLowerCase() !== wagmiAddress.toLowerCase()) {
      clearPersistedChatAuth();
      logoutRef.current();
    }
  }, [wagmiConnected, wagmiAddress, clearPersistedChatAuth]);

  /**
   * 自动恢复会话：不依赖 wagmiConnected/wagmiAddress，避免 Hydration 与重连抖动导致反复
   * connectWithSignature（整页闪烁）。若已与持久化地址建立会话则跳过。
   */
  useEffect(() => {
    let cancelled = false;
    const maxTimer = window.setTimeout(() => {
      if (!cancelled) {
        console.warn('[Chat] auth restore watchdog: timeout, leaving restore screen');
        setIsAuthRestoring(false);
      }
    }, 28000);
    const run = async () => {
      try {
        if (typeof window === 'undefined') {
          if (!cancelled) setIsAuthRestoring(false);
          return;
        }
        const parsed = readPersistedChatAuth();
        if (!parsed?.address || (!parsed.signature && !parsed.sessionToken)) {
          if (!cancelled) setIsAuthRestoring(false);
          return;
        }
        if (
          isAuthenticated &&
          addressRef.current &&
          addressRef.current.toLowerCase() === parsed.address.toLowerCase()
        ) {
          if (!cancelled) setIsAuthRestoring(false);
          return;
        }

        try {
          await connectWithCredentials(
            parsed.address,
            { signature: parsed.signature, sessionToken: parsed.sessionToken },
            true
          );
        } catch (e) {
          console.warn('[Chat] auto-restore failed (network or server); keeping saved session for retry:', e);
        }
        if (!cancelled) setIsAuthRestoring(false);
      } finally {
        window.clearTimeout(maxTimer);
      }
    };
    void run();
    return () => {
      cancelled = true;
      window.clearTimeout(maxTimer);
    };
  }, [connectWithCredentials, isAuthenticated]);

  return (
    <ChatContext.Provider value={{
      isConnected,
      isAuthenticated,
      isAuthRestoring,
      currentUser,
      rooms,
      activeRoomId,
      messages,
      typingUsers,
      lastActionError,
      walletAddress,
      walletEscrow,
      walletWithdrawn,
      walletLoading,
      login,
      establishSession,
      logout,
      setActiveRoom,
      sendMessage,
      sendQuickLink,
      uploadChatImage,
      createRedPacket,
      claimRedPacket,
      getRedPacketRecords,
      fetchWalletBalances,
      withdrawWallet,
      sendTyping,
      loadMoreMessages,
      jumpToMessage,
      jumpTargetMessageId,
      clearJumpTarget,
      getAuthHeaders,
      clearActionError,
      createGroupRoom,
      openDmByAddress,
      updateMyNickname,
    }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used within ChatProvider');
  return ctx;
}
