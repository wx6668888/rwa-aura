const ethers = require('ethers');
(async () => {
  const p = new ethers.JsonRpcProvider('https://bsc-testnet-rpc.publicnode.com');
  const r = await p.getTransactionReceipt('0x054cee5eed7f40d05e045eb5a61f8cb2a0ec10d263a00d49b4e41939660cdec9');
  
  const stakeEventAbi = 'event StakeEvent(address indexed user, uint256 amount, address indexed referrer, uint256 stakeId, uint256 timestamp, uint256 lockPeriod)';
  const iface = new ethers.Interface([stakeEventAbi]);
  
  console.log('解析StakingContract的日志:\n');
  
  for (let i = 0; i < r.logs.length; i++) {
    const log = r.logs[i];
    if (log.address.toLowerCase() === '0xb4fd045003c402be6ebaaeecfd27105343cb7b3be') {
      console.log(`Log ${i}:`);
      console.log('Topics:', log.topics);
      console.log('Data:', log.data);
      
      try {
        const parsed = iface.parseLog({ topics: log.topics, data: log.data });
        console.log('✅ 解析成功:', parsed.name);
        console.log('用户:', parsed.args.user);
        console.log('金额:', ethers.formatUnits(parsed.args.amount, 18));
        console.log('锁仓:', parsed.args.lockPeriod.toString());
        console.log('StakeID:', parsed.args.stakeId.toString());
        console.log('时间戳:', parsed.args.timestamp.toString());
      } catch (e) {
        console.log('❌ 解析失败:', e.message);
      }
      console.log('---\n');
    }
  }
})();
