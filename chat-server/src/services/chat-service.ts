// ============================================================
// RWA Aura Chat — In-Memory Chat Service
// ============================================================

import { v4 as uuid } from 'uuid';
import fs from 'fs';
import path from 'path';
import { ethers } from 'ethers';
import { normalizeUtteranceKey } from '../utils/utterance-dedupe';
import { User, Message, Room, NodeLevel, RedPacket, ChatCurrency } from '../models/types';

const USER_AVATAR_POOL = 50;

/** 每房间仅保留最近若干条消息；超出时按批从最早删除（与前端说明文案一致） */
const MAX_MESSAGES_PER_ROOM = 1000;
/** 单次持久化时最多删除的条数（避免一次 splice 过大） */
const MESSAGE_TRIM_CHUNK = 100;

/** 与机器人同款图标池：按地址确定性分配，登录多次不变 */
export function pickDeterministicUserAvatar(address: string): string {
  const h = BigInt(ethers.id(address.toLowerCase()));
  const idx = Number((h % BigInt(USER_AVATAR_POOL)) + BigInt(1));
  return `/chat-bot-icons/${String(idx).padStart(2, '0')}.svg`;
}

class ChatService {
  private static readonly SYSTEM_ANNOUNCER_ID = 'system-announcer';
  private static readonly SYSTEM_ANNOUNCER_ADDRESS = 'system-announcer';
  private static readonly BOOTSTRAP_ANNOUNCEMENT_VERSION = '20260406-guide-v1';
  private users = new Map<string, User>();
  private rooms = new Map<string, Room>();
  private messages = new Map<string, Message[]>(); // roomId -> messages
  private redPackets = new Map<string, RedPacket>(); // redPacketId -> red packet
  private addressToUser = new Map<string, string>(); // address -> userId
  private messageRateLimits = new Map<string, number[]>(); // userId -> timestamps
  /** 房间内最后一条真人（非机器人）文本/图片消息时间，用于机器人仅在「安静」时主动发言 */
  private roomLastHumanMessageAt = new Map<string, number>();
  private readonly dataFilePath = process.env.CHAT_DATA_FILE
    ? path.resolve(process.env.CHAT_DATA_FILE)
    : path.resolve(process.cwd(), 'data', 'chat-data.json');
  private readonly adminAddresses = new Set(
    (process.env.CHAT_ADMIN_ADDRESSES || '')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  );
  private readonly redPacketExpireMs = Number(process.env.CHAT_RED_PACKET_EXPIRE_MS || 24 * 60 * 60 * 1000);
  private readonly redPacketRpcUrl = process.env.CHAT_RED_PACKET_RPC_URL || process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org';

  // Platform hot wallet (from backend relayer/backend key). Used to transferFrom(sender->vault) and transfer(vault->user) on withdraw.
  private readonly hotWalletPrivateKey =
    String(process.env.CHAT_HOT_WALLET_PRIVATE_KEY || process.env.RELAYER_PRIVATE_KEY || process.env.BACKEND_PRIVATE_KEY || '').trim();
  private hotWalletAddress = '';
  private hotWallet: ethers.Wallet | null = null;

  // Token configuration (fallback to backend token env)
  private readonly usdtTokenAddress = String(process.env.CHAT_USDT_TOKEN_ADDRESS || process.env.USDT_TOKEN || '').trim();
  private readonly rwaTokenAddress = String(process.env.CHAT_RWA_TOKEN_ADDRESS || process.env.RWA_TOKEN || '').trim();
  private readonly usdtTokenDecimals = Number(process.env.CHAT_USDT_TOKEN_DECIMALS || process.env.USDT_TOKEN_DECIMALS || 6);
  private readonly rwaTokenDecimals = Number(process.env.CHAT_RWA_TOKEN_DECIMALS || process.env.RWA_TOKEN_DECIMALS || 18);

  private readonly erc20Abi = [
    'function balanceOf(address owner) view returns (uint256)',
    'function allowance(address owner, address spender) view returns (uint256)',
    'function transfer(address to, uint256 amount) returns (bool)',
    'function transferFrom(address from, address to, uint256 amount) returns (bool)',
  ];

  // Internal escrow ledger (claimed but not withdrawn)
  private userEscrowBalances = new Map<string, Record<ChatCurrency, number>>(); // userId -> currency -> amount
  private userWithdrawnBalances = new Map<string, Record<ChatCurrency, number>>(); // userId -> currency -> withdrawn total
  private poolReservedBalances: Record<ChatCurrency, number> = { USDT: 0, RWA: 0 }; // claimed-but-unwithdrawn total per currency
  private provider: ethers.JsonRpcProvider | null = null;
  /** 机器人话题池（按人设分组）持久化到 chat-data.json */
  private botTopicPools: Record<string, Array<Record<string, any>>> = {};

