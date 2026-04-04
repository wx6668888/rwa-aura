// ============================================================
// RWA Aura Chat — Bot Engine (OpenRouter: OpenAI-compatible)
// ============================================================
import { ethers } from 'ethers';
import { v4 as uuid } from 'uuid';
import { chatService } from './chat-service';
import { Bot, User, Message } from '../models/types';
import type { BotSchedule } from '../models/types';

type BotIdentity = 'beginner' | 'pro' | 'wool' | 'earner';

function makeDeterministicBotAddress(seed: string): string {
  // Deterministic 0x address from seed (so restarts don't spam new bot users)
  const hash = ethers.id(`rwa-aura-bot:${seed}`);
  return `0x${hash.slice(2).slice(0, 40)}`.toLowerCase();
}

function getShanghaiParts(now: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Shanghai',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
    .formatToParts(now)
    .reduce<Record<string, string>>((acc, p) => {
      if (p.type) acc[p.type] = p.value;
      return acc;
    }, {});
  return {
    hour: Number(parts.hour || '0'),
    minute: Number(parts.minute || '0'),
  };
}

function isInEarningsWindow(now: Date): boolean {
  // Beijing: 08:10 - 09:00
  const { hour, minute } = getShanghaiParts(now);
  const after810 = hour > 8 || (hour === 8 && minute >= 10);
  const before900 = hour < 9;
  return after810 && before900;
}

function isInActiveHours(bot: Bot): boolean {
  const now = new Date();
  // We currently only honor Asia/Shanghai; schedule.timezone kept for compatibility.
  const { hour } = getShanghaiParts(now);
  const start = bot.schedule.activeHoursStart;
  const end = bot.schedule.activeHoursEnd;
  if (start === end) return true;
  if (start < end) return hour >= start && hour < end;
  // Wrap around midnight (not used by defaults, but keep safe)
  return hour >= start || hour < end;
}

function pickEarningsRwaAmount(): number {
  // Required: 9 - 300 RWA
  return Math.floor(9 + Math.random() * (300 - 9 + 1));
}

const OPENROUTER_API_KEY = String(process.env.OPENROUTER_API_KEY || '').trim() || String(process.env.CLAUDE_API_KEY || '').trim();
const OPENROUTER_BASE_URL = String(process.env.OPENROUTER_BASE_URL || '').trim();
const openRouterBase = (OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1').replace(/\/+$/, '');

async function openRouterChatComplete(opts: {
  model: string;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  max_tokens: number;
}): Promise<string | null> {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY not configured');
  }
  const url = `${openRouterBase}/chat/completions`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      // Optional but recommended by OpenRouter
      'HTTP-Referer': 'https://rwa.lat',
      'X-Title': 'RWA Aura Chat Bots',
    },
    body: JSON.stringify({
      model: opts.model,
      messages: opts.messages,
      max_tokens: opts.max_tokens,
      temperature: 0.9,
      top_p: 0.95,
    }),
  });

  const data: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = typeof data?.error?.message === 'string' ? data.error.message : JSON.stringify(data);
    throw new Error(`OpenRouter error: ${res.status} ${msg}`);
  }
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string') return null;
  return content.trim();
}

class BotService {
  private bots = new Map<string, Bot>();
  private timers = new Map<string, NodeJS.Timeout>();
  private onBotMessage?: (msg: Message & { user: User }, roomId: string) => void;

  private identityByBotId = new Map<string, BotIdentity>();
  private speakChanceByBotId = new Map<string, number>();

  private roomLastBotAt = new Map<string, number>(); // roomId -> timestamp
  private botLastSentAt = new Map<string, number>(); // botId -> timestamp

  setMessageCallback(cb: (msg: Message & { user: User }, roomId: string) => void) {
    this.onBotMessage = cb;
  }

  getAllBots(): Bot[] {
    return Array.from(this.bots.values());
  }

  getBot(botId: string): Bot | undefined {
    return this.bots.get(botId);
  }

