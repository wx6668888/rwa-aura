const { ethers } = require('ethers');
require('dotenv').config();

const STAKING_CONTRACT = '0xB4FD045003C402BE6ebaAECFD27105343CB7B3bE';
const USDT_TOKEN = '0xb2E5F116B70df3148b49CC4b25354A3DD723BAe2';
const RWA_TOKEN = '0xb2dFB4e2BA97c45c9664f20AB6Df768A9468CdD6';

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)'
];

(async () => {
  const provider = new ethers.JsonRpcProvider(process.env.BSC_TESTNET_RPC_URL);
  
  const usdtContract = new ethers.Contract(USDT_TOKEN, ERC20_ABI, provider);
  const rwaContract = new ethers.Contract(RWA_TOKEN, ERC20_ABI, provider);
  
  console.log('=== 合约余额检查 ===\n');
  
  const usdtBalance = await usdtContract.balanceOf(STAKING_CONTRACT);
  const rwaBalance = await rwaContract.balanceOf(STAKING_CONTRACT);
  
  const usdtDecimals = await usdtContract.decimals();
  const rwaDecimals = await rwaContract.decimals();
  
  console.log('StakingContract地址:', STAKING_CONTRACT);
  console.log('\nUSDT余额:', ethers.formatUnits(usdtBalance, usdtDecimals), 'USDT');
  console.log('RWA余额:', ethers.formatUnits(rwaBalance, rwaDecimals), 'RWA');
  
  console.log('\n=== 分析 ===');
  const usdtAmount = Number(ethers.formatUnits(usdtBalance, usdtDecimals));
  if (usdtAmount < 410) {
    console.log('⚠️ 合约USDT余额不足！需要410 USDT，但只有', usdtAmount, 'USDT');
  } else {
    console.log('✅ 合约USDT余额充足');
  }
})();
