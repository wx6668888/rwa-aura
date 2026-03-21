import { ethers } from 'ethers';
import Database from 'better-sqlite3';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { UserStatsService } from './UserStatsService';
import { StakeOrderService } from './StakeOrderService';

dotenv.config();

const RPC_URL = process.env.BSC_TESTNET_RPC_URL || 'https://bsc-testnet-rpc.publicnode.com';
const STAKING_CONTRACT = process.env.STAKING_CONTRACT || '0x90eCD84f58a47EAF285Dd0634dDa0f490516d6cD';
const SCAN_INTERVAL = 15000;
const BLOCKS_PER_SCAN = 100;

const provider = new ethers.JsonRpcProvider(RPC_URL);
const stakingAbi = require('../../../artifacts/contracts/StakingContract.sol/StakingContract.json').abi;

const dbPath = path.join(__dirname, '../../database/events.db');
const db = new Database(dbPath);

const schemaPath = path.join(__dirname, '../../database/schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf8');
db.exec(schema);

// 初始化服务
const userStatsService = new UserStatsService(db);
const stakeOrderService = new StakeOrderService();

const getLastSyncedBlock = db.prepare('SELECT last_synced_block FROM sync_status WHERE id = 1');
const updateLastSyncedBlock = db.prepare('UPDATE sync_status SET last_synced_block = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1');

