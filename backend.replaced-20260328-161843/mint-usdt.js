const { ethers } = require('ethers');
require('dotenv').config();

(async () => {
  const provider = new ethers.JsonRpcProvider(process.env.BSC_TESTNET_RPC_URL);
  const wallet = new ethers.Wallet(process.env.RELAYER_PRIVATE_KEY, provider);
  
  const USDT_TOKEN = process.env.USDT_TOKEN_ADDRESS;
  
  const tokenABI = [
    'function mint(address to, uint256 amount) returns (bool)',
    'function owner() view returns (address)'
  ];
  
  const usdtContract = new ethers.Contract(USDT_TOKEN, tokenABI, wallet);
  
  console.log('USDT合约:', USDT_TOKEN);
  console.log('RELAYER地址:', wallet.address);
  
  try {
    const owner = await usdtContract.owner();
    console.log('合约Owner:', owner);
    console.log('是否是Owner:', owner.toLowerCase() === wallet.address.toLowerCase());
  } catch (e) {
    console.log('无法获取owner（可能没有owner函数）');
  }
  
  console.log('\n尝试铸造10000 USDT到新地址...');
  const newAddress = '0x0fc49964F76696abeD8c11C568c04A72aebDB15b';
  const amount = ethers.parseUnits('10000', 18);
  
  try {
    const tx = await usdtContract.mint(newAddress, amount);
    console.log('交易已发送:', tx.hash);
    await tx.wait();
    console.log('✅ 铸造成功！');
  } catch (e) {
    console.log('❌ 铸造失败:', e.message);
  }
})();
