const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'i18n.ts');
let lines = fs.readFileSync(filePath, 'utf8').split('\n');

// Fix line 550 and 560
lines[549] = "    stakeNow: 'Stake RWA to Earn',";
lines[559] = "    goStake: 'Go Stake',";

fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
console.log('Fixed lines 550 and 560');
