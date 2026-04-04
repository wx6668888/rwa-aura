/**
 * 用「质押账本」重算应得收益，并与 yield_settlements 中已记账金额对比。
 *
 * 账本构成：
 * - 本金流入：stake_events（event_type=RWA / USDT），与链上质押一致；
 * - 本金流出：balance_snapshots 中 event_type IN ('withdraw','mature')（stake_events 不含提现/到期，必须补全否则收益会系统性偏高）。
 *
 * 计息公式：与 PreciseYieldCalculator / yieldLedgerMath 一致（分段 × 日利率 × 锁仓加成）。
 *
 * 用法：
 *   cd backend
 *   RECONCILE_USER=0x... ASSET_TYPE=RWA npx ts-node --transpile-only scripts/reconcile-yield-settlements-vs-stake-ledger.ts
 */
import dotenv from 'dotenv';
import path from 'path';
import { ethers, JsonRpcProvider } from 'ethers';
import mysql from 'mysql2/promise';
import { computeYieldFromLedgerSnapshots } from '../src/services/yieldLedgerMath';
import { reconcileUserAssetFromDb } from '../src/services/stakeLedgerReconciliation';
import { OnChainYieldCalculator } from '../src/services/on-chain/OnChainYieldCalculator';
import { findBlockAtOrBefore } from '../src/services/on-chain/chainSettlementUtils';

dotenv.config({ path: path.join(__dirname, '../.env') });

type Asset = 'USDT' | 'RWA';

function parseAsset(s: string | undefined): Asset {
  const u = (s || 'RWA').trim().toUpperCase();
  if (u === 'USDT' || u === 'RWA') return u;
  throw new Error(`ASSET_TYPE 须为 RWA 或 USDT，当前: ${s}`);
}

