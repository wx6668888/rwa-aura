const { ethers } = require('ethers');
const { getDeployPrivateKey } = require('./contracts/load-deploy-key');

const wallet = new ethers.Wallet(getDeployPrivateKey());

const expected =
  process.env.EXPECTED_WALLET_ADDRESS ||
  '0x8927e74e0fCaED1D4C87116C805464800651f222';

console.log('私钥对应的地址:', wallet.address);
console.log('期望的地址:', expected);
console.log(
  '是否匹配:',
  wallet.address.toLowerCase() === String(expected).toLowerCase()
);
