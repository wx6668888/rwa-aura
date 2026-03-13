const { ethers } = require('ethers');

const provider = new ethers.JsonRpcProvider('https://data-seed-prebsc-1-s1.binance.org:8545');
const stakingAddress = '0xb4fd045003c402be6ebaaecfd27105343cb7b3be';

const abi = [
  'function referralRewardPool() external view returns (address)'
];

async function checkReferralPool() {
  const contract = new ethers.Contract(stakingAddress, abi, provider);
  const poolAddress = await contract.referralRewardPool();
  console.log('Referral Reward Pool Address:', poolAddress);
  
  if (poolAddress === '0x0000000000000000000000000000000000000000') {
    console.log('❌ 推荐奖励池未设置！');
  } else {
    console.log('✅ 推荐奖励池已设置');
  }
}

checkReferralPool();
