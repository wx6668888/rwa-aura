import { Router, Request, Response } from 'express';
import { getPool, query, transaction } from '../config/database.config';
import { RowDataPacket } from 'mysql2';
import logger from '../utils/logger';
import { MarketDataService } from '../services/MarketDataService';
import { TeamVolumeService } from '../services/TeamVolumeService';
import { getUserDividendInfo, getPoolStatus } from '../services/DividendService';
import { ethers } from 'ethers';

const STAKING_ABI_EVENTS = [
  'event StakeEvent(address indexed user, uint256 amount, address indexed referrer, uint256 indexed stakeId, uint256 timestamp, uint256 lockPeriod)',
  'event RWAStakeEvent(address indexed user, uint256 amount, address indexed referrer, uint256 indexed stakeId, uint256 timestamp, uint256 lockPeriod)',
];

const router = Router();

/** 按 chainId 取 RPC 与质押合约地址，与前端 CONTRACT_ADDRESSES 对应：56=BSC 主网，97=BSC 测试网，31337/1337=本地 */
function getRpcAndContractByChainId(chainId: number): { rpcUrl: string; contractAddress: string } | null {
  const c = Number(chainId);
  if (c === 56) {
    const rpc = process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org';
    const addr = process.env.STAKING_CONTRACT_ADDRESS_BSC || process.env.STAKING_CONTRACT_ADDRESS;
    return addr ? { rpcUrl: rpc, contractAddress: addr } : null;
  }
  if (c === 97) {
    const rpc = process.env.BSC_TESTNET_RPC_URL || 'https://data-seed-prebsc-1-s1.binance.org:8545';
    const addr = process.env.STAKING_CONTRACT_ADDRESS_TESTNET || process.env.STAKING_CONTRACT_ADDRESS;
    return addr ? { rpcUrl: rpc, contractAddress: addr } : null;
  }
  if (c === 31337 || c === 1337) {
    const rpc = process.env.RPC_URL || 'http://127.0.0.1:8545';
    // 与前端 addresses.ts 及 deploy-local-test 部署顺序一致：StakingContract 为第 5 个合约
    const addr = process.env.STAKING_CONTRACT_ADDRESS || '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9';
    return { rpcUrl: rpc, contractAddress: addr };
  }
  return null;
}

/** 与前端 useUserStakes 一致：从指定链查该用户的 StakeEvent/RWAStakeEvent 并汇总 USDT 等值（18 位）。
 * 规则：deposited = 全部充值（用于总留存）；depositedLocked = 仅 lockPeriod>0 的充值（用于节点等级考核，无锁仓不计入）。
 */
async function getDepositedFromChain(userAddress: string, chainId?: number): Promise<{ deposited: string; depositedLocked: string; debug?: { chainId: number | null; rpcMask: string; contract: string; block: number; stakeCount: number; rwaCount: number } }> {
  const cfg = chainId != null && !Number.isNaN(chainId) ? getRpcAndContractByChainId(chainId) : null;
  const rpcUrl = cfg?.rpcUrl ?? process.env.RPC_URL ?? process.env.BSC_RPC_URL ?? process.env.BSC_TESTNET_RPC_URL;
  const contractAddress = cfg?.contractAddress ?? process.env.STAKING_CONTRACT_ADDRESS;
  if (!rpcUrl || !contractAddress) return { deposited: '0', depositedLocked: '0' };
  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const contract = new ethers.Contract(contractAddress, STAKING_ABI_EVENTS, provider);
    const addr = userAddress.toLowerCase();
    const currentBlock = await provider.getBlockNumber();
    const stakeEvents = await contract.queryFilter(contract.filters.StakeEvent(addr), 0, currentBlock);
    const rwaEvents = await contract.queryFilter(contract.filters.RWAStakeEvent(addr), 0, currentBlock);
    let sum = 0n;
    let sumLocked = 0n;
    for (const e of stakeEvents) {
      const args = (e as ethers.EventLog).args as { amount: bigint; lockPeriod?: bigint };
      const amt = BigInt(args.amount?.toString?.() ?? '0');
      sum += amt;
      if (Number(args.lockPeriod ?? 0) > 0) sumLocked += amt;
    }
    for (const e of rwaEvents) {
      const args = (e as ethers.EventLog).args as { amount: bigint; lockPeriod?: bigint };
      const amt = (BigInt(args.amount?.toString?.() ?? '0') * 85n) / 100n;
      sum += amt;
      if (Number(args.lockPeriod ?? 0) > 0) sumLocked += amt;
    }
    return {
      deposited: sum.toString(),
      depositedLocked: sumLocked.toString(),
      debug: {
        chainId: chainId ?? null,
        rpcMask: rpcUrl.length > 20 ? rpcUrl.slice(0, 20) + '...' : rpcUrl,
        contract: contractAddress,
        block: currentBlock,
        stakeCount: stakeEvents.length,
        rwaCount: rwaEvents.length,
      },
    };
  } catch (e) {
    logger.warn('getDepositedFromChain failed:', e);
    return { deposited: '0', depositedLocked: '0' };
  }
}

