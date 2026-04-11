// ============================================================
// RWA Aura Chat — Main Server Entry
// ============================================================

import dotenv from 'dotenv';
import { resolve } from 'path';
import { randomUUID } from 'crypto';
dotenv.config();

// Load backend env (token addresses / private keys) without overriding chat-server's own env.
// This is required for “real” red packet (A mode): server transfers tokens on-chain.
dotenv.config({ path: resolve(__dirname, '../../backend/.env'), override: false });

import express from 'express';
import fs from 'fs';
import { CHAT_UPLOAD_DIR } from './config/paths';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import apiRoutes from './routes/api';
import { chatService } from './services/chat-service';
import { botService } from './services/bot-service';
import { getLlmHealth } from './services/bot-llm';
import { verifySignature, isGuestAuth } from './middleware/auth';
import { verifyChatSessionToken } from './middleware/chat-session';
import { toPublicChatUser } from './utils/public-chat-user';
import { isAllowedChatImageUrl } from './utils/safe-image-url';
import { isAllowedQuickLinkPath } from './utils/quick-link';
import { textContainsOffPlatformContactSolicitation } from './utils/contact-solicitation';
import { ServerToClientEvents, ClientToServerEvents } from './models/types';

const app = express();
const httpServer = createServer(app);

/** 与 nginx / Next rewrites 约定一致；勿默认 3001，避免与主后端抢端口 */
const PORT = parseInt(process.env.PORT || '3002', 10);

/** 支持逗号分隔多个来源，例如：http://localhost:3000,https://rwa.lat */
function parseCorsOrigins(raw: string | undefined): string | string[] {
  const parts = (raw || 'http://localhost:3000')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length === 0) return 'http://localhost:3000';
  if (parts.length === 1) return parts[0];
  return parts;
}

const CORS_ORIGIN = parseCorsOrigins(process.env.CORS_ORIGIN);
const useNormalizedWrite =
  String(process.env.CHAT_DB_WRITE_NORMALIZED || '').trim() === '1' ||
  String(process.env.CHAT_STORAGE || '').trim().toLowerCase() === 'mysql';

// ─── Middleware ─────────────────────────────────────────
app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: '6mb' }));

fs.mkdirSync(CHAT_UPLOAD_DIR, { recursive: true });
app.use('/api/chat/uploads', express.static(CHAT_UPLOAD_DIR));

// ─── REST API ──────────────────────────────────────────
app.use('/api/chat', apiRoutes);

// Health check
app.get('/api/chat/health', (_req, res) => {
  const llm = getLlmHealth();
  res.json({
    status: 'ok',
    timestamp: Date.now(),
    rooms: chatService.getRooms().length,
    bots: botService.getAllBots().length,
    activeBots: botService.getAllBots().filter((b) => b.isActive).length,
    llm: {
      anthropicConfigured: llm.anthropicConfigured,
      openAiCompatConfigured: llm.openAiCompatConfigured,
      groqConfigured: llm.groqConfigured,
      openRouterConfigured: llm.openRouterConfigured,
      siliconFlowConfigured: llm.siliconFlowConfigured,
      xfyunConfigured: llm.xfyunConfigured,
      anthropicKeyCount: llm.anthropicKeyCount,
      openAiCompatKeyCount: llm.openAiCompatKeyCount,
      groqKeyCount: llm.groqKeyCount,
      openRouterKeyCount: llm.openRouterKeyCount,
      siliconFlowKeyCount: llm.siliconFlowKeyCount,
      tryOrder: llm.tryOrder,
      fallbackTemplates: llm.fallbackTemplatesAvailable,
      groqSucceededThisProcess: llm.groqSucceededThisProcess,
    },
  });
});

// ─── Socket.IO ─────────────────────────────────────────
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: { origin: CORS_ORIGIN, methods: ['GET', 'POST'], credentials: true },
  path: '/chat-ws',
});

