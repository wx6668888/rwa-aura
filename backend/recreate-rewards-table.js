const mysql = require('mysql2/promise');

(async () => {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'wuxi3211',
    database: 'rwa_protocol'
  });

  try {
    // 删除旧表
    await connection.execute('DROP TABLE IF EXISTS rewards');
    
    // 创建新表
    await connection.execute(`
      CREATE TABLE rewards (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_address VARCHAR(42) NOT NULL,
        reward_type VARCHAR(20) NOT NULL,
        token_type VARCHAR(10) NOT NULL,
        amount DECIMAL(36,18) NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_address (user_address),
        INDEX idx_timestamp (timestamp)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    
    console.log('✅ rewards 表重新创建成功！');
  } catch (err) {
    console.error('❌ 创建失败:', err.message);
  } finally {
    await connection.end();
  }
})();
