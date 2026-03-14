const mysql = require('mysql2/promise');

(async () => {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'wuxi3211',
    database: 'rwa_protocol'
  });

  try {
    console.log('迁移RWA质押数据...\n');

    const [rwaStakes] = await conn.query(`
      SELECT user_address, total_staked_rwa, first_stake_time 
      FROM rwa_stakes 
      WHERE LOWER(user_address) = LOWER('0xCD5b97505499B1575e481446384430bb159851b6')
    `);

    console.log(`找到 ${rwaStakes.length} 条RWA质押记录`);

    for (const stake of rwaStakes) {
      const timestamp = stake.first_stake_time;
      const stakeDate = new Date(timestamp * 1000).toISOString();

      await conn.query(`
        INSERT INTO balance_snapshots 
        (user_address, asset_type, balance_type, amount, lock_end_time, timestamp, event_type)
        VALUES (?, 'RWA', 'flexible', ?, NULL, ?, 'stake')
      `, [stake.user_address.toLowerCase(), stake.total_staked_rwa, timestamp]);

      console.log(`✓ RWA质押: ${Number(stake.total_staked_rwa)/1e18} RWA, 时间${stakeDate}`);
    }

    console.log('\n✅ RWA数据迁移完成！');
  } catch (err) {
    console.error('❌ 失败:', err.message);
  } finally {
    await conn.end();
  }
})();