// 初始化 MarketDataService（使用环境变量配置）
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || 'https://bsc-dataseed.binance.org');
const tokenAddress = process.env.RWA_TOKEN_ADDRESS || '';
const marketDataService = new MarketDataService(provider, tokenAddress);

/**
 * GET /api/user/:address
 * 查询用户基本信息
 */
router.get('/user/:address', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const pool = getPool();
    
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM users WHERE address = ?',
      [address.toLowerCase()]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    const user = rows[0];
    
    // 所有金额字段使用 string 类型返回
    res.json({
      success: true,
      data: {
        address: user.address,
        referrer: user.referrer,
        nodeLevel: user.node_level,
        totalStaked: user.total_staked.toString(),
        rwaPending: user.rwa_pending.toString(),
        totalStaticRewards: user.total_static_rewards.toString(),
        totalDynamicRewards: user.total_dynamic_rewards.toString(),
        isActive: user.is_active,
        lastStakeTime: user.last_stake_time,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      }
    });
  } catch (error) {
    logger.error('Error fetching user:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/** 节点等级要求（与 frontend/lib/node-levels.ts 一致，用于服务端计算 nodeLevel） */
const NODE_LEVEL_REQUIREMENTS = [
  { level: 1, personalStakeUSDT: 0, teamVolumeUSDT: 0, teamRetainedUSDT: 0 },
  { level: 2, personalStakeUSDT: 500, teamVolumeUSDT: 5000, teamRetainedUSDT: 2000 },
  { level: 3, personalStakeUSDT: 1000, teamVolumeUSDT: 20000, teamRetainedUSDT: 8000 },
  { level: 4, personalStakeUSDT: 3000, teamVolumeUSDT: 50000, teamRetainedUSDT: 20000 },
  { level: 5, personalStakeUSDT: 8000, teamVolumeUSDT: 150000, teamRetainedUSDT: 60000 },
  { level: 6, personalStakeUSDT: 20000, teamVolumeUSDT: 400000, teamRetainedUSDT: 160000 },
  { level: 7, personalStakeUSDT: 50000, teamVolumeUSDT: 1000000, teamRetainedUSDT: 400000 },
  { level: 8, personalStakeUSDT: 100000, teamVolumeUSDT: 2500000, teamRetainedUSDT: 1000000 },
  { level: 9, personalStakeUSDT: 200000, teamVolumeUSDT: 5000000, teamRetainedUSDT: 2000000 },
];

function toUsdtHuman(raw: string): number {
  if (!raw || raw === '0') return 0;
  return Number(BigInt(raw)) / 1e18;
}

function computeNodeLevelFromRequirements(
  personalStakeUsdt: number,
  teamVolumeUsdt: number,
  teamRetainedUsdt: number
): number {
  for (let i = NODE_LEVEL_REQUIREMENTS.length - 1; i >= 0; i--) {
    const r = NODE_LEVEL_REQUIREMENTS[i];
    if (
      personalStakeUsdt >= r.personalStakeUSDT &&
      teamVolumeUsdt >= r.teamVolumeUSDT &&
      teamRetainedUsdt >= r.teamRetainedUSDT
    ) {
      return r.level;
    }
  }
  return 1;
}

/**
 * GET /api/user/:address/level-info
 * 节点等级考核用：返回 nodeLevel、累计个人质押、团队总质押、总留存(团队充值-团队提现，USDT等值)，均为 18 位整数字符串。
 * 总留存：当链上 deposited > DB 时用链上补正（chainDeposited - withdrawn）。
 * nodeLevel：按个人质押、团队量、总留存实时计算，不依赖 DB/合约的 node_level。
 */
router.get('/user/:address/level-info', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const addr = address.toLowerCase();
    const pool = getPool();
    const raw = req.query.chainId;
    const chainId = raw == null ? undefined : Number(Array.isArray(raw) ? raw[0] : raw);
    const chainIdNum = typeof chainId === 'number' && !Number.isNaN(chainId) ? chainId : undefined;

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT node_level,
        COALESCE(cumulative_personal_stake, 0) AS cumulative_personal_stake,
        COALESCE(team_volume, 0) AS team_volume,
        COALESCE(team_total_deposited, 0) AS team_total_deposited,
        COALESCE(team_total_withdrawn, 0) AS team_total_withdrawn,
        GREATEST(0, COALESCE(team_total_deposited, 0) - COALESCE(team_total_withdrawn, 0)) AS team_retained
       FROM users WHERE address = ?`,
      [addr]
    );
    let deposited = '0';
    let withdrawn = '0';
    let teamRetained = '0';
    let nodeLevel = 1;
    let cumulativePersonalStake = '0';
    let teamVolume = '0';
    if (rows.length > 0) {
      const row = rows[0];
      deposited = row.team_total_deposited != null ? String(row.team_total_deposited) : '0';
      withdrawn = row.team_total_withdrawn != null ? String(row.team_total_withdrawn) : '0';
      teamRetained = row.team_retained != null ? String(row.team_retained) : '0';
      nodeLevel = Number(row.node_level) || 1;
      cumulativePersonalStake = String(row.cumulative_personal_stake ?? '0');
      teamVolume = String(row.team_volume ?? '0');
    }
    // 链上兜底：DB 无/零充值时，或链上充值大于 DB 时，用链上数据补正
    const fromChain = await getDepositedFromChain(addr, chainIdNum);
    const chainDeposited = fromChain.deposited;
    if (BigInt(chainDeposited) > 0n) {
      if (BigInt(deposited) === 0n) {
        deposited = chainDeposited;
        const retained = BigInt(chainDeposited) - BigInt(withdrawn);
        teamRetained = retained > 0n ? retained.toString() : '0';
        cumulativePersonalStake = fromChain.depositedLocked ?? chainDeposited;
        teamVolume = rows.length > 0 ? String(rows[0].team_volume ?? '0') : '0';
      } else if (BigInt(chainDeposited) > BigInt(deposited)) {
        // 链上本人充值 > DB 团队总充值：DB 可能不完整。用链上本人 + (DB团队总-本人) 作为 deposited
        const personalFromDb = BigInt(cumulativePersonalStake);
        const teamPart = BigInt(deposited) - personalFromDb;
        deposited = (BigInt(chainDeposited) + (teamPart > 0n ? teamPart : 0n)).toString();
        const retained = BigInt(deposited) - BigInt(withdrawn);
        teamRetained = retained > 0n ? retained.toString() : '0';
        if (personalFromDb < BigInt(fromChain.depositedLocked ?? chainDeposited)) {
          cumulativePersonalStake = fromChain.depositedLocked ?? chainDeposited;
        }
      }
      if (fromChain.debug) logger.info(`level-info chain: chainId=${chainIdNum} deposited=${chainDeposited}`);
    }

    // 按个人质押、团队量、总留存实时计算 nodeLevel（不依赖 DB/合约）
    const personalUsdt = toUsdtHuman(cumulativePersonalStake);
    const teamVolUsdt = toUsdtHuman(teamVolume);
    const teamVolumeUsdt = personalUsdt + teamVolUsdt;
    const teamRetainedUsdt = toUsdtHuman(teamRetained);
    nodeLevel = computeNodeLevelFromRequirements(personalUsdt, teamVolumeUsdt, teamRetainedUsdt);

    res.json({
      success: true,
      data: {
        nodeLevel,
        cumulativePersonalStake,
        teamVolume,
        teamTotalDeposited: deposited,
        teamTotalWithdrawn: withdrawn,
        teamRetained,
      },
    });
  } catch (error) {
    logger.error('Error fetching level-info:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * GET /api/debug/fund-activity/:address
 * 资金活动排查：传 chainId（如 31337），返回该链合约地址、链上事件数、DB 质押条数，便于对照前端
 */
router.get('/debug/fund-activity/:address', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const raw = req.query.chainId;
    const chainId = raw == null ? undefined : Number(Array.isArray(raw) ? raw[0] : raw);
    const chainIdNum = typeof chainId === 'number' && !Number.isNaN(chainId) ? chainId : null;
    const addr = address.toLowerCase();
    const cfg = chainIdNum != null ? getRpcAndContractByChainId(chainIdNum) : null;
    const fromChain = chainIdNum != null ? await getDepositedFromChain(addr, chainIdNum) : null;
    const pool = getPool();
    const [stakeRows] = await pool.query<RowDataPacket[]>(
      'SELECT id, user_address, amount, lock_period, asset_type, tx_hash, block_number, timestamp, created_at FROM stakes WHERE user_address = ? ORDER BY id DESC LIMIT 20',
      [addr]
    );
    return res.json({
      success: true,
      data: {
        address: addr,
        chainId: chainIdNum,
        contractUsed: cfg ? { rpcUrl: cfg.rpcUrl?.slice(0, 40) + '...', stakingAddress: cfg.contractAddress } : null,
        chainEvents: fromChain?.debug ? { stakeCount: fromChain.debug.stakeCount, rwaCount: fromChain.debug.rwaCount, deposited: fromChain.deposited, depositedLocked: fromChain.depositedLocked } : null,
        dbStakesCount: stakeRows?.length ?? 0,
        dbStakes: (stakeRows ?? []).map((r: Record<string, unknown>) => ({
          id: r.id,
          amount: String(r.amount),
          asset_type: r.asset_type,
          lock_period: r.lock_period,
          block_number: r.block_number,
          tx_hash: r.tx_hash,
        })),
        hint: !cfg ? '请传 chainId（如 31337）' : (fromChain?.debug && fromChain.debug.stakeCount + fromChain.debug.rwaCount === 0 ? '链上 0 条事件：请确认前端 Staking 合约地址与后端一致，且钱包连的是该 chainId' : ''),
      },
    });
  } catch (e: any) {
    logger.error('debug fund-activity failed:', e);
    return res.status(500).json({ success: false, error: e?.message });
  }
});

/**
 * GET /api/user/:address/retained-from-chain
 * 诊断总留存链上查询：传入 chainId（如 31337），返回该链上该用户的质押事件数及汇总金额，用于排查总留存为 0
 */
router.get('/user/:address/retained-from-chain', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const raw = req.query.chainId;
    const chainId = raw == null ? undefined : Number(Array.isArray(raw) ? raw[0] : raw);
    const chainIdNum = typeof chainId === 'number' && !Number.isNaN(chainId) ? chainId : null;
    const result = await getDepositedFromChain(address.toLowerCase(), chainIdNum ?? undefined);
    return res.json({
      success: true,
      data: {
        deposited: result.deposited,
        depositedLocked: result.depositedLocked,
        depositedUsdt: result.deposited ? (Number(BigInt(result.deposited)) / 1e18).toFixed(2) : '0',
        depositedLockedUsdt: result.depositedLocked ? (Number(BigInt(result.depositedLocked)) / 1e18).toFixed(2) : '0',
        debug: result.debug ?? null,
        message: !result.debug ? 'chainId 未传或 RPC/合约未配置' : (result.debug.stakeCount + result.debug.rwaCount === 0 ? '该链上未查到该用户的质押事件，请确认 chainId 与前端当前链一致' : ''),
      },
    });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e?.message });
  }
});

/**
 * GET /api/user/:address/retained-debug
 * 诊断总留存：用户是否存在、team_total_deposited/withdrawn、stakes 表条数与金额汇总
 */
router.get('/user/:address/retained-debug', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const pool = getPool();
    const addr = address.toLowerCase();
    const [userRows] = await pool.query<RowDataPacket[]>(
      'SELECT team_total_deposited, team_total_withdrawn FROM users WHERE address = ?',
      [addr]
    );
    const [stakeRows] = await pool.query<RowDataPacket[]>(
      'SELECT id, amount, asset_type FROM stakes WHERE user_address = ? ORDER BY id',
      [addr]
    );
    const deposited = userRows[0]?.team_total_deposited != null ? String(userRows[0].team_total_deposited) : '0';
    const withdrawn = userRows[0]?.team_total_withdrawn != null ? String(userRows[0].team_total_withdrawn) : '0';
    let stakesSumUsdt = BigInt(0);
    for (const r of stakeRows || []) {
      const amt = BigInt(String(r.amount ?? '0'));
      const isRwa = (r.asset_type || '').toString() === 'RWA';
      stakesSumUsdt += isRwa ? (amt * 85n / 100n) : amt;
    }
    return res.json({
      success: true,
      data: {
        hasUserRow: (userRows?.length ?? 0) > 0,
        team_total_deposited: deposited,
        team_total_withdrawn: withdrawn,
        team_retained: (BigInt(deposited) - BigInt(withdrawn)).toString(),
        stakesCount: (stakeRows?.length ?? 0),
        stakesSumUsdtEquiv: stakesSumUsdt.toString(),
      },
    });
  } catch (e: any) {
    logger.error('retained-debug failed:', e);
    return res.status(500).json({ success: false, error: e?.message });
  }
});

/**
 * POST /api/admin/sync-user-from-chain/:address
 * 从链上拉取该用户的质押事件并写入 stakes、更新 team_total_deposited（总留存）。用于后端监听链与用户不一致时补录。
 */
router.post('/admin/sync-user-from-chain/:address', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const userAddr = address.toLowerCase();
    const rpcUrl = process.env.BSC_RPC_URL || process.env.BSC_TESTNET_RPC_URL || process.env.RPC_URL;
    const contractAddress = process.env.STAKING_CONTRACT_ADDRESS;
    if (!rpcUrl || !contractAddress) {
      return res.status(400).json({ success: false, error: 'Missing BSC_RPC_URL or STAKING_CONTRACT_ADDRESS in .env' });
    }
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const contract = new ethers.Contract(contractAddress, STAKING_ABI_EVENTS, provider);
    const currentBlock = await provider.getBlockNumber();
    const fromBlock = Math.max(0, currentBlock - 50000);

    const stakeEvents = await contract.queryFilter(contract.filters.StakeEvent(userAddr), fromBlock, currentBlock);
    const rwaEvents = await contract.queryFilter(contract.filters.RWAStakeEvent(userAddr), fromBlock, currentBlock);
    const teamVolumeService = new TeamVolumeService();
    let added = 0;
    const processEvent = async (event: ethers.EventLog, isRwa: boolean) => {
      const txHash = event.transactionHash;
      const args = event.args as { user: string; amount: bigint; referrer: string; stakeId: bigint; timestamp: bigint; lockPeriod: bigint };
      const user = String(args.user).toLowerCase();
      const amount = args.amount.toString();
      const stakeId = args.stakeId.toString();
      const lockPeriod = (args.lockPeriod ?? 0n).toString();
      const blockNumber = event.blockNumber;
      const timestamp = args.timestamp.toString();
      const referrer = args.referrer && args.referrer !== ethers.ZeroAddress ? String(args.referrer).toLowerCase() : null;
      const existing = await query<RowDataPacket[]>('SELECT id FROM stakes WHERE tx_hash = ?', [txHash]);
      if (existing.length > 0) return;
      const amountUsdtEquiv = isRwa ? (BigInt(amount) * 85n / 100n).toString() : amount;
      await transaction(async (conn) => {
        await conn.query(
          `INSERT INTO stakes (id, user_address, amount, lock_period, asset_type, tx_hash, block_number, timestamp)
           VALUES (?, ?, ?, ?, ?, ?, ?, FROM_UNIXTIME(?))`,
          [stakeId, user, amount, lockPeriod, isRwa ? 'RWA' : 'USDT', txHash, blockNumber, timestamp]
        );
        await conn.query(
          `INSERT INTO users (address, referrer, total_staked, first_stake_time, is_active)
           VALUES (?, ?, ?, FROM_UNIXTIME(?), TRUE)
           ON DUPLICATE KEY UPDATE total_staked = total_staked + VALUES(total_staked), is_active = TRUE`,
          [user, referrer, amount, timestamp]
        );
      });
      await teamVolumeService.updateTeamDeposited(user, amountUsdtEquiv);
      added++;
    };
    for (const e of stakeEvents) await processEvent(e as ethers.EventLog, false);
    for (const e of rwaEvents) await processEvent(e as ethers.EventLog, true);
    logger.info(`Sync from chain: ${userAddr}, added ${added} stakes`);
    return res.json({ success: true, data: { added, stakeEvents: stakeEvents.length, rwaEvents: rwaEvents.length } });
  } catch (e: any) {
    logger.error('sync-user-from-chain failed:', e);
    return res.status(500).json({ success: false, error: e?.message });
  }
});

/**
 * GET /api/stakes/:address
 * 查询用户质押历史
 */
router.get('/stakes/:address', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const { page = '1', limit = '10' } = req.query;
    const pool = getPool();
    
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;
    
    // 查询总数
    const [countRows] = await pool.query<RowDataPacket[]>(
      'SELECT COUNT(*) as total FROM stakes WHERE user_address = ?',
      [address.toLowerCase()]
    );
    const total = countRows[0].total;
    
    // 查询分页数据
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM stakes 
       WHERE user_address = ? 
       ORDER BY created_at DESC 
       LIMIT ? OFFSET ?`,
      [address.toLowerCase(), limitNum, offset]
    );
    
    // stakes 表结构：id, user_address, amount, lock_period, asset_type, tx_hash, block_number, timestamp, created_at
    res.json({
      success: true,
      data: {
        stakes: rows.map((stake: Record<string, unknown>) => ({
          stakeId: String(stake.id ?? stake.stake_id ?? ''),
          userAddress: stake.user_address,
          amount: String(stake.amount ?? '0'),
          treasuryAmount: String(stake.treasury_amount ?? '0'),
          communityAmount: String(stake.community_amount ?? '0'),
          referrer: stake.referrer ?? null,
          lockPeriod: stake.lock_period,
          assetType: stake.asset_type,
          txHash: stake.tx_hash,
          blockNumber: stake.block_number,
          timestamp: stake.timestamp,
          createdAt: stake.created_at
        })),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching stakes:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/rewards/:address
 * 查询用户收益明细
 */
router.get('/rewards/:address', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const { page = '1', limit = '20', type } = req.query;
    const pool = getPool();
    
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;
    
    // 构建查询条件
    let whereClause = 'WHERE user_address = ?';
    const params: any[] = [address.toLowerCase()];
    
    // Frontend uses "dynamic"; DB stores "differential" for referral rewards
    if (type && (type === 'static' || type === 'dynamic')) {
      whereClause += ' AND reward_type = ?';
      params.push(type === 'dynamic' ? 'differential' : type);
    }
    
    // 查询总数
    const [countRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM rewards ${whereClause}`,
      params
    );
    const total = countRows[0].total;
    
    // 查询分页数据
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM rewards 
       ${whereClause}
       ORDER BY created_at DESC 
       LIMIT ? OFFSET ?`,
      [...params, limitNum, offset]
    );
    
    res.json({
      success: true,
      data: {
        rewards: rows.map(reward => ({
          id: reward.id,
          userAddress: reward.user_address,
          rewardType: reward.reward_type === 'differential' ? 'dynamic' : reward.reward_type,
          amount: reward.amount.toString(),
          fromAddress: reward.from_user ?? null,
          stakeId: reward.stake_id?.toString(),
          txHash: reward.tx_hash,
          createdAt: reward.created_at
        })),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching rewards:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/referrals/:address
 * 查询推荐关系
 */
router.get('/referrals/:address', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const pool = getPool();
    
    // 查询直推列表
    const [directReferrals] = await pool.query<RowDataPacket[]>(
      `SELECT 
        u.address,
        u.node_level,
        u.total_staked,
        u.is_active,
        u.created_at
       FROM users u
       WHERE u.referrer = ?
       ORDER BY u.created_at DESC`,
      [address.toLowerCase()]
    );
    
    // 查询团队统计
    const [teamStats] = await pool.query<RowDataPacket[]>(
      `SELECT 
        COUNT(*) as team_count,
        SUM(u.total_staked) as team_volume
       FROM referral_relations rr
       JOIN users u ON rr.user_address = u.address
       WHERE rr.ancestor_address = ? AND rr.depth > 0`,
      [address.toLowerCase()]
    );
    
    // 查询各部门业绩
    const [departments] = await pool.query<RowDataPacket[]>(
      `SELECT 
        direct_referral,
        department_volume
       FROM department_volumes
       WHERE user_address = ?
       ORDER BY department_volume DESC`,
      [address.toLowerCase()]
    );
    
    res.json({
      success: true,
      data: {
        directReferrals: directReferrals.map(ref => ({
          address: ref.address,
          nodeLevel: ref.node_level,
          totalStaked: ref.total_staked.toString(),
          isActive: ref.is_active,
          createdAt: ref.created_at
        })),
        teamStats: {
          teamCount: teamStats[0]?.team_count || 0,
          teamVolume: teamStats[0]?.team_volume?.toString() || '0'
        },
        departments: departments.map(dept => ({
          directReferral: dept.direct_referral,
          departmentVolume: dept.department_volume.toString()
        }))
      }
    });
  } catch (error) {
    logger.error('Error fetching referrals:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/level-history/:address
 * 查询节点等级历史
 */
router.get('/level-history/:address', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const pool = getPool();
    
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM node_level_history 
       WHERE user_address = ? 
       ORDER BY created_at DESC`,
      [address.toLowerCase()]
    );
    
    res.json({
      success: true,
      data: {
        history: rows.map(record => ({
          id: record.id,
          userAddress: record.user_address,
          oldLevel: record.old_level,
          newLevel: record.new_level,
          directReferralsCount: record.direct_v_count ?? 0,
          teamVolume: record.team_volume.toString(),
          maxDepartmentVolume: (record as any).max_department_volume != null ? String((record as any).max_department_volume) : '0',
          txHash: (record as any).tx_hash ?? null,
          createdAt: record.created_at
        }))
      }
    });
  } catch (error) {
    logger.error('Error fetching level history:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/stats/global
 * 查询全局统计
 */
router.get('/stats/global', async (req: Request, res: Response) => {
  try {
    // 查询 RWA 质押统计
    const pool = getPool();

    // 根据实际表结构 rwa_stakes 统计总质押和待领取 RWA
    const [rwaStats] = await pool.query<RowDataPacket[]>(
      `SELECT 
        COUNT(*) as total_rwa_stakes,
        SUM(total_staked_rwa) as total_rwa_staked,
        SUM(rwa_pending) as total_rwa_pending
       FROM rwa_stakes`
    );

    // users 表当前字段：total_staked, rwa_pending, usdt_rewards 等
    // 这里将 rwa_pending 视为静态 RWA 收益，usdt_rewards 视为动态 USDT 收益
    const [stats] = await pool.query<RowDataPacket[]>(
      `SELECT 
        COUNT(*) as total_users,
        SUM(total_staked) as total_staked,
        SUM(rwa_pending) as total_static_rewards,
        SUM(usdt_rewards) as total_dynamic_rewards
       FROM users`
    );
    
    const [activeUsers] = await pool.query<RowDataPacket[]>(
      'SELECT COUNT(*) as active_users FROM users WHERE is_active = true'
    );
    
    res.json({
      success: true,
      data: {
        totalUsers: stats[0]?.total_users || 0,
        activeUsers: activeUsers[0]?.active_users || 0,
        totalStaked: stats[0]?.total_staked?.toString() || '0',
        totalStaticRewards: stats[0]?.total_static_rewards?.toString() || '0',
        totalDynamicRewards: stats[0]?.total_dynamic_rewards?.toString() || '0',
        totalRWAStaked: rwaStats[0]?.total_rwa_staked?.toString() || '0',
        totalRWAPending: rwaStats[0]?.total_rwa_pending?.toString() || '0'
      }
    });
  } catch (error) {
    logger.error('Error fetching global stats:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/price/rwa
 * 查询 RWA Token 当前价格
 */
router.get('/price/rwa', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    // 从 PriceOracleService 获取价格（通过 Redis 缓存）
    // 这里简化处理，实际应该注入 PriceOracleService
    const [config] = await pool.query<RowDataPacket[]>(
      "SELECT config_value FROM system_config WHERE config_key = 'last_rwa_price'"
    );
    
    if (config.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Price not available'
      });
    }
    
    res.json({
      success: true,
      data: {
        price: config[0].config_value,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Error fetching price:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/market/overview
 * 获取市场概览数据（价格、涨跌幅、成交量等）
 */
router.get('/market/overview', async (req: Request, res: Response) => {
  try {
    const data = marketDataService.getMarketOverview();
    
    res.json({
      success: true,
      data
    });
  } catch (error) {
    logger.error('Error fetching market overview:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/market/ohlcv
 * 获取 OHLCV K线数据
 * Query params: days (默认 90)
 */
router.get('/market/ohlcv', async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 90;
    const data = marketDataService.generateMockOHLCV(days);
    
    res.json({
      success: true,
      data
    });
  } catch (error) {
    logger.error('Error fetching OHLCV data:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/market/depth
 * 获取市场深度数据（买卖盘）
 */
router.get('/market/depth', async (req: Request, res: Response) => {
  try {
    const data = marketDataService.generateMockDepthData();
    
    res.json({
      success: true,
      data
    });
  } catch (error) {
    logger.error('Error fetching depth data:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/market/trades
 * 获取最近成交记录
 * Query params: count (默认 15)
 */
router.get('/market/trades', async (req: Request, res: Response) => {
  try {
    const count = parseInt(req.query.count as string) || 15;
    const data = marketDataService.generateMockTrades(count);
    
    res.json({
      success: true,
      data
    });
  } catch (error) {
    logger.error('Error fetching trades:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * 确保 users 表有所需列及 withdrawal_log、存储过程（用后端现有连接，无需命令行密码）
 */
async function ensureTeamRetainedSchema(conn: any): Promise<void> {
  const hasCol = async (name: string): Promise<boolean> => {
    const [r] = await conn.query<RowDataPacket[]>(
      "SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = ?",
      [name]
    );
    return !!(r && r.length > 0);
  };
  if (!(await hasCol('cumulative_personal_stake'))) {
    await conn.query(
      "ALTER TABLE users ADD COLUMN cumulative_personal_stake DECIMAL(38, 0) DEFAULT 0 COMMENT 'Cumulative personal stake' AFTER total_staked"
    );
    logger.info('Migration: added cumulative_personal_stake to users');
  }
  if (!(await hasCol('team_volume'))) {
    await conn.query(
      "ALTER TABLE users ADD COLUMN team_volume DECIMAL(38, 0) DEFAULT 0 COMMENT 'Team volume' AFTER cumulative_personal_stake"
    );
    logger.info('Migration: added team_volume to users');
  }
  if (!(await hasCol('team_total_deposited'))) {
    await conn.query(
      "ALTER TABLE users ADD COLUMN team_total_deposited DECIMAL(38, 0) DEFAULT 0 COMMENT 'Team total deposited' AFTER team_volume"
    );
    await conn.query(
      "ALTER TABLE users ADD COLUMN team_total_withdrawn DECIMAL(38, 0) DEFAULT 0 COMMENT 'Team total withdrawn' AFTER team_total_deposited"
    );
    logger.info('Migration: added team_total_deposited, team_total_withdrawn to users');
  }
  await conn.query(`
    CREATE TABLE IF NOT EXISTS withdrawal_log (
      tx_hash VARCHAR(66) PRIMARY KEY,
      user_address VARCHAR(42) NOT NULL,
      amount_usdt_equiv DECIMAL(38, 0) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  await conn.query('DROP PROCEDURE IF EXISTS sp_update_team_deposited');
  await conn.query(`
    CREATE PROCEDURE sp_update_team_deposited(IN p_user_address VARCHAR(42), IN p_amount_usdt_equiv DECIMAL(38, 0))
    BEGIN
      DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;
      START TRANSACTION;
      UPDATE users SET team_total_deposited = COALESCE(team_total_deposited, 0) + p_amount_usdt_equiv
      WHERE address IN (SELECT ancestor_address FROM referral_relations WHERE user_address = p_user_address);
      UPDATE users SET team_total_deposited = COALESCE(team_total_deposited, 0) + p_amount_usdt_equiv WHERE address = p_user_address;
      COMMIT;
    END
  `);
  await conn.query('DROP PROCEDURE IF EXISTS sp_update_team_withdrawn');
  await conn.query(`
    CREATE PROCEDURE sp_update_team_withdrawn(IN p_user_address VARCHAR(42), IN p_amount_usdt_equiv DECIMAL(38, 0))
    BEGIN
      DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;
      START TRANSACTION;
      UPDATE users SET team_total_withdrawn = COALESCE(team_total_withdrawn, 0) + p_amount_usdt_equiv
      WHERE address IN (SELECT ancestor_address FROM referral_relations WHERE user_address = p_user_address);
      UPDATE users SET team_total_withdrawn = COALESCE(team_total_withdrawn, 0) + p_amount_usdt_equiv WHERE address = p_user_address;
      COMMIT;
    END
  `);
}

/**
 * POST /api/admin/backfill-team-retained
 * 回填总留存：先自动迁移（缺列则加列），再从 stakes/withdrawal_log 补算。
 * 前端总留存显示 0/2000 时，调用此接口即可修复（需后端与数据库在运行）。
 */
router.post('/admin/backfill-team-retained', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const conn = await pool.getConnection();
    try {
      await ensureTeamRetainedSchema(conn);
      await conn.beginTransaction();
      await conn.query(
        'UPDATE users SET team_total_deposited = 0, team_total_withdrawn = 0'
      );
      const [stakes] = await conn.query<any[]>(
        'SELECT user_address, amount, asset_type FROM stakes ORDER BY id'
      );
      let depositedCount = 0;
      for (const row of stakes || []) {
        const user = row.user_address;
        const amount = String(row.amount ?? '0');
        const assetType = row.asset_type || 'USDT';
        const usdtEquiv = assetType === 'RWA'
          ? (BigInt(amount) * 85n / 100n).toString()
          : amount;
        if (BigInt(usdtEquiv) === 0n) continue;
        await conn.query('CALL sp_update_team_deposited(?, ?)', [user, usdtEquiv]);
        depositedCount++;
      }
      const [withdrawals] = await conn.query<any[]>(
        'SELECT user_address, amount_usdt_equiv FROM withdrawal_log'
      );
      let withdrawnCount = 0;
      for (const row of withdrawals || []) {
        const user = row.user_address;
        const amount = String(row.amount_usdt_equiv ?? '0');
        if (BigInt(amount) === 0n) continue;
        await conn.query('CALL sp_update_team_withdrawn(?, ?)', [user, amount]);
        withdrawnCount++;
      }
      // 若 stakes 表无记录，用 users 表兜底：优先 cumulative_personal_stake，否则 total_staked
      if (depositedCount === 0) {
        let usersWithStake: any[] = [];
        try {
          const [rows] = await conn.query<any[]>(
            'SELECT address, COALESCE(cumulative_personal_stake, 0) AS cum FROM users WHERE COALESCE(cumulative_personal_stake, 0) > 0'
          );
          usersWithStake = rows || [];
        } catch {
          usersWithStake = [];
        }
        if (usersWithStake.length === 0) {
          const [rows2] = await conn.query<any[]>(
            'SELECT address, COALESCE(total_staked, 0) AS cum FROM users WHERE COALESCE(total_staked, 0) > 0'
          );
          usersWithStake = rows2 || [];
        }
        for (const row of usersWithStake) {
          const user = row.address;
          const amount = String(row.cum ?? '0');
          if (BigInt(amount) === 0n) continue;
          await conn.query('CALL sp_update_team_deposited(?, ?)', [user, amount]);
          depositedCount++;
        }
        if (depositedCount > 0) logger.info(`Backfill team deposited from users: ${depositedCount} users`);
      }
      await conn.commit();
      conn.release();
      logger.info(`Backfill team retained: ${depositedCount} stakes, ${withdrawnCount} withdrawals`);
      return res.json({
        success: true,
        data: { depositedCount, withdrawnCount },
        message: '回填完成，请刷新页面查看总留存',
      });
    } catch (e) {
      await conn.rollback();
      conn.release();
      throw e;
    }
  } catch (error: any) {
    logger.error('Backfill team retained failed:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Internal server error',
    });
  }
});

/**
 * GET /api/dividend/user/:address
 * 获取用户分红信息
 */
router.get('/dividend/user/:address', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const chainId = req.query.chainId ? Number(req.query.chainId) : undefined;
    const data = await getUserDividendInfo(address, chainId);
    res.json({ success: true, data });
  } catch (error: any) {
    logger.error('Error fetching dividend user info:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'Internal server error',
    });
  }
});

/**
 * GET /api/dividend/pool/status
 * 获取分红池状态
 */
router.get('/dividend/pool/status', async (req: Request, res: Response) => {
  try {
    const data = await getPoolStatus();
    res.json({ success: true, data });
  } catch (error: any) {
    logger.error('Error fetching dividend pool status:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'Internal server error',
    });
  }
});

/**
 * GET /api/dividend/rate/history
 * 分红比例历史（展示给用户）
 */
router.get('/dividend/rate/history', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT month, version, health_ratio, health_status, rate_config, adjustment_type, effective_at FROM dividend_rate_history ORDER BY effective_at DESC LIMIT 12'
    );
    res.json({ success: true, data: rows || [] });
  } catch (error: any) {
    logger.error('Error fetching dividend rate history:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'Internal server error',
    });
  }
});

/**
 * POST /api/admin/settlement/trigger
 * 手动触发月度结算（PM2 Cron 漏触发时的兜底）
 */
router.post('/admin/settlement/trigger', async (req: Request, res: Response) => {
  try {
    await executeMonthlySettlement();
    res.json({ success: true, message: 'Settlement triggered' });
  } catch (error: any) {
    logger.error('Admin settlement trigger failed:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'Internal server error',
    });
  }
});