  constructor() {
    // Restore from disk if available, otherwise create defaults.
    const restored = this.loadFromDisk();
    if (!restored) {
      this.createDefaultRooms();
    }
    this.ensureAnnouncementFeedSeeded();
  }

  private ensureAnnouncementFeedSeeded() {
    const room = this.rooms.get('room-announcements');
    if (!room) return;

    // Ensure a concrete sender exists so frontend always has a valid user object.
    const now = Date.now();
    let changed = false;
    let announcer = this.users.get(ChatService.SYSTEM_ANNOUNCER_ID);
    if (!announcer) {
      announcer = {
        id: ChatService.SYSTEM_ANNOUNCER_ID,
        address: ChatService.SYSTEM_ANNOUNCER_ADDRESS,
        nickname: '📢 官方公告',
        avatar: '/chat-bot-icons/01.svg',
        nodeLevel: 'L9',
        isBot: true,
        isAdmin: true,
        isOnline: true,
        lastSeen: now,
        createdAt: now,
      };
      this.users.set(announcer.id, announcer);
      this.addressToUser.set(announcer.address, announcer.id);
      changed = true;
    }

    const roomMsgs = this.messages.get(room.id) || [];
    if (!this.messages.has(room.id)) {
      this.messages.set(room.id, roomMsgs);
      changed = true;
    }
    const alreadySeeded = roomMsgs.some(
      (m) => m.metadata?.seedKey === ChatService.BOOTSTRAP_ANNOUNCEMENT_VERSION
    );
    if (alreadySeeded) {
      if (changed) this.persistToDisk();
      return;
    }

    const guidePath = '/announcements/account-funding-staking-guide';
    const guideLabel = '新手指南：登录 / 充值 / 质押 / 提现';
    const payloads: Array<{ content: string; metadata?: Record<string, any> }> = [
      {
        content:
          '欢迎来到公告栏。这里会固定发布官方操作指引与安全提醒，普通成员只读。',
      },
      {
        content:
          '新手请先看这篇：登录、充值、质押、提现、FAQ 一站式说明。',
        metadata: { quickLink: { path: guidePath, label: guideLabel } },
      },
      {
        content:
          '重要提醒：请勿向任何人泄露私钥或助记词。官方不会私聊索要这些信息。',
      },
    ];

    payloads.forEach((p, idx) => {
      roomMsgs.push({
        id: uuid(),
        roomId: room.id,
        userId: announcer!.id,
        content: p.content,
        type: p.metadata?.quickLink ? 'text' : 'system',
        timestamp: now + idx,
        edited: false,
        metadata: {
          ...(p.metadata || {}),
          seedKey: ChatService.BOOTSTRAP_ANNOUNCEMENT_VERSION,
        },
      });
    });
    this.messages.set(room.id, roomMsgs);
    this.persistToDisk();
  }