async function main() {
  const userRaw = (process.env.RECONCILE_USER || '').trim().toLowerCase();
  if (!userRaw || !userRaw.startsWith('0x')) {
    throw new Error('请设置 RECONCILE_USER=0x...');
  }

  const assetType = parseAsset(process.env.ASSET_TYPE);
  const showOnchain = ['1', 'true', 'yes'].includes((process.env.SHOW_ONCHAIN || '').trim().toLowerCase());

  const rpcUrl = process.env.BSC_RPC_URL || process.env.BSC_TESTNET_RPC_URL;
  const stakingAddr = process.env.STAKING_CONTRACT_ADDRESS;
  let onchainCalc: OnChainYieldCalculator | null = null;
  let provider: JsonRpcProvider | null = null;
  if (showOnchain) {
    if (!rpcUrl || !stakingAddr) {
      throw new Error('SHOW_ONCHAIN=1 时需要 BSC_RPC_URL、STAKING_CONTRACT_ADDRESS');
    }
    provider = new JsonRpcProvider(rpcUrl);
    onchainCalc = new OnChainYieldCalculator(provider, stakingAddr);
  }

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'rwa_user',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'rwa_protocol',
  });

  const r = await reconcileUserAssetFromDb(conn, userRaw, assetType);
  await conn.end();

  const checksum = ethers.getAddress(userRaw);
  const lines: unknown[] = [];

  for (const row of r.settlementDetails) {
    const fromTime = row.from_time;
    const toTime = row.to_time;
    const paidWei = (() => {
      try {
        return ethers.parseEther(String(row.total_yield).trim().split(/e|E/)[0] || String(row.total_yield));
      } catch {
        return 0n;
      }
    })();

    const { totalYield } = computeYieldFromLedgerSnapshots(r.ledgerSnapshots, assetType, fromTime, toTime);
    const ledgerWei = BigInt(totalYield);
    const delta = paidWei > ledgerWei ? paidWei - ledgerWei : ledgerWei - paidWei;

    const line: Record<string, unknown> = {
      settlement_id: row.id,
      settlement_toTime: toTime,
      date_utc: new Date(toTime * 1000).toISOString().slice(0, 10),
      paid_rwa: assetType === 'RWA' ? ethers.formatEther(paidWei) : undefined,
      paid_equiv_note: assetType === 'USDT' ? 'total_yield 存的是 RWA 等值（与日结一致）' : undefined,
      paid_wei: paidWei.toString(),
      ledger_from_stake_events_wei: ledgerWei.toString(),
      ledger_from_stake_events_rwa: ethers.formatEther(ledgerWei),
      delta_paid_vs_stake_ledger_rwa: ethers.formatEther(delta),
      direction_paid_vs_stake_ledger: paidWei > ledgerWei ? 'paid>HIGH' : paidWei < ledgerWei ? 'paid<LOW' : 'match',
      db_tx: row.tx_hash,
    };

    if (onchainCalc && provider) {
      try {
        const blockAtFrom = await findBlockAtOrBefore(provider, fromTime);
        const { totalYield: oc } = await onchainCalc.calculateYield(
          checksum,
          assetType,
          fromTime,
          toTime,
          provider,
          blockAtFrom
        );
        const onchainWei = BigInt(oc);
        line.onchain_window_formula_wei = onchainWei.toString();
        line.onchain_window_formula_rwa = ethers.formatEther(onchainWei);
        const d2 = paidWei > onchainWei ? paidWei - onchainWei : onchainWei - paidWei;
        line.delta_paid_vs_onchain_rwa = ethers.formatEther(d2);
        line.direction_paid_vs_onchain =
          paidWei > onchainWei ? 'paid>HIGH' : paidWei < onchainWei ? 'paid<LOW' : 'match';
      } catch (e) {
        line.onchain_error = e instanceof Error ? e.message : String(e);
      }
    }

    lines.push(line);
  }

  const sumPaidWei = r.sumPaidWei;
  const sumLedgerWei = r.sumExpectedLedgerWei;
  const overpay = sumPaidWei > sumLedgerWei ? sumPaidWei - sumLedgerWei : 0n;
  const underpay = sumLedgerWei > sumPaidWei ? sumLedgerWei - sumPaidWei : 0n;

  const out: Record<string, unknown> = {
    user: userRaw,
    asset_type: assetType,
    stake_events_rows: r.stakeEventsCount,
    balance_snapshots_withdraw_mature_rows: r.outflowCount,
    ledger_snapshots_after_dedupe: r.ledgerSnapshotsDeduped,
    settlement_rows_compared: r.settlementRows,
    sum_paid_wei: sumPaidWei.toString(),
    sum_ledger_from_stake_events_wei: sumLedgerWei.toString(),
    sum_paid_rwa: ethers.formatEther(sumPaidWei),
    sum_ledger_from_stake_events_rwa: ethers.formatEther(sumLedgerWei),
    delta_if_paid_over_stake_ledger_rwa: ethers.formatEther(overpay),
    delta_if_stake_ledger_over_paid_rwa: ethers.formatEther(underpay),
    rows: lines,
    note:
      '「stake_ledger」= stake_events 质押流入 + balance_snapshots 的 withdraw/mature；分段计息与旧 balance_snapshots 全量积分一致。生产日结用的是 OnChainYieldCalculator（窗口起点区块读合约仓位），与 stake_ledger 分段积分通常不一致；若需与已发放金额对齐，请设 SHOW_ONCHAIN=1 看第三列 onchain_window_formula。',
  };

  if (showOnchain && lines.length > 0) {
    let sumOn = 0n;
    for (const line of lines as Array<Record<string, unknown>>) {
      const w = line.onchain_window_formula_wei;
      if (typeof w === 'string') sumOn += BigInt(w);
    }
    if (sumOn > 0n) {
      out.sum_onchain_window_formula_wei = sumOn.toString();
      out.sum_onchain_window_formula_rwa = ethers.formatEther(sumOn);
    }
  }

  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
