import { ethers } from 'hardhat';

async function main() {
  // 错误选择器
  const errorSelector = '0x4b800e46';
  
  // 尝试解码
  console.log('错误选择器:', errorSelector);
  console.log('可能的错误名称:', ethers.id('InvalidSignature()').slice(0, 10));
  console.log('可能的错误名称:', ethers.id('InvalidReferrer()').slice(0, 10));
  console.log('可能的错误名称:', ethers.id('InsufficientBalance()').slice(0, 10));
  console.log('可能的错误名称:', ethers.id('InvalidAmount()').slice(0, 10));
  console.log('可能的错误名称:', ethers.id('Unauthorized()').slice(0, 10));
}

main().catch(console.error);