  private loadFromDisk(): boolean {
    try {
      if (!fs.existsSync(this.dataFilePath)) {
        return false;
      }
      const raw = fs.readFileSync(this.dataFilePath, 'utf8');
      if (!raw.trim()) return false;
      const data = JSON.parse(raw) as {
        users?: User[];
        rooms?: Room[];
        messages?: Record<string, Message[]>;
        redPackets?: Record<string, RedPacket>;
        userEscrowBalances?: Record<string, Record<ChatCurrency, number>>;
        userWithdrawnBalances?: Record<string, Record<ChatCurrency, number>>;
        poolReservedBalances?: Record<ChatCurrency, number>;
        addressToUser?: Record<string, string>;
        botTopicPools?: Record<string, Array<Record<string, any>>>;
      };

      this.users = new Map((data.users || []).map((u) => [u.id, u]));
      this.rooms = new Map((data.rooms || []).map((r) => [r.id, r]));
      this.messages = new Map(Object.entries(data.messages || {}));

      this.roomLastHumanMessageAt.clear();
      for (const [roomId, msgs] of this.messages.entries()) {
        for (let i = msgs.length - 1; i >= 0; i--) {
          const m = msgs[i]!;
          if (m.type !== 'text' && m.type !== 'image') continue;
          const u = this.users.get(m.userId);
          if (u && !u.isBot) {
            this.roomLastHumanMessageAt.set(roomId, m.timestamp);
            break;
          }
        }
      }
      this.redPackets = new Map(
        Object.entries(data.redPackets || {}).map(([id, packet]) => {
          const p = packet as RedPacket;
          return [
            id,
            {
              ...p,
              currency: (p.currency || 'USDT') as ChatCurrency,
              claimRecords: Array.isArray(p.claimRecords) ? p.claimRecords : [],
              expiresAt: p.expiresAt || (p.createdAt + this.redPacketExpireMs),
              refundedAmount: typeof p.refundedAmount === 'number' ? p.refundedAmount : 0,
              status: (p.status || 'active') as RedPacket['status'],
            },
          ];
        })
      );
      this.addressToUser = new Map(Object.entries(data.addressToUser || {}));
      this.botTopicPools = (data.botTopicPools || {}) as Record<string, Array<Record<string, any>>>;

      // Ledger
      this.userEscrowBalances = new Map(Object.entries(data.userEscrowBalances || {}).map(([userId, balances]) => [userId, balances as any]));
      this.userWithdrawnBalances = new Map(
        Object.entries(data.userWithdrawnBalances || {}).map(([userId, balances]) => [userId, balances as any])
      );
      const pool = (data.poolReservedBalances || {}) as Record<ChatCurrency, number>;
      this.poolReservedBalances = {
        USDT: Number(pool.USDT || 0),
        RWA: Number(pool.RWA || 0),
      };

      let avatarBackfill = false;
      for (const u of this.users.values()) {
        if (u.isBot) continue;
        if (!u.avatar) {
          u.avatar = pickDeterministicUserAvatar(u.address);
          avatarBackfill = true;
        }
      }

      let roomGeneralRenamed = false;
      const genRoom = this.rooms.get('room-general');
      if (genRoom && /general|常规/i.test(genRoom.name)) {
        genRoom.name = '🌐 官方群';
        genRoom.description = 'RWA Aura official community';
        roomGeneralRenamed = true;
      }

      if (avatarBackfill || roomGeneralRenamed) this.persistToDisk();

      return this.rooms.size > 0;
    } catch (err) {
      console.error('[ChatService] Failed to load persisted data:', err);
      return false;
    }
  }

  private persistToDisk() {
    try {
      fs.mkdirSync(path.dirname(this.dataFilePath), { recursive: true });
      const payload = {
        users: Array.from(this.users.values()),
        rooms: Array.from(this.rooms.values()),
        messages: Object.fromEntries(this.messages.entries()),
        redPackets: Object.fromEntries(this.redPackets.entries()),
        addressToUser: Object.fromEntries(this.addressToUser.entries()),
        userEscrowBalances: Object.fromEntries(
          Array.from(this.userEscrowBalances.entries()).map(([userId, balances]) => [userId, balances])
        ),
        userWithdrawnBalances: Object.fromEntries(
          Array.from(this.userWithdrawnBalances.entries()).map(([userId, balances]) => [userId, balances])
        ),
        poolReservedBalances: this.poolReservedBalances,
        botTopicPools: this.botTopicPools,
      };
      fs.writeFileSync(this.dataFilePath, JSON.stringify(payload, null, 2), 'utf8');
    } catch (err) {
      console.error('[ChatService] Failed to persist data:', err);
    }
  }

  private getProvider(): ethers.JsonRpcProvider {
    if (!this.provider) {
      this.provider = new ethers.JsonRpcProvider(this.redPacketRpcUrl);
    }
    return this.provider;
  }

  private getHotWallet(): ethers.Wallet {
    if (!this.hotWallet) {
      if (!this.hotWalletPrivateKey) {
        throw new Error('CHAT_HOT_WALLET_PRIVATE_KEY / RELAYER_PRIVATE_KEY / BACKEND_PRIVATE_KEY 未配置');
      }
      this.hotWallet = new ethers.Wallet(this.hotWalletPrivateKey, this.getProvider());
      this.hotWalletAddress = this.hotWallet.address.toLowerCase();
    }
    return this.hotWallet;
  }

  private getTokenConfig(currency: ChatCurrency): { address: string; decimals: number } {
    if (currency === 'USDT') {
      if (!this.usdtTokenAddress) throw new Error('USDT token address not configured on server');
      return { address: this.usdtTokenAddress, decimals: this.usdtTokenDecimals };
    }
    if (!this.rwaTokenAddress) throw new Error('RWA token address not configured on server');
    return { address: this.rwaTokenAddress, decimals: this.rwaTokenDecimals };
  }

  private getTokenContract(currency: ChatCurrency): any {
    const { address } = this.getTokenConfig(currency);
    return new ethers.Contract(address, this.erc20Abi, this.getHotWallet());
  }

  private normalizeAmount(num: number): number {
    return Math.round(num * 100) / 100;
  }

