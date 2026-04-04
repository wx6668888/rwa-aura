// ============================================================
// RWA Aura Chat — Main Server Entry
// ============================================================

import dotenv from 'dotenv';
import { resolve } from 'path';
dotenv.config();

// Load backend env (token addresses / private keys) without overriding chat-server's own env.
// This is required for “real” red packet (A mode): server transfers tokens on-chain.
dotenv.config({ path: resolve(__dirname, '../../backend/.env'), override: false });

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import apiRoutes from './routes/api';
import { chatService } from './services/chat-service';
import { botService } from './services/bot-service';
import { verifySignature, isGuestAuth } from './middleware/auth';
import { ServerToClientEvents, ClientToServerEvents } from './models/types';

const app = express();
const httpServer = createServer(app);

const PORT = parseInt(process.env.PORT || '3001');

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

// ─── Middleware ─────────────────────────────────────────
app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
app.use(express.json());

// ─── REST API ──────────────────────────────────────────
app.use('/api/chat', apiRoutes);

// Health check
app.get('/api/chat/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now(), rooms: chatService.getRooms().length });
});

// ─── Socket.IO ─────────────────────────────────────────
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: { origin: CORS_ORIGIN, methods: ['GET', 'POST'], credentials: true },
  path: '/chat-ws',
});

// Socket auth middleware
io.use((socket, next) => {
  const { address, signature } = socket.handshake.auth;
  if (!address || !signature) {
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

  // ─── Join Room ─────────────────────────────────────
  socket.on('room:join', (roomId, cb) => {
    if (!userId) return cb(false);
    const ok = chatService.joinRoom(roomId, userId);
    if (ok) {
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
      socket.to(roomId).emit('user:leave', userId, roomId);
    }
  });

  // ─── Send Message ──────────────────────────────────
  socket.on('message:send', ({ roomId, content, replyTo }, cb) => {
    if (!userId || !content.trim()) return cb({ ok: false, error: 'Empty message' });
    const permission = chatService.canSendMessage(roomId, userId);
    if (!permission.ok) return cb({ ok: false, error: permission.error || 'Permission denied' });
    const msg = chatService.addMessage(roomId, userId, content.trim(), 'text', replyTo);
    if (msg) {
      const user = chatService.getUser(userId);
      if (user) {
        io.to(roomId).emit('message:new', { ...msg, user });
        // Probabilistic “real user” replies (simulates chat vibe)
        if (!user.isBot) {
          botService.maybeRespondToUserMessage(roomId, user, content.trim());
        }
      }
      cb({ ok: true, data: msg });
    } else {
      cb({ ok: false, error: 'Failed to send message' });
    }
  });

  // ─── Edit Message ──────────────────────────────────
  socket.on('message:edit', ({ messageId, content }, cb) => {
    // Simplified: find room and edit
    const rooms = chatService.getRooms();
    for (const room of rooms) {
      const edited = chatService.editMessage(messageId, room.id, content, userId);
      if (edited) {
        io.to(room.id).emit('message:edit', edited);
        return cb({ ok: true, data: true });
      }
    }
    cb({ ok: false, error: 'Edit permission denied or message not found' });
  });

  // ─── Create Red Packet ─────────────────────────────
  socket.on('redpacket:create', async ({ roomId, totalAmount, totalCount, greeting, currency }, cb) => {
    if (!userId) return cb({ ok: false, error: 'Authentication required' });
    const permission = chatService.canSendMessage(roomId, userId);
    if (!permission.ok) return cb({ ok: false, error: permission.error || 'Permission denied' });
    const cur = (String(currency || 'USDT').toUpperCase() as any) === 'RWA' ? 'RWA' : 'USDT';
    const balanceCheck = await chatService.validateRedPacketBalance(userId, totalAmount, cur);
    if (!balanceCheck.ok) return cb({ ok: false, error: balanceCheck.error || 'Insufficient balance' });

    const result = await chatService.createRedPacket(roomId, userId, totalAmount, totalCount, greeting, cur);
    if (!result) return cb({ ok: false, error: 'Invalid red packet parameters' });

    const user = chatService.getUser(userId);
    if (!user) return cb({ ok: false, error: 'User not found' });

    const messageWithUser = { ...result.message, user };
    io.to(roomId).emit('message:new', messageWithUser);
    cb({ ok: true, data: messageWithUser });
  });

  // ─── Claim Red Packet ──────────────────────────────
  socket.on('redpacket:claim', ({ packetId }, cb) => {
    if (!userId) return cb({ ok: false, error: 'Authentication required' });
    const result = chatService.claimRedPacket(packetId, userId);
    if (!result) return cb({ ok: false, error: 'Red packet cannot be claimed' });
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
  io.to(roomId).emit('message:new', msg);
});

// Auto bootstrap default bots (only once per server start)
botService.bootstrapDefaultBots();

setInterval(() => {
  const changed = chatService.settleExpiredRedPackets();
  changed.forEach((msg) => {
    io.to(msg.roomId).emit('message:edit', msg);
  });
}, 15_000);

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
});
