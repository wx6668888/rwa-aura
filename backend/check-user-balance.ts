import { ethers } from 'ethers';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkBalance() {
  const provider = new ethers.JsonRpcProvider(process.env.BSC_TESTNET_RPC_URL);
  
  const POOL_ABI = [
    'function withdrawableBalance(address) view returns (uint256)',
    'function balanceOf(address) view returns (uint256)'
  ];
  
  const pool = new ethers.Contract(
    '0xC2a4FBC8CF0C7CA22CC84F3b687b0d73aFdAc629',
    POOL_ABI,
    provider
  );
  
  const userAddress = '0xa941F4806E0e3Ea7577aEC6c015d6E9D91584638';
  const balance = await pool.withdrawableBalance(userAddress);
  
  console.log('用户地址:', userAddress);
  console.log('可提取余额:', ethers.formatUnits(balance, 6), 'USDT');
  console.log('用户尝试提现:', 328, 'USDT');
  console.log('是否足够:', balance >= ethers.parseUnits('328', 6));
}

checkBalance();
