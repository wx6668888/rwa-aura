const { ethers } = require('ethers');
require('dotenv').config();

(async () => {
  const provider = new ethers.JsonRpcProvider(process.env.BSC_TESTNET_RPC_URL);
  const stakingContract = new ethers.Contract(
    process.env.STAKING_CONTRACT_ADDRESS,
    [
      'function getUserStakeInfo(address userAddress) external view returns (uint256, uint256, uint256, uint256, address, uint8, uint256)',
      'function rwaStakes(address) external view returns (uint256, uint256, uint256, address, uint256, uint8, bool)'
    ],
    provider
  );

  const testUser = '0xCD5b97505499B1575e481446384430bb159851b6';
  
  console.log('=== 检查合约中的收益 ===\n');
  console.log('用户:', testUser);
  
  try {
    // 检查USDT质押收益
    const userInfo = await stakingContract.getUserStakeInfo(testUser);
    console.log('\nUSDT质押信息:');
    console.log('  rwaPending:', ethers.formatEther(userInfo[1]), 'RWA');
    
    // 检查RWA质押收益
    const rwaInfo = await stakingContract.rwaStakes(testUser);
    console.log('\nRWA质押信息:');
    console.log('  rwaPending:', ethers.formatEther(rwaInfo[1]), 'RWA');
    
    console.log('\n总收益:', (parseFloat(ethers.formatEther(userInfo[1])) + parseFloat(ethers.formatEther(rwaInfo[1]))).toFixed(4), 'RWA');
    
  } catch (err) {
    console.error('查询失败:', err.message);
  }
})();
