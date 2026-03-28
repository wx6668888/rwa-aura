import { ethers } from 'ethers';
import * as dotenv from 'dotenv';

dotenv.config();

const RPC_URL = 'https://bsc-dataseed1.defibit.io/';
const STAKING_CONTRACT = '0x1E297055ffAA3BDD2a2eD96bD86A1B89d9245f99';
const OWNER_PRIVATE_KEY = process.env.BACKEND_PRIVATE_KEY || '';
const NEW_BACKEND_ADDRESS = '0x8927e74e0fCaED1D4C87116C805464800651f222';

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const owner = new ethers.Wallet(OWNER_PRIVATE_KEY, provider);
  
  const abi = ['function setBackendAddress(address newBackend) external'];
  const contract = new ethers.Contract(STAKING_CONTRACT, abi, owner);
  
  console.log('更新 backendAddress...');
  console.log('Owner:', owner.address);
  console.log('新 backendAddress:', NEW_BACKEND_ADDRESS);
  
  const tx = await contract.setBackendAddress(NEW_BACKEND_ADDRESS);
  console.log('交易已发送:', tx.hash);
  
  await tx.wait();
  console.log('✅ 更新成功！');
}

main().catch(console.error);