// Socket auth middleware（会话令牌优先，免重复钱包签名）
io.use((socket, next) => {
  const auth = (socket.handshake.auth || {}) as {
    address?: string;
    signature?: string;
    sessionToken?: string;
  };
  const { address, signature, sessionToken } = auth;

  if (sessionToken && typeof sessionToken === 'string' && sessionToken.length > 8) {
    const recoveredAddr = verifyChatSessionToken(sessionToken);
    if (!recoveredAddr) {
      return next(new Error('Invalid or expired chat session'));
    }
    if (address && address.toLowerCase() !== recoveredAddr) {
      return next(new Error('Session address mismatch'));
    }
    (socket as any).walletAddress = recoveredAddr;
    const user = chatService.getUserByAddress(recoveredAddr);
    (socket as any).userId = user?.id;
    return next();
  }

  if (!address || signature == null || signature === '') {
    return next(new Error('Authentication required'));
  }
  const recovered = verifySignature(signature);
  const validWalletSig = !!recovered && recovered === address.toLowerCase();
  const validGuestSig = isGuestAuth(address, signature);
  if (!validWalletSig && !validGuestSig) {
    return next(new Error('Invalid signature'));
  }
  (socket as any).walletAddress = address.toLowerCase();
  const user = chatService.getUserByAddress(address);
  (socket as any).userId = user?.id;
  next();
});

