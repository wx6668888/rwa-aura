import { query } from './src/config/database.config';

async function migrate() {
  const sql = `
    CREATE TABLE IF NOT EXISTS approval_events (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_address VARCHAR(42) NOT NULL,
      spender_address VARCHAR(42) NOT NULL,
      amount VARCHAR(78) NOT NULL,
      tx_hash VARCHAR(66) NOT NULL UNIQUE,
      block_number BIGINT NOT NULL,
      timestamp BIGINT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_user (user_address),
      INDEX idx_timestamp (timestamp)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;
  
  await query(sql);
  console.log('✅ approval_events table created');
  process.exit(0);
}

migrate().catch(console.error);
