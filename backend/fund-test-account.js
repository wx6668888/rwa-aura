const { ethers } = require('ethers');
require('dotenv').config();

const ERC20_ABI = [
  "function transfer(address to, uint256 amount) returns (bool)",
  "function mint(address to, uint256 amount) returns (bool)",
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)"
];

(async () => {
  const provider = new ethers.JsonRpcProvider(process.env.BSC_TESTNET_RPC_URL);
  const ownerWallet = new ethers.Wallet(process.env.BACKEND_PRIVATE_KEY, provider);
  
  const testAddress = '0x8FAeD11E28903d652f4e32d93495cfD01c18E84e';
  const usdtAddress = process.env.USDT_TOKEN_ADDRESS;
  const rwaAddress = process.env.RWA_TOKEN_ADDRESS;
  
  console.log('=== 发放测试代币 ===');
  console.log('测试账号:', testAddress);
  console.log('Owner账号:', ownerWallet.address);
  console.log('');
  
  // USDT合约
  const usdtContract = new ethers.Contract(usdtAddress, ERC20_ABI, ownerWallet);
  const usdtDecimals = await usdtContract.decimals();
  const usdtAmount = ethers.parseUnits('10000', usdtDecimals);
  
  console.log('发放10000 USDT...');
  try {
    const tx1 = await usdtContract.transfer(testAddress, usdtAmount);
    console.log('交易哈希:', tx1.hash);
    await tx1.wait();
    console.log('✅ USDT发放成功');
  } catch (e) {
    console.log('❌ USDT发放失败:', e.message);
  }
  
  console.log('');
  
  // RWA合约
  const rwaContract = new ethers.Contract(rwaAddress, ERC20_ABI, ownerWallet);
  const rwaAmount = ethers.parseUnits('10000', 18);
  
  console.log('发放10000 RWA...');
  try {
    const tx2 = await rwaContract.transfer(testAddress, rwaAmount);
    console.log('交易哈希:', tx2.hash);
    await tx2.wait();
    console.log('✅ RWA发放成功');
  } catch (e) {
    console.log('❌ RWA发放失败:', e.message);
  }
  
  console.log('');
  console.log('=== 验证余额 ===');
  const usdtBalance = await usdtContract.balanceOf(testAddress);
  const rwaBalance = await rwaContract.balanceOf(testAddress);
  console.log('USDT余额:', ethers.formatUnits(usdtBalance, usdtDecimals));
  console.log('RWA余额:', ethers.formatUnits(rwaBalance, 18));
})();
