const { ethers } = require('ethers');
require('dotenv').config();

const address = '0xeeeee90971B6264C53175D3Af6840a8dD5dc7b6C';

(async () => {
  const provider = new ethers.JsonRpcProvider(process.env.BSC_TESTNET_RPC_URL);
  
  console.log('地址:', address);
  console.log('');
  
  // 检查是否是合约
  const code = await provider.getCode(address);
  const isContract = code !== '0x';
  console.log('是否是合约:', isContract ? '是' : '否');
  
  // 获取BNB余额
  const balance = await provider.getBalance(address);
  console.log('BNB余额:', ethers.formatEther(balance));
  
  // 获取USDT余额
  const usdtABI = ['function balanceOf(address) view returns (uint256)'];
  const usdtContract = new ethers.Contract(process.env.USDT_TOKEN_ADDRESS, usdtABI, provider);
  const usdtBalance = await usdtContract.balanceOf(address);
  console.log('USDT余额:', ethers.formatUnits(usdtBalance, 18));
  
  // 获取RWA余额
  const rwaContract = new ethers.Contract(process.env.RWA_TOKEN_ADDRESS, usdtABI, provider);
  const rwaBalance = await rwaContract.balanceOf(address);
  console.log('RWA余额:', ethers.formatUnits(rwaBalance, 18));
})();
