const Database = require('better-sqlite3');
const db = new Database('./database/events.db');

const tables = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`).all();

console.log('当前数据库表:');
tables.forEach(t => console.log('  -', t.name));

db.close();
