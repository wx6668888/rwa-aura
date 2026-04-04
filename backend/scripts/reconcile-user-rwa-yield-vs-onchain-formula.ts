/**
 * 将 yield_settlements 中已记录的 RWA 日结金额，与 OnChainYieldCalculator（当前正确公式）重算结果对比，
 * 用于估算链上多发放额度（需 owner 调用 adminClawbackRwaStakePending 扣减）。
 *
 * 用法：
 *   cd backend
 *   RECONCILE_USER=0x06f0e0a0d72dd56fb75ab4f9b1146d8c7bda0ebe npx ts-node --transpile-only scripts/reconcile-user-rwa-yield-vs-onchain-formula.ts
 */
import dotenv from 'dotenv';
import path from 'path';
import { ethers } from 'ethers';
import mysql from 'mysql2/promise';
import type { RowDataPacket } from 'mysql2';
import { OnChainYieldCalculator } from '../src/services/on-chain/OnChainYieldCalculator';
import { findBlockAtOrBefore } from '../src/services/on-chain/chainSettlementUtils';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function main() {
  const user = (process.env.RECONCILE_USER || '').trim().toLowerCase();
  if (!user || !user.startsWith('0x')) {
    throw new Error('请设置 RECONCILE_USER=0x...');
  }

  const rpcUrl = process.env.BSC_RPC_URL || process.env.BSC_TESTNET_RPC_URL;
  const staking = process.env.STAKING_CONTRACT_ADDRESS;
  if (!rpcUrl || !staking) throw new Error('需要 BSC_RPC_URL、STAKING_CONTRACT_ADDRESS');

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const calc = new OnChainYieldCalculator(provider, staking);
  const checksum = ethers.getAddress(user);

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'rwa_user',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'rwa_protocol',
  });

  const [rows] = await conn.query<RowDataPacket[]>(
    `SELECT settlement_time, from_time, to_time, total_yield, tx_hash
     FROM yield_settlements
     WHERE LOWER(TRIM(user_address)) = ?
       AND asset_type = 'RWA'
       AND tx_hash IS NOT NULL AND tx_hash != '' AND tx_hash != 'PENDING'
     ORDER BY settlement_time ASC`,
    [user]
  );
  await conn.end();

  let totalPaidWei = 0n;
  let totalCorrectWei = 0n;

  const lines: unknown[] = [];

  for (const r of rows) {
    const fromTime = Number(r.from_time);
    const toTime = Number(r.to_time);
    const paidStr = String(r.total_yield).trim();
    let paidWei: bigint;
    try {
      paidWei = ethers.parseEther(paidStr.split(/e|E/)[0] || paidStr);
    } catch {
      paidWei = 0n;
    }

    const blockAtFrom = await findBlockAtOrBefore(provider, fromTime);
    const { totalYield } = await calc.calculateYield(
      checksum,
      'RWA',
      fromTime,
      toTime,
      provider,
      blockAtFrom
    );
    const correctWei = BigInt(totalYield);

    totalPaidWei += paidWei;
    totalCorrectWei += correctWei;
    const delta = paidWei > correctWei ? paidWei - correctWei : correctWei - paidWei;

    lines.push({
      settlement_toTime: toTime,
      date_utc: new Date(toTime * 1000).toISOString().slice(0, 10),
      block_at_from: blockAtFrom,
      paid_rwa: ethers.formatEther(paidWei),
      correct_formula_rwa: ethers.formatEther(correctWei),
      delta_rwa: ethers.formatEther(delta),
      direction: paidWei > correctWei ? 'paid>HIGH' : paidWei < correctWei ? 'paid<LOW' : 'match',
      db_tx: r.tx_hash,
    });
  }

  const overpay = totalPaidWei > totalCorrectWei ? totalPaidWei - totalCorrectWei : 0n;

  console.log(
    JSON.stringify(
      {
        user,
        rows: lines,
        sum_paid_wei: totalPaidWei.toString(),
        sum_correct_wei: totalCorrectWei.toString(),
        sum_paid_rwa: ethers.formatEther(totalPaidWei),
        sum_correct_rwa: ethers.formatEther(totalCorrectWei),
        suggested_clawback_rwa_if_overpaid: ethers.formatEther(overpay),
        note:
          '若 suggested_clawback > 0，可由合约 owner 调用 adminClawbackRwaStakePending(user, amount) 扣减 rwaStakes[user].rwaPending（不转走池内代币，仅记账）。',
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