  createBot(name: string, persona: string, avatar?: string): Bot {
    const botAddress = makeDeterministicBotAddress(`${name}:${persona}:${uuid()}`);
    const botUser = chatService.createUser(botAddress, name, 'L1');
    botUser.isBot = true;
    botUser.avatar = avatar;

    const bot: Bot = {
      id: uuid(),
      userId: botUser.id,
      name,
      persona,
      avatar,
      isActive: false,
      roomIds: ['room-general'],
      schedule: {
        enabled: false,
        minIntervalMs: 60_000,
        maxIntervalMs: 300_000,
        activeHoursStart: 8,
        activeHoursEnd: 24,
        timezone: 'Asia/Shanghai',
      },
      createdAt: Date.now(),
    };

    this.bots.set(bot.id, bot);
    return bot;
  }

  startBot(botId: string): boolean {
    const bot = this.bots.get(botId);
    if (!bot) return false;
    if (bot.isActive) return true;

    bot.isActive = true;
    bot.schedule.enabled = true;
    this.scheduleNext(bot);
    return true;
  }

  stopBot(botId: string): boolean {
    const bot = this.bots.get(botId);
    if (!bot) return false;
    bot.isActive = false;
    bot.schedule.enabled = false;
    const timer = this.timers.get(botId);
    if (timer) clearTimeout(timer);
    this.timers.delete(botId);
    return true;
  }

  updateBot(
    botId: string,
    updates: Partial<Pick<Bot, 'name' | 'persona' | 'avatar' | 'roomIds' | 'schedule'>>
  ): Bot | null {
    const bot = this.bots.get(botId);
    if (!bot) return null;
    Object.assign(bot, updates);
    if (updates.name) {
      const user = chatService.getUser(bot.userId);
      if (user) user.nickname = updates.name;
    }
    return bot;
  }

  deleteBot(botId: string): boolean {
    this.stopBot(botId);
    return this.bots.delete(botId);
  }

  triggerBotMessage(botId: string, roomId: string): Promise<Message | null> {
    const bot = this.bots.get(botId);
    if (!bot) return Promise.resolve(null);
    return this.executeBotMessage(bot, roomId, { triggeredBy: null, earningsRwa: null });
  }

  /**
   * Called when a real user sends a message.
   * Bots might respond with some probability, and sometimes “earnings-mode”.
   */
  maybeRespondToUserMessage(roomId: string, user: User, content: string) {
    // Respect “only sometimes respond”
    const roomLast = this.roomLastBotAt.get(roomId) || 0;
    if (Date.now() - roomLast < 18_000) return;

    if (Math.random() > 0.32) return;

    const now = new Date();
    const earningsMode = isInEarningsWindow(now) ? pickEarningsRwaAmount() : null;

    const candidates = Array.from(this.bots.values()).filter((b) => b.isActive && b.roomIds.includes(roomId));
    if (candidates.length === 0) return;
    if (!candidates.some((b) => isInActiveHours(b))) return;

    // Pick identity: earnings window -> prefer earner; otherwise diversify.
    let selected: Bot;
    if (earningsMode !== null) {
      const earner = candidates.find((b) => this.identityByBotId.get(b.id) === 'earner');
      selected = earner || candidates[Math.floor(Math.random() * candidates.length)];
    } else {
      // Diversify by biasing away from last bot
      const lastBotId = Array.from(this.botLastSentAt.entries()).sort((a, b) => b[1] - a[1])[0]?.[0];
      const filtered = candidates.filter((b) => b.id !== lastBotId);
      selected = (filtered.length ? filtered : candidates)[Math.floor(Math.random() * (filtered.length ? filtered.length : candidates.length))];
    }

    const delayMs = 4_000 + Math.floor(Math.random() * 12_000);
    this.roomLastBotAt.set(roomId, Date.now() + delayMs); // reserve slot (soft lock)

    setTimeout(async () => {
      // soft lock check
      const last = this.roomLastBotAt.get(roomId) || 0;
      if (Date.now() < last) return;

      await this.executeBotMessage(selected, roomId, {
        triggeredBy: { user, content },
        earningsRwa: earningsMode,
      });
    }, delayMs);
  }

