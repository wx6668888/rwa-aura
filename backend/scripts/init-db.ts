import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config();

async function initDatabase() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'rwa_user',
    password: process.env.DB_PASSWORD || 'rwa_password',
    database: process.env.DB_NAME || 'rwa_protocol',
  });

  console.log('创建 stake_events 表...');
  await connection.query(`
    CREATE TABLE IF NOT EXISTS stake_events (
      id INT AUTO_INCREMENT PRIMARY KEY,
      event_type VARCHAR(50) NOT NULL,
      user_address VARCHAR(42) NOT NULL,
      amount VARCHAR(78) NOT NULL,
      referrer VARCHAR(42),
      stake_id VARCHAR(100) NOT NULL,
      lock_period INT NOT NULL,
      block_number BIGINT NOT NULL,
      transaction_hash VARCHAR(66) NOT NULL,
      timestamp INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_user (user_address),
      INDEX idx_block (block_number),
      INDEX idx_tx (transaction_hash),
      UNIQUE KEY unique_event (transaction_hash, stake_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  console.log('创建 sync_status 表...');
  await connection.query(`
    CREATE TABLE IF NOT EXISTS sync_status (
      id INT PRIMARY KEY DEFAULT 1,
      last_synced_block BIGINT NOT NULL DEFAULT 0,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  console.log('初始化 sync_status...');
  await connection.query(`
    INSERT INTO sync_status (id, last_synced_block) VALUES (1, 0) ON DUPLICATE KEY UPDATE id=id
  `);

  console.log('✅ 数据库初始化完成');
  await connection.end();
}

initDatabase().catch(console.error);
