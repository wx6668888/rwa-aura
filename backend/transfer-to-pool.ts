import { ethers } from 'ethers';
import * as dotenv from 'dotenv';

dotenv.config();

async function depositToPool() {
  const provider = new ethers.JsonRpcProvider(process.env.BSC_TESTNET_RPC_URL);
  const wallet = new ethers.Wallet(process.env.RELAYER_PRIVATE_KEY!, provider);
  
  const USDT_ABI = [
    'function transfer(address to, uint256 amount) returns (bool)',
    'function balanceOf(address) view returns (uint256)'
  ];
  
  const usdt = new ethers.Contract(process.env.USDT_TOKEN_ADDRESS!, USDT_ABI, wallet);
  const poolAddress = '0xC2a4FBC8CF0C7CA22CC84F3b687b0d73aFdAc629';
  
  console.log('准备转账 10000 USDT 到 ReferralRewardPool...');
  console.log('目标地址:', poolAddress);
  
  const amount = ethers.parseUnits('10000', 6);
  
  const tx = await usdt.transfer(poolAddress, amount);
  console.log('交易已发送:', tx.hash);
  
  await tx.wait();
  console.log('✅ 转账成功！');
  
  const balance = await usdt.balanceOf(poolAddress);
  console.log('合约新余额:', ethers.formatUnits(balance, 6), 'USDT');
}

depositToPool().catch(console.error);
