import { ethers } from 'ethers';
import { query } from '../config/database.config';
import logger from '../utils/logger';
import { DirectReferralRewardService } from './DirectReferralRewardService';

type IngestResult = {
  success: boolean;
  txHash: string;
  receiptFound: boolean;
  inserted: {
    stakeEvents: number;
    withdrawalEvents: number;
    lockedStakes: number;
    referralBindings: number;
  };
  recordedReferralRewards: number;
  affectedUsers: string[];
  updatedRoots: number;
};

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

function chunkArray<T>(arr: T[], chunkSize: number): T[][] {
  if (chunkSize <= 0) return [arr];
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += chunkSize) out.push(arr.slice(i, i + chunkSize));
  return out;
}

function toLowerSafe(v: unknown): string {
  if (typeof v !== 'string') return '';
  return v.toLowerCase();
}

async function sleep(ms: number): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export class TxIngestService {
  private stakingContractAddressLower: string;
  private providers: ethers.JsonRpcProvider[];
  private iface: ethers.Interface;
  private directReferralRewardService: DirectReferralRewardService;

  constructor() {
    const stakingContractAddress = process.env.STAKING_CONTRACT_ADDRESS;
    if (!stakingContractAddress) {
      throw new Error('Missing env STAKING_CONTRACT_ADDRESS');
    }
    this.stakingContractAddressLower = stakingContractAddress.toLowerCase();

    const fromEnv = (process.env.BSC_RPC_URLS || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const primary = (process.env.BSC_RPC_URL || process.env.BSC_TESTNET_RPC_URL || '').trim();
    const merged = Array.from(new Set([primary, ...fromEnv].filter(Boolean)));

    if (merged.length === 0) {
      // Last resort: keep a known public endpoint to avoid hard fail.
      merged.push('https://bsc-dataseed.binance.org');
    }

    this.providers = merged.map((url) => new ethers.JsonRpcProvider(url));

    // Keep consistent with EventMonitor's parsed events.
    const stakingEventsAbi = [
      'event StakeEvent(address indexed user, uint256 amount, address indexed referrer, uint256 indexed stakeId, uint256 timestamp, uint256 lockPeriod)',
      'event RWAStakeEvent(address indexed user, uint256 amount, address indexed referrer, uint256 indexed stakeId, uint256 timestamp, uint256 lockPeriod)',
      'event WithdrawalRequested(address indexed user, uint256 amount, uint256 fee, uint256 timestamp)',
      'event USDTPrincipalWithdrawn(address indexed user, uint256 indexed lockIndex, uint256 grossAmount, uint256 netAmount, uint256 timestamp)',
      'event FlexibleUSDTPrincipalWithdrawn(address indexed user, uint256 grossAmount, uint256 netAmount, uint256 timestamp)',
      'event RWAPrincipalWithdrawn(address indexed user, uint256 indexed lockIndex, uint256 amount, uint256 timestamp)',
      'event FlexibleRWAPrincipalWithdrawn(address indexed user, uint256 amount, uint256 timestamp)',
      'event RWARewardWithdrawn(address indexed user, uint256 amount, uint256 fee, uint256 timestamp)',
      'event EmergencyWithdrawal(address indexed user, uint256 refundAmount, uint256 deductedRewards)',
    ];
    this.iface = new ethers.Interface(stakingEventsAbi);
    this.directReferralRewardService = new DirectReferralRewardService();
  }

  public async ingestTx(txHash: string): Promise<IngestResult> {
    const normalizedTxHash = txHash.trim();

    const receipt = await this.waitForReceipt(normalizedTxHash, 90_000);
    if (!receipt) {
      return {
        success: true,
        txHash: normalizedTxHash,
        receiptFound: false,
        inserted: { stakeEvents: 0, withdrawalEvents: 0, lockedStakes: 0, referralBindings: 0 },
        recordedReferralRewards: 0,
        affectedUsers: [],
        updatedRoots: 0,
      };
    }

    await this.ensureReferralBindingsBuilt();

    const affectedUsers = new Set<string>();
    const rootsToUpdate = new Set<string>();
    const inserted = { stakeEvents: 0, withdrawalEvents: 0, lockedStakes: 0, referralBindings: 0 };
    let recordedReferralRewards = 0;

    // Pre-calc: whether tx already has stake/withdraw records.
    // We still re-calc roots after parsing because data might have been partial/incorrect before EventMonitor stop.
    const txStakeAlready = await query<any[]>(
      'SELECT 1 as ok FROM stake_events WHERE tx_hash = ? LIMIT 1',
      [normalizedTxHash]
    );
    const txWithdrawAlready = await query<any[]>(
      'SELECT 1 as ok FROM withdrawal_events WHERE tx_hash = ? LIMIT 1',
      [normalizedTxHash]
    );

    // Parse all staking logs from the receipt.
    const stakingLogs = receipt.logs.filter((l) => (l.address || '').toLowerCase() === this.stakingContractAddressLower);

    const blockNumber = Number(receipt.blockNumber ?? 0);
    const parsedStakeEvents: Array<{
      user: string;
      referrer: string | null;
      amount: string;
      stakeId: string;
      timestamp: number;
      lockPeriod: number;
      eventType: 'USDT' | 'RWA';
    }> = [];

    const parsedWithdrawalEvents: Array<{
      user: string;
      eventType: string;
      amountUsdtEquiv: string;
      timestamp: number;
    }> = [];

    for (const log of stakingLogs) {
      try {
        const parsed = this.iface.parseLog({ topics: log.topics, data: log.data });
        if (!parsed) continue;

        const eventName = parsed.name;
        const args: any = parsed.args || {};

        if (eventName === 'StakeEvent' || eventName === 'RWAStakeEvent') {
          const user = toLowerSafe(args.user);
          const referrerRaw = toLowerSafe(args.referrer);
          const referrer = referrerRaw && referrerRaw !== ZERO_ADDRESS ? referrerRaw : null;
          const amount = (args.amount?.toString?.() ?? '0').toString();
          const stakeId = args.stakeId?.toString?.() ?? '0';
          const timestamp = Number((args.timestamp?.toString?.() ?? '0').toString());
          const lockPeriod = Number((args.lockPeriod?.toString?.() ?? '0').toString());
          const eventType: 'USDT' | 'RWA' = eventName === 'StakeEvent' ? 'USDT' : 'RWA';

          if (!user) continue;
          parsedStakeEvents.push({ user, referrer, amount, stakeId, timestamp, lockPeriod, eventType });
          affectedUsers.add(user);
          if (referrer) affectedUsers.add(referrer);
          continue;
        }

        if (
          eventName === 'WithdrawalRequested' ||
          eventName === 'RWARewardWithdrawn' ||
          eventName === 'USDTPrincipalWithdrawn' ||
          eventName === 'FlexibleUSDTPrincipalWithdrawn' ||
          eventName === 'RWAPrincipalWithdrawn' ||
          eventName === 'FlexibleRWAPrincipalWithdrawn' ||
          eventName === 'EmergencyWithdrawal'
        ) {
          const user = toLowerSafe(args.user);
          if (!user) continue;

          const timestamp = Number((args.timestamp?.toString?.() ?? '0').toString());
          const amountUsdtEquiv = this.getWithdrawalAmountUsdtEquiv(eventName, args);

          // Keep DB event_type convention same as EventMonitor.
          const eventType =
            eventName === 'WithdrawalRequested'
              ? 'WITHDRAWAL_REQUESTED'
              : eventName === 'RWARewardWithdrawn'
                ? 'RWA_REWARD_WITHDRAWN'
                : eventName;

          parsedWithdrawalEvents.push({ user, eventType, amountUsdtEquiv, timestamp });
          affectedUsers.add(user);
          continue;
        }
      } catch (e) {
        // Ignore parse failures for non-target logs.
      }
    }

    // Early return if no relevant events found.
    if (parsedStakeEvents.length === 0 && parsedWithdrawalEvents.length === 0) {
      return {
        success: true,
        txHash: normalizedTxHash,
        receiptFound: true,
        inserted,
        recordedReferralRewards,
        affectedUsers: [],
        updatedRoots: 0,
      };
    }

    // Idempotent inserts: stake_events / withdrawal_events / locked_stakes / referral_bindings
    // Referral rewards are recorded after stake/locked inserts but before team recalc.
    for (const se of parsedStakeEvents) {
      await query(
        `INSERT IGNORE INTO stake_events
         (stake_id, user_address, amount, lock_period, event_type, referrer_address, tx_hash, block_number, timestamp)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          se.stakeId,
          se.user,
          se.amount,
          se.lockPeriod,
          se.eventType,
          se.referrer,
          normalizedTxHash,
          blockNumber,
          se.timestamp,
        ]
      );
    }

    for (const se of parsedStakeEvents) {
      if (se.lockPeriod > 0) {
        const lockEndTime = se.timestamp + se.lockPeriod * 86400;
        const isRwaStake = se.eventType === 'RWA' ? 1 : 0;
        await query(
          `INSERT IGNORE INTO locked_stakes
           (stake_id, user_address, amount, is_rwa_stake, lock_period, lock_end_time, is_withdrawn, block_number, transaction_hash)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            se.stakeId,
            se.user,
            se.amount,
            isRwaStake,
            se.lockPeriod,
            lockEndTime,
            0,
            blockNumber,
            normalizedTxHash,
          ]
        );
      }
    }

    // Add/ensure direct referral binding for the referee.
    for (const se of parsedStakeEvents) {
      if (!se.referrer) continue;
      await query(
        `INSERT IGNORE INTO referral_bindings (user_address, referrer_address, timestamp)
         VALUES (?, ?, ?)`,
        [se.user, se.referrer, se.timestamp]
      );
    }

    // Count inserts approximately (best-effort): only used for debugging; keep deterministic via affected events count.
    inserted.stakeEvents = parsedStakeEvents.length;
    inserted.lockedStakes = parsedStakeEvents.filter((s) => s.lockPeriod > 0).length;
    inserted.referralBindings = parsedStakeEvents.filter((s) => !!s.referrer).length;

    // Insert withdrawal events
    for (const we of parsedWithdrawalEvents) {
      await query(
        `INSERT IGNORE INTO withdrawal_events
         (user_address, event_type, amount, stake_id, timestamp, block_number, tx_hash)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          we.user,
          we.eventType,
          we.amountUsdtEquiv,
          0,
          we.timestamp,
          blockNumber,
          normalizedTxHash,
        ]
      );
    }
    inserted.withdrawalEvents = parsedWithdrawalEvents.length;

    // Record direct referral reward rows (PENDING) for eligible stakes.
    for (const se of parsedStakeEvents) {
      if (!se.referrer) continue;
      if (se.lockPeriod < 30) continue;

      // stakeId field in DB is bigint; DirectReferralRewardService expects number-like.
      const stakeIdNum = Number(se.stakeId);
      if (!Number.isFinite(stakeIdNum) || stakeIdNum <= 0) continue;

      await this.directReferralRewardService.recordReferralReward(
        se.referrer,
        se.user,
        stakeIdNum,
        se.amount,
        se.eventType,
        new Date(se.timestamp * 1000),
        se.lockPeriod
      );
      recordedReferralRewards++;
    }

    // Update users.team_* and cumulative_personal_stake for multi-level ancestors.
    // Impacted roots are all ancestors of affected users (including themselves).
    for (const u of affectedUsers) {
      // ancestor chain from u upward
      let curr = u;
      const visited = new Set<string>();
      while (curr && !visited.has(curr)) {
        visited.add(curr);
        rootsToUpdate.add(curr);
        const parents = await query<any[]>(
          'SELECT referrer_address FROM referral_bindings WHERE user_address = ? LIMIT 1',
          [curr]
        );
        if (!parents || parents.length === 0) break;
        const parent = toLowerSafe(parents[0].referrer_address);
        if (!parent || parent === ZERO_ADDRESS) break;
        curr = parent;
      }
    }

    const now = new Date();
    const updatedRoots = rootsToUpdate.size;

    for (const root of rootsToUpdate) {
      await this.ensureUserExists(root);

      const descendants = await this.collectDescendants(root);
      const depositTotal = await this.sumStakeDepositsForUsers(descendants);
      const withdrawTotal = await this.sumWithdrawalsForUsers(descendants);

      const personalDepositTotal = await this.sumPersonalDeposits(root);

      // team_volume and team_total_deposited are both defined as USDT 18-dec equivalent in this codebase.
      await query(
        `UPDATE users
         SET cumulative_personal_stake = ?,
             team_volume = ?,
             team_total_deposited = ?,
             team_total_withdrawn = ?
         WHERE address = ?`,
        [
          personalDepositTotal.toString(),
          depositTotal.toString(),
          depositTotal.toString(),
          withdrawTotal.toString(),
          root,
        ]
      );
    }

    // Optional: log a small debug line.
    const stakeProcessedState = txStakeAlready.length > 0 ? 'stake_existed' : 'stake_new';
    const withdrawProcessedState = txWithdrawAlready.length > 0 ? 'withdraw_existed' : 'withdraw_new';
    logger.info(
      `[TxIngest] tx=${normalizedTxHash} parsedStake=${parsedStakeEvents.length} parsedWithdraw=${parsedWithdrawalEvents.length} ` +
        `state=${stakeProcessedState}/${withdrawProcessedState} roots=${updatedRoots}`
    );

    return {
      success: true,
      txHash: normalizedTxHash,
      receiptFound: true,
      inserted,
      recordedReferralRewards,
      affectedUsers: Array.from(affectedUsers),
      updatedRoots,
    };
  }

  private async waitForReceipt(txHash: string, timeoutMs: number): Promise<ethers.TransactionReceipt | null> {
    const deadline = Date.now() + timeoutMs;
    let lastErr: unknown = null;

    while (Date.now() < deadline) {
      for (const p of this.providers) {
        try {
          const r = await p.getTransactionReceipt(txHash);
          if (r) return r;
        } catch (e) {
          lastErr = e;
        }
      }
      await sleep(2000);
    }

    logger.warn(`[TxIngest] timeout waiting receipt tx=${txHash} lastErr=${String((lastErr as any)?.message || lastErr)}`);
    return null;
  }

  private async ensureReferralBindingsBuilt(): Promise<void> {
    const rows = await query<any[]>(
      'SELECT COUNT(*) as cnt FROM referral_bindings',
      []
    );

    const cnt = (rows as any[])[0]?.cnt;
    const count = typeof cnt === 'string' || typeof cnt === 'number' ? Number(cnt) : 0;

    if (count > 0) return;

    logger.info('[TxIngest] referral_bindings empty, rebuilding from stake_events...');

    // For each user, take the earliest stake's referrer as the binding.
    // MySQL 5.7 compatible: MIN(timestamp) + join.
    const zero = ZERO_ADDRESS;
    await query(
      `
      INSERT IGNORE INTO referral_bindings (user_address, referrer_address, timestamp)
      SELECT s.user_address, s.referrer_address, s.timestamp
      FROM stake_events s
      INNER JOIN (
        SELECT user_address, MIN(timestamp) AS min_ts
        FROM stake_events
        WHERE referrer_address IS NOT NULL
          AND referrer_address <> ''
          AND LOWER(referrer_address) <> LOWER(?)
        GROUP BY user_address
      ) t ON s.user_address = t.user_address AND s.timestamp = t.min_ts
      WHERE s.referrer_address IS NOT NULL
        AND s.referrer_address <> ''
        AND LOWER(s.referrer_address) <> LOWER(?)
      `,
      [zero, zero]
    );

    logger.info('[TxIngest] referral_bindings rebuild done');
  }

  private async ensureUserExists(address: string): Promise<void> {
    const addr = address.toLowerCase();
    await query(
      `INSERT IGNORE INTO users
       (address, referrer, node_level, total_staked, team_volume, cumulative_personal_stake, team_total_deposited, team_total_withdrawn, direct_referral_count, is_active)
       VALUES (?, NULL, 1, 0, 0, 0, 0, 0, 0, 1)`,
      [addr]
    );
  }

  private async collectDescendants(root: string): Promise<string[]> {
    const rootLower = root.toLowerCase();
    const descendants = new Set<string>([rootLower]);
    const queue: string[] = [rootLower];

    while (queue.length > 0) {
      const curr = queue.shift() as string;
      const children = await query<any[]>(
        'SELECT user_address FROM referral_bindings WHERE referrer_address = ?',
        [curr]
      );
      for (const c of children as any[]) {
        const child = toLowerSafe(c.user_address);
        if (!child || descendants.has(child)) continue;
        descendants.add(child);
        queue.push(child);
      }
    }

    return Array.from(descendants);
  }

  private async sumStakeDepositsForUsers(addresses: string[]): Promise<bigint> {
    if (addresses.length === 0) return 0n;

    let usdtTotal = 0n;
    let rwaTotal = 0n;

    const chunks = chunkArray(addresses, 200);
    for (const chunk of chunks) {
      const placeholders = chunk.map(() => '?').join(',');
      const sql = `
        SELECT event_type, SUM(CAST(amount AS DECIMAL(65,0))) AS total
        FROM stake_events
        WHERE user_address IN (${placeholders})
        GROUP BY event_type
      `;
      const rows = await query<any[]>(sql, chunk);

      for (const row of rows as any[]) {
        const eventType = String(row.event_type || '');
        const totalStr = String(row.total ?? '0');
        const total = BigInt(totalStr);
        if (eventType === 'RWA' || eventType.includes('RWA')) rwaTotal += total;
        else usdtTotal += total;
      }
    }

    // Convert RWA->USDT eq (18-dec) with 0.85 bps
    const rwaToUsdt = (rwaTotal * 85n) / 100n;
    return usdtTotal + rwaToUsdt;
  }

  private async sumWithdrawalsForUsers(addresses: string[]): Promise<bigint> {
    if (addresses.length === 0) return 0n;

    let withdrawTotal = 0n;
    const chunks = chunkArray(addresses, 200);
    for (const chunk of chunks) {
      const placeholders = chunk.map(() => '?').join(',');
      const sql = `
        SELECT SUM(CAST(amount AS DECIMAL(65,0))) AS total
        FROM withdrawal_events
        WHERE user_address IN (${placeholders})
      `;
      const rows = await query<any[]>(sql, chunk);
      const totalStr = String((rows as any[])[0]?.total ?? '0');
      withdrawTotal += BigInt(totalStr);
    }
    return withdrawTotal;
  }

  private async sumPersonalDeposits(user: string): Promise<bigint> {
    const addr = user.toLowerCase();
    const rows = await query<any[]>(
      `SELECT event_type, SUM(CAST(amount AS DECIMAL(65,0))) AS total
       FROM stake_events
       WHERE user_address = ?
       GROUP BY event_type`,
      [addr]
    );

    let usdtTotal = 0n;
    let rwaTotal = 0n;
    for (const row of rows as any[]) {
      const eventType = String(row.event_type || '');
      const totalStr = String(row.total ?? '0');
      const total = BigInt(totalStr);
      if (eventType === 'RWA' || eventType.includes('RWA')) rwaTotal += total;
      else usdtTotal += total;
    }
    const rwaToUsdt = (rwaTotal * 85n) / 100n;
    return usdtTotal + rwaToUsdt;
  }

  private getWithdrawalAmountUsdtEquiv(eventName: string, args: any): string {
    if (!args) return '0';
    const FEE_RATE_92 = 92n;
    const RWA_TO_USDT_85 = 85n;
    const HUNDRED = 100n;

    switch (eventName) {
      case 'FlexibleUSDTPrincipalWithdrawn':
      case 'USDTPrincipalWithdrawn':
        return (args.grossAmount?.toString?.() ?? args.grossAmount ?? '0').toString();
      case 'FlexibleRWAPrincipalWithdrawn': {
        const netRwa = BigInt((args.amount?.toString?.() ?? args.amount ?? '0').toString());
        const grossRwa = (netRwa * HUNDRED) / FEE_RATE_92;
        return (grossRwa * RWA_TO_USDT_85) / HUNDRED + '';
      }
      case 'RWAPrincipalWithdrawn': {
        const amt = BigInt((args.amount?.toString?.() ?? args.amount ?? '0').toString());
        const grossRwa = (amt * HUNDRED) / FEE_RATE_92;
        return (grossRwa * RWA_TO_USDT_85) / HUNDRED + '';
      }
      case 'EmergencyWithdrawal': {
        const netUsdt = BigInt((args.refundAmount?.toString?.() ?? args.refundAmount ?? '0').toString());
        const grossUsdt = (netUsdt * HUNDRED) / FEE_RATE_92;
        return grossUsdt.toString();
      }
      case 'WithdrawalRequested':
      case 'RWARewardWithdrawn': {
        // These two "reward" withdraw paths store USDT-equivalent amount.
        const amt = BigInt((args.amount?.toString?.() ?? args.amount ?? '0').toString());
        const usdtEquiv = (amt * 85n) / 100n;
        return usdtEquiv.toString();
      }
      default:
        return '0';
    }
  }
}

