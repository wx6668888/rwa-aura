import fs from 'fs';
import path from 'path';

type BotMemoryItem = {
  id: string;
  botId: string;
  roomId: string;
  content: string;
  tags: string[];
  source: 'self_statement' | 'interaction';
  createdAt: number;
  updatedAt: number;
  lastUsedAt: number;
  useCount: number;
};

type BotMemoryStore = {
  version: 1;
  items: BotMemoryItem[];
};

function nowMs(): number {
  return Date.now();
}

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeKey(s: string): string {
  return String(s || '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[，。！？、,.!?;:："'"`~@#$%^&*()_+\-=\[\]{}<>\\/|]/g, '')
    .trim();
}

function containsCjk(s: string): boolean {
  return /[\u4e00-\u9fff]/.test(s);
}

function pickTags(text: string): string[] {
  const t = text.toLowerCase();
  const rules: Array<[string, RegExp]> = [
    ['work', /(上班|下班|工作|门店|店里|仓库|跑单|接单|带团|客服|外卖|司机|美甲|烤串|拍婚礼)/],
    ['family', /(孩子|接娃|家里|老婆|老公|父母|家人)/],
    ['weather', /(天气|下雨|暴雨|晴天|温差|冷|热|风)/],
    ['staking', /(质押|收益|锁仓|确认数|提现|链上|公告|规则|合约)/],
    ['habit', /(习惯|平时|经常|一般|喜欢|常常)/],
    ['city', /(北京|上海|广州|深圳|杭州|成都|武汉|南京|苏州|郑州|青岛|长沙|西安|重庆)/],
  ];
  const out: string[] = [];
  for (const [k, re] of rules) {
    if (re.test(t)) out.push(k);
  }
  return out.slice(0, 4);
}

function splitSentences(text: string): string[] {
  return text
    .split(/[。！？!?]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function isHighValueSelfStatement(line: string): boolean {
  if (!line) return false;
  if (line.length < 8 || line.length > 120) return false;
  if (!containsCjk(line)) return false;
  if (!/(我|我们|平时|经常|一般|最近|习惯|在|做|会|喜欢)/.test(line)) return false;
  if (/(哈哈|嘿嘿|收到|明白|ok|嗯嗯|好的|谢谢|顶|\+1)/i.test(line) && line.length < 16) return false;
  return true;
}

class BotMemoryService {
  private readonly filePath: string;
  private store: BotMemoryStore = { version: 1, items: [] };
  private persistTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.filePath = process.env.BOT_MEMORY_FILE
      ? path.resolve(process.env.BOT_MEMORY_FILE)
      : path.resolve(process.cwd(), 'data', 'bot-memory.json');
    this.load();
  }

  private load(): void {
    try {
      if (!fs.existsSync(this.filePath)) return;
      const raw = fs.readFileSync(this.filePath, 'utf8');
      const data = JSON.parse(raw) as BotMemoryStore;
      if (!data || !Array.isArray(data.items)) return;
      this.store = { version: 1, items: data.items.slice(0, 20_000) };
    } catch {
      this.store = { version: 1, items: [] };
    }
  }

  private schedulePersist(): void {
    if (this.persistTimer) clearTimeout(this.persistTimer);
    this.persistTimer = setTimeout(() => this.persist(), 800);
  }

  private persist(): void {
    try {
      fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
      fs.writeFileSync(this.filePath, JSON.stringify(this.store, null, 2), 'utf8');
    } catch {
      // ignore persistence errors to avoid blocking chat flow
    }
  }

  private upsert(botId: string, roomId: string, content: string, source: BotMemoryItem['source']): void {
    const c = content.trim().slice(0, 160);
    if (!c) return;
    const key = normalizeKey(c);
    const existing = this.store.items.find((it) => it.botId === botId && normalizeKey(it.content) === key);
    const ts = nowMs();
    if (existing) {
      existing.updatedAt = ts;
      existing.roomId = roomId;
      return;
    }
    const item: BotMemoryItem = {
      id: uid(),
      botId,
      roomId,
      content: c,
      tags: pickTags(c),
      source,
      createdAt: ts,
      updatedAt: ts,
      lastUsedAt: 0,
      useCount: 0,
    };
    this.store.items.push(item);
    // Keep memory bounded per bot.
    const perBot = this.store.items.filter((x) => x.botId === botId).sort((a, b) => b.updatedAt - a.updatedAt);
    if (perBot.length > 160) {
      const keep = new Set(perBot.slice(0, 160).map((x) => x.id));
      this.store.items = this.store.items.filter((x) => x.botId !== botId || keep.has(x.id));
    }
    this.schedulePersist();
  }

  rememberFromTurn(botId: string, roomId: string, triggerText: string | null, botText: string): void {
    const lines = splitSentences(botText);
    for (const line of lines) {
      if (isHighValueSelfStatement(line)) {
        this.upsert(botId, roomId, line, 'self_statement');
      }
    }
    if (triggerText && triggerText.trim()) {
      const short = triggerText.trim().slice(0, 70);
      if (short.length >= 10 && containsCjk(short) && /(收益|质押|确认|提现|规则|链上|网络|天气|工作|孩子|跑单)/.test(short)) {
        this.upsert(botId, roomId, `群友常聊：${short}`, 'interaction');
      }
    }
  }

  getMemoryLinesForPrompt(botId: string, roomId: string, queryContext: string, limit = 4): string[] {
    const q = queryContext.toLowerCase();
    const candidates = this.store.items.filter((it) => it.botId === botId);
    const scored = candidates
      .map((it) => {
        let score = 0;
        if (it.roomId === roomId) score += 2;
        for (const tag of it.tags) {
          if (q.includes(tag)) score += 1;
        }
        const ageHours = (nowMs() - it.updatedAt) / 3_600_000;
        score += Math.max(0, 4 - ageHours / 48);
        return { it, score };
      })
      .sort((a, b) => b.score - a.score);

    const picked = scored.slice(0, Math.max(0, Math.min(8, limit))).map((x) => x.it);
    const ts = nowMs();
    for (const m of picked) {
      m.lastUsedAt = ts;
      m.useCount += 1;
    }
    if (picked.length) this.schedulePersist();
    return picked.map((m) => `- ${m.content}`);
  }
}

export const botMemoryService = new BotMemoryService();

