const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'EventMonitor.ts');
let content = fs.readFileSync(filePath, 'utf8');

// 1. 修改函数签名
const oldSignature = `private async recordTeamWithdrawnAndSync(
        userAddress: string,
        txHash: string,
        amountUsdtEquiv: string,
        _token: string
    ): Promise<void>`;

const newSignature = `private async recordTeamWithdrawnAndSync(
        userAddress: string,
        txHash: string,
        amountUsdtEquiv: string,
        _token: string,
        eventType: string,
        timestamp: number,
        blockNumber: number
    ): Promise<void>`;

content = content.replace(oldSignature, newSignature);

// 2. 修改INSERT语句
const oldInsert = `'INSERT INTO withdrawal_events (tx_hash, user_address, amount_usdt_equiv) VALUES (?, ?, ?)',
                [txHash, userAddress, amountUsdtEquiv]`;

const newInsert = `'INSERT INTO withdrawal_events (user_address, event_type, amount, stake_id, timestamp, block_number, tx_hash) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [userAddress, eventType, amountUsdtEquiv, 0, timestamp, blockNumber, txHash]`;

content = content.replace(oldInsert, newInsert);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed function signature and INSERT statement');
