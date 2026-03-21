/**
 * 查询指定用户在后台数据库中的节点等级 node_level
 * 使用方式（在 backend 目录下执行）:
 *   npx ts-node ../scripts/query-user-level.ts 0x...
 */

import { getPool } from '../backend/src/config/database.config';

const address = (process.argv[2] || '').toLowerCase();

if (!address || !address.startsWith('0x') || address.length !== 42) {
  console.error('请提供有效的钱包地址，例如: npx ts-node ../scripts/query-user-level.ts 0xabc...123');
  process.exit(1);
}

async function main() {
  const pool = getPool();
  const [rows] = await pool.query<any[]>(
    `SELECT address, node_level, cumulative_personal_stake, team_volume,
            team_total_deposited, team_total_withdrawn
     FROM users WHERE LOWER(address) = LOWER(?)`,
    [address]
  );

  console.log('\n=== 节点等级与团队数据 ===\n');
  console.log('地址:', address);

  if (!rows || rows.length === 0) {
    console.log('users 表中未找到该用户记录。');
    process.exit(0);
    return;
  }

  const r = rows[0];
  console.log('node_level:', r.node_level);
  console.log('cumulative_personal_stake (18位):', String(r.cumulative_personal_stake ?? '0'));
  console.log('team_volume (18位):', String(r.team_volume ?? '0'));
  console.log('team_total_deposited (18位):', String(r.team_total_deposited ?? '0'));
  console.log('team_total_withdrawn (18位):', String(r.team_total_withdrawn ?? '0'));
  console.log('');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

