// ============================================================
// RWA Aura Chat — REST API Routes
// ============================================================

import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { v4 as uuid } from 'uuid';
import { chatService } from '../services/chat-service';
import { botService } from '../services/bot-service';
import { toPublicChatUser } from '../utils/public-chat-user';
import { authMiddleware, getAuthMessage, verifySignature, isGuestAuth, requireAdmin } from '../middleware/auth';
import { textContainsOffPlatformContactSolicitation } from '../utils/contact-solicitation';
import { CHAT_UPLOAD_DIR } from '../config/paths';
import { NodeLevel, ChatCurrency } from '../models/types';

const router = Router();

// ─── Auth ──────────────────────────────────────────────
router.get('/auth/message', (_req: Request, res: Response) => {
  res.json({ message: getAuthMessage() });
});

router.post('/auth/login', (req: Request, res: Response) => {
  const { address, signature, nickname, nodeLevel } = req.body;

  if (!address || !signature) {
    return res.status(400).json({ error: 'address and signature required' });
  }

  const recovered = verifySignature(signature);
  const validWalletSig = !!recovered && recovered === address.toLowerCase();
  const validGuestSig = isGuestAuth(address, signature);
  if (!validWalletSig && !validGuestSig) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const user = chatService.createUser(address, nickname, nodeLevel as NodeLevel);
  res.json({ user });
});

router.put('/me/nickname', authMiddleware, (req: Request, res: Response) => {
  const userId = (req as any).userId as string | undefined;
  if (!userId) return res.status(401).json({ error: 'Authentication required' });
  const nickname = typeof req.body?.nickname === 'string' ? req.body.nickname.trim() : '';
  if (!nickname) return res.status(400).json({ error: 'nickname required' });
  const user = chatService.updateUserNickname(userId, nickname);
  if (!user) return res.status(400).json({ error: 'Failed to update nickname' });
  return res.json({ user: toPublicChatUser(user) });
});

/** 相册图片：前端 data URL → 落盘 → 返回同源路径（供 messageType:image 使用） */
router.post('/upload/image', authMiddleware, (req: Request, res: Response) => {
  const userId = (req as any).userId as string | undefined;
  if (!userId) return res.status(401).json({ error: 'Login to chat first' });

  const raw = req.body?.imageBase64;
  if (typeof raw !== 'string') {
    return res.status(400).json({ error: 'imageBase64 (data URL) required' });
  }
  const trimmed = raw.trim();
  const m = /^data:(image\/(?:jpeg|jpg|png|gif|webp));base64,([\s\S]+)$/i.exec(trimmed);
  if (!m) {
    return res.status(400).json({ error: 'expected data:image/jpeg|png|gif|webp;base64,...' });
  }
  const mime = m[1].toLowerCase();
  const b64 = m[2].replace(/\s/g, '');
  let buf: Buffer;
  try {
    buf = Buffer.from(b64, 'base64');
  } catch {
    return res.status(400).json({ error: 'invalid base64' });
  }
  if (buf.length < 32) return res.status(400).json({ error: 'image too small' });
  if (buf.length > 4 * 1024 * 1024) return res.status(400).json({ error: 'max 4MB' });

  const ext = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : mime.includes('gif') ? 'gif' : 'jpg';
  fs.mkdirSync(CHAT_UPLOAD_DIR, { recursive: true });
  const name = `${uuid()}.${ext}`;
  fs.writeFileSync(path.join(CHAT_UPLOAD_DIR, name), buf);
  res.json({ url: `/api/chat/uploads/${name}` });
});

// ─── Rooms ─────────────────────────────────────────────
router.get('/rooms', (_req: Request, res: Response) => {
  const rooms = chatService.getRooms();
  res.json({ rooms });
});

router.get('/rooms/:roomId', (req: Request, res: Response) => {
  const room = chatService.getRoom(req.params.roomId as string);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  res.json({ room });
});

