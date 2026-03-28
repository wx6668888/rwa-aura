const mysql = require('mysql2/promise');

(async () => {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'wuxi3211',
    database: 'rwa_protocol'
  });

  try {
    // 查看所有表
    const [tables] = await connection.execute('SHOW TABLES');
    console.log('=== 数据库中的表 ===');
    tables.forEach(t => console.log('-', Object.values(t)[0]));

  } catch (err) {
    console.error('查询失败:', err.message);
  } finally {
    await connection.end();
  }
})();
