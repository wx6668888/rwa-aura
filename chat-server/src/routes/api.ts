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
import { issueChatSessionToken, verifyChatSessionToken } from '../middleware/chat-session';
import { textContainsOffPlatformContactSolicitation } from '../utils/contact-solicitation';
import { CHAT_UPLOAD_DIR } from '../config/paths';
import { NodeLevel, ChatCurrency } from '../models/types';
import { appendSupportFeedback, type SupportSheetFeedbackRow } from '../services/support-feedback-store';

const router = Router();

/** 官方客服弹层：匿名按 IP 滑动窗口限流（无需钱包签名） */
const supportAskIpTimestamps = new Map<string, number[]>();
function getSupportClientIp(req: Request): string {
  const xf = req.headers['x-forwarded-for'];
  const raw = typeof xf === 'string' ? xf.split(',')[0]?.trim() : '';
  if (raw) return raw.slice(0, 64);
  const ip = String(req.socket.remoteAddress || '').replace(/^::ffff:/, '');
  return ip.slice(0, 64) || 'unknown';
}
function allowSupportAskByIp(ip: string, maxPerMinute: number): boolean {
  const key = `ip:${ip}`;
  const now = Date.now();
  const windowMs = 60_000;
  const prev = (supportAskIpTimestamps.get(key) || []).filter((t) => now - t < windowMs);
  if (prev.length >= maxPerMinute) {
    supportAskIpTimestamps.set(key, prev);
    return false;
  }
  prev.push(now);
  supportAskIpTimestamps.set(key, prev);
  return true;
}

function tryGetUserIdFromWalletHeaders(req: Request): string | undefined {
  const address = req.headers['x-wallet-address'] as string | undefined;
  const signature = req.headers['x-wallet-signature'] as string | undefined;
  if (!address || !signature) return undefined;

  const recovered = verifySignature(signature);
  const validWalletSig = !!recovered && recovered === address.toLowerCase();
  const validGuestSig = isGuestAuth(address, signature);
  if (!validWalletSig && !validGuestSig) return undefined;

  const user = chatService.getUserByAddress(address);
  return user?.id;
}

// ─── Auth ──────────────────────────────────────────────
router.get('/auth/message', (_req: Request, res: Response) => {
  res.json({ message: getAuthMessage() });
});

/**
 * 官方客服 AI（底部弹层）：无需登录/签名；按客户端 IP 限流。
 * Body: { message: string, history?: { role:'user'|'assistant', content:string }[] }
 */
router.post('/support/ask', async (req: Request, res: Response) => {
  const clientIp = getSupportClientIp(req);
  const maxPerMin = Math.max(6, Math.min(60, parseInt(String(process.env.CHAT_SUPPORT_SHEET_IP_RPM || '20'), 10) || 20));
  if (!allowSupportAskByIp(clientIp, maxPerMin)) {
    return res.status(429).json({ error: 'rate_limited' });
  }

  const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
  if (!message || message.length > 2400) {
    return res.status(400).json({ error: 'message required (max 2400 chars)' });
  }

  const rawHistory = Array.isArray(req.body?.history) ? req.body.history : [];
  const history: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  for (const row of rawHistory.slice(-12)) {
    if (!row || typeof row !== 'object') continue;
    const role = (row as any).role === 'assistant' ? 'assistant' : 'user';
    const content = typeof (row as any).content === 'string' ? (row as any).content.trim() : '';
    if (!content || content.length > 4000) continue;
    history.push({ role, content });
  }

  const rawWallet =
    typeof req.body?.walletAddress === 'string' ? req.body.walletAddress.trim().slice(0, 66) : '';
  const walletOk = /^0x[a-fA-F0-9]{40}$/.test(rawWallet);
  const walletForPrompt = walletOk ? rawWallet.toLowerCase() : '';

  let nickname = typeof req.body?.nickname === 'string' ? req.body.nickname.trim().slice(0, 64) : '';
  if (!nickname && walletForPrompt) {
    nickname = `${rawWallet.slice(0, 6)}…${rawWallet.slice(-4)}`;
  }
  if (!nickname) nickname = '访客';

  const locale = typeof req.body?.locale === 'string' ? req.body.locale.trim().slice(0, 16) : '';

  try {
    const out = await botService.generateOfficialSupportSheetReply({
      walletAddress: walletForPrompt,
      nickname,
      userMessage: message,
      history,
      locale: locale || undefined,
    });
    if (!out.reply) {
      console.warn('[support/ask] empty reply:', out.error || 'unknown');
      return res.status(503).json({ error: out.error || 'support_unavailable' });
    }
    return res.json({ reply: out.reply });
  } catch (e: any) {
    console.error('[support/ask]', e);
    return res.status(500).json({ error: e?.message || 'support_failed' });
  }
});