  private createDefaultRooms() {
    const general: Room = {
      id: 'room-general',
      name: '🌐 官方群',
      description: 'RWA Aura official community',
      type: 'group',
      icon: '🌐',
      ownerId: 'system',
      memberIds: [],
      isPublic: true,
      minTokenGate: 0,
      createdAt: Date.now(),
    };

    const announcements: Room = {
      id: 'room-announcements',
      name: '📢 Announcements',
      description: 'Official announcements (read-only)',
      type: 'channel',
      icon: '📢',
      ownerId: 'system',
      memberIds: [],
      isPublic: true,
      minTokenGate: 0,
      createdAt: Date.now(),
    };

    const staking: Room = {
      id: 'room-staking',
      name: '⚡ Staking Discussion',
      description: 'Discuss staking strategies and rewards',
      type: 'group',
      icon: '⚡',
      ownerId: 'system',
      memberIds: [],
      isPublic: true,
      minTokenGate: 0,
      createdAt: Date.now(),
    };

    const trading: Room = {
      id: 'room-trading',
      name: '📈 Trading',
      description: 'RWA trading and market analysis',
      type: 'group',
      icon: '📈',
      ownerId: 'system',
      memberIds: [],
      isPublic: true,
      minTokenGate: 0,
      createdAt: Date.now(),
    };

    const vip: Room = {
      id: 'room-vip',
      name: '💎 VIP Lounge',
      description: 'Exclusive room for L5+ members',
      type: 'group',
      icon: '💎',
      ownerId: 'system',
      memberIds: [],
      isPublic: true,
      minTokenGate: 8000, // L5 personal stake requirement
      createdAt: Date.now(),
    };

    [general, announcements, staking, trading, vip].forEach((room) => {
      this.rooms.set(room.id, room);
      this.messages.set(room.id, []);
    });
  }

  // ─── Users ───────────────────────────────────────────
  createUser(address: string, nickname?: string, nodeLevel?: NodeLevel): User {
    const existing = this.addressToUser.get(address.toLowerCase());
    if (existing) {
      const user = this.users.get(existing)!;
      user.isOnline = true;
      user.lastSeen = Date.now();
      if (nodeLevel) user.nodeLevel = nodeLevel;
      if (!user.isBot && !user.avatar) {
        user.avatar = pickDeterministicUserAvatar(user.address);
      }
      this.persistToDisk();
      return user;
    }

    const addrLower = address.toLowerCase();
    const user: User = {
      id: uuid(),
      address: addrLower,
      nickname: nickname || `${address.slice(0, 6)}...${address.slice(-4)}`,
      avatar: pickDeterministicUserAvatar(addrLower),
      nodeLevel: nodeLevel || 'L1',
      isBot: false,
      isAdmin: this.adminAddresses.has(address.toLowerCase()),
      isOnline: true,
      lastSeen: Date.now(),
      createdAt: Date.now(),
    };

    this.users.set(user.id, user);
    this.addressToUser.set(user.address, user.id);

    // Auto-join public rooms
    this.rooms.forEach((room) => {
      if (room.isPublic && !room.memberIds.includes(user.id)) {
        room.memberIds.push(user.id);
      }
    });

    this.persistToDisk();
    return user;
  }

  getUser(userId: string): User | undefined {
    return this.users.get(userId);
  }

  updateUserNickname(userId: string, nickname: string): User | null {
    const user = this.users.get(userId);
    if (!user) return null;
    if (user.isBot) return null;
    const next = String(nickname || '').trim().slice(0, 32);
    if (!next) return null;
    user.nickname = next;
    this.persistToDisk();
    return user;
  }

  /** 供机器人批量 bootstrap 后立刻落盘 isBot/avatar 等内存改动 */
  persistChatState(): void {
    this.persistToDisk();
  }

  getBotTopicPools(): Record<string, Array<Record<string, any>>> {
    return this.botTopicPools;
  }

  setBotTopicPools(pools: Record<string, Array<Record<string, any>>>): void {
    this.botTopicPools = pools;
    this.persistToDisk();
  }

  getUserByAddress(address: string): User | undefined {
    const userId = this.addressToUser.get(address.toLowerCase());
    return userId ? this.users.get(userId) : undefined;
  }

  getMessageById(messageId: string): Message | undefined {
    for (const roomMsgs of this.messages.values()) {
      const found = roomMsgs.find((m) => m.id === messageId);
      if (found) return found;
    }
    return undefined;
  }

