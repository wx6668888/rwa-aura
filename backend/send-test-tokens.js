require('dotenv').config();
const { ethers } = require('ethers');

const RWA_ADDRESS = '0xb2dFB4e2BA97c45c9664f20AB6Df768A9468CdD6';
const USDT_ADDRESS = '0xb2E5F116B70df3148b49CC4b25354A3DD723BAe2';
const PRIVATE_KEY = process.env.BACKEND_PRIVATE_KEY;
const RPC_URL = process.env.BSC_TESTNET_RPC_URL;

const recipients = [
    '0x61f4e50cd17ebe67d8a448f0614f56b595b38958',
    '0x06f0e0a0d72dd56fb75ab4f9b1146d8c7bda0ebe'
];

const ERC20_ABI = [
    'function transfer(address to, uint256 amount) returns (bool)',
    'function balanceOf(address account) view returns (uint256)',
    'function decimals() view returns (uint8)'
];

async function sendTokens() {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    
    const rwaToken = new ethers.Contract(RWA_ADDRESS, ERC20_ABI, wallet);
    const usdtToken = new ethers.Contract(USDT_ADDRESS, ERC20_ABI, wallet);
    
    console.log('发送地址:', wallet.address);
    
    const rwaAmount = ethers.parseUnits('1000', 18);
    const usdtAmount = ethers.parseUnits('1000', 6);
    
    for (const recipient of recipients) {
        console.log(`\n发送到 ${recipient}...`);
        
        try {
            const rwaTx = await rwaToken.transfer(recipient, rwaAmount);
            console.log(`RWA交易: ${rwaTx.hash}`);
            await rwaTx.wait();
            console.log('✅ RWA发送成功');
            
            const usdtTx = await usdtToken.transfer(recipient, usdtAmount);
            console.log(`USDT交易: ${usdtTx.hash}`);
            await usdtTx.wait();
            console.log('✅ USDT发送成功');
        } catch (error) {
            console.error('❌ 发送失败:', error.message);
        }
    }
    
    console.log('\n✅ 所有转账完成！');
}

sendTokens().catch(console.error);
