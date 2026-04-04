
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

import { DailySettlementService } from '../src/services/DailySettlementService';
import { closePool } from '../src/config/database.config';

async function main() {
  const targetUser = '0x77ee3f51F9e0C5C99DB8EF9451Eee1a382f7A340';
  const rpcUrl = process.env.SETTLEMENT_RPC_URL || process.env.BSC_RPC_URL || process.env.BSC_TESTNET_RPC_URL;
  
  if (!rpcUrl || !process.env.STAKING_CONTRACT_ADDRESS || !process.env.BACKEND_PRIVATE_KEY) {
    console.error('缺少环境变量');
    process.exit(1);
  }

  console.log('=== 单个用户结算测试 ===');
  console.log('使用 RPC:', rpcUrl.replace(/\/([a-f0-9]{8}).*$/, '/$1***')); // 隐藏部分 Key
  console.log('测试账户:', targetUser);

  const service = new DailySettlementService({
    rpcUrl,
    stakingContractAddress: process.env.STAKING_CONTRACT_ADDRESS,
    backendPrivateKey: process.env.BACKEND_PRIVATE_KEY,
  });

  // 获取当前北京时间 8 点的结算点
  const now = Math.floor(Date.now() / 1000);
  // @ts-ignore - accessing private method for testing
  const toTime = service.getLastCompletedShanghai8AM(now);
  const fromTime = toTime - 86400;

  console.log(`结算窗口: ${new Date(fromTime * 1000).toISOString()} -> ${new Date(toTime * 1000).toISOString()}`);

  try {
    const publicRpc = process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org/';
    const publicProvider = new (require('ethers')).JsonRpcProvider(publicRpc);
    console.log('正在通过公共 RPC 寻找区块高度...');
    // @ts-ignore
    const blockAtFrom = await (require('../src/services/on-chain/chainSettlementUtils')).findBlockAtOrBefore(publicProvider, fromTime);
    console.log('窗口起点区块:', blockAtFrom);

    // 执行单人结算
    // @ts-ignore
    await service.settleUserYield(targetUser, 'RWA', fromTime, toTime, blockAtFrom);
    console.log('RWA 结算尝试完成');
    
    // @ts-ignore
    await service.settleUserYield(targetUser, 'USDT', fromTime, toTime, blockAtFrom);
    console.log('USDT 结算尝试完成');

    console.log('✅ 测试执行成功，请检查日志或数据库记录。');
  } catch (error) {
    console.error('❌ 测试执行失败:', error);
  } finally {
    await closePool();
  }
}

main().catch(console.error);
