const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'EventMonitor.ts');
let content = fs.readFileSync(filePath, 'utf8');

// 替换所有 withdrawal_log 为 withdrawal_events
content = content.replace(/withdrawal_log/g, 'withdrawal_events');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed: withdrawal_log -> withdrawal_events');
