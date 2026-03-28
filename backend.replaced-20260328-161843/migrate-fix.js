const Database = require('better-sqlite3');
const mysql = require('mysql2/promise');

async function migrate() {
  const sqliteDb = new Database('./database/events.db', { readonly: true });
  const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'wuxi3211',
    database: 'rwa_protocol'
  });
  
  try {
    // 清空并重新迁移 stake_events
    await pool.query('DELETE FROM stake_events');
    
    const stakes = sqliteDb.prepare('SELECT * FROM stake_events').all();
    console.log(`Migrating ${stakes.length} stake events...`);
    
    for (const s of stakes) {
      await pool.query(
        `INSERT INTO stake_events (event_type, user_address, amount, referrer_address, stake_id, lock_period, block_number, tx_hash, timestamp)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [s.event_type, s.user_address, s.amount, s.referrer, s.stake_id, s.lock_period, s.block_number, s.transaction_hash, s.timestamp]
      );
    }
    
    console.log('✅ Migration completed!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    sqliteDb.close();
    await pool.end();
  }
}

migrate();
