const mysql = require('mysql2/promise');

(async () => {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'wuxi3211',
    database: 'rwa_protocol'
  });

  try {
    await connection.query(`ALTER TABLE balance_snapshots MODIFY COLUMN amount VARCHAR(78) NOT NULL`);
    console.log('✅ 表结构修改成功');
  } catch (err) {
    console.error('❌ 修改失败:', err.message);
  } finally {
    await connection.end();
  }
})();
