/**
 * 让兜底/模型输出更像真人手机打字：标点习惯因人设而异（正式/随意/混合）
 */

const TAIL_PUNCT = /[。！？…~～]+$/u;

const MID_PARTICLES = ['', ' 嗯', ' 呃', ' 诶', ' 哈哈', ' 对吧', ' 反正'];

const CASUAL_EMOJI = ['🙂', '😂', '😅', '👍', '✨', '🙏', '🔥', '💤', '🫡', '👀', '😊', '🤝', '💪', '🎉', '☕'];

export type HumanizeMode = 'normal' | 'micro';

/** formal：多保留逗号句号；casual：常省略句末、逗号变空格；mixed：两者随机 */
export type PunctuationStyle = 'formal' | 'casual' | 'mixed';

export type HumanizeOpts = { mode?: HumanizeMode; punctuation?: PunctuationStyle };

/** 句末或句首随机加一个表情（正式人设更少用） */
export function appendCasualEmoji(input: string, emojiRate = 0.12): string {
  let s = input.trim();
  if (!s) return s;
  if (Math.random() > emojiRate) return s;
  const e = CASUAL_EMOJI[Math.floor(Math.random() * CASUAL_EMOJI.length)]!;
  if (Math.random() < 0.72) {
    return `${s} ${e}`;
  }
  return `${e} ${s}`;
}

function applyCasualBody(s: string, emojiRate: number): string {
  if (Math.random() < 0.58) {
    s = s.replace(TAIL_PUNCT, '');
  }
  if (Math.random() < 0.22) {
    s = s.replace(/，/g, () => (Math.random() < 0.35 ? ' ' : '，'));
  }
  if (Math.random() < 0.14) {
    const idx = s.indexOf('的');
    if (idx > 2 && idx < s.length - 2) {
      s = s.slice(0, idx) + '得' + s.slice(idx + 1);
    }
  }
  if (Math.random() < 0.12 && s.length > 6) {
    const p = MID_PARTICLES[Math.floor(Math.random() * MID_PARTICLES.length)]!;
    if (p) {
      const cut = Math.floor(s.length * (0.35 + Math.random() * 0.35));
      s = s.slice(0, cut) + p + s.slice(cut);
    }
  }
  if (Math.random() < 0.05) {
    s = s.replace(/有没有/g, '有木有');
  }
  if (Math.random() < 0.04) {
    s = s.replace(/吗\?$/u, '吗');
    s = s.replace(/吗$/u, '嘛');
  }
  if (Math.random() < 0.035) {
    s = s.replace(/一下/g, '一哈');
  }
  s = s.trim().replace(/\s{2,}/g, ' ');
  return appendCasualEmoji(s, emojiRate);
}

function applyFormalBody(s: string, emojiRate: number): string {
  if (Math.random() < 0.18) {
    s = s.replace(TAIL_PUNCT, '');
  }
  if (Math.random() < 0.08) {
    s = s.replace(/，/g, () => (Math.random() < 0.15 ? ' ' : '，'));
  }
  if (Math.random() < 0.06 && s.length > 14 && !/[，。！？]/.test(s)) {
    const mid = Math.floor(s.length * 0.55);
    if (mid > 4 && mid < s.length - 4) {
      s = s.slice(0, mid) + '，' + s.slice(mid);
    }
  }
  s = s.trim().replace(/\s{2,}/g, ' ');
  return appendCasualEmoji(s, emojiRate);
}

function resolveStyle(punct: PunctuationStyle | undefined): 'formal' | 'casual' {
  const p = punct ?? 'casual';
  if (p === 'mixed') return Math.random() < 0.5 ? 'formal' : 'casual';
  return p;
}

export function humanizeCasualChinese(input: string, opts?: HumanizeOpts): string {
  let s = input.trim().replace(/\s+/g, ' ');
  if (!s) return s;

  const style = resolveStyle(opts?.punctuation);
  const emojiRate = style === 'formal' ? 0.05 : 0.12;

  if (opts?.mode === 'micro' || s.length <= 6) {
    if (style === 'formal') {
      if (Math.random() < 0.22) s = s.replace(TAIL_PUNCT, '');
      return appendCasualEmoji(s, emojiRate);
    }
    if (Math.random() < 0.35) {
      s = s.replace(TAIL_PUNCT, '');
    }
    return appendCasualEmoji(s, emojiRate);
  }

  if (style === 'formal') {
    return applyFormalBody(s, emojiRate);
  }
  return applyCasualBody(s, emojiRate);
}

/** 仍撞车时加极短后缀（保证与当日任意一条不完全相同） */
export function saltUtteranceUnique(base: string, salt: string): string {
  const t = base.trim();
  if (!salt) return t;
  return `${t} ${salt}`.trim();
}
