import Database from 'better-sqlite3';
import { getPool } from '../config/database.config';
import logger from '../utils/logger';

async function migrateSQLiteToMySQL() {
  const sqliteDb = new Database('./database/events.db', { readonly: true });
  const pool = getPool();
  
  try {
    logger.info('Starting SQLite to MySQL migration...');
    
    // 1. Migrate stake_events
    const stakes = sqliteDb.prepare('SELECT * FROM stake_events').all() as any[];
    logger.info(`Migrating ${stakes.length} stake events...`);
    for (const stake of stakes) {
      await pool.query(
        `INSERT IGNORE INTO stake_events (user_address, amount, referrer_address, stake_id, timestamp, lock_period, block_number, tx_hash)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [stake.user_address, stake.amount, stake.referrer_address, stake.stake_id, stake.timestamp, stake.lock_period, stake.block_number, stake.tx_hash]
      );
    }
    
    // 2. Migrate withdrawal_events
    const withdrawals = sqliteDb.prepare('SELECT * FROM withdrawal_events').all() as any[];
    logger.info(`Migrating ${withdrawals.length} withdrawal events...`);
    for (const w of withdrawals) {
      await pool.query(
        `INSERT IGNORE INTO withdrawal_events (user_address, amount, stake_id, timestamp, block_number, tx_hash)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [w.user_address, w.amount, w.stake_id, w.timestamp, w.block_number, w.tx_hash]
      );
    }
    
    // 3. Migrate referral_bindings
    const bindings = sqliteDb.prepare('SELECT * FROM referral_bindings').all() as any[];
    logger.info(`Migrating ${bindings.length} referral bindings...`);
    for (const b of bindings) {
      await pool.query(
        `INSERT IGNORE INTO referral_bindings (user_address, referrer_address, timestamp)
         VALUES (?, ?, ?)`,
        [b.user_address, b.referrer_address, b.timestamp]
      );
    }
    
    // 4. Migrate user_stats to users table
    const userStats = sqliteDb.prepare('SELECT * FROM user_stats').all() as any[];
    logger.info(`Migrating ${userStats.length} user stats...`);
    for (const u of userStats) {
      await pool.query(
        `INSERT IGNORE INTO users (address, referrer_address, node_level, total_stake, team_volume, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [u.user_address, u.referrer_address || null, u.node_level || 1, u.total_staked || 0, u.team_volume || 0, u.first_stake_time || Date.now(), Date.now()]
      );
    }
    
    logger.info('✅ Migration completed successfully!');
    
  } catch (error) {
    logger.error('Migration failed:', error);
    throw error;
  } finally {
    sqliteDb.close();
  }
}

migrateSQLiteToMySQL().then(() => {
  process.exit(0);
}).catch((error) => {
  logger.error('Fatal error:', error);
  process.exit(1);
});
