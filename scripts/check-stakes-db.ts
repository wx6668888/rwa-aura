import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'rwa_user',
    password: process.env.DB_PASSWORD || 'rwa_password',
    database: process.env.DB_NAME || 'rwa_protocol',
  });

  console.log('查询最近的质押记录...\n');
  
  const [rows] = await connection.execute(
    'SELECT id, user_address, amount, asset_type, lock_period, tx_hash, timestamp FROM stakes ORDER BY timestamp DESC LIMIT 10'
  );
  
  console.table(rows);
  
  await connection.end();
}

main().catch(console.error);
