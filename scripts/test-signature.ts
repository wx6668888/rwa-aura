import { ethers } from 'hardhat';

async function main() {
  const STAKING_ADDRESS = '0x1E297055ffAA3BDD2a2eD96bD86A1B89d9245f99';

  const pkRaw = (process.env.TEST_PRIVATE_KEY || process.env.PRIVATE_KEY || '').trim();
  if (!pkRaw) {
    throw new Error('请设置环境变量 TEST_PRIVATE_KEY 或 PRIVATE_KEY');
  }
  const pk = pkRaw.startsWith('0x') ? pkRaw : `0x${pkRaw}`;

  const provider = new ethers.JsonRpcProvider(
    process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org/'
  );
  const user = new ethers.Wallet(pk, provider);
  const USER_ADDRESS = user.address;
  
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
    chainId: 56,
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
