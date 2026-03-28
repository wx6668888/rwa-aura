const ethers = require('ethers');
(async () => {
  const provider = new ethers.JsonRpcProvider('https://bsc-testnet-rpc.publicnode.com');
  const stakingAddress = '0xB4FD045003C402BE6ebaAECFD27105343CB7B3bE';
  const userAddress = '0xCD5b97505499B1575e481446384430bb159851b6';
  
  const abi = [
    'event StakeEvent(address indexed user, uint256 amount, address indexed referrer, uint256 stakeId, uint256 timestamp, uint256 lockPeriod)',
    'event RWAStakeEvent(address indexed user, uint256 amount, address indexed referrer, uint256 stakeId, uint256 timestamp, uint256 lockPeriod)'
  ];
  
  const contract = new ethers.Contract(stakingAddress, abi, provider);
  
  const latestBlock = await provider.getBlockNumber();
  const fromBlock = 95632000;
  
  console.log(`查询区块范围: ${fromBlock} - ${latestBlock}`);
  console.log(`用户地址: ${userAddress}\n`);
  
  // 查询USDT质押
  const usdtFilter = contract.filters.StakeEvent(userAddress);
  const usdtEvents = await contract.queryFilter(usdtFilter, fromBlock, latestBlock);
  
  console.log(`USDT质押事件 (${usdtEvents.length}笔):`);
  for (const event of usdtEvents) {
    console.log(`区块: ${event.blockNumber}`);
    console.log(`金额: ${ethers.formatUnits(event.args.amount, 18)} USDT`);
    console.log(`锁仓: ${event.args.lockPeriod}天`);
    console.log(`哈希: ${event.transactionHash}\n`);
  }
  
  // 查询RWA质押
  const rwaFilter = contract.filters.RWAStakeEvent(userAddress);
  const rwaEvents = await contract.queryFilter(rwaFilter, fromBlock, latestBlock);
  
  console.log(`RWA质押事件 (${rwaEvents.length}笔):`);
  for (const event of rwaEvents) {
    console.log(`区块: ${event.blockNumber}`);
    console.log(`金额: ${ethers.formatUnits(event.args.amount, 18)} RWA`);
    console.log(`锁仓: ${event.args.lockPeriod}天`);
    console.log(`哈希: ${event.transactionHash}\n`);
  }
})();
