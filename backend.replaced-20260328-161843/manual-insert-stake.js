const mysql = require('mysql2/promise');
const ethers = require('ethers');

(async () => {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'wuxi3211',
    database: 'rwa_protocol'
  });

  try {
    const provider = new ethers.JsonRpcProvider('https://bsc-testnet-rpc.publicnode.com');
    const txHash = '0x054cee5eed7f40d05e045eb5a61f8cb2a0ec10d263a00d49b4e41939660cdec9';
    
    console.log('获取交易收据...');
    const receipt = await provider.getTransactionReceipt(txHash);
    
    if (!receipt) {
      console.log('❌ 交易不存在');
      return;
    }
    
    console.log(`区块: ${receipt.blockNumber}`);
    console.log(`状态: ${receipt.status === 1 ? '✅成功' : '❌失败'}`);
    
    // 解析StakeEvent
    const stakeEventAbi = 'event StakeEvent(address indexed user, uint256 amount, address indexed referrer, uint256 stakeId, uint256 timestamp, uint256 lockPeriod)';
    const iface = new ethers.Interface([stakeEventAbi]);
    
    for (const log of receipt.logs) {
      try {
        const parsed = iface.parseLog(log);
        if (parsed && parsed.name === 'StakeEvent') {
          console.log('\n找到StakeEvent:');
          console.log('用户:', parsed.args.user);
          console.log('金额:', ethers.formatUnits(parsed.args.amount, 18), 'USDT');
          console.log('锁仓:', parsed.args.lockPeriod.toString(), '天');
          console.log('StakeID:', parsed.args.stakeId.toString());
          console.log('时间戳:', parsed.args.timestamp.toString());
          
          // 插入数据库
          await conn.query(
            `INSERT INTO stake_events (stake_id, user_address, amount, lock_period, event_type, tx_hash, block_number, timestamp)
             VALUES (?, ?, ?, ?, 'USDT', ?, ?, ?)`,
            [
              parsed.args.stakeId.toString(),
              parsed.args.user.toLowerCase(),
              parsed.args.amount.toString(),
              parsed.args.lockPeriod.toString(),
              txHash,
              receipt.blockNumber,
              parsed.args.timestamp.toString()
            ]
          );
          
          console.log('\n✅ 已插入数据库');
        }
      } catch (e) {
        // 忽略非StakeEvent日志
      }
    }
  } catch (err) {
    console.error('❌ 错误:', err.message);
  } finally {
    await conn.end();
  }
})();
