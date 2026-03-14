import { ethers } from 'ethers';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkTx() {
  const provider = new ethers.JsonRpcProvider(process.env.BSC_TESTNET_RPC_URL);
  const tx = await provider.getTransaction('0xed62ff7d6a9ae173dc50679e542a8d5003a5b213b21e5b104fc4a2267a53986a');
  
  if (tx) {
    console.log('交易发起人:', tx.from);
    console.log('后端地址:', process.env.RELAYER_PRIVATE_KEY ? new ethers.Wallet(process.env.RELAYER_PRIVATE_KEY).address : 'N/A');
    console.log('是否匹配:', tx.from.toLowerCase() === new ethers.Wallet(process.env.RELAYER_PRIVATE_KEY!).address.toLowerCase());
  }
}

checkTx();
