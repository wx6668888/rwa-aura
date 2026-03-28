const { ethers } = require('ethers');
require('dotenv').config();

(async () => {
  const provider = new ethers.JsonRpcProvider(process.env.BSC_TESTNET_RPC_URL);
  const wallet = new ethers.Wallet(process.env.RELAYER_PRIVATE_KEY, provider);
  
  console.log('RELAYER地址:', wallet.address);
  
  const tokenABI = ['function balanceOf(address) view returns (uint256)'];
  
  const usdtContract = new ethers.Contract(process.env.USDT_TOKEN_ADDRESS, tokenABI, provider);
  const rwaContract = new ethers.Contract(process.env.RWA_TOKEN_ADDRESS, tokenABI, provider);
  
  const usdtBalance = await usdtContract.balanceOf(wallet.address);
  const rwaBalance = await rwaContract.balanceOf(wallet.address);
  
  console.log('USDT余额:', ethers.formatUnits(usdtBalance, 18));
  console.log('RWA余额:', ethers.formatUnits(rwaBalance, 18));
})();