  /** Bootstrap 4 default bots (randomized) */
  bootstrapDefaultBots(): { created: number } {
    if (this.bots.size > 0) return { created: 0 };

    const defaultBots: Array<{
      identity: BotIdentity;
      name: string;
      persona: string;
      speakChance: number;
      schedule: Partial<BotSchedule>;
    }> = [
      {
        identity: 'beginner',
        name: '小白学徒',
        persona:
          '身份：小白新手。风格：更口语、更好奇，常问规则和流程。会提到自己刚了解平台，想听大佬讲解。偶尔发“我是不是理解错了？”这种句式。自然推荐平台，别说自己是机器人。',
        speakChance: 0.55,
        schedule: { minIntervalMs: 90_000, maxIntervalMs: 220_000, activeHoursStart: 8, activeHoursEnd: 24 },
      },
      {
        identity: 'pro',
        name: '规则研究员',
        persona:
          '身份：理解平台规则的大牛。风格：1-3句，分享自己的理解框架（例如收益来源、结算周期、如何使用站内功能），会用“按规则来、别乱操作”这样的表述。自然推荐平台，适度提收益体验，但不做投资建议。',
        speakChance: 0.52,
        schedule: { minIntervalMs: 110_000, maxIntervalMs: 260_000, activeHoursStart: 8, activeHoursEnd: 24 },
      },
      {
        identity: 'wool',
        name: '薅羊毛小队',
        persona:
          '身份：薅羊毛但守规矩的玩家。风格：聊聊如何更高频参与站内活动/红包领取/领取与提现的节奏（强调“按规则，别走灰产”）。语气像真人：兴奋、但不夸张。',
        speakChance: 0.45,
        schedule: { minIntervalMs: 130_000, maxIntervalMs: 280_000, activeHoursStart: 8, activeHoursEnd: 24 },
      },
      {
        identity: 'earner',
        name: '收益晒图员',
        persona:
          '身份：收益分享者。风格：在收益窗口会晒收益数字（9-300 RWA之间），并邀请新用户来体验：强调平台、轻松气氛、1-2句足够。',
        speakChance: 0.62,
        schedule: { minIntervalMs: 70_000, maxIntervalMs: 160_000, activeHoursStart: 8, activeHoursEnd: 24 },
      },
    ];

    let created = 0;
    for (const b of defaultBots) {
      // deterministic address so chatService user doesn't explode on restart
      const botAddress = makeDeterministicBotAddress(`default:${b.identity}:${b.name}`);
      const botUser = chatService.createUser(botAddress, b.name, 'L1');
      botUser.isBot = true;
      const bot: Bot = {
        id: uuid(),
        userId: botUser.id,
        name: b.name,
        persona: b.persona,
        avatar: undefined,
        isActive: true,
        roomIds: ['room-general'],
        schedule: {
          enabled: true,
          minIntervalMs: b.schedule.minIntervalMs ?? 90_000,
          maxIntervalMs: b.schedule.maxIntervalMs ?? 240_000,
          activeHoursStart: b.schedule.activeHoursStart ?? 8,
          activeHoursEnd: b.schedule.activeHoursEnd ?? 24,
          timezone: 'Asia/Shanghai',
        },
        createdAt: Date.now(),
      };
      this.bots.set(bot.id, bot);
      this.identityByBotId.set(bot.id, b.identity);
      this.speakChanceByBotId.set(bot.id, b.speakChance);
      this.scheduleNext(bot);
      created += 1;
    }

    return { created };
  }

  // ────────────────────────────────────────────────────────
  private getBotForRoom(roomId: string): Bot | undefined {
    return Array.from(this.bots.values()).find((b) => b.isActive && b.roomIds.includes(roomId));
  }

