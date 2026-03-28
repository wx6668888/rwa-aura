/**
 * 审计：重复 balance_snapshots（同 tx 多条 stake）在「db 日结公式」下多算的收益
 *
 * 对每条 yield_settlements：用 PreciseYieldCalculator 同款逻辑分别对
 * - 全量快照
 * - 去重快照（与 dedupe-balance-snapshots.ts / BalanceSnapshotService 键一致）
 * 计算 (from_time, to_time) 窗口收益，差额记为「该窗口若走 db 公式则因重复快照多算的部分」。
 *
 * 若某笔 settlement 的「全量公式结果」与库中 total_yield 相差过大，则该行不可靠（可能当时为 chain 日结），跳过并统计。
 *
 * 用法：cd backend && npx ts-node --transpile-only scripts/audit-overpaid-yield-dup-snapshots.ts
 */
import dotenv from 'dotenv';
import path from 'path';
import mysql from 'mysql2/promise';
import type { RowDataPacket } from 'mysql2';
import BigNumber from 'bignumber.js';
import { ethers } from 'ethers';

dotenv.config({ path: path.join(__dirname, '../.env') });

const BASE_YIELD_RATE = 0.008;
const LOCK_BONUS: Record<number, number> = { 0: 0, 30: 0.3, 90: 0.6, 180: 1.0, 365: 1.5 };

type DupPairRow = RowDataPacket & { addr: string; asset_type: string };
type SettlementAuditRow = RowDataPacket & {
  from_time: number;
  to_time: number;
  total_yield: string;
};
type SnapDbRow = RowDataPacket & {
  timestamp: number;
  balance_type: string;
  amount: string;
  lock_end_time: number | null;
  event_type: string;
  tx_hash: string | null;
};

interface Snap {
  timestamp: number;
  balance_type: string;
  amount: string;
  lock_end_time: number | null;
  event_type: string;
  tx_hash: string;
}

interface BalanceState {
  flexible: BigNumber;
  locked_30: BigNumber;
  locked_90: BigNumber;
  locked_180: BigNumber;
  locked_365: BigNumber;
}

function emptyBalance(): BalanceState {
  return {
    flexible: new BigNumber(0),
    locked_30: new BigNumber(0),
    locked_90: new BigNumber(0),
    locked_180: new BigNumber(0),
    locked_365: new BigNumber(0),
  };
}

function getYieldRate(lockPeriod: number): number {
  const bonus = LOCK_BONUS[lockPeriod] ?? 0;
  return BASE_YIELD_RATE * (1 + bonus);
}

function updateBalance(balance: BalanceState, snapshot: Snap): void {
  const amount = new BigNumber(snapshot.amount);
  const type = snapshot.balance_type as keyof BalanceState;
  if (balance[type] !== undefined) {
    balance[type] = balance[type].plus(amount);
  }
}

function deepCopyBalance(balance: BalanceState): BalanceState {
  return {
    flexible: new BigNumber(balance.flexible),
    locked_30: new BigNumber(balance.locked_30),
    locked_90: new BigNumber(balance.locked_90),
    locked_180: new BigNumber(balance.locked_180),
    locked_365: new BigNumber(balance.locked_365),
  };
}

function calculateSegmentYield(
  balance: BalanceState,
  fromTime: number,
  toTime: number,
  assetType: 'USDT' | 'RWA'
): BigNumber {
  const duration = toTime - fromTime;
  let totalYield = new BigNumber(0);
  for (const [type, amount] of Object.entries(balance)) {
    if (amount.isZero() || amount.isNegative()) continue;
    const lockPeriod = type === 'flexible' ? 0 : parseInt(type.replace('locked_', ''), 10);
    const yieldRate = getYieldRate(lockPeriod);
    let yieldAmount: BigNumber;
    if (assetType === 'USDT') {
      const rwaEquivalent = amount.dividedBy(0.85);
      yieldAmount = rwaEquivalent.multipliedBy(yieldRate).multipliedBy(duration).dividedBy(86400);
    } else {
      yieldAmount = amount.multipliedBy(yieldRate).multipliedBy(duration).dividedBy(86400);
    }
    totalYield = totalYield.plus(yieldAmount);
  }
  return totalYield;
}

function calculateYieldFromSnapshots(
  snapshots: Snap[],
  assetType: 'USDT' | 'RWA',
  fromTime: number,
  toTime: number
): bigint {
  const all = snapshots.filter((s) => s.timestamp <= toTime);
  if (all.length === 0) return 0n;

  const beforeFrom = all.filter((s) => s.timestamp < fromTime);
  let currentBalance = emptyBalance();
  for (const s of beforeFrom) updateBalance(currentBalance, s);

  const windowSnaps = all.filter((s) => s.timestamp >= fromTime && s.timestamp <= toTime);
  let totalYield = new BigNumber(0);
  let lastTime = fromTime;

  for (const snapshot of windowSnaps) {
    if (snapshot.timestamp > lastTime) {
      const seg = calculateSegmentYield(currentBalance, lastTime, snapshot.timestamp, assetType);
      totalYield = totalYield.plus(seg);
    }
    updateBalance(currentBalance, snapshot);
    lastTime = snapshot.timestamp;
  }

  if (lastTime < toTime) {
    totalYield = totalYield.plus(calculateSegmentYield(currentBalance, lastTime, toTime, assetType));
  }

  try {
    return BigInt(totalYield.toFixed(0));
  } catch {
    return 0n;
  }
}

