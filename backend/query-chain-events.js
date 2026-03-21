const { ethers } = require('ethers');

const RPC_URL = 'https://bsc-testnet-rpc.publicnode.com';
const STAKING_CONTRACT = '0x90eCD84f58a47EAF285Dd0634dDa0f490516d6cD';
const USER_ADDRESS = '0xCC99BAaEcdD41B457850Aec1cE6EaCb38E9a19e4';

const stakingAbi = [
  'event StakeEvent(address indexed user, uint256 indexed stakeId, uint256 amount, string eventType, uint256 lockPeriod, uint256 timestamp)',
  'event RWAStakeEvent(address indexed user, uint256 indexed stakeId, uint256 amount, string eventType, uint256 lockPeriod, uint256 timestamp)'
];

(async () => {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const staking = new ethers.Contract(STAKING_CONTRACT, stakingAbi, provider);
  
  const currentBlock = await provider.getBlockNumber();
  console.log('当前区块:', currentBlock);
  
  // 查询最近1000个区块的StakeEvent
  const fromBlock = currentBlock - 1000;
  console.log(`\n查询区块范围: ${fromBlock} - ${currentBlock}`);
  
  const filter1 = staking.filters.StakeEvent(USER_ADDRESS);
  const events1 = await staking.queryFilter(filter1, fromBlock, currentBlock);
  
  const filter2 = staking.filters.RWAStakeEvent(USER_ADDRESS);
  const events2 = await staking.queryFilter(filter2, fromBlock, currentBlock);
  
  const allEvents = [...events1, ...events2].sort((a, b) => b.blockNumber - a.blockNumber);
  
  console.log(`\n找到 ${allEvents.length} 个质押事件:\n`);
  
  for (const event of allEvents) {
    const block = await provider.getBlock(event.blockNumber);
    const time = new Date(block.timestamp * 1000).toLocaleString('zh-CN');
    console.log(`区块:${event.blockNumber} | StakeID:${event.args.stakeId} | 金额:${ethers.formatEther(event.args.amount)} | 类型:${event.args.eventType} | 时间:${time}`);
  }
})().catch(console.error);
