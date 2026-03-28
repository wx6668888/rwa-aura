const Database = require('better-sqlite3');
const db = new Database('database/events.db');

// 获取所有表
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();

console.log('=== SQLite Tables ===');
tables.forEach(t => {
  console.log(`\n--- Table: ${t.name} ---`);
  const info = db.prepare(`PRAGMA table_info(${t.name})`).all();
  info.forEach(col => {
    console.log(`  ${col.name}: ${col.type}`);
  });
});

db.close();
