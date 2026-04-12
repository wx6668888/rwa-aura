// ============================================================
// RWA Aura Chat — In-Memory Chat Service
// ============================================================

import { v4 as uuid } from 'uuid';
import fs from 'fs';
import path from 'path';
import { ethers } from 'ethers';
import { normalizeUtteranceKey } from '../utils/utterance-dedupe';
import { User, Message, Room, NodeLevel, RedPacket, ChatCurrency } from '../models/types';
import { getShanghaiHourMinute } from '../utils/shanghai-calendar';
import { isTimeContextContradiction } from './bot-human-sim';
import { ChatStateStore, OFFICIAL_CHAT_ROOM_ID_SET } from './chat-state-store';
import { toPublicChatUser } from '../utils/public-chat-user';

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

const INVITE_SUFFIX_ALPH = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

function randomInviteSuffix7(): string {
  const bytes = ethers.randomBytes(12);
  let s = '';
  for (let i = 0; i < 7; i += 1) {
    s += INVITE_SUFFIX_ALPH[Number(bytes[i]) % INVITE_SUFFIX_ALPH.length]!;
  }
  return s;
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
  private userMuteUntil = new Map<string, number>(); // userId -> mute-until timestamp(ms)
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
  private readonly storageMode = String(process.env.CHAT_STORAGE || 'file').trim().toLowerCase();
  private readonly dbStore = this.storageMode === 'mysql' ? new ChatStateStore() : null;
  private isHydratingFromDb = false;
  private persistInFlight = false;
  private persistPending = false;
  /** Normalized DB sync failures can make DB reads stale; degrade reads to memory until recovered. */
  private dbReadDegraded = false;

  constructor() {
    // Restore from disk if available, otherwise create defaults.
    const restored = this.loadFromDisk();
    if (!restored) {
      this.createDefaultRooms();
    }
    this.ensureAnnouncementFeedSeeded();
  }

  async initializeStorage(): Promise<void> {
    if (!this.dbStore) return;
    try {
      await this.dbStore.ensureSchema();
      const snapshot = await this.dbStore.loadSnapshot();
      if (snapshot && typeof snapshot === 'object') {
        this.isHydratingFromDb = true;
        this.applyLoadedState(snapshot as any);
        this.isHydratingFromDb = false;
        this.ensureAnnouncementFeedSeeded();
        await this.dbStore.syncNormalizedFromSnapshot(this.buildStateSnapshot());
        console.log('[ChatService] loaded state from MySQL snapshot');
        return;
      }
      const initial = this.buildStateSnapshot();
      await this.dbStore.saveSnapshot(initial);
      await this.dbStore.syncNormalizedFromSnapshot(initial);
      console.log('[ChatService] initialized MySQL snapshot from current state');
    } catch (e) {
      this.isHydratingFromDb = false;
      console.error('[ChatService] MySQL snapshot init failed, fallback to file mode behavior:', e);
    }
  }

  getDbStore(): ChatStateStore | null {
    return this.dbStore;
  }

  isDbReadEnabled(): boolean {
    return !this.dbReadDegraded && (
      String(process.env.CHAT_DB_READ_NORMALIZED || '').trim() === '1' ||
      String(process.env.CHAT_STORAGE || '').trim().toLowerCase() === 'mysql'
    );
  }

  async getStorageStatus(): Promise<{
    mode: string;
    dbEnabled: boolean;
    dbReadEnabled: boolean;
    dbWriteEnabled: boolean;
    dbHealthy: boolean;
    snapshotUpdatedAt: number | null;
    lastSnapshotSyncAt: number;
    lastNormalizedSyncAt: number;
  }> {
    const db = this.dbStore;
    const dbEnabled = !!db;
    if (!db) {
      return {
        mode: this.storageMode,
        dbEnabled: false,
        dbReadEnabled: this.isDbReadEnabled(),
        dbWriteEnabled: this.isDbWriteEnabled(),
        dbHealthy: false,
        snapshotUpdatedAt: null,
        lastSnapshotSyncAt: 0,
        lastNormalizedSyncAt: 0,
      };
    }
    const [dbHealthy, snapshotUpdatedAt] = await Promise.all([db.ping(), db.getSnapshotUpdatedAt()]);
    return {
      mode: this.storageMode,
      dbEnabled,
      dbReadEnabled: this.isDbReadEnabled(),
      dbWriteEnabled: this.isDbWriteEnabled(),
      dbHealthy,
      snapshotUpdatedAt,
      lastSnapshotSyncAt: db.getLastSnapshotSyncAt(),
      lastNormalizedSyncAt: db.getLastNormalizedSyncAt(),
    };
  }

  isDbWriteEnabled(): boolean {
    return (
      String(process.env.CHAT_DB_WRITE_NORMALIZED || '').trim() === '1' ||
      String(process.env.CHAT_STORAGE || '').trim().toLowerCase() === 'mysql'
    );
  }

  async onUserConnected(userId: string): Promise<void> {
    if (!userId) return;
    if (!this.isDbWriteEnabled() || !this.dbStore) return;
    await this.dbStore.setUserOnlineStatus(userId, true, Date.now());
  }

  async onUserDisconnected(userId: string): Promise<void> {
    if (!userId) return;
    if (!this.isDbWriteEnabled() || !this.dbStore) return;
    await this.dbStore.setUserOnlineStatus(userId, false, Date.now());
  }

  async onRoomJoined(roomId: string, userId: string): Promise<void> {
    if (!roomId || !userId) return;
    if (!this.isDbWriteEnabled() || !this.dbStore) return;
    await this.dbStore.addRoomMember(roomId, userId);
  }

  async onRoomLeft(roomId: string, userId: string): Promise<void> {
    if (!roomId || !userId) return;
    if (!this.isDbWriteEnabled() || !this.dbStore) return;
    await this.dbStore.removeRoomMember(roomId, userId);
  }

  async getRoomsForApi(userId?: string): Promise<Room[]> {
    const db = this.dbStore;
    if (this.isDbReadEnabled() && db) {
      try {
        const rooms = await db.getRoomsForUser(userId);
        return rooms as Room[];
      } catch {
        // fallback below
      }
    }
    return this.getRooms().filter((r) => {
      if (!userId) return OFFICIAL_CHAT_ROOM_ID_SET.has(r.id);
      return OFFICIAL_CHAT_ROOM_ID_SET.has(r.id) || r.memberIds.includes(userId);
    });
  }

  async getMessagesForApi(roomId: string, userId: string, limit = 50, before?: number): Promise<{ ok: boolean; status?: number; error?: string; messages?: any[] }> {
    const db = this.dbStore;
    if (this.isDbReadEnabled() && db) {
      try {
        const room = await db.getRoomById(roomId);
        if (!room) return { ok: false, status: 404, error: 'Room not found' };
        if (room.type === 'dm' && !(await db.isRoomMember(roomId, userId))) return { ok: false, status: 403, error: 'Forbidden' };
        const messages = await db.getMessagesByRoom(roomId, limit, before);
        const enriched = await Promise.all(
          messages.map(async (msg) => {
            const u = await db.getUserById(String(msg.userId));
            if (u) return { ...msg, user: toPublicChatUser(u as any) };
            // Fallback for legacy rows whose chat_users mapping is missing.
            const memUser = this.getUser(String(msg.userId));
            return { ...msg, user: memUser ? toPublicChatUser(memUser) : undefined };
          })
        );
        return { ok: true, messages: enriched };
      } catch {
        // fallback below
      }
    }
    const room = this.getRoom(roomId);
    if (!room) return { ok: false, status: 404, error: 'Room not found' };
    if (room.type === 'dm' && !this.isRoomMember(roomId, userId)) return { ok: false, status: 403, error: 'Forbidden' };
    const messages = this.getMessages(roomId, limit, before).map((msg) => {
      const u = this.getUser(msg.userId);
      return { ...msg, user: u ? toPublicChatUser(u) : undefined };
    });
    return { ok: true, messages };
  }

  async getMessagesAroundForApi(roomId: string, messageId: string, userId: string, limit = 50): Promise<{ ok: boolean; status?: number; error?: string; messages?: any[] }> {
    const db = this.dbStore;
    if (this.isDbReadEnabled() && db) {
      try {
        const room = await db.getRoomById(roomId);
        if (!room) return { ok: false, status: 404, error: 'Room not found' };
        if (room.type === 'dm' && !(await db.isRoomMember(roomId, userId))) return { ok: false, status: 403, error: 'Forbidden' };
        const messages = await db.getMessagesAround(roomId, messageId, limit);
        const enriched = await Promise.all(
          messages.map(async (msg) => {
            const u = await db.getUserById(String(msg.userId));
            if (u) return { ...msg, user: toPublicChatUser(u as any) };
            const memUser = this.getUser(String(msg.userId));
            return { ...msg, user: memUser ? toPublicChatUser(memUser) : undefined };
          })
        );
        return { ok: true, messages: enriched };
      } catch {
        // fallback below
      }
    }
    const room = this.getRoom(roomId);
    if (!room) return { ok: false, status: 404, error: 'Room not found' };
    if (room.type === 'dm' && !this.isRoomMember(roomId, userId)) return { ok: false, status: 403, error: 'Forbidden' };
    const messages = this.getMessagesAround(roomId, messageId, limit).map((msg) => {
      const u = this.getUser(msg.userId);
      return { ...msg, user: u ? toPublicChatUser(u) : undefined };
    });
    return { ok: true, messages };
  }

  async searchUsersForApi(address: string, limit = 5): Promise<User[]> {
    const db = this.dbStore;
    if (this.isDbReadEnabled() && db) {
      try {
        const matches = await db.searchUsersByAddressPrefix(address, limit);
        return matches.map((u) => toPublicChatUser(u as any)) as User[];
      } catch {
        // fallback below
      }
    }
    return this.searchUsersByAddressPrefix(address, limit)
      .filter((u) => !u.isBot)
      .slice(0, limit)
      .map((u) => toPublicChatUser(u));
  }

  async searchMessagesForApi(userId: string, q: string, limit = 40): Promise<Array<{ message: any; room: { id: string; name: string } }>> {
    const db = this.dbStore;
    if (this.isDbReadEnabled() && db) {
      try {
        const found = await db.searchMessagesGlobalByUserRooms(userId, q, limit);
        return Promise.all(
          found.map(async (msg) => {
            const u = await db.getUserById(String(msg.userId));
            const room = await db.getRoomById(String(msg.roomId));
            return {
              message: {
                ...msg,
                user: u ? toPublicChatUser(u as any) : (this.getUser(String(msg.userId)) ? toPublicChatUser(this.getUser(String(msg.userId)) as any) : undefined),
              },
              room: room ? { id: room.id, name: room.name } : { id: msg.roomId, name: msg.roomId },
            };
          })
        );
      } catch {
        // fallback below
      }
    }
    const found = this.searchMessagesGlobal(q, limit);
    return found.map((msg) => {
      const u = this.getUser(msg.userId);
      const room = this.getRoom(msg.roomId);
      return {
        message: { ...msg, user: u ? toPublicChatUser(u) : undefined },
        room: room ? { id: room.id, name: room.name } : { id: msg.roomId, name: msg.roomId },
      };
    });
  }

  async createReportForApi(input: {
    reporterUserId: string;
    targetUserId?: string;
    roomId?: string;
    messageId?: string;
    category: string;
    reasonText?: string;
  }): Promise<{ ok: boolean; id?: string; error?: string }> {
    const db = this.dbStore;
    if (!db) return { ok: false, error: 'Report storage not configured' };
    const id = uuid();
    try {
      await db.createReport({
        id,
        reporterUserId: input.reporterUserId,
        targetUserId: input.targetUserId,
        roomId: input.roomId,
        messageId: input.messageId,
        category: input.category,
        reasonText: input.reasonText,
        createdAt: Date.now(),
      });
      await db.appendAuditLog({
        id: uuid(),
        operatorUserId: input.reporterUserId,
        action: 'chat.report.create',
        targetType: 'report',
        targetId: id,
        detailJson: JSON.stringify({
          category: input.category,
          roomId: input.roomId || null,
          messageId: input.messageId || null,
          targetUserId: input.targetUserId || null,
        }),
        createdAt: Date.now(),
      });
      return { ok: true, id };
    } catch (e: any) {
      return { ok: false, error: e?.message || 'Failed to create report' };
    }
  }

  async listReportsForAdmin(status?: string, limit = 50): Promise<any[]> {
    const db = this.dbStore;
    if (!db) return [];
    return db.listReports(status, limit);
  }

  async listAuditLogsForAdmin(input?: {
    operatorUserId?: string;
    action?: string;
    fromMs?: number;
    toMs?: number;
    limit?: number;
    offset?: number;
  }): Promise<any[]> {
    const db = this.dbStore;
    if (!db) return [];
    return db.listAuditLogs(input);
  }

  async resolveReportForAdmin(input: {
    reportId: string;
    reviewerUserId: string;
    status: 'resolved' | 'rejected' | 'escalated';
    resolutionNote?: string;
    actions?: {
      deleteMessage?: boolean;
      removeRoomMember?: boolean;
      muteMinutes?: number;
    };
  }): Promise<{ ok: boolean; error?: string }> {
    const db = this.dbStore;
    if (!db) return { ok: false, error: 'Report storage not configured' };
    try {
      const report = await db.getReportById(input.reportId);
      if (!report) return { ok: false, error: 'Report not found' };

      const actions = input.actions || {};
      const actionResults: Record<string, any> = {};
      const targetUserId = String(report.targetUserId || '');
      const reportRoomId = String(report.roomId || '');
      const reportMessageId = String(report.messageId || '');

      if (actions.deleteMessage && reportMessageId) {
        let roomId = reportRoomId;
        if (!roomId) {
          const found = this.findMessageById(reportMessageId);
          roomId = found?.roomId || '';
        }
        const deleted = roomId ? this.deleteMessage(reportMessageId, roomId) : false;
        if (deleted && this.isDbWriteEnabled()) {
          try {
            await db.deleteMessageById(reportMessageId);
          } catch {
            // ignore db delete failure here; report flow should continue
          }
        }
        actionResults.deleteMessage = { requested: true, ok: deleted, messageId: reportMessageId, roomId: roomId || null };
      }

      if (actions.removeRoomMember && reportRoomId && targetUserId) {
        this.leaveRoom(reportRoomId, targetUserId);
        if (this.isDbWriteEnabled()) {
          try {
            await db.removeRoomMember(reportRoomId, targetUserId);
          } catch {
            // ignore db remove failure here; report flow should continue
          }
        }
        actionResults.removeRoomMember = { requested: true, ok: true, roomId: reportRoomId, userId: targetUserId };
      }

      if (Number(actions.muteMinutes || 0) > 0 && targetUserId) {
        const muteUntilMs = Date.now() + Math.floor(Number(actions.muteMinutes || 0)) * 60_000;
        this.setUserMuteUntil(targetUserId, muteUntilMs);
        if (this.isDbWriteEnabled()) {
          try {
            await db.setUserMuteUntil(targetUserId, muteUntilMs);
          } catch {
            // ignore db mute failure here; report flow should continue
          }
        }
        actionResults.muteUser = { requested: true, ok: true, userId: targetUserId, muteUntilMs };
      }

      const ok = await db.resolveReport(input.reportId, input.reviewerUserId, input.status, input.resolutionNote);
      if (!ok) return { ok: false, error: 'Report not found' };
      await db.appendAuditLog({
        id: uuid(),
        operatorUserId: input.reviewerUserId,
        action: 'chat.report.resolve',
        targetType: 'report',
        targetId: input.reportId,
        detailJson: JSON.stringify({
          status: input.status,
          resolutionNote: input.resolutionNote || null,
          actions: actionResults,
        }),
        createdAt: Date.now(),
      });
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e?.message || 'Failed to resolve report' };
    }
  }

  private normalizeLoadedState(data: {
    users?: User[];
    rooms?: Room[];
    messages?: Record<string, Message[]>;
    redPackets?: Record<string, RedPacket>;
    userEscrowBalances?: Record<string, Record<ChatCurrency, number>>;
    userWithdrawnBalances?: Record<string, Record<ChatCurrency, number>>;
    poolReservedBalances?: Record<ChatCurrency, number>;
    addressToUser?: Record<string, string>;
    botTopicPools?: Record<string, Array<Record<string, any>>>;
    userMuteUntil?: Record<string, number>;
  }) {
    this.users = new Map((data.users || []).map((u) => [u.id, u]));
    this.rooms = new Map((data.rooms || []).map((r) => [r.id, r]));
    this.messages = new Map(Object.entries(data.messages || {}));
    for (const [rid, msgs] of this.messages.entries()) {
      if (!Array.isArray(msgs)) {
        this.messages.set(rid, []);
        continue;
      }
      if (msgs.length > MAX_MESSAGES_PER_ROOM) {
        // Keep newest N messages; delete from earliest side.
        this.messages.set(rid, msgs.slice(-MAX_MESSAGES_PER_ROOM));
      }
    }
    for (const [rid, msgs] of this.messages.entries()) {
      if (!Array.isArray(msgs)) {
        this.messages.set(rid, []);
        continue;
      }
      if (msgs.length > MAX_MESSAGES_PER_ROOM) {
        // Keep newest N messages; delete from earliest side.
        this.messages.set(rid, msgs.slice(-MAX_MESSAGES_PER_ROOM));
      }
    }

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
    this.userMuteUntil = new Map(
      Object.entries((data.userMuteUntil || {}) as Record<string, number>).map(([k, v]) => [String(k), Number(v || 0)])
    );

    this.userEscrowBalances = new Map(Object.entries(data.userEscrowBalances || {}).map(([userId, balances]) => [userId, balances as any]));
    this.userWithdrawnBalances = new Map(
      Object.entries(data.userWithdrawnBalances || {}).map(([userId, balances]) => [userId, balances as any])
    );
    const pool = (data.poolReservedBalances || {}) as Record<ChatCurrency, number>;
    this.poolReservedBalances = {
      USDT: Number(pool.USDT || 0),
      RWA: Number(pool.RWA || 0),
    };
  }

  private applyLoadedState(data: {
    users?: User[];
    rooms?: Room[];
    messages?: Record<string, Message[]>;
    redPackets?: Record<string, RedPacket>;
    userEscrowBalances?: Record<string, Record<ChatCurrency, number>>;
    userWithdrawnBalances?: Record<string, Record<ChatCurrency, number>>;
    poolReservedBalances?: Record<ChatCurrency, number>;
    addressToUser?: Record<string, string>;
    botTopicPools?: Record<string, Array<Record<string, any>>>;
    userMuteUntil?: Record<string, number>;
  }): boolean {
    this.normalizeLoadedState(data);

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

    const wantPrune = String(process.env.CHAT_PRUNE_TIME_CONTRADICTIONS || '').trim() === '1';
    let pruned = 0;
    if (wantPrune) {
      pruned = this.pruneBotMessagesWithTimeContradictions();
      if (pruned > 0) {
        console.log(`[ChatService] pruned ${pruned} bot messages with time contradictions`);
      } else {
        console.log('[ChatService] prune time contradictions: nothing to remove');
      }
    }

    if ((avatarBackfill || roomGeneralRenamed || pruned > 0) && !this.isHydratingFromDb) this.persistToDisk();
    return this.rooms.size > 0;
  }

  private buildStateSnapshot() {
    return {
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
      userMuteUntil: Object.fromEntries(this.userMuteUntil.entries()),
    };
  }

  /**
   * 清理历史里“时间语义明显不对”的机器人文本（例：上午说下午/晚上）。
   * 仅对机器人 text 消息生效，避免误删真人聊天记录。
   */
  private pruneBotMessagesWithTimeContradictions(): number {
    let removed = 0;
    for (const [roomId, msgs] of this.messages.entries()) {
      if (!Array.isArray(msgs) || msgs.length === 0) continue;
      const kept: Message[] = [];
      for (const m of msgs) {
        if (!m || m.type !== 'text') {
          kept.push(m);
          continue;
        }
        const u = this.users.get(m.userId);
        if (!u || !u.isBot) {
          kept.push(m);
          continue;
        }
        const { hour } = getShanghaiHourMinute(new Date(m.timestamp));
        if (isTimeContextContradiction(String(m.content || ''), hour)) {
          removed += 1;
          continue;
        }
        kept.push(m);
      }
      if (kept.length !== msgs.length) this.messages.set(roomId, kept);
    }
    return removed;
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
      return this.applyLoadedState(data);
    } catch (err) {
      console.error('[ChatService] Failed to load persisted data:', err);
      return false;
    }
  }

  private persistToDbQueued() {
    if (!this.dbStore) return;
    if (this.persistInFlight) {
      this.persistPending = true;
      return;
    }
    this.persistInFlight = true;
    this.persistPending = false;
    const snapshot = this.buildStateSnapshot();
    void this.dbStore
      .saveSnapshot(snapshot)
      .then(() => this.dbStore!.syncNormalizedFromSnapshot(snapshot))
      .then(() => {
        this.dbReadDegraded = false;
      })
      .catch((err) => {
        console.error('[ChatService] Failed to persist MySQL snapshot:', err);
        this.dbReadDegraded = true;
      })
      .finally(() => {
        this.persistInFlight = false;
        if (this.persistPending) this.persistToDbQueued();
      });
  }

  private persistToDisk() {
    try {
      fs.mkdirSync(path.dirname(this.dataFilePath), { recursive: true });
      const payload = this.buildStateSnapshot();
      fs.writeFileSync(this.dataFilePath, JSON.stringify(payload, null, 2), 'utf8');
      if (this.dbStore) this.persistToDbQueued();
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

  searchUsersByAddressPrefix(prefix: string, limit = 10): User[] {
    const p = (prefix || '').trim().toLowerCase();
    if (!p) return [];
    if (p.length < 6) return []; // avoid excessive scans for short prefixes

    const out: User[] = [];
    for (const u of this.users.values()) {
      if ((u.address || '').toLowerCase().startsWith(p)) {
        out.push(u);
        if (out.length >= limit) break;
      }
    }
    return out;
  }

  /**
   * DM room membership check (private rooms must not be joinable by guessing roomId).
   * Public rooms are handled elsewhere.
   */
  isRoomMember(roomId: string, userId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;
    return room.memberIds.includes(userId);
  }

  private getOrCreateDmRoom(userAId: string, userBId: string): Room {
    const [a, b] = userAId <= userBId ? [userAId, userBId] : [userBId, userAId];

    for (const room of this.rooms.values()) {
      if (room.type !== 'dm') continue;
      if (room.memberIds.length !== 2) continue;
      const r0 = room.memberIds[0];
      const r1 = room.memberIds[1];
      if ((r0 === a && r1 === b) || (r0 === b && r1 === a)) {
        return room;
      }
    }

    const room: Room = {
      id: `dm-${uuid().slice(0, 8)}`,
      name: 'DM',
      description: '',
      type: 'dm',
      icon: '💬',
      ownerId: a,
      memberIds: [a, b],
      isPublic: false,
      minTokenGate: 0,
      createdAt: Date.now(),
    };
    this.rooms.set(room.id, room);
    this.messages.set(room.id, []);
    this.persistToDisk();
    return room;
  }

  getOrCreateDmRoomByAddresses(userAId: string, peerAddress: string): Room | null {
    const userB = this.getUserByAddress(peerAddress);
    if (!userB) return null;
    return this.getOrCreateDmRoom(userAId, userB.id);
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

  setUserMuteUntil(userId: string, untilMs: number) {
    const ts = Math.max(0, Math.floor(Number(untilMs || 0)));
    if (ts <= 0) {
      this.userMuteUntil.delete(userId);
    } else {
      this.userMuteUntil.set(userId, ts);
    }
    this.persistToDisk();
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

  private inviteCodeTaken(code: string): boolean {
    const c = String(code || '').toUpperCase();
    return Array.from(this.rooms.values()).some((r) => (r.inviteCode || '').toUpperCase() === c);
  }

  private generateUniqueInviteCode(): string {
    for (let i = 0; i < 48; i += 1) {
      const code = `RWA${randomInviteSuffix7()}`;
      if (!this.inviteCodeTaken(code)) return code;
    }
    return `RWA${uuid().replace(/-/g, '').slice(0, 7).toUpperCase()}`;
  }

  createRoom(name: string, description: string, ownerId: string, type: Room['type'] = 'group'): Room {
    const room: Room = {
      id: `room-${uuid().slice(0, 8)}`,
      name,
      description,
      type,
      ownerId,
      memberIds: [ownerId],
      isPublic: false,
      minTokenGate: 0,
      createdAt: Date.now(),
      inviteCode: type === 'group' ? this.generateUniqueInviteCode() : undefined,
    };
    this.rooms.set(room.id, room);
    this.messages.set(room.id, []);
    this.persistToDisk();
    return room;
  }

  /** 通过群邀请码加入用户自建群（非官方房） */
  joinGroupByInviteCode(userId: string, rawCode: string): { ok: boolean; error?: string; room?: Room } {
    if (!userId) return { ok: false, error: 'Not authenticated' };
    const code = String(rawCode || '').replace(/\s+/g, '').toUpperCase();
    if (!/^RWA[A-Z0-9]{7}$/.test(code)) return { ok: false, error: 'Invalid invite code' };
    const room = Array.from(this.rooms.values()).find((r) => (r.inviteCode || '').toUpperCase() === code);
    if (!room) return { ok: false, error: 'Room not found' };
    if (room.type !== 'group') return { ok: false, error: 'Cannot join this room by code' };
    if (OFFICIAL_CHAT_ROOM_ID_SET.has(room.id)) {
      return { ok: false, error: 'Open official rooms from the channel list' };
    }
    if (!room.memberIds.includes(userId)) {
      room.memberIds.push(userId);
      this.persistToDisk();
    }
    return { ok: true, room };
  }

  joinRoom(roomId: string, userId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    // DM rooms are private: only existing members can join the socket room.
    if (room.type === 'dm') {
      return this.isRoomMember(roomId, userId);
    }

    const openJoin = OFFICIAL_CHAT_ROOM_ID_SET.has(room.id) || room.isPublic;
    if (openJoin) {
      if (!room.memberIds.includes(userId)) {
        room.memberIds.push(userId);
        this.persistToDisk();
      }
      return true;
    }

    return this.isRoomMember(roomId, userId);
  }

  leaveRoom(roomId: string, userId: string) {
    const room = this.rooms.get(roomId);
    if (room) {
      room.memberIds = room.memberIds.filter((id) => id !== userId);
      this.persistToDisk();
    }
  }

  // ─── Messages ────────────────────────────────────────
  private normalizeUserTextForGuard(input: string): string {
    return String(input || '')
      .replace(/\s+/g, ' ')
      .replace(/[!?？！]{2,}/g, '？')
      .replace(/[。\.]{3,}/g, '。')
      .trim()
      .toLowerCase();
  }

  private textDiceSimilarity(a: string, b: string): number {
    if (!a || !b) return 0;
    if (a === b) return 1;
    const toBigrams = (s: string): string[] => {
      if (s.length < 2) return [s];
      const arr: string[] = [];
      for (let i = 0; i < s.length - 1; i += 1) arr.push(s.slice(i, i + 2));
      return arr;
    };
    const A = toBigrams(a);
    const B = toBigrams(b);
    const map = new Map<string, number>();
    for (const x of A) map.set(x, (map.get(x) || 0) + 1);
    let inter = 0;
    for (const x of B) {
      const n = map.get(x) || 0;
      if (n > 0) {
        inter += 1;
        map.set(x, n - 1);
      }
    }
    return (2 * inter) / (A.length + B.length);
  }

  canSendMessage(roomId: string, userId: string, content?: string): { ok: boolean; error?: string } {
    const room = this.rooms.get(roomId);
    const user = this.users.get(userId);
    if (!room || !user) return { ok: false, error: 'Room or user not found' };
    const muteUntilMs = Number(this.userMuteUntil.get(userId) || 0);
    if (muteUntilMs > Date.now()) {
      return { ok: false, error: `Muted until ${new Date(muteUntilMs).toISOString()}` };
    }

    // DM: sender must be a member.
    if (room.type === 'dm' && !this.isRoomMember(roomId, userId)) {
      return { ok: false, error: 'Not a DM participant' };
    }

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

    if (typeof content === 'string' && content.trim()) {
      const normalized = this.normalizeUserTextForGuard(content);
      const roomMsgs = this.getMessages(roomId, 80);
      const selfRecentText = roomMsgs
        .filter((m) => m.userId === userId && m.type === 'text' && now - m.timestamp <= 10 * 60_000)
        .slice(-10);

      // Low-value ping spam guard (e.g. "有人不/在吗") in short window.
      const lowValuePing = /^(有人(吗|不|在吗)?|在吗|有人在吗|哈喽|hello)[？?。!！\s]*$/i.test(normalized);
      if (lowValuePing) {
        const pingHits = selfRecentText.filter((m) =>
          /^(有人(吗|不|在吗)?|在吗|有人在吗|哈喽|hello)[？?。!！\s]*$/i.test(
            this.normalizeUserTextForGuard(m.content || '')
          )
        );
        if (pingHits.length >= 2) {
          return { ok: false, error: 'Low-value repeated ping detected. Please add specific content.' };
        }
      }

      // Duplicate and near-duplicate blocker in short horizon.
      for (let i = selfRecentText.length - 1; i >= 0; i -= 1) {
        const prev = selfRecentText[i]!;
        const prevNorm = this.normalizeUserTextForGuard(prev.content || '');
        const dt = now - prev.timestamp;
        if (!prevNorm) continue;
        if (normalized === prevNorm && dt <= 180_000) {
          return { ok: false, error: 'Duplicate message blocked. Please avoid repeated sending.' };
        }
        if (normalized.length >= 8 && prevNorm.length >= 8 && dt <= 180_000) {
          const sim = this.textDiceSimilarity(normalized, prevNorm);
          if (sim >= 0.9) {
            return { ok: false, error: 'Highly similar repeated message blocked.' };
          }
        }
      }
    }

    return { ok: true };
  }

  addMessage(
    roomId: string,
    userId: string,
    content: string,
    type: Message['type'] = 'text',
    replyTo?: string,
    metadata?: Record<string, any>,
    opts?: { id?: string; timestamp?: number; skipPersist?: boolean }
  ): Message | null {
    if (!this.rooms.has(roomId)) return null;

    const msg: Message = {
      id: opts?.id || uuid(),
      roomId,
      userId,
      content,
      type,
      replyTo,
      timestamp: Number(opts?.timestamp || Date.now()),
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

    if (!opts?.skipPersist) {
      this.persistToDisk();
    }
    return msg;
  }

  /** 距该房间最后真人发言的毫秒数；从未有真人发过则返回 Infinity（允许机器人主动暖场） */
  getMsSinceLastHumanMessage(roomId: string): number {
    const t = this.roomLastHumanMessageAt.get(roomId);
    if (t == null) return Number.POSITIVE_INFINITY;
    return Date.now() - t;
  }

  /** 该房间最后一次真人发言时间戳（ms）；从未有真人发过则为 0（勿与「map 未命中」混淆，持久化后会恢复） */
  getLastHumanMessageTimestamp(roomId: string): number {
    return this.roomLastHumanMessageAt.get(roomId) ?? 0;
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

    const room = this.rooms.get(roomId);
    if (room?.type === 'dm' && !this.isRoomMember(roomId, editorUserId)) {
      return null;
    }

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
  /**
   * 前端发红包前需对 spender 做 ERC20 approve；地址须与热钱包一致。
   * 不返回私钥；仅公开链上可见信息。
   */
  getRedPacketPublicConfig(): {
    spender: string;
    chainId: number;
    usdt: { address: string; decimals: number } | null;
    rwa: { address: string; decimals: number } | null;
  } | null {
    const pk = this.hotWalletPrivateKey;
    if (!pk) return null;
    try {
      const normalizedPk = pk.startsWith('0x') ? pk : `0x${pk}`;
      const spender = new ethers.Wallet(normalizedPk).address.toLowerCase();
      const usdt = this.usdtTokenAddress
        ? { address: this.usdtTokenAddress.toLowerCase(), decimals: this.usdtTokenDecimals }
        : null;
      const rwa = this.rwaTokenAddress
        ? { address: this.rwaTokenAddress.toLowerCase(), decimals: this.rwaTokenDecimals }
        : null;
      if (!usdt && !rwa) return null;
      return { spender, chainId: 56, usdt, rwa };
    } catch {
      return null;
    }
  }

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
