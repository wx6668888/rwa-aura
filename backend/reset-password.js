const mysql = require('mysql2/promise');

(async () => {
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root'
  });

  try {
    await connection.query(`FLUSH PRIVILEGES`);
    await connection.query(`ALTER USER 'root'@'localhost' IDENTIFIED BY 'wuxi3211'`);
    await connection.query(`FLUSH PRIVILEGES`);
    console.log('✅ 密码已重置为 wuxi3211');
  } catch (err) {
    console.error('❌ 失败:', err.message);
  } finally {
    await connection.end();
  }
})();
