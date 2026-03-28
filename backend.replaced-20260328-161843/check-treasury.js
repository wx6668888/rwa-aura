const { ethers } = require('ethers');
require('dotenv').config();

(async () => {
  const provider = new ethers.JsonRpcProvider(process.env.BSC_TESTNET_RPC_URL);
  
  const stakingContractABI = [
    'function treasuryAddress() view returns (address)'
  ];
  
  const stakingContract = new ethers.Contract(
    process.env.STAKING_CONTRACT_ADDRESS,
    stakingContractABI,
    provider
  );
  
  const treasuryAddress = await stakingContract.treasuryAddress();
  
  console.log('=== 合约国库地址 ===');
  console.log('测试网合约:', process.env.STAKING_CONTRACT_ADDRESS);
  console.log('国库地址:', treasuryAddress);
  console.log('');
  console.log('对比地址:', '0xa941F4806E0e3Ea7577aEC6c015d6E9D91584638');
  console.log('是否匹配:', treasuryAddress.toLowerCase() === '0xa941F4806E0e3Ea7577aEC6c015d6E9D91584638'.toLowerCase() ? '是' : '否');
})();