/** Member roster for modal (nickname + address); requires chat auth */
router.get('/rooms/:roomId/members', authMiddleware, (req: Request, res: Response) => {
  const roomId = req.params.roomId as string;
  if (!chatService.getRoom(roomId)) return res.status(404).json({ error: 'Room not found' });
  const users = chatService.getRoomMemberUsers(roomId);
  res.json({
    members: users.map((u) => toPublicChatUser(u)),
  });
});

router.post('/rooms', authMiddleware, (req: Request, res: Response) => {
  const { name, description, type } = req.body;
  const userId = (req as any).userId as string | undefined;
  if (!userId) return res.status(401).json({ error: 'User not found; login to chat first' });
  if (!name) return res.status(400).json({ error: 'name required' });
  const room = chatService.createRoom(name, description || '', userId, type);
  res.json({ room });
});

// ─── Messages ──────────────────────────────────────────
router.get('/rooms/:roomId/messages', (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const before = req.query.before ? parseInt(req.query.before as string) : undefined;
  const messages = chatService.getMessages(req.params.roomId as string, limit, before);

  // Enrich with user data
  const enriched = messages.map((msg) => {
    const u = chatService.getUser(msg.userId);
    return {
      ...msg,
      user: u ? toPublicChatUser(u) : undefined,
    };
  });

  res.json({ messages: enriched });
});

/** 定位到某条消息附近的一页（用于从搜索结果跳转） */
router.get('/rooms/:roomId/messages/around/:messageId', (req: Request, res: Response) => {
  const roomId = req.params.roomId as string;
  const messageId = req.params.messageId as string;
  if (!chatService.getRoom(roomId)) return res.status(404).json({ error: 'Room not found' });
  const limit = Math.min(100, Math.max(10, parseInt(req.query.limit as string) || 50));
  const messages = chatService.getMessagesAround(roomId, messageId, limit);
  const enriched = messages.map((msg) => {
    const u = chatService.getUser(msg.userId);
    return {
      ...msg,
      user: u ? toPublicChatUser(u) : undefined,
    };
  });
  res.json({ messages: enriched });
});

/** 跨房间搜索聊天记录（需钱包/访客签名） */
router.get('/search/messages', authMiddleware, (req: Request, res: Response) => {
  const userId = (req as any).userId as string | undefined;
  if (!userId) return res.status(401).json({ error: 'Authentication required' });
  const q = String(req.query.q || '').trim();
  const limit = Math.min(80, Math.max(1, parseInt(req.query.limit as string) || 40));
  if (q.length < 2) {
    return res.json({ results: [] });
  }
  const found = chatService.searchMessagesGlobal(q, limit);
  const results = found.map((msg) => {
    const u = chatService.getUser(msg.userId);
    const room = chatService.getRoom(msg.roomId);
    return {
      message: {
        ...msg,
        user: u ? toPublicChatUser(u) : undefined,
      },
      room: room
        ? { id: room.id, name: room.name }
        : { id: msg.roomId, name: msg.roomId },
    };
  });
  res.json({ results });
});

router.post('/rooms/:roomId/redpackets', authMiddleware, async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  const roomId = req.params.roomId as string;
  const { totalAmount, totalCount, greeting, currency } = req.body || {};
  const greet = typeof greeting === 'string' ? greeting.trim() : '';
  if (greet && textContainsOffPlatformContactSolicitation(greet)) {
    return res.status(400).json({ error: 'Off-platform contact solicitation is not allowed', errorCode: 'OFF_PLATFORM_CONTACT' });
  }

  const cur = (String(currency || 'USDT').toUpperCase() as ChatCurrency) || 'USDT';
  if (cur !== 'USDT' && cur !== 'RWA') {
    return res.status(400).json({ error: 'Invalid currency' });
  }

  const permission = chatService.canSendMessage(roomId, userId);
  if (!permission.ok) {
    return res.status(400).json({ error: permission.error || 'Cannot send in this room' });
  }
  const balanceCheck = await chatService.validateRedPacketBalance(userId, Number(totalAmount), cur);
  if (!balanceCheck.ok) {
    return res.status(400).json({ error: balanceCheck.error || 'Insufficient balance' });
  }

  let result: any = null;
  try {
    result = await chatService.createRedPacket(
    roomId,
    userId,
    Number(totalAmount),
    Number(totalCount),
    typeof greeting === 'string' ? greeting.trim() : undefined,
    cur
    );
  } catch (e: any) {
    return res.status(400).json({ error: e?.message || 'Failed to create red packet' });
  }
  if (!result) return res.status(400).json({ error: 'Invalid red packet parameters' });
  const user = chatService.getUser(userId);
  res.json({
    packet: result.packet,
    message: { ...result.message, user: user ? toPublicChatUser(user) : undefined },
  });
});

