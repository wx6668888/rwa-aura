/**
 * 从后端 MySQL stake_events 去重拉取曾质押用户（避开公共 RPC 历史日志限流）
 *
 * 读取 backend/.env 的 DB_*，输出与 01 相同: scripts/migration/out/stakers.json
 *
 *   npx ts-node scripts/migration/01b-list-stakers-from-db.ts
 */
import * as dotenv from 'dotenv';
import * as nodePath from 'path';
import * as fs from 'fs';
import { ethers } from 'ethers';
import mysql from 'mysql2/promise';

// DB 配置优先取运行环境变量（推荐：PM2/systemd 注入），可选读取 backend/.env 作为本地开发兜底。
dotenv.config({ path: nodePath.resolve(__dirname, '../../backend/.env'), override: false });

async function main() {
  const host = process.env.DB_HOST || 'localhost';
  const port = parseInt(process.env.DB_PORT || '3306', 10);
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  const database = process.env.DB_NAME;
  if (!user || !database) throw new Error('backend/.env 缺少 DB_USER / DB_NAME');

  // 勿用 STAKING_CONTRACT_ADDRESS（多为新合约）；未设 LEGACY_STAKING 时用下列老地址
  const legacy =
    (process.env.LEGACY_STAKING || '').trim() || '0x8FA4A4BE954a80c940623DDa1ed6e3D50FC25175';
  const fromBlock = parseInt(process.env.FROM_BLOCK || process.env.STAKING_DEPLOY_BLOCK || '87485780', 10);

  const conn = await mysql.createConnection({ host, port, user, password, database });
  const [rows] = await conn.query<{ user_address: string }[]>(
    `SELECT DISTINCT user_address FROM stake_events WHERE user_address IS NOT NULL AND TRIM(user_address) <> ''`
  );
  let maxStakeId = 0n;
  try {
    const [mx] = await conn.query<{ m: string | number | null }[]>(
      `SELECT COALESCE(MAX(CAST(stake_id AS UNSIGNED)), 0) AS m FROM stake_events WHERE stake_id IS NOT NULL`
    );
    const v = (mx as { m: string | number | null }[])[0]?.m;
    if (v != null && v !== '') maxStakeId = BigInt(String(v));
  } catch {
    /* 表结构差异时忽略 */
  }
  await conn.end();

  const set = new Set<string>();
  for (const r of rows as { user_address: string }[]) {
    const a = (r.user_address || '').trim();
    if (!a || !ethers.isAddress(a)) continue;
    set.add(ethers.getAddress(a).toLowerCase());
  }
  const addresses = [...set].sort().map((x) => ethers.getAddress(x));

  const outDir = nodePath.join(__dirname, 'out');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = nodePath.join(outDir, 'stakers.json');
  const minNextFromDb = maxStakeId + 1n;
  fs.writeFileSync(
    outPath,
    JSON.stringify(
      {
        meta: {
          source: 'mysql:stake_events',
          legacy,
          fromBlock,
          count: addresses.length,
          dbMaxStakeId: maxStakeId.toString(),
          suggestedMigrationMinStakesCounter: minNextFromDb.toString(),
        },
        addresses,
      },
      null,
      2
    ),
    'utf8'
  );
  const hintPath = nodePath.join(outDir, 'migration-min-stakes-counter.txt');
  fs.writeFileSync(hintPath, minNextFromDb.toString(), 'utf8');
  console.log('Wrote', outPath, 'count=', addresses.length, 'minStakesCounter hint', minNextFromDb.toString(), '->', hintPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
