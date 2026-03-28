/**
 * 用 owner 私钥向新合约批量调用 migrationImportUserBundle
 *
 * 须先: 00-prep + 02-export（或手工放入 out/bundles/*.json）
 *
 * NEW_STAKING=0x... PRIVATE_KEY=0x... BSC_MAINNET_RPC_URL=... \\
 *   npx ts-node scripts/migration/03-import-bundles.ts
 *
 * 可选: BUNDLES_DIR=... IMPORT_START=0 IMPORT_LIMIT=10 SLEEP_MS=3000
 * 若某用户已导入，链上会 revert "already migrated"，脚本会记录并继续（见 SKIP_ON_ERROR）
 */
import * as dotenv from 'dotenv';
import * as nodePath from 'path';
dotenv.config({ path: nodePath.resolve(__dirname, '../../.env'), override: true });

import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';
import { parseBundleFromJson } from './legacyUserBundle';
import { migrationArgsToContractTuples } from './argsToContract';
import { STAKING_MIGRATION_ABI } from './migrationContract';

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  let pk = (process.env.PRIVATE_KEY || '').trim();
  if (pk && !pk.startsWith('0x')) pk = `0x${pk}`;
  const newStaking = (process.env.NEW_STAKING || '').trim();
  const rpc =
    process.env.BSC_RPC_URL || process.env.BSC_MAINNET_RPC_URL || 'https://bsc.publicnode.com';
  const bundlesDir = process.env.BUNDLES_DIR || path.join(__dirname, 'out', 'bundles');
  const start = parseInt(process.env.IMPORT_START || '0', 10);
  const limit = process.env.IMPORT_LIMIT ? parseInt(process.env.IMPORT_LIMIT, 10) : undefined;
  const sleepMs = parseInt(process.env.SLEEP_MS || '2000', 10);
  const skipOnError = process.env.SKIP_ON_ERROR !== '0';

  if (!pk) throw new Error('Set PRIVATE_KEY (须为新合约 owner)');
  if (!newStaking || !ethers.isAddress(newStaking)) throw new Error('Set NEW_STAKING');
  if (!fs.existsSync(bundlesDir)) throw new Error(`Missing bundles dir ${bundlesDir}`);

  const files = fs
    .readdirSync(bundlesDir)
    .filter((f) => f.endsWith('.json'))
    .sort();
  const slice = limit === undefined ? files.slice(start) : files.slice(start, start + limit);

  const provider = new ethers.JsonRpcProvider(rpc);
  const wallet = new ethers.Wallet(pk, provider);
  const c = new ethers.Contract(ethers.getAddress(newStaking), STAKING_MIGRATION_ABI, wallet);

  const enabled = await c.migrationEnabled();
  if (!enabled) throw new Error('migrationEnabled is false — run 00-prep first');

  let ok = 0;
  let skip = 0;
  let fail = 0;

  for (let i = 0; i < slice.length; i++) {
    const fn = slice[i]!;
    const fp = path.join(bundlesDir, fn);
    let j: unknown;
    try {
      j = JSON.parse(fs.readFileSync(fp, 'utf8'));
    } catch (e) {
      console.error('Bad JSON', fp, e);
      fail++;
      continue;
    }
    let args;
    try {
      args = parseBundleFromJson(j as Parameters<typeof parseBundleFromJson>[0]);
    } catch (e) {
      console.error('parseBundleFromJson', fp, e);
      fail++;
      continue;
    }
    const t = migrationArgsToContractTuples(args);
    try {
      if (await c.migrationSeen(t.user)) {
        console.warn(`[skip seen] ${t.user}`);
        skip++;
        continue;
      }
      const tx = await c.migrationImportUserBundle(
        t.user,
        t.uInfo,
        t.rInfo,
        t.usdtLocks,
        t.rwaLocks,
        t.usdtFlexPrincipal_,
        t.usdtFlexTotal_,
        t.rwaFlexPrincipal_,
        t.rwaFlexTotal_,
        t.hist,
        t.globalDeltaTotalStaked,
        t.globalDeltaTotalStakedRWA
      );
      console.log(`[${start + i + 1}/${files.length}]`, t.user, tx.hash);
      await tx.wait();
      ok++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (skipOnError && msg.includes('already migrated')) {
        console.warn(`[skip revert] ${t.user}`);
        skip++;
      } else {
        console.error(`[fail] ${t.user}`, e);
        fail++;
        if (!skipOnError) process.exit(1);
      }
    }
    if (sleepMs > 0 && i + 1 < slice.length) await sleep(sleepMs);
  }

  console.log(`Done ok=${ok} skip=${skip} fail=${fail}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
