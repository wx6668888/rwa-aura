const Database = require('better-sqlite3');
const mysql = require('mysql2/promise');

async function migrateUserStakeOrders() {
  const sqlite = new Database('database/events.db');
  const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'wuxi3211',
    database: 'rwa_protocol'
  });

  try {
    const orders = sqlite.prepare('SELECT * FROM user_stake_orders').all();
    console.log(`Found ${orders.length} stake orders`);

    for (const o of orders) {
      await pool.query(
        `INSERT INTO user_stake_orders 
         (user_address, stake_id, asset_type, amount, lock_period, lock_start_time, 
          lock_end_time, status, is_flexible, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          o.user_address,
          o.stake_id,
          o.asset_type,
          o.amount,
          o.lock_period,
          o.lock_start_time,
          o.lock_end_time,
          o.status,
          o.is_flexible,
          o.created_at,
          o.updated_at
        ]
      );
      console.log(`✓ Migrated order: ${o.stake_id}`);
    }

    console.log('✅ Migration completed!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    sqlite.close();
    await pool.end();
  }
}

migrateUserStakeOrders();
