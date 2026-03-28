const mysql = require('mysql2/promise');
const fs = require('fs');

(async () => {
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'wuxi3211',
    database: 'rwa_protocol',
    multipleStatements: true
  });

  try {
    console.log('执行数据库初始化...\n');
    
    const sql = fs.readFileSync('database/init_all_tables.sql', 'utf8');
    await connection.query(sql);
    
    console.log('✅ 数据库初始化完成');
  } catch (err) {
    console.error('❌ 失败:', err.message);
  } finally {
    await connection.end();
  }
})();