io.on('connection', (socket) => {
  const userId = (socket as any).userId as string;
  const address = (socket as any).walletAddress as string;
  console.log(`[WS] Connected: ${address} (${userId})`);
  if (userId) {
    void chatService.onUserConnected(userId).catch(() => {});
  }

  // ─── Join Room ─────────────────────────────────────
  socket.on('room:join', (roomId, cb) => {
    if (!userId) return cb(false);
    const ok = chatService.joinRoom(roomId, userId);
    if (ok) {
      void chatService.onRoomJoined(roomId, userId).catch(() => {});
      socket.join(roomId);
      const user = chatService.getUser(userId);
      if (user) {
        socket.to(roomId).emit('user:join', user, roomId);
      }
    }
    cb(ok);
  });

  // ─── Leave Room ────────────────────────────────────
  socket.on('room:leave', (roomId) => {
    socket.leave(roomId);
    if (userId) {
      void chatService.onRoomLeft(roomId, userId).catch(() => {});
      socket.to(roomId).emit('user:leave', userId, roomId);
    }
  });

  // ─── Send Message ──────────────────────────────────
  socket.on('message:send', async ({ roomId, content, replyTo, messageType, metadata }, cb) => {
    const sanitizeIncomingText = (raw: string) =>
      String(raw || '')
        .replace(/\s+/g, ' ')
        .replace(/[!?？！]{2,}/g, '？')
        .replace(/[。\.]{3,}/g, '。')
        .trim();
    const sanitizedContent = sanitizeIncomingText(String(content || ''));
    if (!userId || !sanitizedContent) return cb({ ok: false, error: 'Empty message' });
    const permission = chatService.canSendMessage(roomId, userId, sanitizedContent);
    if (!permission.ok) return cb({ ok: false, error: permission.error || 'Permission denied' });
    const type = messageType === 'image' ? 'image' : 'text';
    if (type === 'image' && !isAllowedChatImageUrl(sanitizedContent)) {
      return cb({ ok: false, error: 'Invalid image URL (HTTPS allowlist only)' });
    }

    if (type === 'text' && textContainsOffPlatformContactSolicitation(sanitizedContent)) {
      return cb({
        ok: false,
        error: 'Off-platform contact solicitation is not allowed',
        errorCode: 'OFF_PLATFORM_CONTACT',
      });
    }

    let extraMeta: Record<string, unknown> | undefined;
    if (metadata && typeof metadata === 'object' && metadata !== null && 'quickLink' in metadata) {
      const ql = (metadata as { quickLink?: { path?: string; label?: string } }).quickLink;
      const path = typeof ql?.path === 'string' ? ql.path.trim() : '';
      if (!isAllowedQuickLinkPath(path)) {
        return cb({ ok: false, error: 'Invalid quick link path' });
      }
      const label = typeof ql?.label === 'string' ? ql.label.slice(0, 240) : content.trim().slice(0, 500);
      if (textContainsOffPlatformContactSolicitation(label)) {
        return cb({
          ok: false,
          error: 'Off-platform contact solicitation is not allowed',
          errorCode: 'OFF_PLATFORM_CONTACT',
        });
      }
      extraMeta = { quickLink: { path, label } };
    }

    const messageId = randomUUID();
    const messageTs = Date.now();
    const msgDraft = {
      id: messageId,
      roomId,
      userId,
      content: sanitizedContent,
      type,
      replyTo,
      timestamp: messageTs,
      edited: false,
      metadata: extraMeta as any,
    };

    const db = chatService.getDbStore();
    if (useNormalizedWrite && db) {
      try {
        await db.upsertMessage(msgDraft as any);
      } catch {
        return cb({ ok: false, error: 'Failed to persist message' });
      }
    }

    const msg = chatService.addMessage(roomId, userId, sanitizedContent, type, replyTo, extraMeta, {
      id: messageId,
      timestamp: messageTs,
    });
    if (msg) {
      const user = chatService.getUser(userId);
      if (user) {
        io.to(roomId).emit('message:new', { ...msg, user: toPublicChatUser(user) });
        // Probabilistic “real user” replies (simulates chat vibe)
        if (!user.isBot) {
          botService.maybeSendYieldSanityNudge(roomId, user, sanitizedContent, msg.id);
          botService.maybeRespondToUserMessage(roomId, user, sanitizedContent, msg.id);
        }
      }
      cb({ ok: true, data: msg });
    } else {
      cb({ ok: false, error: 'Failed to send message' });
    }
  });

  // ─── Edit Message ──────────────────────────────────
  socket.on('message:edit', async ({ messageId, content }, cb) => {
    const trimmed = typeof content === 'string' ? content.trim() : '';
    const found = chatService.findMessageById(messageId);
    if (!found) {
      return cb({ ok: false, error: 'Edit permission denied or message not found' });
    }
    if (found.message.type === 'text' && textContainsOffPlatformContactSolicitation(trimmed)) {
      return cb({
        ok: false,
        error: 'Off-platform contact solicitation is not allowed',
        errorCode: 'OFF_PLATFORM_CONTACT',
      });
    }
    const edited = chatService.editMessage(messageId, found.roomId, trimmed, userId);
    if (edited) {
      const db = chatService.getDbStore();
      if (useNormalizedWrite && db) {
        try {
          await db.markMessageEdited(messageId, trimmed);
        } catch {
          return cb({ ok: false, error: 'Failed to persist edited message' });
        }
      }
      io.to(found.roomId).emit('message:edit', edited);
      return cb({ ok: true, data: true });
    }
    cb({ ok: false, error: 'Edit permission denied or message not found' });
  });

  // ─── Create Red Packet ─────────────────────────────
  socket.on('redpacket:create', async ({ roomId, totalAmount, totalCount, greeting, currency }, cb) => {
    if (!userId) return cb({ ok: false, error: 'Authentication required' });
    const greet = typeof greeting === 'string' ? greeting.trim() : '';
    if (greet && textContainsOffPlatformContactSolicitation(greet)) {
      return cb({
        ok: false,
        error: 'Off-platform contact solicitation is not allowed',
        errorCode: 'OFF_PLATFORM_CONTACT',
      });
    }
    const permission = chatService.canSendMessage(roomId, userId, greet || '');
    if (!permission.ok) return cb({ ok: false, error: permission.error || 'Permission denied' });
    const cur = (String(currency || 'USDT').toUpperCase() as any) === 'RWA' ? 'RWA' : 'USDT';
    const balanceCheck = await chatService.validateRedPacketBalance(userId, totalAmount, cur);
    if (!balanceCheck.ok) return cb({ ok: false, error: balanceCheck.error || 'Insufficient balance' });

    const result = await chatService.createRedPacket(roomId, userId, totalAmount, totalCount, greeting, cur);
    if (!result) return cb({ ok: false, error: 'Invalid red packet parameters' });

    const user = chatService.getUser(userId);
    if (!user) return cb({ ok: false, error: 'User not found' });

    const db = chatService.getDbStore();
    if (useNormalizedWrite && db) {
      try {
        await db.upsertMessage(result.message as any);
      } catch {
        return cb({ ok: false, error: 'Failed to persist red packet message' });
      }
    }

    const messageWithUser = { ...result.message, user: toPublicChatUser(user) };
    io.to(roomId).emit('message:new', messageWithUser);
    cb({ ok: true, data: messageWithUser });
  });

  // ─── Claim Red Packet ──────────────────────────────
  socket.on('redpacket:claim', ({ packetId }, cb) => {
    if (!userId) return cb({ ok: false, error: 'Authentication required' });
    const result = chatService.claimRedPacket(packetId, userId);
    if (!result) return cb({ ok: false, error: 'Red packet cannot be claimed' });
    const db = chatService.getDbStore();
    if (useNormalizedWrite && db) {
      void db
        .upsertMessage(result.message as any)
        .then(() => {
          io.to(result.packet.roomId).emit('message:edit', result.message);
          cb({ ok: true, data: { amount: result.amount, message: result.message } });
        })
        .catch(() => {
          cb({ ok: false, error: 'Failed to persist red packet claim state' });
        });
      return;
    }
    io.to(result.packet.roomId).emit('message:edit', result.message);
    cb({ ok: true, data: { amount: result.amount, message: result.message } });
  });

  // ─── Typing Indicator ─────────────────────────────
  socket.on('user:typing', (roomId) => {
    if (userId) {
      socket.to(roomId).emit('user:typing', userId, roomId);
    }
  });

  // ─── Disconnect ────────────────────────────────────
  socket.on('disconnect', () => {
    if (userId) {
      chatService.setUserOffline(userId);
      void chatService.onUserDisconnected(userId).catch(() => {});
      console.log(`[WS] Disconnected: ${address}`);
    }
  });

  // Auto-join all public rooms
  const rooms = chatService.getRooms();
  rooms.forEach((room) => {
    if (room.isPublic) {
      socket.join(room.id);
    }
  });
});

