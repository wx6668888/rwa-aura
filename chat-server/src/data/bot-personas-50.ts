/**
 * 50 个氛围机器人：详细人设见 rwa-bot-personas-50-built.ts；
 * 大厅展示由服务端改为短地址 + 头像；persona 为 LLM 完整系统人设块。
 */
export type { BotArchetypeIdentity, BotPersonaRow } from './rwa-bot-persona-types';
import type { BotPersonaRow } from './rwa-bot-persona-types';
import { detailedToBotPersonaRow, RWA_BOT_DETAILED_PERSONAS_50 } from './rwa-bot-personas-50-built';

export const BOT_PERSONAS_50: BotPersonaRow[] = RWA_BOT_DETAILED_PERSONAS_50.map((p, i) => {
  const row = detailedToBotPersonaRow(p, i + 1);
  return {
    ...row,
    schedule: {
      activeHoursStart: row.schedule.activeHoursStart ?? 7,
      activeHoursEnd: row.schedule.activeHoursEnd ?? 24,
      timezone: row.schedule.timezone ?? 'Asia/Shanghai',
      ...row.schedule,
    },
  };
});
