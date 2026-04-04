// ============================================================
// RWA Aura Chat — REST API Routes
// ============================================================

import { Router, Request, Response } from 'express';
import { chatService } from '../services/chat-service';
import { botService } from '../services/bot-service';
import { authMiddleware, getAuthMessage, verifySignature, isGuestAuth, requireAdmin } from '../middleware/auth';
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
  const enriched = messages.map((msg) => ({
    ...msg,
    user: chatService.getUser(msg.userId),
  }));

  res.json({ messages: enriched });
});

router.post('/rooms/:roomId/redpackets', authMiddleware, async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  const roomId = req.params.roomId as string;
  const { totalAmount, totalCount, greeting, currency } = req.body || {};

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
  res.json({ packet: result.packet, message: { ...result.message, user } });
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

export default router;
