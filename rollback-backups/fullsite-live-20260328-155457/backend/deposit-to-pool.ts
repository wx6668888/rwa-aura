import { ethers } from 'ethers';

const RPC_URL = 'https://bsc-testnet-rpc.publicnode.com';
const PRIVATE_KEY = process.env.BACKEND_PRIVATE_KEY || '0xc7ede35bdb337a0990ff803e279083146628277d89d14513f77a91f64dded29d';
const USDT_ADDRESS = '0xb2E5F116B70df3148b49CC4b25354A3DD723BAe2';
const REFERRAL_POOL = '0xEB2c7bACC5d6FAB553e65B7162aA3B84db977E32';

const ERC20_ABI = [
    'function transfer(address to, uint256 amount) returns (bool)',
    'function balanceOf(address) view returns (uint256)'
];

async function depositToPool() {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    const usdt = new ethers.Contract(USDT_ADDRESS, ERC20_ABI, wallet);
    
    console.log('给ReferralRewardPool充值USDT...\n');
    console.log('充值地址:', wallet.address);
    console.log('合约地址:', REFERRAL_POOL);
    
    // 充值1000 USDT
    const amount = ethers.parseUnits('1000', 6);
    console.log('充值金额:', '1000 USDT\n');
    
    const tx = await usdt.transfer(REFERRAL_POOL, amount);
    console.log('交易已发送:', tx.hash);
    
    await tx.wait();
    console.log('交易已确认！\n');
    
    // 查询合约余额
    const balance = await usdt.balanceOf(REFERRAL_POOL);
    console.log('合约USDT余额:', ethers.formatUnits(balance, 6), 'USDT');
}

depositToPool().catch(console.error);
