const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'EventMonitor.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Step 1: 替换表名 withdrawal_log -> withdrawal_events
content = content.replace(/withdrawal_log/g, 'withdrawal_events');

// Step 2: 修改函数签名
const oldSig = `private async recordTeamWithdrawnAndSync(
        userAddress: string,
        txHash: string,
        amountUsdtEquiv: string,
        _token: string
    ): Promise<void>`;

const newSig = `private async recordTeamWithdrawnAndSync(
        userAddress: string,
        txHash: string,
        amountUsdtEquiv: string,
        _token: string,
        eventType: string,
        timestamp: number,
        blockNumber: number
    ): Promise<void>`;

content = content.replace(oldSig, newSig);

// Step 3: 修改INSERT语句
content = content.replace(
  /'INSERT INTO withdrawal_events \(tx_hash, user_address, amount_usdt_equiv\) VALUES \(\?, \?, \?\)',\s+\[txHash, userAddress, amountUsdtEquiv\]/,
  `'INSERT INTO withdrawal_events (user_address, event_type, amount, stake_id, timestamp, block_number, tx_hash) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [userAddress, eventType, amountUsdtEquiv, 0, timestamp, blockNumber, txHash]`
);

// Step 4: 修改 handleRewardWithdrawal - 添加 timestamp
content = content.replace(
  /private async handleRewardWithdrawal\(event: ethers\.EventLog\): Promise<void> \{\s+const \{ user, amount \} = event\.args as any;/,
  `private async handleRewardWithdrawal(event: ethers.EventLog): Promise<void> {
        const { user, amount, timestamp } = event.args as any;`
);

// Step 5: 修改 handleRWARewardWithdrawal - 添加 timestamp
content = content.replace(
  /private async handleRWARewardWithdrawal\(event: ethers\.EventLog\): Promise<void> \{\s+const \{ user, amount \} = event\.args as any;/,
  `private async handleRWARewardWithdrawal(event: ethers.EventLog): Promise<void> {
        const { user, amount, timestamp } = event.args as any;`
);

// Step 6: 修改调用 - handleRewardWithdrawal
content = content.replace(
  /await this\.recordTeamWithdrawnAndSync\(user\.toLowerCase\(\), txHash, usdtEquiv, 'USDT'\);(\s+)await this\.syncUserState\(user\.toLowerCase\(\)\);/,
  `await this.recordTeamWithdrawnAndSync(user.toLowerCase(), txHash, usdtEquiv, 'USDT', 'WITHDRAWAL_REQUESTED', Number(timestamp), event.blockNumber);$1await this.syncUserState(user.toLowerCase());`
);

// Step 7: 修改调用 - handleRWARewardWithdrawal
content = content.replace(
  /await this\.recordTeamWithdrawnAndSync\(user\.toLowerCase\(\), txHash, usdtEquiv, 'USDT'\);(\s+)await this\.syncRWAStakeState\(user\.toLowerCase\(\)\);/,
  `await this.recordTeamWithdrawnAndSync(user.toLowerCase(), txHash, usdtEquiv, 'USDT', 'RWA_REWARD_WITHDRAWN', Number(timestamp), event.blockNumber);$1await this.syncRWAStakeState(user.toLowerCase());`
);

// Step 8: 修改调用 - handlePrincipalStateSync
content = content.replace(
  /await this\.recordTeamWithdrawnAndSync\(user, txHash, amountUsdtEquiv, 'USDT'\);(\s+)await this\.syncUserState\(user\);(\s+)await this\.syncRWAStakeState\(user\);/,
  `await this.recordTeamWithdrawnAndSync(user, txHash, amountUsdtEquiv, 'USDT', eventName, Number(args.timestamp || 0), event.blockNumber);$1await this.syncUserState(user);$2await this.syncRWAStakeState(user);`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ All fixes applied successfully');