// ─── Bot Message Broadcasting ──────────────────────────
botService.setMessageCallback((msg, roomId) => {
  io.to(roomId).emit('message:new', { ...msg, user: toPublicChatUser(msg.user) });
});

async function startServer() {
  await chatService.initializeStorage();

  // Auto bootstrap default bots (only once per server start)
  botService.bootstrapDefaultBots();
  botService.ensureAdminSupportBot();
  botService.ensureGroupOwnerBot();

  setInterval(() => {
    const changed = chatService.settleExpiredRedPackets();
    const db = chatService.getDbStore();
    if (useNormalizedWrite && db && changed.length > 0) {
      void Promise.all(changed.map((msg) => db.upsertMessage(msg as any)))
        .then(() => {
          changed.forEach((msg) => {
            io.to(msg.roomId).emit('message:edit', msg);
          });
        })
        .catch(() => {
          // DB sync failed: keep old behavior to avoid missing realtime updates.
          changed.forEach((msg) => {
            io.to(msg.roomId).emit('message:edit', msg);
          });
        });
      return;
    }
    changed.forEach((msg) => {
      io.to(msg.roomId).emit('message:edit', msg);
    });
  }, 15_000);

  // Admin scheduled professional broadcasts (Shanghai fixed times)
  setInterval(() => {
    try {
      botService.runAdminScheduledBroadcastTick();
    } catch (e) {
      console.error('[Bot] admin scheduled broadcast tick failed:', e);
    }
  }, 60_000);

  // ─── Start Server ──────────────────────────────────────
  httpServer.listen(PORT, () => {
    console.log(`
  ╔══════════════════════════════════════════╗
  ║   🚀 RWA Aura Chat Server              ║
  ║   Port: ${PORT}                            ║
  ║   WebSocket: /chat-ws                   ║
  ║   API: /api/chat                        ║
  ╚══════════════════════════════════════════╝
  `);

    const burst = Number(process.env.BOT_STARTUP_BURST_COUNT ?? 0);
    if (Number.isFinite(burst) && burst > 0) {
      const n = Math.min(50, Math.max(1, Math.floor(burst)));
      setTimeout(() => {
        void botService
          .triggerBotBurst('room-general', n)
          .then((r) => console.log('[Bots] startup burst:', r))
          .catch((e) => console.warn('[Bots] startup burst failed', e));
      }, 5_000);
    }
  });
}

void startServer().catch((e) => {
  console.error('[ChatServer] startup failed:', e);
  process.exit(1);
});
