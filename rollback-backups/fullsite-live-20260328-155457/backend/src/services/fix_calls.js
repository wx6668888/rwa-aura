const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'EventMonitor.ts');
let content = fs.readFileSync(filePath, 'utf8');

// 修复第1处调用 (handleWithdrawalRequested)
content = content.replace(
  /await this\.recordTeamWithdrawnAndSync\(user\.toLowerCase\(\), txHash, usdtEquiv, 'USDT'\);[\s\S]{0,50}await this\.syncUserState/,
  `await this.recordTeamWithdrawnAndSync(user.toLowerCase(), txHash, usdtEquiv, 'USDT', 'WITHDRAWAL_REQUESTED', Number(timestamp), event.blockNumber);
        await this.syncUserState`
);

// 修复第2处调用 (handleRWARewardWithdrawal)
content = content.replace(
  /await this\.recordTeamWithdrawnAndSync\(user\.toLowerCase\(\), txHash, usdtEquiv, 'USDT'\);[\s\S]{0,50}await this\.syncRWAStakeState/,
  `await this.recordTeamWithdrawnAndSync(user.toLowerCase(), txHash, usdtEquiv, 'USDT', 'RWA_REWARD_WITHDRAWN', Number(timestamp), event.blockNumber);
        await this.syncRWAStakeState`
);

// 修复第3处调用 (handlePrincipalStateSync)
content = content.replace(
  /await this\.recordTeamWithdrawnAndSync\(user, txHash, amountUsdtEquiv, 'USDT'\);[\s\S]{0,50}await this\.syncUserState\(user\);[\s\S]{0,50}await this\.syncRWAStakeState/,
  `await this.recordTeamWithdrawnAndSync(user, txHash, amountUsdtEquiv, 'USDT', eventName, Number(args.timestamp || 0), event.blockNumber);
        await this.syncUserState(user);
        await this.syncRWAStakeState`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed all 3 function calls');
