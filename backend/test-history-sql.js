const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
  const conn = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'wuxi3211',
    database: 'rwa_protocol'
  });

  const addr = '0xa941f4806e0e3ea7577aec6c015d6e9d91584638';
  
  const sql = `
    (SELECT id, 'stake' as type, event_type, amount, block_number, timestamp 
     FROM stake_events 
     WHERE LOWER(user_address) = LOWER(?))
    UNION ALL
    (SELECT id, 'withdrawal' as type, event_type, amount, block_number, timestamp 
     FROM withdrawal_events 
     WHERE LOWER(user_address) = LOWER(?))
    ORDER BY timestamp DESC LIMIT 5
  `;

  const [rows] = await conn.query(sql, [addr, addr]);
  
  console.log('SQL直接查询结果:');
  rows.forEach(r => {
    console.log('  type:', r.type, 'timestamp:', r.timestamp, 'event:', r.event_type);
  });

  await conn.end();
})();
