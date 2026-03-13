const fs = require('fs');
let lines = fs.readFileSync('i18n.ts', 'utf8').split('\n');
lines[563] = "    goStake: 'Go Stake',";
fs.writeFileSync('i18n.ts', lines.join('\n'), 'utf8');
console.log('Fixed line 564');
