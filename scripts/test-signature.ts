import { ethers } from 'hardhat';

async function main() {
  const STAKING_ADDRESS = '0x6140e7fAfcC48a6635d981202A7A9931C672772B';
  const USER_ADDRESS = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
  const USER_PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
  
  const provider = new ethers.JsonRpcProvider('https://data-seed-prebsc-1-s1.binance.org:8545');
  const user = new ethers.Wallet(USER_PRIVATE_KEY, provider);
  
  const stakingAbi = require('../artifacts/contracts/StakingContract.sol/StakingContract.json').abi;
  const staking = new ethers.Contract(STAKING_ADDRESS, stakingAbi, provider);
  
  // 获取 nonce
  const nonce = await staking.nonces(USER_ADDRESS);
  console.log('Nonce:', nonce.toString());
  
  // 准备签名参数
  const amount = ethers.parseUnits('120', 18);
  const referrer = '0xa941F4806E0e3Ea7577aEC6c015d6E9D91584638';
  const lockPeriod = 0;
  const deadline = Math.floor(Date.now() / 1000) + 3600;
  
  // EIP712 domain
  const domain = {
    name: 'RWAStaking',
    version: '1',
    chainId: 97,
    verifyingContract: STAKING_ADDRESS,
  };
  
  // StakeRWA 类型
  const types = {
    StakeRWA: [
      { name: 'user', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'referrer', type: 'address' },
      { name: 'lockPeriod', type: 'uint256' },
      { name: 'nonce', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
    ],
  };
  
  const value = {
    user: USER_ADDRESS,
    amount,
    referrer,
    lockPeriod,
    nonce,
    deadline,
  };
  
  console.log('\n签名参数:');
  console.log('  user:', value.user);
  console.log('  amount:', value.amount.toString());
  console.log('  referrer:', value.referrer);
  console.log('  lockPeriod:', value.lockPeriod);
  console.log('  nonce:', value.nonce.toString());
  console.log('  deadline:', value.deadline);
  
  // 签名
  const signature = await user.signTypedData(domain, types, value);
  console.log('\n签名:', signature);
  
  // 验证签名恢复的地址
  const recovered = ethers.verifyTypedData(domain, types, value, signature);
  console.log('\n恢复的地址:', recovered);
  console.log('是否匹配:', recovered.toLowerCase() === USER_ADDRESS.toLowerCase());
}

main().catch(console.error);
