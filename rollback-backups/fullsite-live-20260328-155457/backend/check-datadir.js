const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
  const conn = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'wuxi3211'
  });
  
  const [rows] = await conn.query('SHOW VARIABLES LIKE "datadir"');
  console.log('MySQL数据文件位置:');
  console.log(rows[0].Value);
  
  await conn.end();
})();
