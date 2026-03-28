import { ethers } from 'ethers';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkContractBalance() {
  const provider = new ethers.JsonRpcProvider(process.env.BSC_TESTNET_RPC_URL);
  
  const USDT_ABI = ['function balanceOf(address) view returns (uint256)'];
  const usdt = new ethers.Contract(process.env.USDT_TOKEN_ADDRESS!, USDT_ABI, provider);
  
  const poolAddress = process.env.REFERRAL_REWARD_POOL!;
  const balance = await usdt.balanceOf(poolAddress);
  
  console.log('ReferralRewardPool合约地址:', poolAddress);
  console.log('合约USDT余额:', ethers.formatUnits(balance, 6), 'USDT');
}

checkContractBalance();
