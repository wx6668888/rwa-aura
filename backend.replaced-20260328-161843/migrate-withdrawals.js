const Database = require('better-sqlite3');
const mysql = require('mysql2/promise');

async function migrateWithdrawals() {
  const sqlite = new Database('database/events.db');
  const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'wuxi3211',
    database: 'rwa_protocol'
  });

  try {
    // 清空MySQL提现表
    await pool.query('DELETE FROM withdrawal_events');
    console.log('Cleared withdrawal_events table');

    // 从SQLite读取
    const withdrawals = sqlite.prepare('SELECT * FROM withdrawal_events').all();
    console.log(`Found ${withdrawals.length} withdrawals in SQLite`);

    // 插入到MySQL
    for (const w of withdrawals) {
      await pool.query(
        `INSERT INTO withdrawal_events 
         (user_address, event_type, amount, stake_id, timestamp, block_number, tx_hash)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          w.user_address,
          w.event_type,
          w.amount,
          w.stake_id || 0,
          w.timestamp,
          w.block_number,
          w.transaction_hash
        ]
      );
      console.log(`✓ Migrated withdrawal: ${w.event_type} ${w.amount} wei`);
    }

    console.log('✅ Withdrawal migration completed!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    sqlite.close();
    await pool.end();
  }
}

migrateWithdrawals();
