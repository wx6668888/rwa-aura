import { ethers } from 'ethers';
import * as dotenv from 'dotenv';

dotenv.config();

async function queryUserStakeData() {
  const provider = new ethers.JsonRpcProvider(process.env.BSC_TESTNET_RPC_URL);
  
  const STAKING_ABI = [
    'function rwaStakes(address) view returns (uint256 totalStakedRWA, uint256 rwaPending, uint256 lastWithdrawTime, address referrer, uint256 firstStakeTime, uint8 nodeLevel, bool isActive)',
    'function rwaLockedPrincipals(address, uint256) view returns (uint256 stakeId, uint256 totalAmount, uint256 lockStartTime, uint256 lockEndTime, bool canWithdraw, bool isWithdrawn, uint256 lockPeriod)'
  ];
  
  const staking = new ethers.Contract(
    process.env.STAKING_CONTRACT_ADDRESS!,
    STAKING_ABI,
    provider
  );
  
  const userAddress = '0xCD5b97505499B1575e481446384430bb159851b6';
  
  console.log('=== 用户RWA质押总览 ===');
  const rwaStakes = await staking.rwaStakes(userAddress);
  console.log('总质押:', ethers.formatEther(rwaStakes[0]), 'RWA');
  console.log('待提取收益:', ethers.formatEther(rwaStakes[1]), 'RWA');
  console.log('上次提现:', new Date(Number(rwaStakes[2]) * 1000).toLocaleString());
  console.log('首次质押:', new Date(Number(rwaStakes[4]) * 1000).toLocaleString());
  
  console.log('\n=== 锁仓质押明细 ===');
  let totalLocked = 0n;
  for (let i = 0; i < 20; i++) {
    try {
      const locked = await staking.rwaLockedPrincipals(userAddress, i);
      if (locked[1] > 0n) {
        console.log(`\n${i+1}. ${ethers.formatEther(locked[1])} RWA`);
        console.log(`   锁仓期: ${locked[6]}天`);
        console.log(`   到期: ${new Date(Number(locked[3]) * 1000).toLocaleString()}`);
        console.log(`   已提现: ${locked[5]}`);
        totalLocked += locked[1];
      }
    } catch {
      break;
    }
  }
  console.log('\n锁仓总计:', ethers.formatEther(totalLocked), 'RWA');
}

queryUserStakeData();
