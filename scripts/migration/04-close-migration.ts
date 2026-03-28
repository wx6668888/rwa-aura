/**
 * setMigrationEnabled(false) — 导入完成后关闭迁移窗口
 *
 * NEW_STAKING=0x... npx ts-node scripts/migration/04-close-migration.ts
 */
import * as dotenv from 'dotenv';
import * as nodePath from 'path';
dotenv.config({ path: nodePath.resolve(__dirname, '../../.env'), override: true });

import { ethers } from 'ethers';
import { STAKING_MIGRATION_ABI } from './migrationContract';

async function main() {
  let pk = (process.env.PRIVATE_KEY || '').trim();
  if (pk && !pk.startsWith('0x')) pk = `0x${pk}`;
  const newStaking = (process.env.NEW_STAKING || '').trim();
  const rpc =
    process.env.BSC_RPC_URL || process.env.BSC_MAINNET_RPC_URL || 'https://bsc.publicnode.com';
  if (!pk) throw new Error('Set PRIVATE_KEY');
  if (!newStaking || !ethers.isAddress(newStaking)) throw new Error('Set NEW_STAKING');

  const provider = new ethers.JsonRpcProvider(rpc);
  const wallet = new ethers.Wallet(pk, provider);
  const c = new ethers.Contract(ethers.getAddress(newStaking), STAKING_MIGRATION_ABI, wallet);
  const tx = await c.setMigrationEnabled(false);
  console.log('setMigrationEnabled(false)', tx.hash);
  await tx.wait();
  console.log('migrationEnabled=', await c.migrationEnabled());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