function dedupeSnapshots(rows: Snap[]): Snap[] {
  const seen = new Set<string>();
  const out: Snap[] = [];
  for (const r of rows) {
    const th = (r.tx_hash || '').trim();
    const key = th
      ? `tx|${th}|${r.event_type}|${r.balance_type}`
      : `no|${r.timestamp}|${r.amount}|${r.balance_type}|${r.event_type}|${r.lock_end_time ?? 'null'}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'rwa_user',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'rwa_protocol',
  });

  const [dupPairs] = await conn.query<DupPairRow[]>(
    `SELECT DISTINCT LOWER(b1.user_address) AS addr, b1.asset_type
     FROM balance_snapshots b1
     INNER JOIN balance_snapshots b2
       ON LOWER(b1.user_address) = LOWER(b2.user_address)
      AND b1.asset_type = b2.asset_type
      AND b1.tx_hash = b2.tx_hash
      AND b1.balance_type = b2.balance_type
      AND b1.event_type = b2.event_type
      AND b1.tx_hash IS NOT NULL
      AND TRIM(b1.tx_hash) != ''
      AND b1.id < b2.id`
  );

  console.log(
    JSON.stringify(
      { message: '存在重复质押快照（同 tx）的用户+资产对数', count: dupPairs.length },
      null,
      2
    )
  );

  const MATCH_WEI_TOLERANCE = 10n ** 12n; // 允许 1e-6 RWA 量级舍入
  const perUser: Array<{
    address: string;
    asset_type: string;
    overpayWei: bigint;
    settlementsCounted: number;
    settlementsSkipped: number;
  }> = [];

  for (const { addr, asset_type } of dupPairs) {
    const assetType = asset_type as 'USDT' | 'RWA';
    const [settlements] = await conn.query<SettlementAuditRow[]>(
      `SELECT from_time, to_time, total_yield
       FROM yield_settlements
       WHERE LOWER(user_address) = ? AND asset_type = ?
       ORDER BY settlement_time ASC`,
      [addr, assetType]
    );

    let overpayWei = 0n;
    let counted = 0;
    let skipped = 0;

    for (const row of settlements) {
      const [snapRows] = await conn.query<SnapDbRow[]>(
        `SELECT timestamp, balance_type, amount, lock_end_time, event_type, IFNULL(tx_hash,'') AS tx_hash
         FROM balance_snapshots
         WHERE LOWER(user_address) = ? AND asset_type = ? AND timestamp <= ?
         ORDER BY timestamp ASC, id ASC`,
        [addr, assetType, row.to_time]
      );

      const snaps: Snap[] = snapRows.map((r) => ({
        timestamp: Number(r.timestamp),
        balance_type: r.balance_type,
        amount: String(r.amount),
        lock_end_time: r.lock_end_time != null ? Number(r.lock_end_time) : null,
        event_type: r.event_type,
        tx_hash: String(r.tx_hash || ''),
      }));

      const rawWei = calculateYieldFromSnapshots(snaps, assetType, row.from_time, row.to_time);
      const dedupWei = calculateYieldFromSnapshots(dedupeSnapshots(snaps), assetType, row.from_time, row.to_time);

      let storedWei: bigint;
      try {
        storedWei = ethers.parseEther(String(row.total_yield).trim());
      } catch {
        skipped++;
        continue;
      }

      const diffRawStored = rawWei > storedWei ? rawWei - storedWei : storedWei - rawWei;
      if (diffRawStored > MATCH_WEI_TOLERANCE) {
        skipped++;
        continue;
      }

      const excess = rawWei - dedupWei;
      if (excess > 0n) overpayWei += excess;
      counted++;
    }

    if (overpayWei > 0n || settlements.length > 0) {
      perUser.push({
        address: addr,
        asset_type: assetType,
        overpayWei,
        settlementsCounted: counted,
        settlementsSkipped: skipped,
      });
    }
  }

  const withPositive = perUser.filter((p) => p.overpayWei > 0n);
  const totalOverpay = withPositive.reduce((a, p) => a + p.overpayWei, 0n);

  console.log('\n=== 汇总（仅统计：库中 total_yield 与「全量快照公式」一致 的 yield_settlements 行）===');
  console.log(`因重复快照、按公式推算多付 RWA（wei）合计: ${totalOverpay.toString()}`);
  console.log(
    `折合 RWA（18 位）: ${ethers.formatEther(totalOverpay)}`
  );
  console.log(`多付金额 > 0 的用户数: ${withPositive.length}`);

  console.log('\n=== 逐用户（仅 overpayWei > 0）===');
  for (const p of withPositive.sort((a, b) => (a.overpayWei > b.overpayWei ? -1 : 1))) {
    console.log(
      `${p.address} ${p.asset_type} 多付RWA=${ethers.formatEther(p.overpayWei)} (wei=${p.overpayWei}) 计入settlement=${p.settlementsCounted} 跳过=${p.settlementsSkipped}`
    );
  }

  const zeroDupUsers = dupPairs.filter(
    (d) => !withPositive.some((p) => p.address === d.addr && p.asset_type === d.asset_type)
  );
  console.log(
    `\n有重复快照但「可核对」结算行差额为 0 或未计入的用户+资产对: ${zeroDupUsers.length}（可能无 yield_settlements、或结算走链上公式与库中 total_yield 不匹配）`
  );

  await conn.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
