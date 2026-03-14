const ethers = require('ethers');
(async () => {
  const provider = new ethers.JsonRpcProvider('https://bsc-testnet-rpc.publicnode.com');
  const stakingAddress = '0xB4FD045003C402BE6ebaAECFD27105343CB7B3bE';
  const userAddress = '0xCD5b97505499B1575e481446384430bb159851b6';
  
  const abi = ['event StakeEvent(address indexed user, uint256 amount, address indexed referrer, uint256 stakeId, uint256 timestamp, uint256 lockPeriod)'];
  const contract = new ethers.Contract(stakingAddress, abi, provider);
  
  const latestBlock = await provider.getBlockNumber();
  console.log(`最新区块: ${latestBlock}\n`);
  
  // 查询最近1000个区块
  const fromBlock = latestBlock - 1000;
  const filter = contract.filters.StakeEvent(userAddress);
  
  console.log(`查询区块范围: ${fromBlock} - ${latestBlock}\n`);
  
  const events = await contract.queryFilter(filter, fromBlock, latestBlock);
  
  console.log(`找到 ${events.length} 笔USDT质押:\n`);
  
  for (const event of events) {
    const block = await provider.getBlock(event.blockNumber);
    const time = new Date(block.timestamp * 1000).toLocaleString('zh-CN');
    
    console.log(`区块: ${event.blockNumber} | 时间: ${time}`);
    console.log(`交易: ${event.transactionHash}`);
    
    // 手动从receipt解析
    const receipt = await provider.getTransactionReceipt(event.transactionHash);
    const iface = new ethers.Interface(abi);
    
    for (const log of receipt.logs) {
      if (log.address.toLowerCase() === stakingAddress.toLowerCase()) {
        try {
          const parsed = iface.parseLog({ topics: log.topics, data: log.data });
          if (parsed && parsed.name === 'StakeEvent') {
            console.log(`金额: ${ethers.formatUnits(parsed.args.amount, 18)} USDT`);
            console.log(`锁仓: ${parsed.args.lockPeriod}天`);
            console.log(`StakeID: ${parsed.args.stakeId}`);
          }
        } catch (e) {}
      }
    }
    console.log('---\n');
  }
})();
