const { ethers } = require('ethers');
const { getDeployPrivateKey } = require('./load-deploy-key');

async function transferToLottery() {
  console.log('向LotteryContract转入RWA作为奖池...');
  
  const RPC_URL = 'https://bsc-dataseed.binance.org/';
  const PRIVATE_KEY = getDeployPrivateKey();
  const RWA_ADDRESS = '0x9EF16931f3628f48dE1A2FfCF6f7fdf34A5240A6';
  const LOTTERY_ADDRESS = '0x82D475812BE018BF113c6815783DFa6d6658Ff88';
  const AMOUNT = '10000'; // 10,000 RWA
  
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  
  const rwaABI = ['function transfer(address to, uint256 amount) returns (bool)'];
  const rwaToken = new ethers.Contract(RWA_ADDRESS, rwaABI, wallet);
  
  console.log('转账金额:', AMOUNT, 'RWA');
  console.log('接收地址:', LOTTERY_ADDRESS);
  
  const amountWei = ethers.parseEther(AMOUNT);
  const tx = await rwaToken.transfer(LOTTERY_ADDRESS, amountWei);
  console.log('交易哈希:', tx.hash);
  
  await tx.wait();
  console.log('✅ 转账成功');
}

transferToLottery()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
