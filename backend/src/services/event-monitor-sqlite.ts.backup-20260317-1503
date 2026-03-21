import { ethers } from 'ethers';
import Database from 'better-sqlite3';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config();

const RPC_URL = process.env.BSC_TESTNET_RPC_URL || 'https://bsc-testnet-rpc.publicnode.com';
const STAKING_CONTRACT = process.env.STAKING_CONTRACT || '0x90eCD84f58a47EAF285Dd0634dDa0f490516d6cD';
const SCAN_INTERVAL = 15000;
const BLOCKS_PER_SCAN = 100;

const provider = new ethers.JsonRpcProvider(RPC_URL);
const stakingAbi = require('../../../artifacts/contracts/StakingContract.sol/StakingContract.json').abi;

// SQLite 数据库
const dbPath = path.join(__dirname, '../../database/events.db');
const db = new Database(dbPath);

// 初始化表
db.exec(`
  CREATE TABLE IF NOT EXISTS stake_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT NOT NULL,
    user_address TEXT NOT NULL,
    amount TEXT NOT NULL,
    referrer TEXT,
    stake_id TEXT NOT NULL,
    lock_period INTEGER NOT NULL,
    block_number INTEGER NOT NULL,
    transaction_hash TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(transaction_hash, stake_id)
  );
  CREATE INDEX IF NOT EXISTS idx_user ON stake_events(user_address);
  CREATE INDEX IF NOT EXISTS idx_block ON stake_events(block_number);
  
  CREATE TABLE IF NOT EXISTS sync_status (
    id INTEGER PRIMARY KEY DEFAULT 1,
    last_synced_block INTEGER NOT NULL DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  INSERT OR IGNORE INTO sync_status (id, last_synced_block) VALUES (1, 0);
`);

const getLastSyncedBlock = db.prepare('SELECT last_synced_block FROM sync_status WHERE id = 1');
const updateLastSyncedBlock = db.prepare('UPDATE sync_status SET last_synced_block = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1');
const insertStakeEvent = db.prepare(`
  INSERT OR IGNORE INTO stake_events (event_type, user_address, amount, referrer, stake_id, lock_period, block_number, transaction_hash, timestamp)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

async function scanBlocks() {
  try {
    const currentBlock = await provider.getBlockNumber();
    const row = getLastSyncedBlock.get() as any;
    const lastSynced = BigInt(row.last_synced_block);
    const fromBlock = lastSynced === 0n ? (BigInt(currentBlock) > 10000n ? BigInt(currentBlock) - 10000n : 0n) : lastSynced + 1n;
    const toBlock = fromBlock + BigInt(BLOCKS_PER_SCAN) > BigInt(currentBlock) ? BigInt(currentBlock) : fromBlock + BigInt(BLOCKS_PER_SCAN);

    if (fromBlock > currentBlock) {
      console.log(`[EventMonitor] 已同步到最新区块 ${currentBlock}`);
      return;
    }

    console.log(`[EventMonitor] 扫描区块 ${fromBlock} - ${toBlock}`);

    const staking = new ethers.Contract(STAKING_CONTRACT, stakingAbi, provider);
    const usdtFilter = staking.filters.StakeEvent();
    const usdtLogs = await staking.queryFilter(usdtFilter, fromBlock, toBlock);
    const rwaFilter = staking.filters.RWAStakeEvent();
    const rwaLogs = await staking.queryFilter(rwaFilter, fromBlock, toBlock);

    console.log(`[EventMonitor] 找到 ${usdtLogs.length} 个 USDT 质押, ${rwaLogs.length} 个 RWA 质押`);

    const insertMany = db.transaction((events: any[]) => {
      for (const e of events) {
        insertStakeEvent.run(e.eventType, e.userAddress.toLowerCase(), e.amount, e.referrer.toLowerCase(), e.stakeId, e.lockPeriod, e.blockNumber, e.transactionHash, e.timestamp);
      }
    });

    const events = [
      ...usdtLogs.map((log: any) => ({
        eventType: 'USDT_STAKE',
        userAddress: log.args.user,
        amount: log.args.amount.toString(),
        referrer: log.args.referrer,
        stakeId: log.args.stakeId.toString(),
        lockPeriod: Number(log.args.lockPeriod),
        blockNumber: Number(log.blockNumber),
        transactionHash: log.transactionHash,
        timestamp: Number(log.args.timestamp),
      })),
      ...rwaLogs.map((log: any) => ({
        eventType: 'RWA_STAKE',
        userAddress: log.args.user,
        amount: log.args.amount.toString(),
        referrer: log.args.referrer,
        stakeId: log.args.stakeId.toString(),
        lockPeriod: Number(log.args.lockPeriod),
        blockNumber: Number(log.blockNumber),
        transactionHash: log.transactionHash,
        timestamp: Number(log.args.timestamp),
      }))
    ];

    insertMany(events);
    updateLastSyncedBlock.run(toBlock.toString());
    console.log(`[EventMonitor] 同步完成，最新区块: ${toBlock}`);
  } catch (error: any) {
    console.error('[EventMonitor] 扫描失败:', error.message);
  }
}

async function start() {
  console.log('[EventMonitor] 启动事件监听服务 (SQLite)');
  console.log(`[EventMonitor] 数据库: ${dbPath}`);
  console.log(`[EventMonitor] Staking 合约: ${STAKING_CONTRACT}`);
  await scanBlocks();
  setInterval(scanBlocks, SCAN_INTERVAL);
}

start().catch(console.error);