  getRedPacket(packetId: string): RedPacket | undefined {
    const packet = this.redPackets.get(packetId);
    if (!packet) return undefined;
    const before = packet.status;
    this.settleExpiredPacket(packet);
    if (before !== packet.status) this.persistToDisk();
    return packet;
  }

  setUserOffline(userId: string) {
    const user = this.users.get(userId);
    if (user) {
      user.isOnline = false;
      user.lastSeen = Date.now();
      this.persistToDisk();
    }
  }

  getOnlineUsers(roomId: string): User[] {
    const room = this.rooms.get(roomId);
    if (!room) return [];
    return room.memberIds
      .map((id) => this.users.get(id))
      .filter((u): u is User => !!u && u.isOnline);
  }

  // ─── Rooms ───────────────────────────────────────────
  getRooms(): Room[] {
    return Array.from(this.rooms.values());
  }

  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  /** All users currently in room.memberIds (for member list UI). */
  getRoomMemberUsers(roomId: string): User[] {
    const room = this.rooms.get(roomId);
    if (!room) return [];
    const out: User[] = [];
    for (const id of room.memberIds) {
      const u = this.users.get(id);
      if (u) out.push(u);
    }
    return out;
  }

  createRoom(name: string, description: string, ownerId: string, type: Room['type'] = 'group'): Room {
    const room: Room = {
      id: `room-${uuid().slice(0, 8)}`,
      name,
      description,
      type,
      ownerId,
      memberIds: [ownerId],
      isPublic: true,
      minTokenGate: 0,
      createdAt: Date.now(),
    };
    this.rooms.set(room.id, room);
    this.messages.set(room.id, []);
    this.persistToDisk();
    return room;
  }

  joinRoom(roomId: string, userId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;
    if (!room.memberIds.includes(userId)) {
      room.memberIds.push(userId);
      this.persistToDisk();
    }
    return true;
  }

  leaveRoom(roomId: string, userId: string) {
    const room = this.rooms.get(roomId);
    if (room) {
      room.memberIds = room.memberIds.filter((id) => id !== userId);
      this.persistToDisk();
    }
  }

  // ─── Messages ────────────────────────────────────────
  canSendMessage(roomId: string, userId: string): { ok: boolean; error?: string } {
    const room = this.rooms.get(roomId);
    const user = this.users.get(userId);
    if (!room || !user) return { ok: false, error: 'Room or user not found' };

    // Enforce read-only channels for normal users.
    if (room.type === 'channel' && !user.isAdmin && !user.isBot) {
      return { ok: false, error: 'This channel is read-only' };
    }

    // Simple anti-spam limiter: 5 messages / 10 seconds per user.
    const now = Date.now();
    const windowMs = 10_000;
    const maxInWindow = 5;
    const recent = (this.messageRateLimits.get(userId) || []).filter((ts) => now - ts < windowMs);
    if (recent.length >= maxInWindow) {
      this.messageRateLimits.set(userId, recent);
      return { ok: false, error: 'Rate limit exceeded. Please slow down.' };
    }
    recent.push(now);
    this.messageRateLimits.set(userId, recent);
    return { ok: true };
  }

  addMessage(
    roomId: string,
    userId: string,
    content: string,
    type: Message['type'] = 'text',
    replyTo?: string,
    metadata?: Record<string, any>
  ): Message | null {
    if (!this.rooms.has(roomId)) return null;

    const msg: Message = {
      id: uuid(),
      roomId,
      userId,
      content,
      type,
      replyTo,
      timestamp: Date.now(),
      edited: false,
      metadata,
    };

    const roomMessages = this.messages.get(roomId) || [];
    roomMessages.push(msg);
    while (roomMessages.length > MAX_MESSAGES_PER_ROOM) {
      const excess = roomMessages.length - MAX_MESSAGES_PER_ROOM;
      roomMessages.splice(0, Math.min(MESSAGE_TRIM_CHUNK, excess));
    }
    this.messages.set(roomId, roomMessages);

    const author = this.users.get(userId);
    if (author && !author.isBot && (type === 'text' || type === 'image')) {
      this.roomLastHumanMessageAt.set(roomId, Date.now());
    }

    this.persistToDisk();
    return msg;
  }

  /** 距该房间最后真人发言的毫秒数；从未有真人发过则返回 Infinity（允许机器人主动暖场） */
  getMsSinceLastHumanMessage(roomId: string): number {
    const t = this.roomLastHumanMessageAt.get(roomId);
    if (t == null) return Number.POSITIVE_INFINITY;
    return Date.now() - t;
  }

  getMessages(roomId: string, limit = 50, before?: number): Message[] {
    const msgs = this.messages.get(roomId) || [];
    let filtered = before ? msgs.filter((m) => m.timestamp < before) : msgs;
    return filtered.slice(-limit);
  }

