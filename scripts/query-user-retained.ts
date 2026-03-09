/**
 * 查询指定用户的 总充值、总提现、总留存（用于排查 0/2000 等显示）
 * 使用方式：npx ts-node scripts/query-user-retained.ts [address]
 */
import { getPool } from '../backend/src/config/database.config';

const address = process.argv[2] || '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

function from18(s: string): number {
  if (!s || s === '0') return 0;
  return Number(BigInt(s)) / 1e18;
}

async function main() {
  const pool = getPool();
  const [rows] = await pool.query<any[]>(
    `SELECT address,
        COALESCE(team_total_deposited, 0) AS team_total_deposited,
        COALESCE(team_total_withdrawn, 0) AS team_total_withdrawn,
        GREATEST(0, COALESCE(team_total_deposited, 0) - COALESCE(team_total_withdrawn, 0)) AS team_retained
     FROM users WHERE address = ?`,
    [address.toLowerCase()]
  );

  console.log('\n=== 用户总留存明细 ===\n');
  console.log('地址:', address);

  if (!rows || rows.length === 0) {
    console.log('未在 users 表中找到该用户，总充值/总提现/总留存 均为 0。');
    process.exit(0);
    return;
  }

  const r = rows[0];
  const deposited = String(r.team_total_deposited ?? '0');
  const withdrawn = String(r.team_total_withdrawn ?? '0');
  const retained = String(r.team_retained ?? '0');

  console.log('总充值 (team_total_deposited, 18位):', deposited);
  console.log('总提现 (team_total_withdrawn, 18位):', withdrawn);
  console.log('总留存 (充值-提现):', retained);
  console.log('');
  console.log('折合 USDT 显示:');
  console.log('  总充值:', from18(deposited).toLocaleString('en-US', { maximumFractionDigits: 2 }), 'USDT');
  console.log('  总提现:', from18(withdrawn).toLocaleString('en-US', { maximumFractionDigits: 2 }), 'USDT');
  console.log('  总留存:', from18(retained).toLocaleString('en-US', { maximumFractionDigits: 2 }), 'USDT');
  console.log('\n说明：总留存 = 团队总充值 - 团队总提现。若为 0，多为历史质押/提现发生在上线前未计入，需跑回填脚本 backfill-team-retained.ts。');
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
