import { ethers } from 'ethers';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const rpc = 'https://bsc-dataseed.binance.org/';
const provider = new ethers.JsonRpcProvider(rpc);

const pKey = process.env.RELAYER_PRIVATE_KEY || '';
const formattedPKey = pKey.startsWith('0x') ? pKey : '0x' + pKey;

const wallet = new ethers.Wallet(formattedPKey, provider);

async function check() {
  console.log('配置的 Relayer 私钥推导出的地址:', wallet.address);
  const bal = await provider.getBalance(wallet.address);
  console.log('该地址链上实际余额:', ethers.formatEther(bal), 'BNB');
}
check();
