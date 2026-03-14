import { ethers } from 'ethers';

const RPC_URL = 'https://bsc-testnet-rpc.publicnode.com';
const USDT_ADDRESS = '0xb2E5F116B70df3148b49CC4b25354A3DD723BAe2';
const YOUR_ADDRESS = '0xa941F4806E0e3Ea7577aEC6c015d6E9D91584638';

const ERC20_ABI = [
    'function balanceOf(address) view returns (uint256)',
    'function decimals() view returns (uint8)'
];

async function checkBalance() {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, ERC20_ABI, provider);
    
    const balance = await usdtContract.balanceOf(YOUR_ADDRESS);
    const decimals = await usdtContract.decimals();
    const balanceFormatted = ethers.formatUnits(balance, decimals);
    
    console.log('地址:', YOUR_ADDRESS);
    console.log('USDT余额:', balanceFormatted, 'USDT');
    console.log('原始余额:', balance.toString());
}

checkBalance().catch(console.error);
