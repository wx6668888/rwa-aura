import { ethers } from 'ethers';

const RPC_URL = 'https://bsc-testnet-rpc.publicnode.com';
const STAKING_CONTRACT = '0xB4FD045003C402BE6ebaAECFD27105343CB7B3bE';
const RWA_TOKEN = '0xb2dFB4e2BA97c45c9664f20AB6Df768A9468CdD6';

const RWA_ABI = [
    'function stakingContract() view returns (address)'
];

const STAKING_ABI = [
    'function stRwaToken() view returns (address)',
    'function treasuryAddress() view returns (address)'
];

async function checkContracts() {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    
    console.log('=== 检查已部署合约 ===\n');
    
    // 检查RWAToken
    console.log('1. RWAToken:', RWA_TOKEN);
    const rwaToken = new ethers.Contract(RWA_TOKEN, RWA_ABI, provider);
    const rwaStakingContract = await rwaToken.stakingContract();
    console.log('   配置的StakingContract:', rwaStakingContract);
    console.log('   是否正确:', rwaStakingContract.toLowerCase() === STAKING_CONTRACT.toLowerCase());
    console.log('');
    
    // 检查StakingContract
    console.log('2. StakingContract:', STAKING_CONTRACT);
    const stakingContract = new ethers.Contract(STAKING_CONTRACT, STAKING_ABI, provider);
    
    const strwaToken = await stakingContract.stRwaToken();
    console.log('   StRWA地址:', strwaToken);
    
    const treasuryAddress = await stakingContract.treasuryAddress();
    console.log('   Treasury地址:', treasuryAddress);
    console.log('');
    
    // 检查StRWA
    if (strwaToken !== ethers.ZeroAddress) {
        console.log('3. StRWA:', strwaToken);
        const strwa = new ethers.Contract(strwaToken, ['function stakingContract() view returns (address)'], provider);
        const strwaStakingContract = await strwa.stakingContract();
        console.log('   配置的StakingContract:', strwaStakingContract);
        console.log('   是否正确:', strwaStakingContract.toLowerCase() === STAKING_CONTRACT.toLowerCase());
    } else {
        console.log('3. StRWA: 未部署');
    }
}

checkContracts().catch(console.error);
