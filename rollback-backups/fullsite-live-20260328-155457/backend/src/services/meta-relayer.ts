import express from 'express';
import { ethers } from 'ethers';
import cors from 'cors';
import * as dotenv from 'dotenv';
import Database from 'better-sqlite3';
import * as path from 'path';
import unifiedDataRouter from '../routes/unified-data';
import { BSC_MAINNET_ADDRESSES } from '../config/bsc-mainnet-addresses';
import { bscRelayerProvider } from '../config/bsc-relayer-provider';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// 配置
const RELAYER_PRIVATE_KEY = process.env.RELAYER_PRIVATE_KEY || '';
const STAKING_CONTRACT =
  process.env.STAKING_CONTRACT ||
  process.env.STAKING_CONTRACT_ADDRESS ||
  BSC_MAINNET_ADDRESSES.stakingContract;
const RWA_TOKEN_ADDR =
  process.env.RWA_TOKEN_ADDRESS || process.env.RWA_TOKEN || BSC_MAINNET_ADDRESSES.rwaToken;
const USDT_TOKEN_ADDR =
  process.env.USDT_TOKEN_ADDRESS || process.env.USDT_ADDRESS || BSC_MAINNET_ADDRESSES.usdtToken;

/** 与 routes/relayer.ts 一致：多 RPC Fallback，勿再用单点 getBscRpcUrl */
const provider = bscRelayerProvider;
const relayer = new ethers.Wallet(RELAYER_PRIVATE_KEY, provider);

const stakingAbi = require('../../../artifacts/contracts/StakingContract.sol/StakingContract.json').abi;

// SQLite 数据库
const dbPath = path.join(__dirname, '../../database/events.db');
const db = new Database(dbPath);

// 初始化数据库表
const fs = require('fs');
const schemaPath = path.join(__dirname, '../../database/schema.sql');
if (fs.existsSync(schemaPath)) {
  const schema = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schema);
}

const getStakesByUser = db.prepare('SELECT * FROM stake_events WHERE user_address = ? ORDER BY block_number DESC');

