
import { ethers } from 'ethers';

async function main() {
    const rpcUrl = 'https://binance.llamarpc.com';
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const blockNumber = 89318488; // 0x552e458
    try {
        const balance = await provider.getBalance('0x77ee3f51f9e0c5c99db8ef9451eee1a382f7a340', blockNumber);
        console.log('Balance at block', blockNumber, ':', balance.toString());
    } catch (error: any) {
        console.error('Error at block', blockNumber, ':', error.message);
        if (error.info) console.error('Error info:', JSON.stringify(error.info));
    }
}

main();
