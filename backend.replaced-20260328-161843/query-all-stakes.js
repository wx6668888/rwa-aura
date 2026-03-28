const { ethers } = require('ethers');

const provider = new ethers.JsonRpcProvider('https://bsc-testnet-rpc.publicnode.com');
const contractAddress = '0xB4FD045003C402BE6ebaAECFD27105343CB7B3bE';
const userAddress = '0xCD5b97505499B1575e481446384430bb159851b6';

const abi = [
    'event StakeEvent(address indexed user, uint256 amount, address indexed referrer, uint256 indexed stakeId, uint256 timestamp, uint256 lockPeriod)',
    'event RWAStakeEvent(address indexed user, uint256 amount, address indexed referrer, uint256 indexed stakeId, uint256 timestamp, uint256 lockPeriod)'
];

async function queryAllStakes() {
    const contract = new ethers.Contract(contractAddress, abi, provider);
    const currentBlock = await provider.getBlockNumber();
    const fromBlock = currentBlock - 10000;
    
    console.log(`查询区块范围: ${fromBlock} - ${currentBlock}`);
    
    const [usdtEvents, rwaEvents] = await Promise.all([
        contract.queryFilter(contract.filters.StakeEvent(userAddress), fromBlock, currentBlock),
        contract.queryFilter(contract.filters.RWAStakeEvent(userAddress), fromBlock, currentBlock)
    ]);
    
    console.log(`\n找到 ${usdtEvents.length} 笔 USDT 质押, ${rwaEvents.length} 笔 RWA 质押\n`);
    
    [...usdtEvents, ...rwaEvents].forEach((event, i) => {
        const args = event.args;
        console.log(`质押 #${i + 1}:`);
        console.log(`  类型: ${event.eventName}`);
        console.log(`  金额: ${ethers.formatEther(args.amount)}`);
        console.log(`  stakeId: ${args.stakeId.toString()}`);
        console.log(`  区块: ${event.blockNumber}`);
        console.log(`  tx: ${event.transactionHash}`);
        console.log('');
    });
}

queryAllStakes().catch(console.error);
