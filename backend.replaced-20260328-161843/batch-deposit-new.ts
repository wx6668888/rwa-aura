import { ethers } from 'ethers';
import * as dotenv from 'dotenv';

dotenv.config();

async function batchDeposit() {
  const provider = new ethers.JsonRpcProvider(process.env.BSC_TESTNET_RPC_URL);
  const wallet = new ethers.Wallet(process.env.RELAYER_PRIVATE_KEY!, provider);
  
  const POOL_ABI = [
    'function batchDeposit(address[] calldata users, uint256[] calldata amounts) external'
  ];
  
  const pool = new ethers.Contract('0xC2a4FBC8CF0C7CA22CC84F3b687b0d73aFdAc629', POOL_ABI, wallet);
  
  const users = ['0xa941F4806E0e3Ea7577aEC6c015d6E9D91584638'];
  const amounts = [ethers.parseUnits('328.068', 6)];
  
  console.log('批量充值到新合约...');
  const tx = await pool.batchDeposit(users, amounts);
  console.log('交易已发送:', tx.hash);
  
  await tx.wait();
  console.log('✅ 充值成功！');
}

batchDeposit();
