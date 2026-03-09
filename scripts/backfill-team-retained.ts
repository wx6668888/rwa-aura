/**
 * 回填总留存相关字段：从 stakes 表补算 team_total_deposited，从 withdrawal_log 补算 team_total_withdrawn。
 * 总留存功能上线前的历史质押/提现不会自动写入这两列，跑本脚本可一次性按历史数据补全。
 *
 * 使用方式：cd backend && npx ts-node ../scripts/backfill-team-retained.ts
 * 注意：会先把所有用户的 team_total_deposited、team_total_withdrawn 置 0，再按 stakes 与 withdrawal_log 重新累加。
 */
import { getPool } from '../backend/src/config/database.config';
import type { RowDataPacket } from 'mysql2';

const pool = getPool();

function from18(s: string): number {
  return Number(BigInt(s)) / 1e18;
}

async function main() {
  console.log('\n=== 回填 team_total_deposited / team_total_withdrawn ===\n');

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    console.log('1. 将 users 表中 team_total_deposited、team_total_withdrawn 置 0...');
    await conn.query(
      'UPDATE users SET team_total_deposited = 0, team_total_withdrawn = 0'
    );

    console.log('2. 从 stakes 表回填 team_total_deposited（每笔质押按 USDT 等值累加到本人及所有上级）...');
    const [stakes] = await conn.query<RowDataPacket[]>(
      'SELECT user_address, amount, asset_type FROM stakes ORDER BY id'
    );
    let depositedCount = 0;
    for (const row of stakes || []) {
      const user = (row as any).user_address;
      const amount = String((row as any).amount ?? '0');
      const assetType = (row as any).asset_type || 'USDT';
      const usdtEquiv = assetType === 'RWA'
        ? (BigInt(amount) * 85n / 100n).toString()
        : amount;
      if (BigInt(usdtEquiv) === 0n) continue;
      await conn.query('CALL sp_update_team_deposited(?, ?)', [user, usdtEquiv]);
      depositedCount++;
    }
    console.log(`   已处理 ${depositedCount} 笔质押。`);

    console.log('3. 从 withdrawal_log 表回填 team_total_withdrawn...');
    const [withdrawals] = await conn.query<RowDataPacket[]>(
      'SELECT user_address, amount_usdt_equiv FROM withdrawal_log'
    );
    let withdrawnCount = 0;
    for (const row of withdrawals || []) {
      const user = (row as any).user_address;
      const amount = String((row as any).amount_usdt_equiv ?? '0');
      if (BigInt(amount) === 0n) continue;
      await conn.query('CALL sp_update_team_withdrawn(?, ?)', [user, amount]);
      withdrawnCount++;
    }
    console.log(`   已处理 ${withdrawnCount} 笔提现记录。`);

    await conn.commit();
    console.log('\n回填完成。可运行 scripts/query-user-retained.ts <地址> 查看某用户的总充值/总提现/总留存。');
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
