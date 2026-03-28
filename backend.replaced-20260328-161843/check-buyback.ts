import { ethers } from 'ethers';

const RPC_URL = 'https://bsc-testnet-rpc.publicnode.com';
const STAKING_CONTRACT = '0xB4FD045003C402BE6ebaAECFD27105343CB7B3bE';
const USDT_ADDRESS = '0x337610d27c682E347C9cD60BD4b3b107C9d34dDd';

const STAKING_ABI = [
    'function buybackAddress() view returns (address)',
    'function treasuryAddress() view returns (address)'
];

const ERC20_ABI = [
    'function balanceOf(address) view returns (uint256)',
    'function decimals() view returns (uint8)'
];

async function checkBuybackAddress() {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const stakingContract = new ethers.Contract(STAKING_CONTRACT, STAKING_ABI, provider);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, ERC20_ABI, provider);
    
    console.log('查询Buyback地址和余额...\n');
    
    const buybackAddress = await stakingContract.buybackAddress();
    const treasuryAddress = await stakingContract.treasuryAddress();
    
    console.log('Buyback地址:', buybackAddress);
    console.log('Treasury地址:', treasuryAddress);
    console.log('是否相同:', buybackAddress.toLowerCase() === treasuryAddress.toLowerCase());
    console.log('');
    
    const balance = await usdtContract.balanceOf(buybackAddress);
    const decimals = await usdtContract.decimals();
    const balanceFormatted = ethers.formatUnits(balance, decimals);
    
    console.log('Buyback地址USDT余额:', balanceFormatted, 'USDT');
}

checkBuybackAddress().catch(console.error);
