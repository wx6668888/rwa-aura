const { ethers } = require('ethers');
const { getDeployPrivateKey } = require('./load-deploy-key');

async function transferToSwap() {
  console.log('向USDTRWASwap转入RWA流动性...');
  
  const RPC_URL = 'https://bsc-dataseed.binance.org/';
  const PRIVATE_KEY = getDeployPrivateKey();
  const RWA_ADDRESS = '0x9EF16931f3628f48dE1A2FfCF6f7fdf34A5240A6';
  const SWAP_ADDRESS = '0xdE4296FD71c0634129C93155b9DB68eF647B326b';
  const AMOUNT = '100000'; // 100,000 RWA
  
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  
  const rwaABI = ['function transfer(address to, uint256 amount) returns (bool)'];
  const rwaToken = new ethers.Contract(RWA_ADDRESS, rwaABI, wallet);
  
  console.log('转账金额:', AMOUNT, 'RWA');
  console.log('接收地址:', SWAP_ADDRESS);
  
  const amountWei = ethers.parseEther(AMOUNT);
  const tx = await rwaToken.transfer(SWAP_ADDRESS, amountWei);
  console.log('交易哈希:', tx.hash);
  
  await tx.wait();
  console.log('✅ 转账成功');
}

transferToSwap()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
