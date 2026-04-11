import fs from 'fs';
import path from 'path';

const FILE = path.join(process.cwd(), 'data', 'support-sheet-feedback.jsonl');

export type SupportSheetFeedbackRow = {
  ts: number;
  reaction: 'up' | 'down' | 'clear';
  assistantMessageId: string;
  locale?: string;
  userQuestion?: string;
  answerPreview?: string;
  clientIp?: string;
};

export function appendSupportFeedback(row: SupportSheetFeedbackRow): void {
  try {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    fs.appendFileSync(FILE, `${JSON.stringify(row)}\n`, { encoding: 'utf8' });
  } catch (e) {
    console.warn('[support-feedback] append failed', e);
  }
}

/** 将近期「踩」对应的问题注入系统提示，便于模型针对性加强核对步骤 */
export function buildSupportFeedbackHintsForPrompt(maxQuestions = 10): string {
  try {
    if (!fs.existsSync(FILE)) return '';
    const lines = fs.readFileSync(FILE, 'utf8').split('\n').filter(Boolean).slice(-500);
    const downs: string[] = [];
    const cutoff = Date.now() - 14 * 86400000;
    for (let i = lines.length - 1; i >= 0 && downs.length < maxQuestions; i--) {
      try {
        const o = JSON.parse(lines[i]!) as SupportSheetFeedbackRow;
        if (o.reaction !== 'down') continue;
        if (typeof o.ts === 'number' && o.ts < cutoff) continue;
        const q = String(o.userQuestion || '').trim();
        if (q.length < 4) continue;
        if (!downs.includes(q)) downs.push(q);
      } catch {
        /* skip bad line */
      }
    }
    if (!downs.length) return '';
    return `\n=== USER_FEEDBACK_SIGNAL (recent thumbs-down questions; be extra careful on these themes, add verification steps, avoid overconfident claims) ===\n${downs.map((q) => `- ${q}`).join('\n')}\n`;
  } catch {
    return '';
  }
}
