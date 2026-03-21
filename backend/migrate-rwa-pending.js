const mysql = require('mysql2/promise');
const fs = require('fs');

async function migrate() {
  const pool = mysql.createPool({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'wuxi3211',
    database: 'rwa_protocol',
    multipleStatements: true
  });

  const sql = fs.readFileSync('migrations/add_rwa_pending_fields.sql', 'utf8');
  
  console.log('🔄 执行数据库迁移...\n');
  
  try {
    await pool.query(sql);
    console.log('✅ 迁移成功！');
    console.log('   - 添加 usdt_rwa_pending 字段');
    console.log('   - 添加 rwa_rwa_pending 字段');
    console.log('   - 添加 rwa_pending_updated_at 字段');
    console.log('   - 创建索引');
  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('⚠️  字段已存在，跳过迁移');
    } else {
      throw error;
    }
  }
  
  await pool.end();
}

migrate().catch(console.error);
