const mysql = require('mysql2/promise');

(async () => {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'wuxi3211',
    database: 'rwa_protocol'
  });

  try {
    await connection.execute(`
      ALTER TABLE rewards 
      ADD COLUMN reward_type VARCHAR(20) NOT NULL DEFAULT 'daily_yield' AFTER user_address
    `);
    console.log('✅ rewards 表已添加 reward_type 字段！');
  } catch (err) {
    console.error('❌ 修改失败:', err.message);
  } finally {
    await connection.end();
  }
})();
