// 检查 user_stats 表数据
const mysql = require('mysql2/promise');

async function checkUserStats() {
  const pool = mysql.createPool({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'wuxi3211',
    database: 'rwa_protocol',
    waitForConnections: true,
    connectionLimit: 10,
  });

  try {
    // 1. 检查表是否存在
    const [tables] = await pool.query("SHOW TABLES LIKE 'user_stats'");
    console.log('✅ user_stats 表存在:', tables.length > 0);

    if (tables.length === 0) {
      console.log('❌ user_stats 表不存在');
      process.exit(1);
    }

    // 2. 检查数据量
    const [count] = await pool.query('SELECT COUNT(*) as total FROM user_stats');
    console.log('📊 user_stats 记录数:', count[0].total);

    // 3. 查看示例数据
    const [sample] = await pool.query('SELECT * FROM user_stats LIMIT 3');
    console.log('📝 示例数据:', JSON.stringify(sample, null, 2));

    // 4. 检查测试用户数据
    const testAddress = '0xCD5b97505499B1575e481446384430bb159851b6';
    const [testUser] = await pool.query(
      'SELECT * FROM user_stats WHERE LOWER(user_address) = LOWER(?)',
      [testAddress]
    );
    console.log(`\n🔍 测试用户 ${testAddress}:`, testUser.length > 0 ? '有数据' : '无数据');
    if (testUser.length > 0) {
      console.log(JSON.stringify(testUser[0], null, 2));
    }

  } catch (error) {
    console.error('❌ 错误:', error.message);
  } finally {
    await pool.end();
  }
}

checkUserStats();
