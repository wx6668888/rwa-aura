const { ethers } = require('ethers');

const provider = new ethers.JsonRpcProvider('https://bsc-testnet-rpc.publicnode.com');
const txHash = '0x450d759ece4d9b05cfc8c4644a475712ea7b735c411df56d3cde00c538f9abe4';

async function queryTx() {
    try {
        console.log('查询交易:', txHash);
        const tx = await provider.getTransaction(txHash);
        const receipt = await provider.getTransactionReceipt(txHash);
        
        console.log('\n=== 交易信息 ===');
        console.log('区块号:', receipt.blockNumber);
        console.log('合约地址:', tx.to);
        console.log('发送者:', tx.from);
        console.log('状态:', receipt.status === 1 ? '成功' : '失败');
        
        console.log('\n=== 事件日志 ===');
        receipt.logs.forEach((log, i) => {
            console.log(`\n日志 #${i}:`);
            console.log('  地址:', log.address);
            console.log('  Topics:', log.topics);
            console.log('  Data:', log.data);
        });
        
    } catch (error) {
        console.error('查询失败:', error.message);
    }
}

queryTx();