const supportFeedbackIpTimestamps = new Map<string, number[]>();
function allowSupportFeedbackByIp(ip: string, maxPerMinute: number): boolean {
  const key = `fb:${ip}`;
  const now = Date.now();
  const windowMs = 60_000;
  const prev = (supportFeedbackIpTimestamps.get(key) || []).filter((t) => now - t < windowMs);
  if (prev.length >= maxPerMinute) {
    supportFeedbackIpTimestamps.set(key, prev);
    return false;
  }
  prev.push(now);
  supportFeedbackIpTimestamps.set(key, prev);
  return true;
}

/**
 * 官方客服弹层：点赞/踩/取消 记录（匿名，按 IP 限流）
 * Body: { assistantMessageId, reaction: 'up'|'down'|'clear', locale?, userQuestion?, answerPreview? }
 */
router.post('/support/feedback', (req: Request, res: Response) => {
  const clientIp = getSupportClientIp(req);
  const maxPerMin = Math.max(20, Math.min(200, parseInt(String(process.env.CHAT_SUPPORT_FEEDBACK_IP_RPM || '90'), 10) || 90));
  if (!allowSupportFeedbackByIp(clientIp, maxPerMin)) {
    return res.status(429).json({ error: 'rate_limited' });
  }

  const assistantMessageId =
    typeof req.body?.assistantMessageId === 'string' ? req.body.assistantMessageId.trim().slice(0, 96) : '';
  const reactionRaw = req.body?.reaction;
  const reaction: SupportSheetFeedbackRow['reaction'] | null =
    reactionRaw === 'up' || reactionRaw === 'down' || reactionRaw === 'clear' ? reactionRaw : null;
  if (!assistantMessageId || !reaction) {
    return res.status(400).json({ error: 'assistantMessageId and reaction (up|down|clear) required' });
  }

  const locale = typeof req.body?.locale === 'string' ? req.body.locale.trim().slice(0, 16) : '';
  const userQuestion = typeof req.body?.userQuestion === 'string' ? req.body.userQuestion.trim().slice(0, 600) : '';
  const answerPreview = typeof req.body?.answerPreview === 'string' ? req.body.answerPreview.trim().slice(0, 1200) : '';

  appendSupportFeedback({
    ts: Date.now(),
    reaction,
    assistantMessageId,
    locale: locale || undefined,
    userQuestion: userQuestion || undefined,
    answerPreview: answerPreview || undefined,
    clientIp: clientIp.slice(0, 64),
  });

  return res.json({ ok: true });
});

router.get('/storage/status', async (_req: Request, res: Response) => {
  const status = await chatService.getStorageStatus();
  res.json({ ok: true, ...status, now: Date.now() });
});