router.post('/redpackets/:packetId/claim', authMiddleware, (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  const packetId = req.params.packetId as string;
  const result = chatService.claimRedPacket(packetId, userId);
  if (!result) {
    return res.status(400).json({ error: 'Red packet cannot be claimed' });
  }
  res.json({ amount: result.amount, packet: result.packet, message: result.message });
});

// ─── Chat Wallet (Red packet escrow) ──────────────────
router.get('/wallet/balances', authMiddleware, (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  const data = chatService.getChatWalletBalances(userId);
  res.json({ walletAddress: data.walletAddress, balances: data.escrow, withdrawn: data.withdrawn });
});

router.post('/wallet/withdraw', authMiddleware, async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  const { currency, amount } = req.body || {};
  const cur = (String(currency || 'USDT').toUpperCase() as ChatCurrency) || 'USDT';
  if (cur !== 'USDT' && cur !== 'RWA') {
    return res.status(400).json({ error: 'Invalid currency' });
  }

  const amt = Number(amount);
  if (!Number.isFinite(amt) || amt <= 0) {
    return res.status(400).json({ error: 'Invalid amount' });
  }

  const user = chatService.getUser(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  try {
    const resTx = await chatService.withdrawChatWallet(userId, cur, amt, (req as any).walletAddress as string);
    res.json({ ok: true, ...resTx });
  } catch (e: any) {
    res.status(400).json({ ok: false, error: e?.message || 'Withdraw failed' });
  }
});

router.get('/redpackets/:packetId/records', authMiddleware, (req: Request, res: Response) => {
  const packet = chatService.getRedPacket(req.params.packetId as string);
  if (!packet) return res.status(404).json({ error: 'Red packet not found' });
  const records = packet.claimRecords
    .map((r) => ({
      ...r,
      nickname: chatService.getUser(r.userId)?.nickname || 'Unknown',
    }))
    .sort((a, b) => a.claimedAt - b.claimedAt);
  res.json({
    packet: {
      id: packet.id,
      totalAmount: packet.totalAmount,
      remainingAmount: packet.remainingAmount,
      totalCount: packet.totalCount,
      remainingCount: packet.remainingCount,
      status: packet.status,
      refundedAmount: packet.refundedAmount,
      expiresAt: packet.expiresAt,
    },
    records,
  });
});

// ─── Online Users ──────────────────────────────────────
router.get('/rooms/:roomId/online', (req: Request, res: Response) => {
  const users = chatService.getOnlineUsers(req.params.roomId as string);
  res.json({ users });
});

// ─── Bot Management ────────────────────────────────────
router.get('/bots', (_req: Request, res: Response) => {
  const bots = botService.getAllBots();
  res.json({ bots });
});

router.post('/bots', authMiddleware, requireAdmin, (req: Request, res: Response) => {
  const { name, persona, avatar } = req.body;
  if (!name || !persona) {
    return res.status(400).json({ error: 'name and persona required' });
  }
  const bot = botService.createBot(name, persona, avatar);
  res.json({ bot });
});

