import { ethers } from 'ethers';

const RPC_URL = process.env.RPC_URL || 'https://bsc-testnet-rpc.publicnode.com';
const STAKING_CONTRACT = process.env.STAKING_CONTRACT_ADDRESS || '0xB4FD045003C402BE6ebaAECFD27105343CB7B3bE';

(async () => {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  
  // 获取最新区块
  const latestBlock = await provider.getBlockNumber();
  console.log('Latest block:', latestBlock);
  
  // 查询owner地址的最近交易
  const ownerAddress = '0xa941F4806E0e3Ea7577aEC6c015d6E9D91584638';
  
  // 从12分钟前开始扫描（约120个区块）
  const fromBlock = latestBlock - 120;
  
  console.log(`Scanning blocks ${fromBlock} to ${latestBlock} for ${ownerAddress}`);
  
  const filter = {
    address: STAKING_CONTRACT,
    fromBlock,
    toBlock: latestBlock
  };
  
  const logs = await provider.getLogs(filter);
  console.log(`Found ${logs.length} logs`);
  
  // 找到owner相关的交易
  const ownerLogs = logs.filter(log => 
    log.topics.some(topic => topic.toLowerCase().includes(ownerAddress.slice(2).toLowerCase()))
  );
  
  console.log(`Found ${ownerLogs.length} logs for owner`);
  
  if (ownerLogs.length > 0) {
    console.log('Owner transaction block:', ownerLogs[0].blockNumber);
  }
  
  process.exit(0);
})();
