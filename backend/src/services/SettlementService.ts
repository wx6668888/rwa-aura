/**
 * 月度结算服务
 * 每月1号执行，计算上月分红，等待管理员签名后提交链上
 */

import { ethers } from 'ethers';
import { getPool } from '../config/database.config';
import { getPreviousMonth, getMonthIndex } from '../utils/time';
import {
  computeUserDividend,
  topologicalSort,
  buildSubordinatesSnapshot,
} from './DividendCalculator';
import { getRateConfig, determineAndSaveRateConfig } from './DynamicRateAdjuster';
import { getContractAvailableBalance } from './DividendService';
import logger from '../utils/logger';
import { RowDataPacket } from 'mysql2';

const BATCH_SIZE = 50;
const LAUNCH_MONTH = process.env.DIVIDEND_LAUNCH_MONTH || '2026-03';

function getPoolContract(): ethers.Contract | null {
  const rpcUrl =
    process.env.RPC_URL ||
    process.env.BSC_RPC_URL ||
    'http://127.0.0.1:8545';
  const addr = process.env.TEAM_DIVIDEND_POOL_ADDRESS;
  if (!addr || !rpcUrl) return null;
  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const abi = [
      'function batchRecordDividend(address[],uint256[],uint256,bytes32,bytes,bytes)',
      'function getAvailableBalance() view returns (uint256)',
    ];
    return new ethers.Contract(addr, abi, provider);
  } catch (e) {
    logger.warn('SettlementService: getPoolContract failed', e);
    return null;
  }
}

async function getEligibleUsers(month: string): Promise<string[]> {
  const pool = getPool();
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT u.address FROM users u
     WHERE u.node_level >= 2
       AND NOT EXISTS (
         SELECT 1 FROM team_dividends td
         WHERE td.user_address = u.address AND td.month = ? AND td.status = 'COMPLETED'
       )`,
    [month]
  );
  return (rows || []).map((r) => (r.address as string).toLowerCase());
}

async function getUserNodeLevel(user: string): Promise<number> {
  const pool = getPool();
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT node_level FROM users WHERE address = ?',
    [user.toLowerCase()]
  );
  return Number(rows?.[0]?.node_level ?? 1);
}

/**
 * 执行月度结算（计算阶段）
 */
export async function executeMonthlySettlement(): Promise<void> {
  const month = getPreviousMonth();
  logger.info(`[Settlement] Starting settlement for ${month}`);

  const pool = getPool();

  const [existing] = await pool.query<RowDataPacket[]>(
    'SELECT status FROM settlement_execution WHERE month = ?',
    [month]
  );
  const row = (existing as RowDataPacket[])?.[0];
  if (row?.status === 'COMPLETED') {
    logger.info(`[Settlement] ${month} already completed, skipping`);
    return;
  }

  let cfg = await getRateConfig(month);
  if (!cfg) {
    const availableStr = await getContractAvailableBalance();
    const available = BigInt(Math.round(parseFloat(availableStr || '0') * 1_000_000));
    const monthIndex = getMonthIndex(month, LAUNCH_MONTH);
    const rateResult = await determineAndSaveRateConfig(month, monthIndex, available);
    if (rateResult.adjustmentType === '暂停') {
      await pool.query(
        `INSERT INTO settlement_execution (month, snapshot_time, snapshot_version, total_users, status, skip_reason)
         VALUES (?, NOW(), ?, 0, 'SKIPPED', ?)
         ON DUPLICATE KEY UPDATE status='SKIPPED', skip_reason=VALUES(skip_reason)`,
        [month, `${month}_skipped`, 'health_ratio < 1.0']
      );
      logger.warn(`[Settlement] ${month} SKIPPED: pool health < 100%`);
      return;
    }
    cfg = await getRateConfig(month);
  }
  if (!cfg) {
    logger.warn(`[Settlement] ${month} No rate config, skipping`);
    return;
  }

  const snapshotVersion = `${month}_${Date.now()}`;
  await pool.query(
    `INSERT INTO settlement_execution
       (month, snapshot_time, snapshot_version, total_users, status, started_at)
     VALUES (?, NOW(), ?, 0, 'IN_PROGRESS', NOW())
     ON DUPLICATE KEY UPDATE
       snapshot_time = VALUES(snapshot_time),
       snapshot_version = VALUES(snapshot_version),
       status = 'IN_PROGRESS',
       started_at = NOW()`,
    [month, snapshotVersion]
  );

  try {
    const eligibleUsers = await getEligibleUsers(month);
    await pool.query(
      'UPDATE settlement_execution SET total_users = ? WHERE month = ?',
      [eligibleUsers.length, month]
    );

    const subordinatesMap = await buildSubordinatesSnapshot(eligibleUsers);
    const sortedUsers = topologicalSort(eligibleUsers, subordinatesMap);

    for (let i = 0; i < sortedUsers.length; i += BATCH_SIZE) {
      const batch = sortedUsers.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map((user) => settleUserIdempotent(user, month, cfg))
      );
      await pool.query(
        'UPDATE settlement_execution SET processed_users = processed_users + ? WHERE month = ?',
        [batch.length, month]
      );
      logger.info(
        `[Settlement] Progress: ${Math.min(i + BATCH_SIZE, sortedUsers.length)}/${sortedUsers.length}`
      );
    }

    await pool.query(
      "UPDATE settlement_execution SET status = 'AWAITING_ADMIN_SIG' WHERE month = ?",
      [month]
    );
    logger.info(`[Settlement] ${month} calculation complete, awaiting admin signature`);
  } catch (error: any) {
    await pool.query(
      'UPDATE settlement_execution SET status = ? , error_message = ? WHERE month = ?',
      ['FAILED', error?.message || 'Unknown error', month]
    );
    logger.error(`[Settlement] ${month} FAILED:`, error);
    throw error;
  }
}

async function settleUserIdempotent(
  user: string,
  month: string,
  rateConfig: Record<string, number>
): Promise<void> {
  const pool = getPool();
  try {
    const nodeLevel = await getUserNodeLevel(user);
    if (nodeLevel < 2) return;

    const data = await computeUserDividend(user, month, rateConfig, nodeLevel);

    await pool.query(
      `INSERT IGNORE INTO team_dividends
         (user_address, month, node_level, team_stakes, team_withdraws,
          team_rewards, team_sub_dividends, net_growth,
          standard_rate, actual_rate, rate_status, dividend_amount, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
      [
        user,
        month,
        data.nodeLevel,
        Number(data.teamStakes) / 1_000_000,
        Number(data.teamWithdraws) / 1_000_000,
        Number(data.teamRewards) / 1_000_000,
        Number(data.teamSubDividends) / 1_000_000,
        Number(data.netGrowth) / 1_000_000,
        data.standardRate,
        data.actualRate,
        data.rateStatus,
        Number(data.dividendAmount) / 1_000_000,
      ]
    );
  } catch (error: any) {
    if ((error as { code?: string }).code === 'ER_DUP_ENTRY') return;
    await pool.query(
      `INSERT INTO settlement_failures (month, user_address, error_message)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE error_message = VALUES(error_message), retry_count = retry_count + 1`,
      [month, user, error?.message || 'Unknown']
    );
    await pool.query(
      'UPDATE settlement_execution SET failed_users = failed_users + 1 WHERE month = ?',
      [month]
    );
  }
}

