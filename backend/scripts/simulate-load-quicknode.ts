
import dotenv from 'dotenv';
import path from 'path';
import { query, closePool } from '../src/config/database.config';
import { OnChainYieldCalculator } from '../src/services/on-chain/OnChainYieldCalculator';
import { ethers } from 'ethers';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function main() {
  const rpcUrl = process.env.SETTLEMENT_RPC_URL || process.env.BSC_RPC_URL;
  if (!rpcUrl) {
    console.error('Missing RPC URL');
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const calculator = new OnChainYieldCalculator(provider, process.env.STAKING_CONTRACT_ADDRESS!);

  // 1. 从数据库中获取 500 个真实参与过质押的用户地址进行模拟
  console.log('正在从数据库获取 500 个参与过质押的用户地址...');
  const rows = await query<any[]>(
    `SELECT DISTINCT user_address FROM stake_events LIMIT 500`
  );
  
  let users = rows.map(r => r.user_address.toLowerCase());
  if (users.length < 500) {
    console.warn(`数据库中仅有 ${users.length} 个用户，将使用这些用户进行测试。`);
  } else {
    console.log(`成功获取 ${users.length} 个用户。`);
  }

  // 2. 模拟结算窗口（今日 08:00 对应的区块）
  const toTime = Math.floor(Date.UTC(2026, 2, 30, 0, 0, 0) / 1000); // 2026-03-30 08:00 (UTC 00:00)
  const fromTime = toTime - 86400;
  const blockTag = 89318488; // 存档区块

  console.log(`=== 开始模拟 500 个账户的只读收益计算 ===`);
  console.log(`测试目标：生产环境下的 500ms 延迟策略是否安全`);
  console.log(`模拟总账户数: ${users.length}`);
  console.log(`------------------------------------------`);

  let successCount = 0;
  let failCount = 0;
  let rateLimitCount = 0;
  const startTime = Date.now();

  // 模拟生产环境的顺序处理 + 500ms 延迟
  for (let i = 0; i < users.length; i++) {
    const address = users[i];
    if (i % 10 === 0) {
      console.log(`正在处理第 ${i + 1} - ${Math.min(i + 10, users.length)} 个用户...`);
    }
    
    try {
      // 分别计算 RWA 和 USDT 的持仓（模拟真实结算逻辑）
      await Promise.all([
          calculator.calculateYield(address, 'RWA', fromTime, toTime, provider, blockTag),
          calculator.calculateYield(address, 'USDT', fromTime, toTime, provider, blockTag)
      ]);
      successCount++;
    } catch (error: any) {
      failCount++;
      if (error.message.includes('limit reached') || error.message.includes('429')) {
        rateLimitCount++;
        console.error(`  [Rate Limit] 用户 ${address} 计算失败: ${error.message.substring(0, 50)}...`);
      } else {
        // 忽略 missing revert data 等由于模拟账户无持仓导致的正常报错，只关注 RPC 错误
      }
    }

    // 与生产环境完全一致的 500ms 延迟
    if (i < users.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500)); 
    }
  }

  const endTime = Date.now();
  const totalSeconds = (endTime - startTime) / 1000;

  console.log(`\n=== 模拟测试结束 ===`);
  console.log(`总耗时: ${totalSeconds.toFixed(2)} 秒`);
  console.log(`平均每秒处理: ${(users.length / totalSeconds).toFixed(2)} 个账户`);
  console.log(`成功: ${successCount}`);
  console.log(`失败: ${failCount} (其中 Rate Limit 导致: ${rateLimitCount})`);
  console.log(`------------------------------------------`);

  if (rateLimitCount > 0) {
    console.warn('⚠️ 结果显示 QuickNode 触发了速率限制。建议增加结算时的延迟，或者升级 QuickNode 套餐。');
  } else {
    console.log('✅ 测试通过！当前并发设置下 QuickNode 能够扛住压力。');
  }
}

main().catch(console.error).finally(async () => {
  await closePool();
});
