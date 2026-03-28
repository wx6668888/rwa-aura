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
  
  const [cols] = await conn.query('SHOW COLUMNS FROM yield_settlements');
  console.log('yield_settlements表结构:');
  cols.forEach(c => console.log(`  ${c.Field} (${c.Type})`));
  
  await conn.end();
})();
