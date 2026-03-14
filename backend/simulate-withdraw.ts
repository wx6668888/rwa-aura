import { ethers } from 'ethers';
import * as dotenv from 'dotenv';

dotenv.config();

async function simulateWithdraw() {
  const provider = new ethers.JsonRpcProvider(process.env.BSC_TESTNET_RPC_URL);
  const wallet = new ethers.Wallet(process.env.RELAYER_PRIVATE_KEY!, provider);
  
  const POOL_ABI = [
    'function withdraw(uint256 amount) external',
    'function withdrawableBalance(address) view returns (uint256)'
  ];
  
  const USDT_ABI = ['function balanceOf(address) view returns (uint256)'];
  
  const pool = new ethers.Contract(process.env.REFERRAL_REWARD_POOL!, POOL_ABI, wallet);
  const usdt = new ethers.Contract(process.env.USDT_TOKEN_ADDRESS!, USDT_ABI, provider);
  
  const userAddress = '0xa941F4806E0e3Ea7577aEC6c015d6E9D91584638';
  const poolAddress = process.env.REFERRAL_REWARD_POOL!;
  
  const userBalance = await pool.withdrawableBalance(userAddress);
  const poolUsdtBalance = await usdt.balanceOf(poolAddress);
  
  console.log('用户可提取:', ethers.formatUnits(userBalance, 6), 'USDT');
  console.log('合约USDT余额:', ethers.formatUnits(poolUsdtBalance, 6), 'USDT');
  console.log('用户尝试提现: 328 USDT');
  console.log('需要支付: 328 * 0.92 =', 328 * 0.92, 'USDT (给用户)');
  console.log('手续费: 328 * 0.08 =', 328 * 0.08, 'USDT (给owner)');
  console.log('总需要:', 328, 'USDT');
  console.log('合约是否足够:', poolUsdtBalance >= ethers.parseUnits('328', 6));
}

simulateWithdraw();
