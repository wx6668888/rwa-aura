import { ethers } from 'ethers';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkApproval() {
  const provider = new ethers.JsonRpcProvider(process.env.BSC_TESTNET_RPC_URL);
  
  const USDT_ABI = ['function allowance(address owner, address spender) view returns (uint256)'];
  const usdt = new ethers.Contract(process.env.USDT_TOKEN_ADDRESS!, USDT_ABI, provider);
  
  const poolAddress = process.env.REFERRAL_REWARD_POOL!;
  const ownerAddress = '0xa941F4806E0e3Ea7577aEC6c015d6E9D91584638';
  
  const allowance = await usdt.allowance(poolAddress, ownerAddress);
  
  console.log('合约地址:', poolAddress);
  console.log('Owner地址:', ownerAddress);
  console.log('USDT授权额度:', ethers.formatUnits(allowance, 6), 'USDT');
}

checkApproval();
