const mysql = require('mysql2/promise');

(async () => {
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'wuxi3211',
    database: 'rwa_protocol'
  });

  try {
    console.log('开始迁移现有用户数据到快照表...\n');

    // 1. 迁移USDT质押记录
    console.log('1. 迁移USDT质押记录...');
    const [usdtStakes] = await connection.query(`
      SELECT user_address, amount, lock_period, timestamp, tx_hash
      FROM stake_events
      WHERE event_type = 'USDT' AND amount > 0
      ORDER BY timestamp ASC
    `);

    for (const stake of usdtStakes) {
      const balanceType = stake.lock_period === 0 ? 'flexible' : `locked_${stake.lock_period}`;
      const lockEndTime = stake.lock_period > 0 ? stake.timestamp + stake.lock_period * 86400 : null;
      
      await connection.query(`
        INSERT INTO balance_snapshots 
        (user_address, asset_type, balance_type, amount, timestamp, event_type, lock_end_time, tx_hash)
        VALUES (?, 'USDT', ?, ?, ?, 'stake', ?, ?)
      `, [stake.user_address, balanceType, stake.amount, stake.timestamp, lockEndTime, stake.tx_hash]);
    }
    console.log(`✅ 迁移了 ${usdtStakes.length} 条USDT质押记录\n`);

    // 2. 迁移RWA质押记录
    console.log('2. 迁移RWA质押记录...');
    const [rwaStakes] = await connection.query(`
      SELECT user_address, amount, lock_period, timestamp, tx_hash
      FROM stake_events
      WHERE event_type = 'RWA' AND amount > 0
      ORDER BY timestamp ASC
    `);

    for (const stake of rwaStakes) {
      const balanceType = stake.lock_period === 0 ? 'flexible' : `locked_${stake.lock_period}`;
      const lockEndTime = stake.lock_period > 0 ? stake.timestamp + stake.lock_period * 86400 : null;
      
      await connection.query(`
        INSERT INTO balance_snapshots 
        (user_address, asset_type, balance_type, amount, timestamp, event_type, lock_end_time, tx_hash)
        VALUES (?, 'RWA', ?, ?, ?, 'stake', ?, ?)
      `, [stake.user_address, balanceType, stake.amount, stake.timestamp, lockEndTime, stake.tx_hash]);
    }
    console.log(`✅ 迁移了 ${rwaStakes.length} 条RWA质押记录\n`);

    console.log('✅ 数据迁移完成！');
  } catch (err) {
    console.error('❌ 迁移失败:', err.message);
  } finally {
    await connection.end();
  }
})();
