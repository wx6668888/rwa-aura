import { ethers } from 'ethers';
import { getPool } from '../config/database.config';
import { getBscRpcUrl } from '../config/rpc-url';
import { BSC_MAINNET_ADDRESSES } from '../config/bsc-mainnet-addresses';
import * as dotenv from 'dotenv';

dotenv.config();

const RPC_URL = getBscRpcUrl();
const STAKING_CONTRACT =
  process.env.STAKING_CONTRACT ||
  process.env.STAKING_CONTRACT_ADDRESS ||
  BSC_MAINNET_ADDRESSES.stakingContract;
const RELAYER_PRIVATE_KEY = process.env.RELAYER_PRIVATE_KEY || '';

const provider = new ethers.JsonRpcProvider(RPC_URL);
const relayer = new ethers.Wallet(RELAYER_PRIVATE_KEY, provider);
const stakingAbi = require('../../../artifacts/contracts/StakingContract.sol/StakingContract.json').abi;
const staking = new ethers.Contract(STAKING_CONTRACT, stakingAbi, relayer);

const pool = getPool();

async function settleRewards() {
  console.log('[DailySettlement] 开始每日结算...');
  console.log('[DailySettlement] 时间:', new Date().toLocaleString('zh-CN'));
  
  try {
    // 获取所有有质押的用户
    const [users] = await pool.query(`
      SELECT DISTINCT user_address 
      FROM stake_events
    `);
    
    const usersArray = users as Array<{ user_address: string }>;
    console.log(`[DailySettlement] 找到 ${usersArray.length} 个用户`);
    
    let successCount = 0;
    let failCount = 0;
    
    for (const user of usersArray) {
      try {
        console.log(`[DailySettlement] 结算用户: ${user.user_address}`);
        
        const tx = await staking.updateUserRewards(user.user_address);
        await tx.wait();
        
        console.log(`[DailySettlement] ✅ 结算成功: ${user.user_address}`);
        successCount++;
        
        // 避免 RPC 限流，每次结算后等待 1 秒
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error: any) {
        console.error(`[DailySettlement] ❌ 结算失败: ${user.user_address}`, error.message);
        failCount++;
      }
    }
    
    console.log(`[DailySettlement] 结算完成！成功: ${successCount}, 失败: ${failCount}`);
  } catch (error: any) {
    console.error('[DailySettlement] 结算失败:', error.message);
  }
}

// 计算下次结算时间（UTC 0点 = 北京时间 8点）
function getNextSettlementTime(): number {
  const now = new Date();
  const next = new Date(now);
  next.setUTCHours(0, 0, 0, 0);
  
  if (now.getTime() >= next.getTime()) {
    next.setUTCDate(next.getUTCDate() + 1);
  }
  
  return next.getTime() - now.getTime();
}

async function start() {
  console.log('[DailySettlement] 每日结算服务启动');
  console.log('[DailySettlement] Staking 合约:', STAKING_CONTRACT);
  console.log('[DailySettlement] Relayer 地址:', relayer.address);
  
  const scheduleNext = () => {
    const delay = getNextSettlementTime();
    const nextTime = new Date(Date.now() + delay);
    console.log(`[DailySettlement] 下次结算时间: ${nextTime.toLocaleString('zh-CN')}`);
    
    setTimeout(async () => {
      await settleRewards();
      scheduleNext();
    }, delay);
  };
  
  scheduleNext();
}

start().catch(console.error);
