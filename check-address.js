const { ethers } = require('ethers');

const privateKey = '72de45eab3e0f215109b5beb29a62188d7784542aab9b72eeb4f82a8b8c69200';
const wallet = new ethers.Wallet(privateKey);

console.log('私钥对应的地址:', wallet.address);
console.log('期望的地址:', '0x08Ea66321c4dd47468c3aDc55d06c5De7129A292');
console.log('是否匹配:', wallet.address.toLowerCase() === '0x08Ea66321c4dd47468c3aDc55d06c5De7129A292'.toLowerCase());
