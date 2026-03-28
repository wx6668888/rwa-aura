/**
 * @deprecated 已废弃 — 请勿使用。
 * 本文件曾错误调用 `updateUserRewards(user)`（参数不全），且无任何防重逻辑。
 *
 * 正确入口：
 * - 生产：`BackendService` + `SchedulerService` → `DailySettlementService.runDailySettlement()`
 * - 手动：`npx ts-node scripts/run-daily-settlement-once.ts`
 *
 * 若 npm scripts 仍指向本文件，请改为上述脚本。
 */
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  console.error('');
  console.error('❌ backend/src/services/daily-settlement.ts 已废弃，不会执行任何链上结算。');
  console.error('   请使用: cd backend && npx ts-node scripts/run-daily-settlement-once.ts');
  console.error('   或启动主服务: npm run server');
  console.error('');
  process.exit(1);
}

void main();
