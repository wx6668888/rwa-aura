/**
 * 手动执行一次 DailySettlementService.runDailySettlement()（用于补发 / 排错）
 *
 * 用法:
 *   cd backend && npx ts-node scripts/run-daily-settlement-once.ts
 *
 * 补发指定「北京 8 点日界」的窗口（toTime = 该日北京时间 08:00 = 当日 UTC 00:00）：
 *   SETTLEMENT_DATE=2025-03-21 npx ts-node scripts/run-daily-settlement-once.ts
 * 或传 Unix 秒（须恰好为上述边界）：
 *   SETTLEMENT_TO_UNIX=1742515200 npx ts-node scripts/run-daily-settlement-once.ts
 *
 * 不设变量时：与线上定时任务一致，结算「当前时刻下最近一次已过去的北京 8 点」对应窗口。
 */
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

import { DailySettlementService } from '../src/services/DailySettlementService';
import { closePool } from '../src/config/database.config';

function resolveToTimeOverride(): number | undefined {
  const unix = (process.env.SETTLEMENT_TO_UNIX || '').trim();
  if (unix) {
    if (!/^\d+$/.test(unix)) {
      throw new Error('SETTLEMENT_TO_UNIX must be a positive integer Unix seconds');
    }
    return parseInt(unix, 10);
  }
  const dateStr = (process.env.SETTLEMENT_DATE || '').trim();
  if (!dateStr) return undefined;
  const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) {
    throw new Error('SETTLEMENT_DATE must be YYYY-MM-DD (Asia/Shanghai calendar day for 08:00 boundary)');
  }
  const y = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10);
  const d = parseInt(m[3], 10);
  return DailySettlementService.shanghaiDateToToTime(y, mo, d);
}

async function main() {
  const rpcUrl = process.env.BSC_RPC_URL || process.env.BSC_TESTNET_RPC_URL;
  if (!rpcUrl || !process.env.STAKING_CONTRACT_ADDRESS || !process.env.BACKEND_PRIVATE_KEY) {
    console.error('缺少环境变量: BSC_RPC_URL(或 BSC_TESTNET_RPC_URL)、STAKING_CONTRACT_ADDRESS、BACKEND_PRIVATE_KEY');
    process.exit(1);
  }

  const service = new DailySettlementService({
    rpcUrl,
    stakingContractAddress: process.env.STAKING_CONTRACT_ADDRESS,
    backendPrivateKey: process.env.BACKEND_PRIVATE_KEY,
  });

  const toTimeOverride = resolveToTimeOverride();

  console.log('=== 手动执行每日结算 runDailySettlement ===');
  console.log('服务器时间:', new Date().toISOString());
  if (toTimeOverride !== undefined) {
    console.log(
      '指定 toTime(Unix)=',
      toTimeOverride,
      '→',
      new Date(toTimeOverride * 1000).toISOString(),
      '| 窗口 [from,to) 各 24h，from = toTime - 86400'
    );
  } else {
    console.log('未指定 SETTLEMENT_DATE / SETTLEMENT_TO_UNIX，使用「最近一次已过去的北京 8 点」');
  }

  await service.runDailySettlement(
    toTimeOverride !== undefined ? { toTime: toTimeOverride } : undefined
  );
  console.log('=== 执行结束 ===');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await closePool();
  });
