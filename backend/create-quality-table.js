const { getPool } = require('./dist/config/database.config');

async function createQualityScoreTable() {
  const pool = getPool();
  
  const sql = `
    CREATE TABLE IF NOT EXISTS referral_quality_score (
      id INT PRIMARY KEY AUTO_INCREMENT,
      user_address VARCHAR(42) NOT NULL UNIQUE,
      total_referrals INT DEFAULT 0,
      valid_referrals INT DEFAULT 0,
      total_stake_amount DECIMAL(20,2) DEFAULT 0,
      emergency_withdrawals INT DEFAULT 0,
      referral_count_score DECIMAL(5,2) DEFAULT 0,
      valid_rate_score DECIMAL(5,2) DEFAULT 0,
      stake_amount_score DECIMAL(5,2) DEFAULT 0,
      emergency_penalty DECIMAL(5,2) DEFAULT 0,
      total_score DECIMAL(5,2) DEFAULT 0,
      grade VARCHAR(10) DEFAULT 'C',
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_user (user_address),
      INDEX idx_score (total_score DESC)
    )
  `;
  
  await pool.query(sql);
  console.log('✅ Table created!');
  process.exit(0);
}

createQualityScoreTable();
