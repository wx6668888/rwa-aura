const mysql = require('mysql2/promise');
const fs = require('fs');

(async () => {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'wuxi3211',
    database: 'rwa_protocol',
    multipleStatements: true
  });

  try {
    const sql = fs.readFileSync('database/create_yield_tables.sql', 'utf8');
    await connection.query(sql);
    console.log('✅ 表创建成功！');
  } catch (err) {
    console.error('❌ 创建失败:', err.message);
  } finally {
    await connection.end();
  }
})();
