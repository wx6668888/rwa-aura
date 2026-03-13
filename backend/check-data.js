const Database = require('better-sqlite3');
const db = new Database('./database/events.db', { readonly: true });

console.log('=== Stake Events for 0xcc99... ===');
const stakes = db.prepare("SELECT * FROM stake_events WHERE LOWER(user_address) LIKE '%cc99%' LIMIT 3").all();
console.log(JSON.stringify(stakes, null, 2));

console.log('\n=== User Stats ===');
const userStats = db.prepare("SELECT * FROM user_stats WHERE LOWER(user_address) LIKE '%cc99%'").all();
console.log(JSON.stringify(userStats, null, 2));

console.log('\n=== Referral Bindings ===');
const bindings = db.prepare("SELECT * FROM referral_bindings WHERE LOWER(referrer_address) LIKE '%cc99%'").all();
console.log(JSON.stringify(bindings, null, 2));

db.close();
