const mysql = require('mysql2/promise');

(async () => {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'wuxi3211',
    database: 'rwa_protocol'
  });

  try {
    // 添加 token_type 字段
    await connection.execute(`
      ALTER TABLE rewards 
      ADD COLUMN token_type VARCHAR(10) NOT NULL DEFAULT 'RWA' AFTER reward_type
    `);
    console.log('✅ 已添加 token_type 字段！');
  } catch (err) {
    console.error('❌ 修改失败:', err.message);
  } finally {
    await connection.end();
  }
})();
