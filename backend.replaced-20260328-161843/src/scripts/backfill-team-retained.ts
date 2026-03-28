/**
 * 回填总留存：从 stakes 补算 team_total_deposited，从 withdrawal_log 补算 team_total_withdrawn。
 * 运行：cd backend && npx ts-node src/scripts/backfill-team-retained.ts
 */
import { getPool } from '../config/database.config';

const pool = getPool();

async function main() {
  console.log('\n=== 回填 team_total_deposited / team_total_withdrawn ===\n');

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    console.log('1. 将 users 表中 team_total_deposited、team_total_withdrawn 置 0...');
    await conn.query(
      'UPDATE users SET team_total_deposited = 0, team_total_withdrawn = 0'
    );

    console.log('2. 从 stakes 表回填 team_total_deposited...');
    const [stakes] = await conn.query<any[]>(
      'SELECT user_address, amount, asset_type FROM stakes ORDER BY id'
    );
    let depositedCount = 0;
    for (const row of stakes || []) {
      const user = row.user_address;
      const amount = String(row.amount ?? '0');
      const assetType = row.asset_type || 'USDT';
      const usdtEquiv = assetType === 'RWA'
        ? (BigInt(amount) * 85n / 100n).toString()
        : amount;
      if (BigInt(usdtEquiv) === 0n) continue;
      await conn.query('CALL sp_update_team_deposited(?, ?)', [user, usdtEquiv]);
      depositedCount++;
    }
    console.log('   已处理 ' + depositedCount + ' 笔质押。');

    console.log('3. 从 withdrawal_log 表回填 team_total_withdrawn...');
    const [withdrawals] = await conn.query<any[]>(
      'SELECT user_address, amount_usdt_equiv FROM withdrawal_log'
    );
    let withdrawnCount = 0;
    for (const row of withdrawals || []) {
      const user = row.user_address;
      const amount = String(row.amount_usdt_equiv ?? '0');
      if (BigInt(amount) === 0n) continue;
      await conn.query('CALL sp_update_team_withdrawn(?, ?)', [user, amount]);
      withdrawnCount++;
    }
    console.log('   已处理 ' + withdrawnCount + ' 笔提现记录。');

    await conn.commit();
    console.log('\n回填完成。刷新 http://localhost:3000 查看总留存。');
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
    process.exit(0);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
