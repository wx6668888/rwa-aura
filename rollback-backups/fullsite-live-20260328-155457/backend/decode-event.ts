import { ethers } from 'ethers';

// 事件数据
const data = "0x000000000000000000000000000000000000000000000000190e73c205a63c7200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000069b58606";

// 解码
const abiCoder = ethers.AbiCoder.defaultAbiCoder();
const decoded = abiCoder.decode(['uint256', 'uint256', 'uint256'], data);

console.log('=== RewardsUpdated事件解码 ===');
console.log('rwAmount:', ethers.formatEther(decoded[0]), 'RWA');
console.log('usdtAmount:', ethers.formatUnits(decoded[1], 6), 'USDT');
console.log('stakeId:', decoded[2].toString());
console.log('\n交易哈希: 0xed62ff7d6a9ae173dc50679e542a8d5003a5b213b21e5b104fc4a2267a53986a');
console.log('区块: 95700528');