  private scheduleNext(bot: Bot) {
    if (!bot.isActive || !bot.schedule.enabled) return;
    const { minIntervalMs, maxIntervalMs } = bot.schedule;
    const delay = Math.floor(Math.random() * (maxIntervalMs - minIntervalMs)) + minIntervalMs;

    const timer = setTimeout(async () => {
      // Sometimes skip to avoid “batch-like” behavior
      const chance = this.speakChanceByBotId.get(bot.id) ?? 0.5;
      if (Math.random() <= chance) {
        const roomId = bot.roomIds[Math.floor(Math.random() * bot.roomIds.length)];
        if (roomId) {
          const now = new Date();
          const earningsRwa = isInEarningsWindow(now) ? pickEarningsRwaAmount() : null;
          await this.executeBotMessage(bot, roomId, { triggeredBy: null, earningsRwa });
        }
      }
      this.scheduleNext(bot);
    }, delay);

    this.timers.set(bot.id, timer);
  }

  private async executeBotMessage(
    bot: Bot,
    roomId: string,
    opts: { triggeredBy: null | { user: User; content: string }; earningsRwa: number | null }
  ): Promise<Message | null> {
    if (!bot.isActive) return null;
    if (!isInActiveHours(bot)) return null;

    const roomLast = this.roomLastBotAt.get(roomId) || 0;
    if (Date.now() - roomLast < 16_000) return null;

    // Soft lock: reserve now
    this.roomLastBotAt.set(roomId, Date.now());
    this.botLastSentAt.set(bot.id, Date.now());

    try {
      const recentMessages = chatService.getMessages(roomId, 12);
      const context = recentMessages
        .map((m) => {
          const u = chatService.getUser(m.userId);
          return `${u?.nickname || 'Unknown'}: ${m.content}`;
        })
        .join('\n');

      const room = chatService.getRoom(roomId);

      const earningsLine =
        opts.earningsRwa !== null
          ? `在接下来的发言里，确保提到：我今天收益大约 ${opts.earningsRwa} RWA（真实数字范围：9-300）。`
          : '';

      const triggerLine = opts.triggeredBy
        ? `我刚看到有人发言：${opts.triggeredBy.user.nickname}: ${opts.triggeredBy.content}\n请自然回应它（像真人讨论），不需要复述原话。`
        : `聊天氛围偏静：请发一条自然短句，带一点点互动感（可以提问或接话）。`;

      const systemPrompt = `You are "${bot.name}", a real community participant in the RWA Aura protocol chat.

PERSONA:
${bot.persona}

RULES:
- Output ONLY the message content, 1-3 sentences max.
- Sound human and casual (NEVER say you're a bot/AI).
- Match the language style used in the recent chat (prefer Chinese if most users are Chinese).
- Recommend and casually explain the platform + typical收益体验 (no investment advice).
- When in earnings mode, follow the earningsLine strictly.

ROOM:
${room?.name || roomId} - ${room?.description || ''}`;

      const userPrompt = `Recent chat:\n${context}\n\n${triggerLine}\n${earningsLine}\n\nWrite the next message as ${bot.name}. Keep it natural.`;

      const model = process.env.OPENROUTER_MODEL || 'anthropic/claude-sonnet-4-20250514';

      const content = await openRouterChatComplete({
        model,
        max_tokens: 180,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      });

      if (!content) return null;

      // Simulate typing
      await new Promise((r) => setTimeout(r, 700 + Math.random() * 1800));

      const msg = chatService.addMessage(roomId, bot.userId, content, 'text');
      if (msg && this.onBotMessage) {
        const user = chatService.getUser(bot.userId);
        if (user) this.onBotMessage({ ...msg, user }, roomId);
      }
      return msg;
    } catch (err) {
      // Don't crash server if model call fails
      console.error('[Bot] generate message failed:', err);
      return null;
    }
  }
}

export const botService = new BotService();

