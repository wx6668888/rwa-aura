const mysql = require('mysql2/promise');
const ethers = require('ethers');

(async () => {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'wuxi3211',
    database: 'rwa_protocol'
  });

  const provider = new ethers.JsonRpcProvider('https://bsc-testnet-rpc.publicnode.com');
  const txHash = '0x054cee5eed7f40d05e045eb5a61f8cb2a0ec10d263a00d49b4e41939660cdec9';
  
  console.log('获取交易收据...');
  const receipt = await provider.getTransactionReceipt(txHash);
  const block = await provider.getBlock(receipt.blockNumber);
  
  const abi = ['event StakeEvent(address indexed user, uint256 amount, address indexed referrer, uint256 stakeId, uint256 timestamp, uint256 lockPeriod)'];
  const iface = new ethers.Interface(abi);
  
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() === '0xb4fd045003c402be6ebaaeecfd27105343cb7b3be') {
      try {
        const parsed = iface.parseLog({ topics: log.topics, data: log.data });
        if (parsed && parsed.name === 'StakeEvent') {
          const amount = parsed.args.amount.toString();
          const user = parsed.args.user.toLowerCase();
          const stakeId = parsed.args.stakeId.toString();
          const lockPeriod = parsed.args.lockPeriod.toString();
          const timestamp = parsed.args.timestamp.toString();
          
          console.log('\n✅ 找到StakeEvent:');
          console.log('用户:', user);
          console.log('金额:', ethers.formatUnits(amount, 18), 'USDT');
          console.log('锁仓:', lockPeriod, '天');
          console.log('StakeID:', stakeId);
          console.log('时间戳:', timestamp);
          console.log('区块:', receipt.blockNumber);
          
          // 插入数据库
          await conn.query(
            `INSERT INTO stake_events (stake_id, user_address, amount, lock_period, event_type, tx_hash, block_number, timestamp)
             VALUES (?, ?, ?, ?, 'USDT', ?, ?, ?)`,
            [stakeId, user, amount, lockPeriod, txHash, receipt.blockNumber, timestamp]
          );
          
          console.log('\n✅ 已插入数据库');
        }
      } catch (e) {
        // 忽略
      }
    }
  }
  
  await conn.end();
})();
