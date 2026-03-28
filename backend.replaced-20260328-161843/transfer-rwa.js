const { ethers } = require('ethers');
require('dotenv').config();

(async () => {
  const provider = new ethers.JsonRpcProvider(process.env.BSC_TESTNET_RPC_URL);
  const wallet = new ethers.Wallet(process.env.RELAYER_PRIVATE_KEY, provider);
  
  const RWA_TOKEN = process.env.RWA_TOKEN_ADDRESS;
  const newAddress = '0x0fc49964F76696abeD8c11C568c04A72aebDB15b';
  
  const tokenABI = ['function transfer(address to, uint256 amount) returns (bool)'];
  const rwaContract = new ethers.Contract(RWA_TOKEN, tokenABI, wallet);
  
  console.log('转账 10,000 RWA...');
  const amount = ethers.parseUnits('10000', 18);
  const tx = await rwaContract.transfer(newAddress, amount);
  console.log('交易已发送:', tx.hash);
  await tx.wait();
  console.log('✅ RWA转账成功！');
})();