/**
 * POST /api/admin/settlement/sign
 * 管理员提交签名，触发链上批量写入
 */
router.post('/admin/settlement/sign', async (req: Request, res: Response) => {
  try {
    const { month, adminSignature } = req.body;
    if (!month || !adminSignature) {
      return res.status(400).json({ error: 'month and adminSignature required' });
    }
    const txHash = await submitBatchToChain(month, adminSignature);
    res.json({ success: true, txHash });
  } catch (error: any) {
    logger.error('Admin settlement sign failed:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'Internal server error',
    });
  }
});

/**
 * POST /api/admin/rate/determine
 * 手动触发比例计算（正常情况每月25号自动运行）
 */
router.post('/admin/rate/determine', async (req: Request, res: Response) => {
  try {
    const { month } = req.body;
    const m = month || getPreviousMonth();
    const availableStr = await getContractAvailableBalance();
    const available = BigInt(Math.round(parseFloat(availableStr || '0') * 1_000_000));
    const monthIndex = getMonthIndex(m, process.env.DIVIDEND_LAUNCH_MONTH || '2026-03');
    const result = await determineAndSaveRateConfig(m, monthIndex, available);
    res.json({ success: true, data: result });
  } catch (error: any) {
    logger.error('Admin rate determine failed:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'Internal server error',
    });
  }
});

export default router;
