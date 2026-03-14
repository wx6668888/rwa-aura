import { ethers } from 'ethers';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkTx() {
  const provider = new ethers.JsonRpcProvider(process.env.BSC_TESTNET_RPC_URL);
  const txHash = '0x71521b95a44f169e6abedcbd1a38eeaf18df7744493efc50dca98b91c88dbd42';
  
  const tx = await provider.getTransaction(txHash);
  const receipt = await provider.getTransactionReceipt(txHash);
  
  console.log('交易状态:', receipt?.status === 1 ? '成功' : '失败');
  console.log('Gas使用:', receipt?.gasUsed.toString());
  
  // 尝试重放交易获取错误信息
  try {
    await provider.call({
      to: tx?.to,
      from: tx?.from,
      data: tx?.data,
      value: tx?.value,
      blockTag: receipt?.blockNumber
    });
  } catch (error: any) {
    console.log('错误信息:', error.message);
    if (error.data) {
      console.log('错误数据:', error.data);
    }
  }
}

checkTx();
