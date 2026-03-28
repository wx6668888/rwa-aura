/**
 * 在新合约上打开迁移并提升 stakesCounter（与 STAKING_MIGRATION.md 步骤 2–3 对应）
 *
 * NEW_STAKING=0x... PRIVATE_KEY=0x... BSC_MAINNET_RPC_URL=... \\
 *   npx ts-node scripts/migration/00-prep-new-staking-migration.ts
 *
 * 若设 LEGACY_STAKING，则从老合约读 stakesCounter 并调用 migrationSetStakesCounter(该值)；
 * 否则设 MIGRATION_MIN_STAKES_COUNTER=数字 手动指定。
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
dotenv.config({ path: path.resolve(__dirname, '../../.env'), override: true });

import { ethers } from 'ethers';
import { STAKING_MIGRATION_ABI } from './migrationContract';

const LEGACY_ABI = ['function stakesCounter() view returns (uint256)'] as const;

async function main() {
  let pk = (process.env.PRIVATE_KEY || '').trim();
  if (pk && !pk.startsWith('0x')) pk = `0x${pk}`;
  const newStaking = (process.env.NEW_STAKING || '').trim();
  const rpc =
    process.env.BSC_RPC_URL || process.env.BSC_MAINNET_RPC_URL || 'https://bsc.publicnode.com';
  const legacy = (process.env.LEGACY_STAKING || '').trim();
  const manualMin = (process.env.MIGRATION_MIN_STAKES_COUNTER || '').trim();

  if (!pk) throw new Error('Set PRIVATE_KEY (须为新合约 owner)');
  if (!newStaking || !ethers.isAddress(newStaking)) throw new Error('Set NEW_STAKING');

  const provider = new ethers.JsonRpcProvider(rpc);
  const wallet = new ethers.Wallet(pk, provider);
  const c = new ethers.Contract(ethers.getAddress(newStaking), STAKING_MIGRATION_ABI, wallet);

  console.log('Signer:', wallet.address);
  console.log('New staking:', ethers.getAddress(newStaking));

  const tx1 = await c.setMigrationEnabled(true);
  console.log('setMigrationEnabled(true)', tx1.hash);
  await tx1.wait();

  const hintFile = path.join(__dirname, 'out/migration-min-stakes-counter.txt');
  let minNext: bigint;
  if (manualMin) {
    minNext = BigInt(manualMin);
    console.log('From MIGRATION_MIN_STAKES_COUNTER:', minNext.toString());
  } else if (legacy && ethers.isAddress(legacy)) {
    const leg = new ethers.Contract(ethers.getAddress(legacy), LEGACY_ABI, provider);
    try {
      minNext = await leg.stakesCounter();
      console.log('From LEGACY_STAKING stakesCounter:', minNext.toString());
    } catch {
      if (!fs.existsSync(hintFile)) {
        throw new Error(`老合约 stakesCounter() 不可用且缺少 ${hintFile}，请先运行 01b-list-stakers-from-db 与 02-export-all-bundles`);
      }
      minNext = BigInt(fs.readFileSync(hintFile, 'utf8').trim());
      console.log('From migration-min-stakes-counter.txt:', minNext.toString());
    }
  } else {
    if (!fs.existsSync(hintFile)) {
      throw new Error('Set LEGACY_STAKING / MIGRATION_MIN_STAKES_COUNTER 或生成 out/migration-min-stakes-counter.txt');
    }
    minNext = BigInt(fs.readFileSync(hintFile, 'utf8').trim());
    console.log('From migration-min-stakes-counter.txt (no legacy):', minNext.toString());
  }

  const cur = await c.stakesCounter();
  console.log('New contract stakesCounter (before):', cur.toString());
  if (minNext < cur) {
    console.log('minNext < current; migrationSetStakesCounter 将 revert，跳过或提高老合约计数');
    throw new Error('minNext too low vs new contract');
  }

  const tx2 = await c.migrationSetStakesCounter(minNext);
  console.log('migrationSetStakesCounter', tx2.hash);
  await tx2.wait();
  console.log('Done. migrationEnabled=', await c.migrationEnabled(), 'stakesCounter=', (await c.stakesCounter()).toString());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
