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
  /** 已持有签名时建立会话（可与站点 Wagmi 连接复用，避免二次 requestAccounts） */
  establishSession: (address: string, signature: string) => Promise<void>;
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
  getAuthHeaders: () => Record<string, string>;
  clearActionError: () => void;
  createGroupRoom: (name: string, description: string) => Promise<ChatRoom>;
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
  const signatureRef = useRef<string>('');
  const addressRef = useRef<string>('');
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    socketRef.current = socket;
  }, [socket]);

  // ─── Load rooms ────────────────────────────────────
  const loadRooms = useCallback(async () => {
    try {
      const res = await fetchWithTimeout(chatHttpUrl('rooms'), { timeoutMs: 22000 });
      const data = await res.json();
      setRooms(data.rooms || []);
    } catch (err) {
      console.error('Failed to load rooms:', err);
    }
  }, []);

  // ─── Load messages ─────────────────────────────────
  const loadMessages = useCallback(async (roomId: string) => {
    try {
      const res = await fetchWithTimeout(chatHttpUrl(`rooms/${roomId}/messages?limit=50`), {
        timeoutMs: 22000,
      });
      const data = await res.json();
      setMessages(data.messages || []);
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  }, []);

  const saveAuth = useCallback((auth: { address: string; signature: string }) => {
    writePersistedChatAuth(auth);
  }, []);

  const clearSavedAuth = useCallback(() => {
    clearPersistedChatAuth();
  }, []);

  const connectWithSignature = useCallback(async (address: string, signature: string, persist: boolean) => {
    try {
      const addr = (address ?? '').trim();
      const sig = typeof signature === 'string' ? signature.trim() : '';
      if (!addr) {
        throw new Error('缺少钱包地址');
      }
      const isGuest = addr.toLowerCase().startsWith('guest_');
      if (!sig || (!isGuest && !sig.startsWith('0x'))) {
        throw new Error('签名无效或已损坏，请重新连接钱包登录');
      }

      socketRef.current?.disconnect();
      setSocket(null);
      setIsConnected(false);

      signatureRef.current = sig;
      addressRef.current = addr;

      // Login（TP / 弱网下无超时会导致永久「连接中」）
      let loginRes: Response;
      try {
        loginRes = await fetchWithTimeout(chatHttpUrl('auth/login'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address: addr, signature: sig }),
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
      const { user } = await loginRes.json();
      setCurrentUser(user);
      setIsAuthenticated(true);
      if (persist) {
        saveAuth({ address: addr, signature: sig });
      }

      // Connect WebSocket
      const s = io(chatSocketUrl(), {
        path: '/chat-ws',
        auth: { address: addr, signature: sig },
        transports: ['websocket', 'polling'],
      });

      s.on('connect', () => {
        setIsConnected(true);
        console.log('[Chat] WebSocket connected');
      });

      s.on('disconnect', () => {
        setIsConnected(false);
        console.log('[Chat] WebSocket disconnected');
      });

      s.on('message:new', (msg: ChatMessage) => {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      });

      s.on('message:edit', (msg: Partial<ChatMessage> & { id: string }) => {
        setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, ...msg } as ChatMessage : m)));
      });

      s.on('user:typing', (userId: string) => {
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
  const login = useCallback(async (address: string, signer: any) => {
    let signature = '';
    if (signer) {
      const message = await fetchChatAuthSigningMessage();
      signature = await signer.signMessage(message);
      if (typeof signature !== 'string' || !signature.startsWith('0x')) {
        throw new Error('钱包未返回有效签名，请换浏览器或暂时关闭冲突的扩展后重试。');
      }
    } else {
      // Guest login for quick testing mode
      signature = 'guest';
    }
    await connectWithSignature(address, signature, true);
  }, [connectWithSignature]);

  const establishSession = useCallback(async (address: string, signature: string) => {
    await connectWithSignature(address, signature, true);
  }, [connectWithSignature]);

  // ─── Logout ────────────────────────────────────────
  const logout = useCallback(() => {
    socketRef.current?.disconnect();
    setSocket(null);
    setIsConnected(false);
    setIsAuthenticated(false);
    setCurrentUser(null);
    setMessages([]);
    setRooms([]);
    setActiveRoomId(null);
    signatureRef.current = '';
    addressRef.current = '';
    clearSavedAuth();
  }, [clearSavedAuth]);

  // ─── Set active room ──────────────────────────────
  const setActiveRoom = useCallback((roomId: string) => {
    setActiveRoomId(roomId);
    loadMessages(roomId);
    socket?.emit('room:join', roomId, () => {});
  }, [socket, loadMessages]);

  // ─── Send message ─────────────────────────────────
  const sendMessage = useCallback(
    (
      content: string,
      replyTo?: string,
      messageType?: 'text' | 'image',
      opts?: { metadata?: Record<string, unknown> }
    ) => {
      if (!socket || !activeRoomId || !content.trim()) return;
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
    [socket, activeRoomId]
  );

  const sendQuickLink = useCallback(
    (path: string, label: string) => {
      if (!socket || !activeRoomId || !label.trim()) return;
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
    [socket, activeRoomId]
  );

  const createRedPacket = useCallback(
    (totalAmount: number, totalCount: number, greeting: string | undefined, currency: 'USDT' | 'RWA') => {
    if (!socket || !activeRoomId) return;
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
    [socket, activeRoomId]
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
      const headers: Record<string, string> =
        addressRef.current && signatureRef.current
          ? {
              'x-wallet-address': addressRef.current,
              'x-wallet-signature': signatureRef.current,
            }
          : {};
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
      if (!addressRef.current || !signatureRef.current) return;
      setWalletLoading(true);
      setLastActionError(null);
      const headers: Record<string, string> = {
        'x-wallet-address': addressRef.current,
        'x-wallet-signature': signatureRef.current,
      };
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
      if (!addressRef.current || !signatureRef.current) throw new Error('Not authenticated');
      setLastActionError(null);
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-wallet-address': addressRef.current,
        'x-wallet-signature': signatureRef.current,
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
    if (!socket || !activeRoomId) return;
    socket.emit('user:typing', activeRoomId);
  }, [socket, activeRoomId]);

  // ─── Load more ─────────────────────────────────────
  const loadMoreMessages = useCallback(async () => {
    if (!activeRoomId || messages.length === 0) return;
    const oldest = messages[0]?.timestamp;
    try {
      const res = await fetch(chatHttpUrl(`rooms/${activeRoomId}/messages?limit=50&before=${oldest}`));
      const data = await res.json();
      setMessages((prev) => [...(data.messages || []), ...prev]);
    } catch (err) {
      console.error('Failed to load more:', err);
    }
  }, [activeRoomId, messages]);

  const getAuthHeaders = useCallback((): Record<string, string> => {
    if (!addressRef.current || !signatureRef.current) {
      return {};
    }
    return {
      'x-wallet-address': addressRef.current,
      'x-wallet-signature': signatureRef.current,
    };
  }, []);

  const clearActionError = useCallback(() => {
    setLastActionError(null);
  }, []);

  const uploadChatImage = useCallback(
    async (file: File): Promise<string | null> => {
      const headers = getAuthHeaders();
      if (!headers['x-wallet-address'] || !headers['x-wallet-signature']) {
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
      if (!headers['x-wallet-address'] || !headers['x-wallet-signature']) {
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

  const updateMyNickname = useCallback(
    async (nickname: string) => {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      };
      if (!headers['x-wallet-address'] || !headers['x-wallet-signature']) {
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

  // Auto-select first room
  useEffect(() => {
    if (rooms.length > 0 && !activeRoomId) {
      setActiveRoom(rooms[0].id);
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
        if (!parsed?.address || !parsed?.signature) {
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
          await connectWithSignature(parsed.address, parsed.signature, false);
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
  }, [connectWithSignature, isAuthenticated]);

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
      getAuthHeaders,
      clearActionError,
      createGroupRoom,
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
