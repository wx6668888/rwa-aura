import { ethers } from 'hardhat';

async function main() {
  const STAKING_ADDRESS = '0x1E297055ffAA3BDD2a2eD96bD86A1B89d9245f99';
  
  const provider = new ethers.JsonRpcProvider('https://data-seed-prebsc-1-s1.binance.org:8545');
  
  // EIP712Domain 函数签名
  const abi = [
    'function eip712Domain() view returns (bytes1 fields, string name, string version, uint256 chainId, address verifyingContract, bytes32 salt, uint256[] extensions)'
  ];
  
  const contract = new ethers.Contract(STAKING_ADDRESS, abi, provider);
  
  try {
    const domain = await contract.eip712Domain();
    console.log('合约 EIP712 Domain:');
    console.log('  name:', domain.name);
    console.log('  version:', domain.version);
    console.log('  chainId:', domain.chainId.toString());
    console.log('  verifyingContract:', domain.verifyingContract);
  } catch (e: any) {
    console.log('无法读取 eip712Domain，可能合约不支持此函数');
    console.log('错误:', e.message);
  }
}

main().catch(console.error);
