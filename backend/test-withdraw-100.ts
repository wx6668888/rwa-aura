import { ethers } from 'ethers';
import * as dotenv from 'dotenv';

dotenv.config();

async function testWithdraw() {
  const provider = new ethers.JsonRpcProvider(process.env.BSC_TESTNET_RPC_URL);
  const wallet = new ethers.Wallet(process.env.RELAYER_PRIVATE_KEY!, provider);
  
  const POOL_ABI = ['function withdraw(uint256 amount) external'];
  const pool = new ethers.Contract('0xC2a4FBC8CF0C7CA22CC84F3b687b0d73aFdAc629', POOL_ABI, wallet);
  
  console.log('测试提现100 USDT...');
  const tx = await pool.withdraw(ethers.parseUnits('100', 6));
  console.log('交易已发送:', tx.hash);
  
  await tx.wait();
  console.log('✅ 提现成功！');
}

testWithdraw();