/**
 * 管理员签名后提交链上
 */
export async function submitBatchToChain(
  month: string,
  adminSig: string
): Promise<string> {
  const pool = getPool();
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT user_address, dividend_amount FROM team_dividends WHERE month = ? AND status = ?',
    [month, 'PENDING']
  );

  if (!rows?.length) {
    throw new Error(`No PENDING records for month ${month}`);
  }

  const users = rows.map((r) => r.user_address as string);
  const amounts = rows.map((r) =>
    BigInt(Math.round(parseFloat(r.dividend_amount as string) * 1_000_000))
  );
  const monthId = parseInt(month.replace('-', ''), 10);
  const nonce = ethers.hexlify(ethers.randomBytes(32));

  const privateKey = process.env.BACKEND_SIGNER_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('BACKEND_SIGNER_PRIVATE_KEY not configured');
  }

  const wallet = new ethers.Wallet(privateKey);
  const encodeAddr = (a: string) => ethers.getBytes(ethers.zeroPadValue(a, 20));
  const encodeU256 = (n: bigint) => ethers.getBytes(ethers.toBeHex(n, 32));
  const encoded = ethers.concat([
    ...users.map(encodeAddr),
    ...amounts.map(encodeU256),
    encodeU256(BigInt(monthId)),
    ethers.getBytes(nonce),
  ]);
  const msgHash = ethers.keccak256(encoded);
  const backendSig = await wallet.signMessage(ethers.getBytes(msgHash));

  const poolContract = getPoolContract();
  if (!poolContract) {
    throw new Error('TeamDividendPool contract not configured');
  }

  const signer = new ethers.Wallet(
    privateKey,
    new ethers.JsonRpcProvider(
      process.env.RPC_URL || 'http://127.0.0.1:8545'
    )
  );
  const contractWithSigner = poolContract.connect(signer) as ethers.Contract;

  const tx = await contractWithSigner.batchRecordDividend(
    users,
    amounts,
    monthId,
    nonce,
    backendSig,
    adminSig
  );
  const receipt = await tx.wait();

  await pool.query(
    "UPDATE team_dividends SET status = 'RECORDED', tx_hash = ?, recorded_at = NOW() WHERE month = ? AND status = 'PENDING'",
    [receipt.hash, month]
  );
  await pool.query(
    "UPDATE settlement_execution SET status = 'COMPLETED', completed_at = NOW() WHERE month = ?",
    [month]
  );

  return receipt.hash;
}
