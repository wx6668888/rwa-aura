import { ethers } from 'ethers';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkOwner() {
  const provider = new ethers.JsonRpcProvider(process.env.BSC_TESTNET_RPC_URL);
  
  const POOL_ABI = ['function owner() view returns (address)'];
  const pool = new ethers.Contract(process.env.REFERRAL_REWARD_POOL!, POOL_ABI, provider);
  
  const owner = await pool.owner();
  
  console.log('合约Owner:', owner);
  console.log('预期Owner:', '0xa941F4806E0e3Ea7577aEC6c015d6E9D91584638');
  console.log('是否匹配:', owner.toLowerCase() === '0xa941F4806E0e3Ea7577aEC6c015d6E9D91584638'.toLowerCase());
}

checkOwner();
