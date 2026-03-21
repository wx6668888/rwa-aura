const { ethers } = require('ethers');

async function transferToSwap() {
  console.log('向USDTRWASwap转入RWA流动性...');
  
  const RPC_URL = 'https://bsc-dataseed.binance.org/';
  const PRIVATE_KEY = '0x72de45eab3e0f215109b5beb29a62188d7784542aab9b72eeb4f82a8b8c69200';
  const RWA_ADDRESS = '0x0B4f2Ca412466fDBf7B0691Ca6F5b51A197f4812';
  const SWAP_ADDRESS = '0xE6812B78091D64D983079B375c9afEfF9d2EB764';
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