router.post('/auth/login', (req: Request, res: Response) => {
  const { address, signature, sessionToken, nickname, nodeLevel } = req.body || {};
  const addrRaw = typeof address === 'string' ? address.trim() : '';
  if (!addrRaw) {
    return res.status(400).json({ error: 'address required' });
  }

  if (sessionToken && typeof sessionToken === 'string' && sessionToken.length > 8) {
    const recovered = verifyChatSessionToken(sessionToken);
    if (!recovered || recovered !== addrRaw.toLowerCase()) {
      return res.status(401).json({ error: 'Invalid or expired chat session' });
    }
    const user = chatService.createUser(addrRaw, nickname, nodeLevel as NodeLevel);
    return res.json({ user: toPublicChatUser(user), sessionToken });
  }

  if (!signature || typeof signature !== 'string') {
    return res.status(400).json({ error: 'signature or sessionToken required' });
  }

  const recovered = verifySignature(signature);
  const validWalletSig = !!recovered && recovered === addrRaw.toLowerCase();
  const validGuestSig = isGuestAuth(addrRaw, signature);
  if (!validWalletSig && !validGuestSig) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const user = chatService.createUser(addrRaw, nickname, nodeLevel as NodeLevel);
  const st = issueChatSessionToken(addrRaw);
  return res.json({ user: toPublicChatUser(user), sessionToken: st });
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
router.get('/rooms', (req: Request, res: Response) => {
  const userId = tryGetUserIdFromWalletHeaders(req);
  void (async () => {
    const rooms = await chatService.getRoomsForApi(userId);
    return res.json({ rooms });
  })();
});

router.get('/rooms/:roomId', (req: Request, res: Response) => {
  const room = chatService.getRoom(req.params.roomId as string);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  res.json({ room });
});

/** Member roster for modal (nickname + address); requires chat auth */
router.get('/rooms/:roomId/members', authMiddleware, (req: Request, res: Response) => {
  const roomId = req.params.roomId as string;
  const userId = (req as any).userId as string | undefined;
  if (!chatService.getRoom(roomId)) return res.status(404).json({ error: 'Room not found' });

  const room = chatService.getRoom(roomId);
  if (room?.type === 'dm' && (!userId || !chatService.isRoomMember(roomId, userId))) {
    return res.status(403).json({ error: 'Forbidden' });
  }
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
router.get('/rooms/:roomId/messages', authMiddleware, (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const before = req.query.before ? parseInt(req.query.before as string) : undefined;
  const roomId = req.params.roomId as string;
  const userId = (req as any).userId as string | undefined;
  if (!userId) return res.status(401).json({ error: 'Authentication required' });
  void (async () => {
    const out = await chatService.getMessagesForApi(roomId, userId, limit, before);
    if (!out.ok) return res.status(out.status || 400).json({ error: out.error || 'Failed' });
    return res.json({ messages: out.messages || [] });
  })();
});

/** 定位到某条消息附近的一页（用于从搜索结果跳转） */
router.get('/rooms/:roomId/messages/around/:messageId', authMiddleware, (req: Request, res: Response) => {
  const roomId = req.params.roomId as string;
  const messageId = req.params.messageId as string;
  const userId = (req as any).userId as string | undefined;
  if (!userId) return res.status(401).json({ error: 'Authentication required' });
  const limit = Math.min(100, Math.max(10, parseInt(req.query.limit as string) || 50));
  void (async () => {
    const out = await chatService.getMessagesAroundForApi(roomId, messageId, userId, limit);
    if (!out.ok) return res.status(out.status || 400).json({ error: out.error || 'Failed' });
    return res.json({ messages: out.messages || [] });
  })();
});

// ─── User Search (DM) ──────────────────────────────────
router.get('/users/search', authMiddleware, (req: Request, res: Response) => {
  const address = String(req.query.address || '').trim();
  const limit = Math.min(10, Math.max(1, parseInt(String(req.query.limit || '5'), 10) || 5));
  if (!address) return res.status(400).json({ error: 'address required' });
  void (async () => {
    const users = await chatService.searchUsersForApi(address, limit);
    return res.json({ users });
  })();
});

// ─── DM Open ────────────────────────────────────────────
router.post('/dm/open', authMiddleware, (req: Request, res: Response) => {
  const userId = (req as any).userId as string | undefined;
  if (!userId) return res.status(401).json({ error: 'Authentication required' });

  const peerAddress = String(req.body?.peerAddress || '').trim();
  if (!peerAddress) return res.status(400).json({ error: 'peerAddress required' });

  const me = chatService.getUser(userId);
  if (me?.address && me.address.toLowerCase() === peerAddress.toLowerCase()) {
    return res.status(400).json({ error: 'Cannot open DM with yourself' });
  }

  const room = chatService.getOrCreateDmRoomByAddresses(userId, peerAddress);
  if (!room) return res.status(404).json({ error: 'Peer user not found in chat yet' });

  if (!chatService.isRoomMember(room.id, userId)) return res.status(403).json({ error: 'Forbidden' });

  res.json({ room });
});

// ─── Reports / Moderation Queue ───────────────────────
router.post('/reports', authMiddleware, async (req: Request, res: Response) => {
  const reporterUserId = (req as any).userId as string | undefined;
  if (!reporterUserId) return res.status(401).json({ error: 'Authentication required' });
  const category = String(req.body?.category || '').trim();
  if (!category) return res.status(400).json({ error: 'category required' });

  const targetUserId = typeof req.body?.targetUserId === 'string' ? req.body.targetUserId.trim() : undefined;
  const roomId = typeof req.body?.roomId === 'string' ? req.body.roomId.trim() : undefined;
  const messageId = typeof req.body?.messageId === 'string' ? req.body.messageId.trim() : undefined;
  const reasonText = typeof req.body?.reasonText === 'string' ? req.body.reasonText.trim().slice(0, 2000) : undefined;

  const out = await chatService.createReportForApi({
    reporterUserId,
    targetUserId,
    roomId,
    messageId,
    category,
    reasonText,
  });
  if (!out.ok) return res.status(400).json({ error: out.error || 'Failed to create report' });
  res.json({ ok: true, reportId: out.id });
});

router.get('/admin/reports', authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  const status = typeof req.query.status === 'string' ? req.query.status.trim() : undefined;
  const limit = Math.min(200, Math.max(1, parseInt(String(req.query.limit || '50'), 10) || 50));
  const rows = await chatService.listReportsForAdmin(status, limit);
  res.json({ reports: rows });
});

router.get('/admin/audit-logs', authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  const operatorUserId = typeof req.query.operatorUserId === 'string' ? req.query.operatorUserId.trim() : undefined;
  const action = typeof req.query.action === 'string' ? req.query.action.trim() : undefined;
  const fromMs = req.query.fromMs != null ? Number(req.query.fromMs) : undefined;
  const toMs = req.query.toMs != null ? Number(req.query.toMs) : undefined;
  const limit = Math.min(200, Math.max(1, parseInt(String(req.query.limit || '50'), 10) || 50));
  const offset = Math.max(0, parseInt(String(req.query.offset || '0'), 10) || 0);

  const logs = await chatService.listAuditLogsForAdmin({
    operatorUserId,
    action,
    fromMs: Number.isFinite(fromMs) ? fromMs : undefined,
    toMs: Number.isFinite(toMs) ? toMs : undefined,
    limit,
    offset,
  });
  res.json({ logs, pagination: { limit, offset, count: logs.length } });
});

router.post('/admin/reports/:reportId/resolve', authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  const reviewerUserId = (req as any).userId as string | undefined;
  if (!reviewerUserId) return res.status(401).json({ error: 'Authentication required' });
  const reportId = String(req.params.reportId || '').trim();
  if (!reportId) return res.status(400).json({ error: 'reportId required' });
  const status = String(req.body?.status || '').trim() as 'resolved' | 'rejected' | 'escalated';
  if (!['resolved', 'rejected', 'escalated'].includes(status)) {
    return res.status(400).json({ error: 'invalid status' });
  }
  const resolutionNote = typeof req.body?.resolutionNote === 'string' ? req.body.resolutionNote.trim().slice(0, 2000) : undefined;
  const actionsRaw = req.body?.actions || {};
  const actions = {
    deleteMessage: actionsRaw?.deleteMessage === true,
    removeRoomMember: actionsRaw?.removeRoomMember === true,
    muteMinutes: Math.max(0, Math.min(60 * 24 * 30, Number(actionsRaw?.muteMinutes || 0))),
  };
  const out = await chatService.resolveReportForAdmin({
    reportId,
    reviewerUserId,
    status,
    resolutionNote,
    actions,
  });
  if (!out.ok) return res.status(400).json({ error: out.error || 'Failed to resolve report' });
  res.json({ ok: true });
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

  void (async () => {
    const results = await chatService.searchMessagesForApi(userId, q, limit);
    return res.json({ results });
  })();
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

  const permission = chatService.canSendMessage(roomId, userId, greet || '');
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
