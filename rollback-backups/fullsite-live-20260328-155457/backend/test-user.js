const mysql = require('mysql2/promise');

(async () => {
  const conn = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'wuxi3211',
    database: 'rwa_protocol'
  });

  const [rows] = await conn.query(
    "SELECT * FROM users WHERE LOWER(address) = LOWER('0xcd5b97505499b1575e481446384430bb159851b6')"
  );
  
  console.log('User data:', JSON.stringify(rows, null, 2));
  await conn.end();
})();
