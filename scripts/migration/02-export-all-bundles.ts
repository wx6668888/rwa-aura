/**
 * 根据 01 输出的 stakers.json，批量从老合约只读导出每个用户的 migration bundle
 *
 * LEGACY_STAKING=0x... BSC_RPC_URL=... \\
 *   npx ts-node scripts/migration/02-export-all-bundles.ts
 *
 * 可选: STAKERS_JSON=path/to/stakers.json（默认 scripts/migration/out/stakers.json）
 * 可选: EXPORT_START=0 EXPORT_LIMIT=100 分批
 * 可选: SLEEP_MS=200 每用户间隔，减轻 RPC 压力
 */
import * as dotenv from 'dotenv';
import * as nodePath from 'path';
dotenv.config({ path: nodePath.resolve(__dirname, '../../.env'), override: true });

import { ethers } from 'ethers';
import * as fs from 'fs';
import { fetchLegacyUserBundle, bundleToJson } from './legacyUserBundle';

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const legacy = (process.env.LEGACY_STAKING || '').trim();
  const rpc =
    process.env.BSC_RPC_URL || process.env.BSC_MAINNET_RPC_URL || 'https://bsc.publicnode.com';
  const stakersPath =
    process.env.STAKERS_JSON || nodePath.join(__dirname, 'out', 'stakers.json');
  const start = parseInt(process.env.EXPORT_START || '0', 10);
  const limit = process.env.EXPORT_LIMIT ? parseInt(process.env.EXPORT_LIMIT, 10) : undefined;
  const sleepMs = parseInt(process.env.SLEEP_MS || '0', 10);

  if (!legacy || !ethers.isAddress(legacy)) throw new Error('Set LEGACY_STAKING（老 Staking 地址）');

  if (!fs.existsSync(stakersPath)) throw new Error(`Missing ${stakersPath} — run 01-list-legacy-stakers first`);

  const raw = JSON.parse(fs.readFileSync(stakersPath, 'utf8')) as { addresses: string[] };
  const all = raw.addresses || [];
  const slice = limit === undefined ? all.slice(start) : all.slice(start, start + limit);

  const outDir = nodePath.join(__dirname, 'out', 'bundles');
  fs.mkdirSync(outDir, { recursive: true });

  const provider = new ethers.JsonRpcProvider(rpc);
  const legacyAddr = ethers.getAddress(legacy);

  let ok = 0;
  let fail = 0;
  for (let i = 0; i < slice.length; i++) {
    const user = ethers.getAddress(slice[i]!);
    const name = `${user.toLowerCase()}.json`;
    const fp = nodePath.join(outDir, name);
    try {
      const { args, legacyStakesCounter, readable } = await fetchLegacyUserBundle(provider, legacyAddr, user);
      const doc = bundleToJson(legacyAddr, args, legacyStakesCounter, readable);
      fs.writeFileSync(fp, JSON.stringify(doc, null, 2), 'utf8');
      ok++;
      console.log(`[${start + i + 1}/${all.length}] ok`, user);
    } catch (e) {
      fail++;
      console.error(`[${start + i + 1}/${all.length}] FAIL`, user, e);
    }
    if (sleepMs > 0) await sleep(sleepMs);
  }

  console.log(`Wrote under ${outDir} ok=${ok} fail=${fail}`);

  let bundleMax = 0n;
  for (const fn of fs.readdirSync(outDir).filter((f) => f.endsWith('.json'))) {
    try {
      const j = JSON.parse(fs.readFileSync(nodePath.join(outDir, fn), 'utf8')) as {
        migrationImportUserBundleArgs?: {
          usdtLocks?: Array<{ stakeId: string }>;
          rwaLocks?: Array<{ stakeId: string }>;
        };
      };
      const a = j.migrationImportUserBundleArgs;
      if (!a) continue;
      for (const x of a.usdtLocks || []) {
        const id = BigInt(x.stakeId);
        if (id > bundleMax) bundleMax = id;
      }
      for (const x of a.rwaLocks || []) {
        const id = BigInt(x.stakeId);
        if (id > bundleMax) bundleMax = id;
      }
    } catch {
      /* skip */
    }
  }
  const fromBundles = bundleMax + 1n;
  const hintFile = nodePath.join(__dirname, 'out', 'migration-min-stakes-counter.txt');
  let dbHint = 0n;
  if (fs.existsSync(hintFile)) {
    try {
      dbHint = BigInt(fs.readFileSync(hintFile, 'utf8').trim());
    } catch {
      /* ignore */
    }
  }
  const finalMin = fromBundles > dbHint ? fromBundles : dbHint;
  fs.writeFileSync(hintFile, finalMin.toString(), 'utf8');
  console.log(
    'migration-min-stakes-counter.txt ->',
    finalMin.toString(),
    '(maxStakeId=',
    bundleMax.toString(),
    ', dbHint=',
    dbHint.toString(),
    ')'
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
