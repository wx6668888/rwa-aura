import { ethers } from 'ethers';
import mysql from 'mysql2/promise';
import Database from 'better-sqlite3';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { UserStatsService } from './UserStatsService';

dotenv.config();

const RPC_URL = process.env.BSC_TESTNET_RPC_URL || 'https://bsc-testnet-rpc.publicnode.com';
const STAKING_CONTRACT = process.env.STAKING_CONTRACT || '0x90eCD84f58a47EAF285Dd0634dDa0f490516d6cD';
const SCAN_INTERVAL = 15000; // 15秒扫描一次
const BLOCKS_PER_SCAN = 100; // 每次扫描100个区块

const provider = new ethers.JsonRpcProvider(RPC_URL);
const stakingAbi = require('../../../artifacts/contracts/StakingContract.sol/StakingContract.json').abi;

// MySQL 连接
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'rwa_user',
  password: process.env.DB_PASSWORD || 'rwa_password',
  database: process.env.DB_NAME || 'rwa_protocol',
  waitForConnections: true,
  connectionLimit: 10,
});

// SQLite 连接（用于 user_stats）
const dbPath = path.join(__dirname, '../../database/events.db');
const sqliteDb = new Database(dbPath);
const userStatsService = new UserStatsService(sqliteDb);

async function getLastSyncedBlock(): Promise<bigint> {
  const [rows] = await pool.query('SELECT last_synced_block FROM sync_status WHERE id = 1');
  const result = rows as any[];
  return BigInt(result[0]?.last_synced_block || 0);
}

async function updateLastSyncedBlock(blockNumber: bigint) {
  await pool.query('UPDATE sync_status SET last_synced_block = ? WHERE id = 1', [blockNumber.toString()]);
}

async function saveStakeEvent(event: any) {
  const sql = `
    INSERT INTO stake_events (event_type, user_address, amount, referrer, stake_id, lock_period, block_number, transaction_hash, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE id=id
  `;
  
  await pool.query(sql, [
    event.eventType,
    event.userAddress.toLowerCase(),
    event.amount,
    event.referrer.toLowerCase(),
    event.stakeId,
    event.lockPeriod,
    event.blockNumber.toString(),
    event.transactionHash,
    event.timestamp,
  ]);
}

async function scanBlocks() {
  try {
    const currentBlock = await provider.getBlockNumber();
    const lastSynced = await getLastSyncedBlock();
    const fromBlock = lastSynced === 0n ? (currentBlock > 10000 ? BigInt(currentBlock - 10000) : 0n) : lastSynced + 1n;
    const toBlock = fromBlock + BigInt(BLOCKS_PER_SCAN) > BigInt(currentBlock) ? BigInt(currentBlock) : fromBlock + BigInt(BLOCKS_PER_SCAN);

    if (fromBlock > currentBlock) {
      console.log(`[EventMonitor] 已同步到最新区块 ${currentBlock}`);
      return;
    }

    console.log(`[EventMonitor] 扫描区块 ${fromBlock} - ${toBlock}`);

    const staking = new ethers.Contract(STAKING_CONTRACT, stakingAbi, provider);
    
    // 查询 USDT 质押事件
    const usdtFilter = staking.filters.StakeEvent();
    const usdtLogs = await staking.queryFilter(usdtFilter, fromBlock, toBlock);
    
    // 查询 RWA 质押事件
    const rwaFilter = staking.filters.RWAStakeEvent();
    const rwaLogs = await staking.queryFilter(rwaFilter, fromBlock, toBlock);

    console.log(`[EventMonitor] 找到 ${usdtLogs.length} 个 USDT 质押, ${rwaLogs.length} 个 RWA 质押`);

    const affectedUsers = new Set<string>();

    // 保存 USDT 质押
    for (const log of usdtLogs) {
      const eventLog = log as ethers.EventLog;
      await saveStakeEvent({
        eventType: 'USDT_STAKE',
        userAddress: eventLog.args.user,
        amount: eventLog.args.amount.toString(),
        referrer: eventLog.args.referrer,
        stakeId: eventLog.args.stakeId.toString(),
        lockPeriod: Number(eventLog.args.lockPeriod),
        blockNumber: eventLog.blockNumber,
        transactionHash: eventLog.transactionHash,
        timestamp: Number(eventLog.args.timestamp),
      });
      affectedUsers.add(eventLog.args.user.toLowerCase());
    }

    // 保存 RWA 质押
    for (const log of rwaLogs) {
      const eventLog = log as ethers.EventLog;
      await saveStakeEvent({
        eventType: 'RWA_STAKE',
        userAddress: eventLog.args.user,
        amount: eventLog.args.amount.toString(),
        referrer: eventLog.args.referrer,
        stakeId: eventLog.args.stakeId.toString(),
        lockPeriod: Number(eventLog.args.lockPeriod),
        blockNumber: eventLog.blockNumber,
        transactionHash: eventLog.transactionHash,
        timestamp: Number(eventLog.args.timestamp),
      });
      affectedUsers.add(eventLog.args.user.toLowerCase());
    }

    await updateLastSyncedBlock(toBlock);
    console.log(`[EventMonitor] 同步完成，最新区块: ${toBlock}`);

    // 自动更新受影响用户的统计数据
    if (affectedUsers.size > 0) {
      console.log(`[EventMonitor] 更新 ${affectedUsers.size} 个用户的统计数据...`);
      for (const user of affectedUsers) {
        try {
          userStatsService.updateUserStats(user);
        } catch (error: any) {
          console.error(`[EventMonitor] 更新用户 ${user} 失败:`, error.message);
        }
      }
      console.log(`[EventMonitor] 用户统计数据更新完成`);
    }
  } catch (error: any) {
    console.error('[EventMonitor] 扫描失败:', error.message);
  }
}

async function start() {
  console.log('[EventMonitor] 启动事件监听服务');
  console.log(`[EventMonitor] Staking 合约: ${STAKING_CONTRACT}`);
  console.log(`[EventMonitor] 扫描间隔: ${SCAN_INTERVAL}ms`);
  
  // 立即执行一次
  await scanBlocks();
  
  // 定期扫描
  setInterval(scanBlocks, SCAN_INTERVAL);
}

start().catch(console.error);
