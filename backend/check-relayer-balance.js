const { ethers } = require('ethers');
const provider = new ethers.JsonRpcProvider('https://bsc-testnet-rpc.publicnode.com');
const backendAddress = '0xa941F4806E0e3Ea7577aEC6c015d6E9D91584638';

(async () => {
  try {
    const balance = await provider.getBalance(backendAddress);
    console.log('=== Relayer钱包状态 ===');
    console.log('地址:', backendAddress);
    console.log('BNB余额:', ethers.formatEther(balance), 'BNB');
    console.log('');
    if (parseFloat(ethers.formatEther(balance)) < 0.01) {
      console.log('⚠️ 警告：BNB余额不足！需要至少0.01 BNB才能支付Gas费用');
      console.log('请向该地址充值BNB');
    } else {
      console.log('✅ BNB余额充足');
    }
  } catch (err) {
    console.error('查询失败:', err.message);
  }
})();
