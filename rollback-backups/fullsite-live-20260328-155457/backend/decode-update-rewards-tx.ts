import { ethers } from 'ethers';
import * as dotenv from 'dotenv';

dotenv.config();

async function decodeUpdateRewardsTx() {
  const provider = new ethers.JsonRpcProvider(process.env.BSC_TESTNET_RPC_URL);
  const txHash = '0xed62ff7d6a9ae173dc50679e542a8d5003a5b213b21e5b104fc4a2267a53986a';
  
  const tx = await provider.getTransaction(txHash);
  
  if (tx && tx.data) {
    const iface = new ethers.Interface([
      'function updateUserRewards(address user, uint256 rwAmount, uint256 usdtAmount, uint256 stakeId)'
    ]);
    
    const decoded = iface.parseTransaction({ data: tx.data });
    
    console.log('=== updateUserRewards调用参数 ===');
    console.log('用户地址:', decoded?.args[0]);
    console.log('RWA金额:', ethers.formatEther(decoded?.args[1]), 'RWA');
    console.log('USDT金额:', ethers.formatUnits(decoded?.args[2], 6), 'USDT');
    console.log('StakeID:', decoded?.args[3].toString());
  }
}

decodeUpdateRewardsTx();