const insertStakeEvent = db.prepare(`
  INSERT OR IGNORE INTO stake_events (event_type, user_address, amount, referrer, stake_id, lock_period, block_number, transaction_hash, timestamp)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertWithdrawalEvent = db.prepare(`
  INSERT OR IGNORE INTO withdrawal_events (event_type, user_address, amount, fee, actual_amount, block_number, transaction_hash, timestamp)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertReferralBinding = db.prepare(`
  INSERT OR IGNORE INTO referral_bindings (user_address, referrer_address, block_number, transaction_hash, timestamp)
  VALUES (?, ?, ?, ?, ?)
`);

const insertRewardUpdate = db.prepare(`
  INSERT OR IGNORE INTO reward_updates (user_address, usdt_rewards, rwa_rewards, block_number, transaction_hash, timestamp)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const insertNodeLevelUpdate = db.prepare(`
  INSERT OR IGNORE INTO node_level_updates (user_address, old_level, new_level, block_number, transaction_hash, timestamp)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const insertStRWAMint = db.prepare(`
  INSERT OR IGNORE INTO strwa_mints (user_address, amount, block_number, transaction_hash, timestamp)
  VALUES (?, ?, ?, ?, ?)
`);

const insertEmergencyWithdrawal = db.prepare(`
  INSERT OR IGNORE INTO emergency_withdrawals (user_address, amount, block_number, transaction_hash, timestamp)
  VALUES (?, ?, ?, ?, ?)
`);

const insertSystemConfigChange = db.prepare(`
  INSERT OR IGNORE INTO system_config_changes (event_type, old_value, new_value, affected_address, block_number, transaction_hash, timestamp)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const insertTokenBurn = db.prepare(`
  INSERT OR IGNORE INTO token_burns (amount, block_number, transaction_hash, timestamp)
  VALUES (?, ?, ?, ?)
`);

async function scanBlocks() {
  try {
    const currentBlock = await provider.getBlockNumber();
    const row = getLastSyncedBlock.get() as any;
    const lastSynced = BigInt(row.last_synced_block);
    const fromBlock = lastSynced === 0n ? (BigInt(currentBlock) > 10000n ? BigInt(currentBlock) - 10000n : 0n) : lastSynced + 1n;
    const toBlock = fromBlock + BigInt(BLOCKS_PER_SCAN) > BigInt(currentBlock) ? BigInt(currentBlock) : fromBlock + BigInt(BLOCKS_PER_SCAN);

    if (fromBlock > BigInt(currentBlock)) {
      console.log(`[EventMonitor] 已同步到最新区块 ${currentBlock}`);
      return;
    }

    console.log(`[EventMonitor] 扫描区块 ${fromBlock} - ${toBlock}`);

    const staking = new ethers.Contract(STAKING_CONTRACT, stakingAbi, provider);
    
    const [
      usdtStakeLogs,
      rwaStakeLogs,
      withdrawalRequestedLogs,
      rwaPrincipalLogs,
      rwaRewardLogs,
      usdtPrincipalLogs,
      flexibleUsdtLogs,
      flexibleRwaLogs,
      referralBoundLogs,
      rewardsUpdatedLogs,
      nodeLevelLogs,
      stRWAMintedLogs,
      emergencyWithdrawalLogs,
      treasuryUpdatedLogs,
      backendUpdatedLogs,
      maxRewardUpdatedLogs,
      whitelistUpdatedLogs,
      buybackUpdatedLogs,
      stRWATokenUpdatedLogs,
      tokensBurnedLogs
    ] = await Promise.all([
      staking.queryFilter(staking.filters.StakeEvent(), fromBlock, toBlock),
      staking.queryFilter(staking.filters.RWAStakeEvent(), fromBlock, toBlock),
      staking.queryFilter(staking.filters.WithdrawalRequested(), fromBlock, toBlock),
      staking.queryFilter(staking.filters.RWAPrincipalWithdrawn(), fromBlock, toBlock),
      staking.queryFilter(staking.filters.RWARewardWithdrawn(), fromBlock, toBlock),
      staking.queryFilter(staking.filters.USDTPrincipalWithdrawn(), fromBlock, toBlock),
      staking.queryFilter(staking.filters.FlexibleUSDTPrincipalWithdrawn(), fromBlock, toBlock),
      staking.queryFilter(staking.filters.FlexibleRWAPrincipalWithdrawn(), fromBlock, toBlock),
      staking.queryFilter(staking.filters.ReferralBound(), fromBlock, toBlock),
      staking.queryFilter(staking.filters.RewardsUpdated(), fromBlock, toBlock),
      staking.queryFilter(staking.filters.NodeLevelUpdated(), fromBlock, toBlock),
      staking.queryFilter(staking.filters.StRWAMinted(), fromBlock, toBlock),
      staking.queryFilter(staking.filters.EmergencyWithdrawal(), fromBlock, toBlock),
      staking.queryFilter(staking.filters.TreasuryAddressUpdated(), fromBlock, toBlock),
      staking.queryFilter(staking.filters.BackendAddressUpdated(), fromBlock, toBlock),
      staking.queryFilter(staking.filters.MaxRewardPerCallUpdated(), fromBlock, toBlock),
      staking.queryFilter(staking.filters.WhitelistUpdated(), fromBlock, toBlock),
      staking.queryFilter(staking.filters.BuybackAddressUpdated(), fromBlock, toBlock),
      staking.queryFilter(staking.filters.StRWATokenUpdated(), fromBlock, toBlock),
      staking.queryFilter(staking.filters.TokensBurned(), fromBlock, toBlock)
    ]);

    console.log(`[EventMonitor] 找到事件: USDT质押=${usdtStakeLogs.length}, RWA质押=${rwaStakeLogs.length}, 提现=${withdrawalRequestedLogs.length + flexibleRwaLogs.length}, 推荐=${referralBoundLogs.length}, 奖励=${rewardsUpdatedLogs.length}, 等级=${nodeLevelLogs.length}, stRWA=${stRWAMintedLogs.length}, 紧急=${emergencyWithdrawalLogs.length}, 配置=${treasuryUpdatedLogs.length + backendUpdatedLogs.length + maxRewardUpdatedLogs.length + whitelistUpdatedLogs.length + buybackUpdatedLogs.length + stRWATokenUpdatedLogs.length}, 销毁=${tokensBurnedLogs.length}`);

    const insertAll = db.transaction(() => {
      for (const log of usdtStakeLogs as any[]) {
        insertStakeEvent.run('USDT_STAKE', log.args.user.toLowerCase(), log.args.amount.toString(), log.args.referrer.toLowerCase(), log.args.stakeId.toString(), Number(log.args.lockPeriod), Number(log.blockNumber), log.transactionHash, Number(log.args.timestamp));
      }
      for (const log of rwaStakeLogs as any[]) {
        insertStakeEvent.run('RWA_STAKE', log.args.user.toLowerCase(), log.args.amount.toString(), log.args.referrer.toLowerCase(), log.args.stakeId.toString(), Number(log.args.lockPeriod), Number(log.blockNumber), log.transactionHash, Number(log.args.timestamp));
      }
      
      for (const log of withdrawalRequestedLogs as any[]) {
        insertWithdrawalEvent.run('WITHDRAWAL_REQUESTED', log.args.user.toLowerCase(), log.args.amount.toString(), null, null, Number(log.blockNumber), log.transactionHash, Number(log.args.timestamp));
      }
      for (const log of rwaPrincipalLogs as any[]) {
        insertWithdrawalEvent.run('RWA_PRINCIPAL', log.args.user.toLowerCase(), log.args.amount.toString(), null, null, Number(log.blockNumber), log.transactionHash, Number(log.args.timestamp));
      }
      for (const log of rwaRewardLogs as any[]) {
        insertWithdrawalEvent.run('RWA_REWARD', log.args.user.toLowerCase(), log.args.amount.toString(), null, null, Number(log.blockNumber), log.transactionHash, Number(log.args.timestamp));
      }
      for (const log of usdtPrincipalLogs as any[]) {
        insertWithdrawalEvent.run('USDT_PRINCIPAL', log.args.user.toLowerCase(), log.args.amount.toString(), log.args.fee?.toString(), log.args.actualAmount?.toString(), Number(log.blockNumber), log.transactionHash, Number(log.args.timestamp));
      }
      for (const log of flexibleUsdtLogs as any[]) {
        insertWithdrawalEvent.run('FLEXIBLE_USDT', log.args.user.toLowerCase(), log.args.amount.toString(), log.args.fee?.toString(), log.args.actualAmount?.toString(), Number(log.blockNumber), log.transactionHash, Number(log.args.timestamp));
      }
      for (const log of flexibleRwaLogs as any[]) {
        insertWithdrawalEvent.run('FLEXIBLE_RWA', log.args.user.toLowerCase(), log.args.amount.toString(), null, null, Number(log.blockNumber), log.transactionHash, Number(log.args.timestamp));
      }
      
      for (const log of referralBoundLogs as any[]) {
        insertReferralBinding.run(log.args.user.toLowerCase(), log.args.referrer.toLowerCase(), Number(log.blockNumber), log.transactionHash, Number(log.args.timestamp));
      }
      
      for (const log of rewardsUpdatedLogs as any[]) {
        insertRewardUpdate.run(log.args.user.toLowerCase(), log.args.usdtRewards.toString(), log.args.rwaRewards.toString(), Number(log.blockNumber), log.transactionHash, Number(log.args.timestamp));
      }
      
      for (const log of nodeLevelLogs as any[]) {
        insertNodeLevelUpdate.run(log.args.user.toLowerCase(), Number(log.args.oldLevel), Number(log.args.newLevel), Number(log.blockNumber), log.transactionHash, Number(log.args.timestamp));
      }
      
      for (const log of stRWAMintedLogs as any[]) {
        insertStRWAMint.run(log.args.user.toLowerCase(), log.args.amount.toString(), Number(log.blockNumber), log.transactionHash, Number(log.args.timestamp));
      }
      
      for (const log of emergencyWithdrawalLogs as any[]) {
        insertEmergencyWithdrawal.run(log.args.user.toLowerCase(), log.args.amount.toString(), Number(log.blockNumber), log.transactionHash, Number(log.args.timestamp));
      }
      
      for (const log of treasuryUpdatedLogs as any[]) {
        insertSystemConfigChange.run('TREASURY_UPDATED', log.args.oldAddress, log.args.newAddress, null, Number(log.blockNumber), log.transactionHash, Math.floor(Date.now() / 1000));
      }
      for (const log of backendUpdatedLogs as any[]) {
        insertSystemConfigChange.run('BACKEND_UPDATED', log.args.oldAddress, log.args.newAddress, null, Number(log.blockNumber), log.transactionHash, Math.floor(Date.now() / 1000));
      }
      for (const log of maxRewardUpdatedLogs as any[]) {
        insertSystemConfigChange.run('MAX_REWARD_UPDATED', null, log.args.newLimit.toString(), null, Number(log.blockNumber), log.transactionHash, Math.floor(Date.now() / 1000));
      }
      for (const log of whitelistUpdatedLogs as any[]) {
        insertSystemConfigChange.run('WHITELIST_UPDATED', null, log.args.status.toString(), log.args.account, Number(log.blockNumber), log.transactionHash, Math.floor(Date.now() / 1000));
      }
      for (const log of buybackUpdatedLogs as any[]) {
        insertSystemConfigChange.run('BUYBACK_UPDATED', log.args.oldAddress, log.args.newAddress, null, Number(log.blockNumber), log.transactionHash, Math.floor(Date.now() / 1000));
      }
      for (const log of stRWATokenUpdatedLogs as any[]) {
        insertSystemConfigChange.run('STRWA_TOKEN_UPDATED', log.args.oldToken, log.args.newToken, null, Number(log.blockNumber), log.transactionHash, Math.floor(Date.now() / 1000));
      }
      
      for (const log of tokensBurnedLogs as any[]) {
        insertTokenBurn.run(log.args.amount.toString(), Number(log.blockNumber), log.transactionHash, Number(log.args.timestamp));
      }
    });

    insertAll();
    updateLastSyncedBlock.run(toBlock.toString());
    console.log(`[EventMonitor] 同步完成，最新区块: ${toBlock}`);
    
    // 自动更新受影响用户的统计数据
    const totalEvents = usdtStakeLogs.length + rwaStakeLogs.length + withdrawalRequestedLogs.length + 
                        rwaPrincipalLogs.length + rwaRewardLogs.length + usdtPrincipalLogs.length;
    
    if (totalEvents > 0) {
      const affectedUsers = new Set<string>();
      
      // 收集所有受影响的用户
      for (const log of usdtStakeLogs as any[]) affectedUsers.add(log.args.user.toLowerCase());
      for (const log of rwaStakeLogs as any[]) affectedUsers.add(log.args.user.toLowerCase());
      for (const log of withdrawalRequestedLogs as any[]) affectedUsers.add(log.args.user.toLowerCase());
      for (const log of rwaPrincipalLogs as any[]) affectedUsers.add(log.args.user.toLowerCase());
      for (const log of rwaRewardLogs as any[]) affectedUsers.add(log.args.user.toLowerCase());
      for (const log of usdtPrincipalLogs as any[]) affectedUsers.add(log.args.user.toLowerCase());
      
      if (affectedUsers.size > 0) {
        console.log(`[EventMonitor] 自动更新 ${affectedUsers.size} 个用户的统计数据...`);
        for (const user of affectedUsers) {
          try {
            userStatsService.updateUserStats(user);
            // 同步用户订单
            await stakeOrderService.syncUserOrders(user);
          } catch (error: any) {
            console.error(`[EventMonitor] 更新用户 ${user} 失败:`, error.message);
          }
        }
        console.log(`[EventMonitor] 用户统计数据更新完成`);
      }
    }
    
    // 每次扫描后更新到期订单状态
    stakeOrderService.updateExpiredOrders();
    
  } catch (error: any) {
    console.error('[EventMonitor] 扫描失败:', error.message);
  }
}

async function start() {
  console.log('[EventMonitor] 启动完整事件监听服务 (SQLite) - 监听 21 种事件');
  console.log(`[EventMonitor] 数据库: ${dbPath}`);
  console.log(`[EventMonitor] Staking 合约: ${STAKING_CONTRACT}`);
  await scanBlocks();
  setInterval(scanBlocks, SCAN_INTERVAL);
}

start().catch(console.error);
