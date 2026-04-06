// ============================================================
// RWA Aura Chat — Type Definitions
// ============================================================

/** Node level codes matching frontend/lib/node-levels.ts */
export type NodeLevel = 'L1' | 'L2' | 'L3' | 'L4' | 'L5' | 'L6' | 'L7' | 'L8' | 'L9';

export type ChatCurrency = 'USDT' | 'RWA';

export interface User {
  id: string;
  address: string;           // wallet address (0x...)
  nickname: string;
  avatar?: string;
  nodeLevel: NodeLevel;
  isBot: boolean;
  isAdmin: boolean;
  isOnline: boolean;
  lastSeen: number;          // unix ms
  createdAt: number;
}

export interface Message {
  id: string;
  roomId: string;
  userId: string;
  content: string;
  type: 'text' | 'image' | 'system' | 'chain-event' | 'redpacket';
  replyTo?: string;          // message id
  timestamp: number;
  edited: boolean;
  metadata?: Record<string, any>;
}

export interface RedPacket {
  id: string;
  roomId: string;
  senderId: string;
  messageId: string;
  currency: ChatCurrency;
  totalAmount: number;
  remainingAmount: number;
  totalCount: number;
  remainingCount: number;
  amountsQueue: number[];
  claimedBy: Record<string, number>;
  claimRecords: Array<{ userId: string; amount: number; claimedAt: number }>;
  greeting?: string;
  status: 'active' | 'finished' | 'expired' | 'refunded';
  expiresAt: number;
  refundedAmount: number;
  createdAt: number;
}

export interface Room {
  id: string;
  name: string;
  description: string;
  type: 'group' | 'channel' | 'dm';
  icon?: string;
  ownerId: string;
  memberIds: string[];
  isPublic: boolean;
  minTokenGate: number;      // minimum RWA balance required (0 = no gate)
  createdAt: number;
}

/** community=氛围组；admin_support=官方客服；group_owner=群主 */
export type BotRole = 'community' | 'admin_support' | 'group_owner';

export interface Bot {
  id: string;
  userId: string;            // linked User.id
  name: string;
  persona: string;           // system prompt / personality description
  avatar?: string;
  isActive: boolean;
  roomIds: string[];         // rooms the bot participates in
  schedule: BotSchedule;
  createdAt: number;
  /** 未设置时视为 community（兼容旧数据） */
  role?: BotRole;
}

export interface BotSchedule {
  enabled: boolean;
  minIntervalMs: number;     // minimum gap between messages
  maxIntervalMs: number;     // maximum gap
  activeHoursStart: number;  // 0-23
  activeHoursEnd: number;    // 0-23
  timezone: string;          // e.g. 'Asia/Shanghai'
}

export interface AckSuccess<T> {
  ok: true;
  data: T;
}

export interface AckError {
  ok: false;
  error: string;
  /** Machine-readable code for client i18n (e.g. OFF_PLATFORM_CONTACT) */
  errorCode?: string;
}

export type Ack<T> = AckSuccess<T> | AckError;

/** Socket.IO event payloads */
export interface ServerToClientEvents {
  'message:new': (msg: Message & { user: User }) => void;
  'message:edit': (msg: Message) => void;
  'message:delete': (msgId: string) => void;
  'user:join': (user: User, roomId: string) => void;
  'user:leave': (userId: string, roomId: string) => void;
  'user:typing': (userId: string, roomId: string) => void;
  'room:update': (room: Room) => void;
}

export interface ClientToServerEvents {
  'message:send': (
    data: {
      roomId: string;
      content: string;
      replyTo?: string;
      messageType?: 'text' | 'image';
      metadata?: Record<string, unknown>;
    },
    cb: (ack: Ack<Message>) => void
  ) => void;
  'message:edit': (data: { messageId: string; content: string }, cb: (ack: Ack<true>) => void) => void;
  'redpacket:create': (
    data: { roomId: string; totalAmount: number; totalCount: number; greeting?: string; currency: ChatCurrency },
    cb: (ack: Ack<Message>) => void
  ) => void;
  'redpacket:claim': (data: { packetId: string }, cb: (ack: Ack<{ amount: number; message: Message }>) => void) => void;
  'room:join': (roomId: string, cb: (ok: boolean) => void) => void;
  'room:leave': (roomId: string) => void;
  'user:typing': (roomId: string) => void;
}
