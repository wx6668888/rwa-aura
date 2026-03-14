// 测试合约更新功能
require('dotenv').config();
const { ethers } = require('ethers');

(async () => {
  try {
    console.log('=== 测试合约更新功能 ===\n');
    
    const provider = new ethers.JsonRpcProvider(process.env.BSC_TESTNET_RPC_URL);
    const wallet = new ethers.Wallet(process.env.BACKEND_PRIVATE_KEY, provider);
    
    const stakingContract = new ethers.Contract(
      process.env.STAKING_CONTRACT_ADDRESS,
      [{
        name: 'updateUserRewards',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
          { name: 'user', type: 'address' },
          { name: 'rwAmount', type: 'uint256' },
          { name: 'usdtAmount', type: 'uint256' },
          { name: 'stakeId', type: 'uint256' }
        ],
        outputs: []
      }],
      wallet
    );
    
    console.log('后端钱包地址:', wallet.address);
    console.log('合约地址:', process.env.STAKING_CONTRACT_ADDRESS);
    console.log('');
    
    // 测试调用
    const testUser = '0xCD5b97505499B1575e481446384430bb159851b6';
    const testAmount = ethers.parseEther('1'); // 1 RWA
    const testStakeId = Date.now();
    
    console.log('测试参数:');
    console.log('  用户:', testUser);
    console.log('  RWA金额:', ethers.formatEther(testAmount), 'RWA');
    console.log('  StakeId:', testStakeId);
    console.log('');
    
    console.log('发送交易...');
    const tx = await stakingContract.updateUserRewards(
      testUser,
      testAmount,
      0,
      testStakeId
    );
    
    console.log('交易哈希:', tx.hash);
    console.log('等待确认...');
    
    const receipt = await tx.wait();
    console.log('✅ 交易成功！');
    console.log('Gas used:', receipt.gasUsed.toString());
    
  } catch (err) {
    console.error('❌ 测试失败:');
    console.error('错误类型:', err.constructor.name);
    console.error('错误信息:', err.message);
    console.error('错误代码:', err.code);
    if (err.reason) console.error('原因:', err.reason);
    if (err.data) console.error('数据:', err.data);
    console.error('\n完整错误:', err);
  }
})();