  findMessageById(messageId: string): { roomId: string; message: Message } | null {
    for (const [roomId, msgs] of this.messages.entries()) {
      const m = msgs.find((x) => x.id === messageId);
      if (m) return { roomId, message: m };
    }
    return null;
  }

  /** 全文搜索（所有房间），按时间倒序，仅匹配文本/图片消息的 content */
  searchMessagesGlobal(query: string, limit = 50): Message[] {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    const cap = Math.min(200, Math.max(1, limit));
    const out: Message[] = [];
    for (const msgs of this.messages.values()) {
      for (const m of msgs) {
        if (m.type !== 'text' && m.type !== 'image') continue;
        if (!(m.content || '').toLowerCase().includes(q)) continue;
        out.push(m);
      }
    }
    out.sort((a, b) => b.timestamp - a.timestamp);
    return out.slice(0, cap);
  }

  /** 取某条消息前后窗口，便于前端跳转定位 */
  getMessagesAround(roomId: string, messageId: string, limit = 50): Message[] {
    const msgs = this.messages.get(roomId) || [];
    const idx = msgs.findIndex((m) => m.id === messageId);
    if (idx === -1) return [];
    const lim = Math.min(100, Math.max(10, limit));
    const half = Math.floor(lim / 2);
    const start = Math.max(0, idx - half);
    return msgs.slice(start, Math.min(msgs.length, start + lim));
  }

  /** 机器人当日去重：收集自 sinceMs（含）起的文本消息归一化键 */
  collectBotUtteranceKeysSince(sinceMs: number): Set<string> {
    const set = new Set<string>();
    for (const msgs of this.messages.values()) {
      for (const m of msgs) {
        if ((m.type !== 'text' && m.type !== 'image') || m.timestamp < sinceMs) continue;
        const u = this.users.get(m.userId);
        if (!u?.isBot) continue;
        set.add(normalizeUtteranceKey(m.content));
      }
    }
    return set;
  }

  editMessage(messageId: string, roomId: string, newContent: string, editorUserId: string): Message | null {
    const msgs = this.messages.get(roomId);
    if (!msgs) return null;
    const msg = msgs.find((m) => m.id === messageId);
    if (!msg) return null;

    // Only author or admin can edit a message.
    if (msg.userId !== editorUserId) {
      const editor = this.users.get(editorUserId);
      if (!editor?.isAdmin) return null;
    }

    msg.content = newContent;
    msg.edited = true;
    this.persistToDisk();
    return msg;
  }

  deleteMessage(messageId: string, roomId: string): boolean {
    const msgs = this.messages.get(roomId);
    if (!msgs) return false;
    const idx = msgs.findIndex((m) => m.id === messageId);
    if (idx === -1) return false;
    msgs.splice(idx, 1);
    this.persistToDisk();
    return true;
  }

  private updateRedPacketMessage(packet: RedPacket) {
    const roomMessages = this.messages.get(packet.roomId) || [];
    const msg = roomMessages.find((m) => m.id === packet.messageId);
    if (!msg) return;
    msg.metadata = {
      ...msg.metadata,
      redPacketId: packet.id,
      currency: packet.currency,
      totalAmount: packet.totalAmount,
      remainingAmount: packet.remainingAmount,
      totalCount: packet.totalCount,
      remainingCount: packet.remainingCount,
      status: packet.status,
      greeting: packet.greeting || '',
      senderId: packet.senderId,
      expiresAt: packet.expiresAt,
      refundedAmount: packet.refundedAmount,
      claimRecords: (packet.claimRecords || []).map((r) => ({
        userId: r.userId,
        nickname: this.users.get(r.userId)?.nickname || 'Unknown',
        amount: r.amount,
        claimedAt: r.claimedAt,
      })),
    };
    msg.content = packet.greeting || 'Red packet';
    msg.edited = true;
  }

  private createLuckyAmounts(totalAmount: number, totalCount: number): number[] {
    const unit = 100; // cents
    const minCents = 1;
    const totalCents = Math.round(totalAmount * unit);
    const queue: number[] = [];

    let remainAmount = totalCents;
    let remainCount = totalCount;
    for (let i = 0; i < totalCount - 1; i += 1) {
      const max = Math.floor((remainAmount / remainCount) * 2);
      const draw = Math.max(minCents, Math.floor(Math.random() * Math.max(minCents, max)) + 1);
      const amount = Math.min(draw, remainAmount - minCents * (remainCount - 1));
      queue.push(amount / unit);
      remainAmount -= amount;
      remainCount -= 1;
    }
    queue.push(remainAmount / unit);
    queue.sort(() => Math.random() - 0.5);
    return queue.map((a) => this.normalizeAmount(a));
  }

