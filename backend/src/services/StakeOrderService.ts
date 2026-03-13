import Database from 'better-sqlite3';
import { ethers } from 'ethers';
import path from 'path';

const dbPath = path.join(__dirname, '../../database/events.db');
const db = new Database(dbPath);

const STAKING_CONTRACT = process.env.STAKING_CONTRACT || '0xB4FD045003C402BE6ebaAECFD27105343CB7B3bE';
const RPC_URL = process.env.BSC_TESTNET_RPC_URL || 'https://bsc-testnet-rpc.publicnode.com';

const provider = new ethers.JsonRpcProvider(RPC_URL);
const stakingAbi = [
  'function getRWALockedPrincipals(address user) view returns (uint256[] stakeIds, uint256[] amounts, uint256[] lockStartTimes, uint256[] lockEndTimes, bool[] canWithdraw, bool[] isWithdrawn)',
  'function getUSDTLockedPrincipals(address user) view returns (uint256[] stakeIds, uint256[] amounts, uint256[] lockStartTimes, uint256[] lockEndTimes, bool[] canWithdraw, bool[] isWithdrawn)',
  'function rwaFlexibleTotalStaked(address user) view returns (uint256)',
  'function usdtFlexibleTotalStaked(address user) view returns (uint256)'
];
const staking = new ethers.Contract(STAKING_CONTRACT, stakingAbi, provider);

export class StakeOrderService {
  // 同步用户的所有订单
  async syncUserOrders(userAddress: string) {
    const now = Math.floor(Date.now() / 1000);
    
    try {
      // 读取锁仓订单
      const [rwaStakeIds, rwaAmounts, rwaLockStartTimes, rwaLockEndTimes, , rwaIsWithdrawn] = 
        await staking.getRWALockedPrincipals(userAddress);
      
      const [usdtStakeIds, usdtAmounts, usdtLockStartTimes, usdtLockEndTimes, , usdtIsWithdrawn] = 
        await staking.getUSDTLockedPrincipals(userAddress);
      
      // 插入或更新 RWA 锁仓订单
      for (let i = 0; i < rwaStakeIds.length; i++) {
        const lockPeriod = Math.floor((Number(rwaLockEndTimes[i]) - Number(rwaLockStartTimes[i])) / 86400);
        const isExpired = now >= Number(rwaLockEndTimes[i]);
        const status = rwaIsWithdrawn[i] ? 'withdrawn' : (isExpired ? 'expired' : 'active');
        
        db.prepare(`
          INSERT INTO user_stake_orders (
            user_address, stake_id, asset_type, amount, lock_period,
            lock_start_time, lock_end_time, status, is_flexible, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(user_address, stake_id, asset_type) DO UPDATE SET
            status = excluded.status,
            updated_at = excluded.updated_at
        `).run(
          userAddress.toLowerCase(),
          `rwa_${rwaStakeIds[i]}`,
          'RWA',
          rwaAmounts[i].toString(),
          lockPeriod,
          Number(rwaLockStartTimes[i]),
          Number(rwaLockEndTimes[i]),
          status,
          0,
          now,
          now
        );
      }
      
      // 插入或更新 USDT 锁仓订单
      for (let i = 0; i < usdtStakeIds.length; i++) {
        const lockPeriod = Math.floor((Number(usdtLockEndTimes[i]) - Number(usdtLockStartTimes[i])) / 86400);
        const isExpired = now >= Number(usdtLockEndTimes[i]);
        const status = usdtIsWithdrawn[i] ? 'withdrawn' : (isExpired ? 'expired' : 'active');
        
        db.prepare(`
          INSERT INTO user_stake_orders (
            user_address, stake_id, asset_type, amount, lock_period,
            lock_start_time, lock_end_time, status, is_flexible, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(user_address, stake_id, asset_type) DO UPDATE SET
            status = excluded.status,
            updated_at = excluded.updated_at
        `).run(
          userAddress.toLowerCase(),
          `usdt_${usdtStakeIds[i]}`,
          'USDT',
          usdtAmounts[i].toString(),
          lockPeriod,
          Number(usdtLockStartTimes[i]),
          Number(usdtLockEndTimes[i]),
          status,
          0,
          now,
          now
        );
      }
      
      console.log(`[StakeOrderService] 同步完成: ${userAddress}`);
    } catch (error) {
      console.error(`[StakeOrderService] 同步失败: ${userAddress}`, error);
    }
  }
  
  // 更新所有到期订单的状态
  updateExpiredOrders() {
    const now = Math.floor(Date.now() / 1000);
    const result = db.prepare(`
      UPDATE user_stake_orders
      SET status = 'expired', updated_at = ?
      WHERE lock_end_time <= ? AND status = 'active'
    `).run(now, now);
    
    if (result.changes > 0) {
      console.log(`[StakeOrderService] 更新了 ${result.changes} 个到期订单`);
    }
  }
}
