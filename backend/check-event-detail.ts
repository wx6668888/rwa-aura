import { ethers } from 'ethers';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkEvent() {
  const provider = new ethers.JsonRpcProvider(process.env.BSC_TESTNET_RPC_URL);
  
  const STAKING_ABI = [
    'event RewardsUpdated(address indexed user, uint256 rwAmount, uint256 usdtAmount, uint256 stakeId, uint256 timestamp)'
  ];
  
  const staking = new ethers.Contract(
    process.env.STAKING_CONTRACT_ADDRESS!,
    STAKING_ABI,
    provider
  );
  
  const userAddress = '0xCD5b97505499B1575e481446384430bb159851b6';
  const currentBlock = await provider.getBlockNumber();
  const fromBlock = Math.max(0, currentBlock - 10000);
  
  const filter = staking.filters.RewardsUpdated(userAddress);
  const events = await staking.queryFilter(filter, fromBlock, currentBlock);
  
  console.log('事件数:', events.length);
  
  if (events.length > 0) {
    const event = events[0];
    console.log('\n事件详情:');
    console.log('Block:', event.blockNumber);
    console.log('TxHash:', event.transactionHash);
    console.log('Event:', JSON.stringify(event, null, 2));
  }
}

checkEvent();
