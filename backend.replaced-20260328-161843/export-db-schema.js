const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
  const conn = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'wuxi3211',
    database: 'rwa_protocol'
  });
  
  // 获取所有表
  const [tables] = await conn.query('SHOW TABLES');
  
  console.log('=== RWA Protocol 数据库结构 ===\n');
  
  for (const table of tables) {
    const tableName = Object.values(table)[0];
    console.log(`\n## 表: ${tableName}`);
    
    // 获取表的字段信息
    const [columns] = await conn.query(`SHOW FULL COLUMNS FROM ??`, [tableName]);
    
    console.log('| 字段名 | 类型 | 允许NULL | 默认值 | 注释 |');
    console.log('|--------|------|----------|--------|------|');
    
    columns.forEach(col => {
      const name = col.Field;
      const type = col.Type;
      const nullable = col.Null === 'YES' ? '是' : '否';
      const defaultVal = col.Default === null ? 'NULL' : col.Default;
      const comment = col.Comment || '';
      
      console.log(`| ${name} | ${type} | ${nullable} | ${defaultVal} | ${comment} |`);
    });
  }
  
  await conn.end();
})();
