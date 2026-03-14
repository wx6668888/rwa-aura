const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'EventMonitor.ts');
let content = fs.readFileSync(filePath, 'utf8');

// 修复INSERT语句
const oldInsert = `'INSERT INTO withdrawal_events (tx_hash, user_address, amount_usdt_equiv) VALUES (?, ?, ?)'`;
const newInsert = `'INSERT INTO withdrawal_events (user_address, event_type, amount, stake_id, timestamp, block_number, tx_hash) VALUES (?, ?, ?, ?, ?, ?, ?)'`;

content = content.replace(oldInsert, newInsert);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed INSERT statement');
