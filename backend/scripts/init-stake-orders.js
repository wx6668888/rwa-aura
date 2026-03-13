const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '../database/events.db');
const db = new Database(dbPath);

// 读取并执行 SQL
const sql = fs.readFileSync(path.join(__dirname, '../database/user_stake_orders.sql'), 'utf8');
db.exec(sql);

console.log('✅ user_stake_orders 表创建成功');
db.close();