  private settleExpiredPacket(packet: RedPacket) {
    if (packet.status !== 'active') return;
    const now = Date.now();
    if (packet.expiresAt > now) return;

    const remaining = this.normalizeAmount(packet.remainingAmount);
    packet.status = remaining > 0 ? 'refunded' : 'expired';
    packet.refundedAmount = remaining;
    packet.remainingAmount = 0;
    packet.remainingCount = 0;
    packet.amountsQueue = [];

    if (packet.status === 'refunded') {
      // Logical release: tokens stay in platform hot wallet, but we unlock reserved balance.
      this.poolReservedBalances[packet.currency] = Math.max(0, (this.poolReservedBalances[packet.currency] || 0) - remaining);
    }

    this.updateRedPacketMessage(packet);
  }

  settleExpiredRedPackets(): Message[] {
    const changed: Message[] = [];
    this.redPackets.forEach((packet) => {
      const before = packet.status;
      this.settleExpiredPacket(packet);
      if (before !== packet.status) {
        const msg = this.getMessageById(packet.messageId);
        if (msg) changed.push(msg);
      }
    });
    if (changed.length > 0) this.persistToDisk();
    return changed;
  }

  private ensureUserLedger(userId: string) {
    if (!this.userEscrowBalances.has(userId)) {
      this.userEscrowBalances.set(userId, { USDT: 0, RWA: 0 });
    }
    if (!this.userWithdrawnBalances.has(userId)) {
      this.userWithdrawnBalances.set(userId, { USDT: 0, RWA: 0 });
    }
  }

  private parseTokenAmount(amount: number, decimals: number) {
    // We use 2 decimal precision input; parseUnits handles decimals correctly.
    return ethers.parseUnits(amount.toString(), decimals);
  }

  async validateRedPacketBalance(userId: string, totalAmount: number, currency: ChatCurrency): Promise<{ ok: boolean; error?: string }> {
    const user = this.users.get(userId);
    if (!user) return { ok: false, error: 'User not found' };
    if (user.address.startsWith('guest_')) return { ok: false, error: 'Guest account cannot send red packets' };
    if (!/^0x[a-fA-F0-9]{40}$/.test(user.address)) return { ok: false, error: 'Invalid wallet address for balance check' };

    const token = this.getTokenContract(currency);
    try {
      const amountParsed = this.parseTokenAmount(totalAmount, this.getTokenConfig(currency).decimals);
      const bal = await token.balanceOf(user.address);
      if (bal < amountParsed) return { ok: false, error: currency === 'USDT' ? 'Insufficient USDT balance' : 'Insufficient RWA balance' };

      const allowance = await token.allowance(user.address, this.hotWalletAddress);
      if (allowance < amountParsed) return { ok: false, error: `Insufficient allowance. Please approve ${this.hotWalletAddress} for ${currency}.` };

      return { ok: true };
    } catch {
      return { ok: false, error: 'Balance check failed, please try later' };
    }
  }

  async createRedPacket(
    roomId: string,
    senderId: string,
    totalAmount: number,
    totalCount: number,
    greeting: string | undefined,
    currency: ChatCurrency
  ): Promise<{ packet: RedPacket; message: Message } | null> {
    if (!this.rooms.has(roomId)) return null;
    if (totalAmount <= 0 || totalCount <= 0) return null;
    if (totalCount > 100) return null;

    const cents = Math.round(totalAmount * 100);
    if (cents < totalCount) return null;

    const sender = this.users.get(senderId);
    if (!sender) return null;
    if (!/^0x[a-fA-F0-9]{40}$/.test(sender.address)) return null;
    if (sender.address.startsWith('guest_')) return null;

    // 1) Move tokens from sender -> platform hot wallet on-chain (real custody deposit)
    const { decimals } = this.getTokenConfig(currency);
    const token = this.getTokenContract(currency);
    const amountParsed = this.parseTokenAmount(totalAmount, decimals);

    const tx = await token.connect(this.getHotWallet()).transferFrom(sender.address, this.hotWalletAddress, amountParsed);
    await tx.wait();

    // 2) Create red packet + reserve internal ledger balance
    const queue = this.createLuckyAmounts(totalAmount, totalCount);
    const message = this.addMessage(roomId, senderId, greeting || 'Red packet', 'redpacket', undefined, {});
    if (!message) return null;

    this.poolReservedBalances[currency] = Math.max(0, (this.poolReservedBalances[currency] || 0) + totalAmount);

    const packet: RedPacket = {
      id: uuid(),
      roomId,
      senderId,
      messageId: message.id,
      currency,
      totalAmount,
      remainingAmount: totalAmount,
      totalCount,
      remainingCount: totalCount,
      amountsQueue: queue,
      claimedBy: {},
      claimRecords: [],
      greeting,
      status: 'active',
      expiresAt: Date.now() + this.redPacketExpireMs,
      refundedAmount: 0,
      createdAt: Date.now(),
    };

    this.redPackets.set(packet.id, packet);
    this.updateRedPacketMessage(packet);
    this.persistToDisk();
    return {
      packet,
      message: {
        ...message,
        metadata: (this.messages.get(roomId) || []).find((m) => m.id === message.id)?.metadata,
      } as Message,
    };
  }

