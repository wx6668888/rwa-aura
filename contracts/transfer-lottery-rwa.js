const { ethers } = require('ethers');

async function transferToLottery() {
  console.log('向LotteryContract转入RWA作为奖池...');
  
  const RPC_URL = 'https://bsc-dataseed.binance.org/';
  const PRIVATE_KEY = '0x72de45eab3e0f215109b5beb29a62188d7784542aab9b72eeb4f82a8b8c69200';
  const RWA_ADDRESS = '0x0B4f2Ca412466fDBf7B0691Ca6F5b51A197f4812';
  const LOTTERY_ADDRESS = '0xD4Fce5360C56200ca299EF53E13904dAf1b1662c';
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
