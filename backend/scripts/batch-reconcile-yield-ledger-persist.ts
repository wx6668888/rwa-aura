/**
 * 全库批量：按质押账本（stake_events + withdraw/mature）重算「相对 yield_settlements 各窗口」的应得收益之和，
 * 与库中已发放 sum 对比，并可写入表 yield_reconciliation_ledger。
 *
 * 流程建议：
 * 1）仅核验示例地址（不写库）：
 *    VERIFY_USER=0x06f0e0a0d72dd56fb75ab4f9b1146d8c7bda0ebe npm run batch:reconcile-yield-ledger
 * 2）确认无误后写入全库：
 *    BATCH_WRITE=1 npm run batch:reconcile-yield-ledger
 *
 * 仅写入示例（测试）：
 *    VERIFY_USER=0x06f0... BATCH_WRITE=1 npm run batch:reconcile-yield-ledger
 */
import dotenv from 'dotenv';
import path from 'path';
import mysql from 'mysql2/promise';
import type { RowDataPacket } from 'mysql2';
import { ethers } from 'ethers';
import { reconcileUserAssetFromDb, type StakeLedgerAsset } from '../src/services/stakeLedgerReconciliation';

dotenv.config({ path: path.join(__dirname, '../.env') });

const DDL = `
CREATE TABLE IF NOT EXISTS yield_reconciliation_ledger (
  id BIGINT NOT NULL AUTO_INCREMENT,
  user_address VARCHAR(42) NOT NULL,
  asset_type ENUM('RWA', 'USDT') NOT NULL,
  stake_events_count INT NOT NULL DEFAULT 0,
  outflow_snapshots_count INT NOT NULL DEFAULT 0,
  ledger_snapshots_after_dedupe INT NOT NULL DEFAULT 0,
  settlement_rows INT NOT NULL DEFAULT 0,
  sum_paid_wei VARCHAR(80) NOT NULL,
  sum_expected_ledger_wei VARCHAR(80) NOT NULL,
  delta_paid_minus_expected_wei VARCHAR(80) NOT NULL,
  sum_paid_rwa_display VARCHAR(64) DEFAULT NULL,
  sum_expected_rwa_display VARCHAR(64) DEFAULT NULL,
  computed_at BIGINT NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_user_asset (user_address, asset_type),
  KEY idx_computed_at (computed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`;

function envBool(name: string): boolean {
  return ['1', 'true', 'yes'].includes((process.env[name] || '').trim().toLowerCase());
}

function normalizeAddr(a: string): string {
  return a.trim().toLowerCase();
}

async function ensureTable(conn: mysql.Connection): Promise<void> {
  await conn.query(DDL);
}

async function listDistinctUsers(conn: mysql.Connection, only?: string): Promise<string[]> {
  if (only) {
    const u = normalizeAddr(only);
    if (!u.startsWith('0x')) throw new Error('VERIFY_USER 须为 0x 地址');
    return [u];
  }
  const [rows] = await conn.query<RowDataPacket[]>(
    `SELECT addr FROM (
       SELECT DISTINCT LOWER(TRIM(user_address)) AS addr FROM stake_events
       UNION
       SELECT DISTINCT LOWER(TRIM(user_address)) AS addr FROM yield_settlements
     ) x
     WHERE addr IS NOT NULL AND addr != ''
     ORDER BY addr`
  );
  return rows.map((r) => String(r.addr));
}

async function main() {
  const verifyUser = (process.env.VERIFY_USER || '').trim();
  const batchWrite = envBool('BATCH_WRITE');

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'rwa_user',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'rwa_protocol',
  });

  if (batchWrite) {
    await ensureTable(conn);
  }

  const users = await listDistinctUsers(conn, verifyUser || undefined);
  const assets: StakeLedgerAsset[] = ['RWA', 'USDT'];

  const results: unknown[] = [];
  let upserted = 0;
  const computedAt = Math.floor(Date.now() / 1000);

  for (const userLower of users) {
    for (const assetType of assets) {
      const r = await reconcileUserAssetFromDb(conn, userLower, assetType);
      if (r.stakeEventsCount === 0 && r.settlementRows === 0) {
        continue;
      }

      const delta = r.sumPaidWei - r.sumExpectedLedgerWei;
      const row = {
        user_address: userLower,
        asset_type: assetType,
        stake_events_count: r.stakeEventsCount,
        outflow_snapshots_count: r.outflowCount,
        ledger_snapshots_after_dedupe: r.ledgerSnapshotsDeduped,
        settlement_rows: r.settlementRows,
        sum_paid_wei: r.sumPaidWei.toString(),
        sum_expected_ledger_wei: r.sumExpectedLedgerWei.toString(),
        delta_paid_minus_expected_wei: delta.toString(),
        sum_paid_rwa_display: ethers.formatEther(r.sumPaidWei),
        sum_expected_rwa_display: ethers.formatEther(r.sumExpectedLedgerWei),
        computed_at: computedAt,
      };

      results.push(row);

      if (batchWrite) {
        await conn.query(
          `INSERT INTO yield_reconciliation_ledger (
            user_address, asset_type, stake_events_count, outflow_snapshots_count,
            ledger_snapshots_after_dedupe, settlement_rows,
            sum_paid_wei, sum_expected_ledger_wei, delta_paid_minus_expected_wei,
            sum_paid_rwa_display, sum_expected_rwa_display, computed_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            stake_events_count = VALUES(stake_events_count),
            outflow_snapshots_count = VALUES(outflow_snapshots_count),
            ledger_snapshots_after_dedupe = VALUES(ledger_snapshots_after_dedupe),
            settlement_rows = VALUES(settlement_rows),
            sum_paid_wei = VALUES(sum_paid_wei),
            sum_expected_ledger_wei = VALUES(sum_expected_ledger_wei),
            delta_paid_minus_expected_wei = VALUES(delta_paid_minus_expected_wei),
            sum_paid_rwa_display = VALUES(sum_paid_rwa_display),
            sum_expected_rwa_display = VALUES(sum_expected_rwa_display),
            computed_at = VALUES(computed_at)`,
          [
            userLower,
            assetType,
            r.stakeEventsCount,
            r.outflowCount,
            r.ledgerSnapshotsDeduped,
            r.settlementRows,
            r.sumPaidWei.toString(),
            r.sumExpectedLedgerWei.toString(),
            delta.toString(),
            ethers.formatEther(r.sumPaidWei),
            ethers.formatEther(r.sumExpectedLedgerWei),
            computedAt,
          ]
        );
        upserted++;
      }
    }
  }

  await conn.end();

  const includeFullResults = Boolean(verifyUser) || results.length <= 100;

  const summary = {
    mode: batchWrite
      ? verifyUser
        ? 'write_single_user'
        : 'write_all_users'
      : verifyUser
        ? 'verify_single_user'
        : 'dry_run_all_users',
    users_scanned: users.length,
    rows_computed: results.length,
    rows_upserted: batchWrite ? upserted : 0,
    computed_at_unix: computedAt,
    note:
      'sum_expected_ledger_wei 为质押账本分段积分，与生产日结 OnChainYieldCalculator 可能不一致；先用 VERIFY_USER 核验，再 BATCH_WRITE=1。',
    results: includeFullResults ? results : { _truncated: true, count: results.length },
  };

  console.log(JSON.stringify(summary, null, 2));

  if (!includeFullResults) {
    console.error(
      JSON.stringify({
        hint: '输出已截断。使用 VERIFY_USER=0x... 查看单人明细，或 BATCH_WRITE=1 写入表后 SELECT * FROM yield_reconciliation_ledger。',
        rows_computed: results.length,
      })
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
