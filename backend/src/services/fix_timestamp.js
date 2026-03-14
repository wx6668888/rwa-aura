const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'EventMonitor.ts');
let content = fs.readFileSync(filePath, 'utf8');

// 修复 handleWithdrawalRequested - 添加 timestamp 解构
content = content.replace(
  /private async handleWithdrawalRequested\(event: ethers\.EventLog\): Promise<void> \{\s+const \{ user, amount \} = event\.args as any;/,
  `private async handleWithdrawalRequested(event: ethers.EventLog): Promise<void> {
        const { user, amount, timestamp } = event.args as any;`
);

// 修复 handleRWARewardWithdrawal - 添加 timestamp 解构
content = content.replace(
  /private async handleRWARewardWithdrawal\(event: ethers\.EventLog\): Promise<void> \{\s+const \{ user, amount \} = event\.args as any;/,
  `private async handleRWARewardWithdrawal(event: ethers.EventLog): Promise<void> {
        const { user, amount, timestamp } = event.args as any;`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed timestamp variables');
