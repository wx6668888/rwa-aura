const Database = require('better-sqlite3');
const db = new Database('./database/events.db', { readonly: true });

console.log('Tables in SQLite database:');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
tables.forEach(t => {
  console.log(`\n=== ${t.name} ===`);
  const count = db.prepare(`SELECT COUNT(*) as count FROM ${t.name}`).get();
  console.log(`Rows: ${count.count}`);
});

db.close();
