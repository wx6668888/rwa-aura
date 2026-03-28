const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../database/events.db');
const sqlPath = path.join(__dirname, '../database/user_stats.sql');

const db = new Database(dbPath);
const sql = fs.readFileSync(sqlPath, 'utf8');

db.exec(sql);
console.log('✅ user_stats 表创建成功！');
db.close();
