import { ethers } from 'ethers';

const RPC_URL = 'https://bsc-testnet-rpc.publicnode.com';
const REFERRAL_POOL = '0xEB2c7bACC5d6FAB553e65B7162aA3B84db977E32';
const USER_ADDRESS = '0xa941F4806E0e3Ea7577aEC6c015d6E9D91584638';

const ABI = ['function balances(address) view returns (uint256)'];

async function checkBalance() {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(REFERRAL_POOL, ABI, provider);
    
    const balance = await contract.balances(USER_ADDRESS);
    const balanceFormatted = ethers.formatUnits(balance, 6);
    
    console.log('用户地址:', USER_ADDRESS);
    console.log('ReferralRewardPool可提取余额:', balanceFormatted, 'USDT');
}

checkBalance().catch(console.error);