// 获取 nonce
app.get('/api/nonce/:address', async (req, res) => {
  try {
    const staking = new ethers.Contract(STAKING_CONTRACT, stakingAbi, provider);
    const nonce = await staking.nonces(req.params.address);
    res.json({ nonce: nonce.toString() });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 获取 RWA Permit nonce
app.get('/api/rwa-nonce/:address', async (req, res) => {
  try {
    const rwaAbi = ['function nonces(address) view returns (uint256)'];
    const rwa = new ethers.Contract(RWA_TOKEN_ADDR, rwaAbi, provider);
    const nonce = await rwa.nonces(req.params.address);
    res.json({ nonce: nonce.toString() });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 获取 USDT Permit nonce
app.get('/api/usdt-nonce/:address', async (req, res) => {
  try {
    const usdtAbi = ['function nonces(address) view returns (uint256)'];
    const usdt = new ethers.Contract(USDT_TOKEN_ADDR, usdtAbi, provider);
    const nonce = await usdt.nonces(req.params.address);
    res.json({ nonce: nonce.toString() });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Meta Stake
app.post('/api/meta-stake', async (req, res) => {
  try {
    const { user, amount, referrer, lockPeriod, deadline, signature } = req.body;
    
    const staking = new ethers.Contract(STAKING_CONTRACT, stakingAbi, relayer);
    const tx = await staking.metaStake(user, amount, referrer, lockPeriod, deadline, signature);
    const receipt = await tx.wait();
    
    res.json({ success: true, txHash: receipt.hash });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Meta Stake with Permit (完全 gasless)
app.post('/api/meta-stake-permit', async (req, res) => {
  try {
    const { user, amount, referrer, lockPeriod, deadline, v, r, s, signature } = req.body;
    
    const staking = new ethers.Contract(STAKING_CONTRACT, stakingAbi, relayer);
    const tx = await staking.metaStakeWithPermit(user, amount, referrer, lockPeriod, deadline, v, r, s, signature);
    const receipt = await tx.wait();
    
    res.json({ success: true, txHash: receipt.hash });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Meta Stake RWA
app.post('/api/meta-stake-rwa', async (req, res) => {
  try {
    const { user, amount, referrer, lockPeriod, deadline, signature } = req.body;
    
    const staking = new ethers.Contract(STAKING_CONTRACT, stakingAbi, relayer);
    const tx = await staking.metaStakeRWA(user, amount, referrer, lockPeriod, deadline, signature);
    const receipt = await tx.wait();
    
    res.json({ success: true, txHash: receipt.hash });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Meta Stake RWA with Permit (完全 gasless)
app.post('/api/meta-stake-rwa-permit', async (req, res) => {
  try {
    const { user, amount, referrer, lockPeriod, deadline, v, r, s, signature } = req.body;
    
    const staking = new ethers.Contract(STAKING_CONTRACT, stakingAbi, relayer);
    const tx = await staking.metaStakeRWAWithPermit(user, amount, referrer, lockPeriod, deadline, v, r, s, signature);
    const receipt = await tx.wait();
    
    res.json({ success: true, txHash: receipt.hash });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 查询用户资产组合（余额 + 质押）
app.get('/api/portfolio/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const staking = new ethers.Contract(STAKING_CONTRACT, stakingAbi, provider);
    
    // 读取合约数据
    const [userInfo, rwaInfo] = await Promise.all([
      staking.users(address),
      staking.rwaStakes(address),
    ]);
    
    const portfolio = {
      usdtStaked: userInfo.totalStaked.toString(),
      rwaStaked: rwaInfo.totalStakedRWA.toString(),
      usdtFlexible: userInfo.usdtFlexibleTotalStaked?.toString() || '0',
      rwaFlexible: rwaInfo.rwaFlexibleTotalStaked?.toString() || '0',
      firstStakeTime: Number(userInfo.firstStakeTime),
      rwaFirstStakeTime: Number(rwaInfo.firstStakeTime),
    };
    
    res.json({ success: true, data: portfolio });
  } catch (error: any) {
    console.error('Error fetching portfolio:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 查询用户质押事件列表（从数据库读取）
app.get('/api/stakes/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const limit = parseInt(req.query.limit as string) || 200;
    
    // 合并质押和提现事件
    const events = db.prepare(`
      SELECT 'stake' as action, event_type, amount, timestamp, lock_period, block_number, transaction_hash
      FROM stake_events
      WHERE LOWER(user_address) = LOWER(?)
      UNION ALL
      SELECT 'withdraw' as action, event_type, amount, timestamp, NULL as lock_period, block_number, transaction_hash
      FROM withdrawal_events
      WHERE LOWER(user_address) = LOWER(?)
      ORDER BY timestamp DESC
      LIMIT ?
    `).all(address, address, limit);
    
    const stakes = events.map((e: any) => ({
      stakeId: `${e.action}_${e.event_type}_${e.timestamp}`,
      amount: e.amount,
      timestamp: e.timestamp,
      lockPeriod: e.lock_period || 0,
      assetType: e.event_type.includes('USDT') ? 'USDT' : 'RWA',
      action: e.action,
      blockNumber: e.block_number,
      transactionHash: e.transaction_hash,
    }));
    
    res.json({ success: true, data: { stakes } });
  } catch (error: any) {
    console.error('Error fetching stakes:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 查询用户质押总和（优先合约，回退数据库）
app.get('/stakes/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const staking = new ethers.Contract(STAKING_CONTRACT, stakingAbi, provider);
    
    // 1. 优先从合约读取
    const userInfo = await staking.users(address);
    const rwaInfo = await staking.rwaStakes(address);
    
    const stakes = [];
    
    if (userInfo.totalStaked > 0n) {
      stakes.push({
        stakeId: `usdt_${userInfo.firstStakeTime}`,
        amount: userInfo.totalStaked.toString(),
        timestamp: Number(userInfo.firstStakeTime),
        lockPeriod: 0,
        assetType: 'USDT',
      });
    }
    
    if (rwaInfo.totalStakedRWA > 0n) {
      stakes.push({
        stakeId: `rwa_${rwaInfo.firstStakeTime}`,
        amount: rwaInfo.totalStakedRWA.toString(),
        timestamp: Number(rwaInfo.firstStakeTime),
        lockPeriod: 0,
        assetType: 'RWA',
      });
    }
    
    // 2. 如果合约无数据，回退到数据库
    if (stakes.length === 0) {
      const events = getStakesByUser.all(address.toLowerCase()) as any[];
      stakes.push(...events.map(e => ({
        stakeId: e.stake_id,
        amount: e.amount,
        timestamp: e.timestamp,
        lockPeriod: e.lock_period,
        assetType: e.event_type === 'RWA_STAKE' ? 'RWA' : 'USDT',
      })));
    }
    
    res.json({ success: true, data: { stakes } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 导入额外的 API 路由
import apiRoutes from '../routes/api';
app.use('/api', apiRoutes);

// 初始化统一数据服务
const staking = new ethers.Contract(STAKING_CONTRACT, stakingAbi, provider);
app.use('/api', unifiedDataRouter);

// UserStatsService 统计同步在当前部署版本中可能与类型/方法不匹配。
// 为了保证 gasless nonce / 签名 / meta-stake 等主链上流程可用，
// 这里先禁用“全量更新/按地址更新用户统计”的逻辑。
// 后续等你把 UserStatsService 与 meta-relayer 的方法对齐后，再恢复这段功能。

const PORT = process.env.RELAYER_PORT || 3001;
app.listen(PORT, () => {
  console.log(`Meta Transaction Relayer running on port ${PORT}`);
  console.log(`Relayer address: ${relayer.address}`);
});
