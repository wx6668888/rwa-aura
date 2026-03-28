const mysql = require('mysql2/promise');

(async () => {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'wuxi3211',
    database: 'rwa_protocol'
  });

  try {
    console.log('开始迁移数据到balance_snapshots...\n');

    // 1. 迁移USDT质押记录
    const [usdtStakes] = await conn.query(`
      SELECT user_address, amount, lock_period, timestamp 
      FROM stake_events 
      WHERE LOWER(user_address) = LOWER('0xCD5b97505499B1575e481446384430bb159851b6')
      ORDER BY timestamp
    `);

    console.log(`找到 ${usdtStakes.length} 条USDT质押记录`);

    for (const stake of usdtStakes) {
      const tsStr = String(stake.timestamp);
      const year = tsStr.substr(0, 4);
      const month = tsStr.substr(4, 2);
      const day = tsStr.substr(6, 2);
      const hour = tsStr.substr(8, 2);
      const min = tsStr.substr(10, 2);
      const sec = tsStr.substr(12, 2);
      const stakeDate = `${year}-${month}-${day} ${hour}:${min}:${sec}`;
      const timestamp = Math.floor(new Date(stakeDate).getTime() / 1000);

      const balanceType = stake.lock_period === 0 ? 'flexible' : `locked_${stake.lock_period}`;
      const lockEndTime = stake.lock_period === 0 ? null : timestamp + (stake.lock_period * 86400);

      await conn.query(`
        INSERT INTO balance_snapshots 
        (user_address, asset_type, balance_type, amount, lock_end_time, timestamp, event_type)
        VALUES (?, 'USDT', ?, ?, ?, ?, 'stake')
      `, [stake.user_address.toLowerCase(), balanceType, stake.amount, lockEndTime, timestamp]);

      console.log(`✓ USDT质押: ${Number(stake.amount)/1e18} USDT, 锁仓${stake.lock_period}天, 时间${stakeDate}`);
    }

    console.log('\n✅ 迁移完成！');
  } catch (err) {
    console.error('❌ 迁移失败:', err.message);
  } finally {
    await conn.end();
  }
})();
