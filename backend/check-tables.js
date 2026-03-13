const db = require('better-sqlite3')('database/events.db');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('SQLite Tables:', tables.map(t => t.name).join(', '));