router.put('/bots/:botId', authMiddleware, requireAdmin, (req: Request, res: Response) => {
  const { name, persona, avatar, roomIds, schedule } = req.body;
  const bot = botService.updateBot(req.params.botId as string, { name, persona, avatar, roomIds, schedule });
  if (!bot) return res.status(404).json({ error: 'Bot not found' });
  res.json({ bot });
});

router.delete('/bots/:botId', authMiddleware, requireAdmin, (req: Request, res: Response) => {
  const ok = botService.deleteBot(req.params.botId as string);
  res.json({ success: ok });
});

router.post('/bots/:botId/start', authMiddleware, requireAdmin, (req: Request, res: Response) => {
  const ok = botService.startBot(req.params.botId as string);
  res.json({ success: ok });
});

router.post('/bots/:botId/stop', authMiddleware, requireAdmin, (req: Request, res: Response) => {
  const ok = botService.stopBot(req.params.botId as string);
  res.json({ success: ok });
});

router.post('/bots/:botId/trigger', authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  const { roomId } = req.body;
  if (!roomId) return res.status(400).json({ error: 'roomId required' });
  const msg = await botService.triggerBotMessage(req.params.botId as string, roomId);
  if (!msg) return res.status(500).json({ error: 'Failed to generate message' });
  res.json({ message: msg });
});

/** 仅本机：连发机器人消息做现场测试（跳过真人静默与房间节流） */
function isLocalhostChatReq(req: Request): boolean {
  const raw = req.socket.remoteAddress || '';
  const ip = raw.replace(/^::ffff:/, '');
  return ip === '127.0.0.1' || ip === '::1';
}

router.post('/internal/trigger-bot-burst', async (req: Request, res: Response) => {
  if (!isLocalhostChatReq(req)) {
    return res.status(403).json({ error: 'localhost only' });
  }
  const roomId = typeof req.body?.roomId === 'string' ? req.body.roomId.trim() : 'room-general';
  const maxBots = Number(req.body?.maxBots);
  const cap = Number.isFinite(maxBots) && maxBots > 0 && maxBots <= 50 ? Math.floor(maxBots) : 15;
  const out = await botService.triggerBotBurst(roomId, cap);
  res.json({ ok: true, roomId, ...out });
});

/**
 * 仅本机：手动触发“管理员每日播报”（用于试播/验文案）。
 * Body:
 * - weekdayIdx: number (0=Mon..6=Sun) required
 * - slot: 'morning'|'afternoon'|'night' optional
 * - variant: 'long'|'medium' optional
 * - roomIds: string[] optional (default BOT_ADMIN_BROADCAST_ROOMS)
 */
router.post('/internal/admin-broadcast-test', (req: Request, res: Response) => {
  if (!isLocalhostChatReq(req)) {
    return res.status(403).json({ error: 'localhost only' });
  }
  const weekdayIdx = Number(req.body?.weekdayIdx);
  if (!Number.isFinite(weekdayIdx)) {
    return res.status(400).json({ error: 'weekdayIdx required (0=Mon..6=Sun)' });
  }
  const slot = typeof req.body?.slot === 'string' ? req.body.slot.trim() : 'morning';
  const variant = typeof req.body?.variant === 'string' ? req.body.variant.trim() : undefined;
  const force = req.body?.force === true;

  const roomIdsRaw = String(process.env.BOT_ADMIN_BROADCAST_ROOMS || 'room-announcements,room-general');
  const roomIds: string[] = Array.isArray(req.body?.roomIds)
    ? (req.body.roomIds as any[]).map((x) => String(x || '').trim()).filter(Boolean)
    : roomIdsRaw.split(',').map((s) => s.trim()).filter(Boolean);

  const out = botService.triggerAdminBroadcastManual({
    roomIds,
    weekdayIdx,
    slot: slot as any,
    variant: variant as any,
    now: new Date(),
    force,
  });
  res.json(out);
});

export default router;
