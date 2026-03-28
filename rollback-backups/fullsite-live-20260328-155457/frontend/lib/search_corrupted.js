const fs = require('fs');
const lines = fs.readFileSync('i18n.ts', 'utf8').split('\n');

console.log('Searching for corrupted lines...\n');
let count = 0;
lines.forEach((line, i) => {
  if (line.includes('\uFFFD') || /[^\x00-\x7F\u4e00-\u9fa5]/.test(line)) {
    if (line.includes(':') && count < 30) {
      console.log(`Line ${i + 1}: ${line.trim().substring(0, 80)}`);
      count++;
    }
  }
});
console.log(`\nTotal corrupted lines found: ${count}`);