  claimRedPacket(packetId: string, userId: string): { packet: RedPacket; amount: number; message: Message } | null {
    const packet = this.redPackets.get(packetId);
    if (!packet || packet.status !== 'active') return null;
    this.settleExpiredPacket(packet);
    if (packet.status !== 'active') return null;
    if (packet.claimedBy[userId]) return null;
    if (packet.remainingCount <= 0 || packet.amountsQueue.length === 0) return null;

    const amount = packet.amountsQueue.shift()!;
    packet.claimedBy[userId] = amount;
    packet.claimRecords.push({ userId, amount, claimedAt: Date.now() });
    packet.remainingAmount = Math.max(0, this.normalizeAmount(packet.remainingAmount - amount));
    packet.remainingCount -= 1;
    if (packet.remainingCount <= 0 || packet.remainingAmount <= 0.000001) {
      packet.status = 'finished';
      packet.remainingCount = 0;
      packet.remainingAmount = 0;
    }

    this.ensureUserLedger(userId);
    this.userEscrowBalances.get(userId)![packet.currency] = (this.userEscrowBalances.get(userId)![packet.currency] || 0) + amount;

    this.updateRedPacketMessage(packet);
    this.persistToDisk();

    const message = (this.messages.get(packet.roomId) || []).find((m) => m.id === packet.messageId);
    if (!message) return null;
    return { packet, amount, message };
  }

  /**
   * Get user's internal red packet wallet balances.
   * - escrow: 已领取但未提现
   * - withdrawn: 已提现累计
   */
  getChatWalletBalances(userId: string): { walletAddress: string; escrow: Record<ChatCurrency, number>; withdrawn: Record<ChatCurrency, number> } {
    const user = this.users.get(userId);
    const walletAddress = user?.address || '';

    const escrow = this.userEscrowBalances.get(userId) || { USDT: 0, RWA: 0 };
    const withdrawn = this.userWithdrawnBalances.get(userId) || { USDT: 0, RWA: 0 };
    return { walletAddress, escrow, withdrawn };
  }

  async withdrawChatWallet(userId: string, currency: ChatCurrency, amount: number, toAddress: string): Promise<{ txHash: string; transferred: number }> {
    const user = this.users.get(userId);
    if (!user) throw new Error('User not found');
    if (!toAddress || !/^0x[a-fA-F0-9]{40}$/.test(toAddress)) throw new Error('Invalid withdraw address');
    if (amount <= 0) throw new Error('Invalid amount');

    this.ensureUserLedger(userId);
    const escrow = this.userEscrowBalances.get(userId)!;
    const available = escrow[currency] || 0;
    if (available < amount) {
      throw new Error(`Insufficient escrow balance for ${currency}`);
    }

    const token = this.getTokenContract(currency);
    const { decimals } = this.getTokenConfig(currency);
    const amountParsed = this.parseTokenAmount(amount, decimals);

    // 真实链上转账：platform hot wallet -> user wallet
    const tx = await token.connect(this.getHotWallet()).transfer(toAddress, amountParsed);
    const receipt = await tx.wait();

    // Ledger update only after tx is confirmed
    escrow[currency] = this.normalizeAmount((escrow[currency] || 0) - amount);
    this.poolReservedBalances[currency] = Math.max(0, (this.poolReservedBalances[currency] || 0) - amount);
    const withdrawn = this.userWithdrawnBalances.get(userId) || { USDT: 0, RWA: 0 };
    withdrawn[currency] = this.normalizeAmount((withdrawn[currency] || 0) + amount);
    this.userWithdrawnBalances.set(userId, withdrawn);

    this.persistToDisk();
    return { txHash: receipt?.hash || tx.hash, transferred: amount };
  }
}

export const chatService = new ChatService();
