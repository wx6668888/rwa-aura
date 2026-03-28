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
    const userStats = sqliteDb.prepare('SELECT * FROM user_stats').all();
    console.log(`Migrating ${userStats.length} user stats...`);
    
    for (const u of userStats) {
      await pool.query(
        `INSERT INTO user_stats (user_address, personal_usdt_staked, personal_rwa_staked, personal_total_usdt, direct_referrals, team_volume_usdt, team_retained_usdt, current_level, effective_level, last_calculated_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
         personal_usdt_staked=VALUES(personal_usdt_staked),
         personal_rwa_staked=VALUES(personal_rwa_staked),
         personal_total_usdt=VALUES(personal_total_usdt),
         direct_referrals=VALUES(direct_referrals),
         team_volume_usdt=VALUES(team_volume_usdt),
         team_retained_usdt=VALUES(team_retained_usdt),
         current_level=VALUES(current_level),
         effective_level=VALUES(effective_level),
         last_calculated_at=VALUES(last_calculated_at),
         updated_at=VALUES(updated_at)`,
        [u.user_address, u.personal_usdt_staked, u.personal_rwa_staked, u.personal_total_usdt, u.direct_referrals, u.team_volume_usdt, u.team_retained_usdt, u.current_level, u.effective_level, u.last_calculated_at, u.updated_at]
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
