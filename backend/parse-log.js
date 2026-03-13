const { ethers } = require('ethers');

// Log 3 的 data
const data = '0x00000000000000000000000000000000000000000000000c9e31a2c8dfec00000000000000000000000000000000000000000000000000000000000069b24a48';

// 解析两个uint256参数
const amount1 = ethers.getBigInt('0x' + data.slice(2, 66));
const amount2 = ethers.getBigInt('0x' + data.slice(66, 130));

console.log('Parameter 1 (amount):', amount1.toString(), 'wei');
console.log('Parameter 1 (RWA):', ethers.formatEther(amount1));
console.log('Parameter 2 (timestamp):', amount2.toString());
console.log('Parameter 2 (date):', new Date(Number(amount2) * 1000).toLocaleString());
