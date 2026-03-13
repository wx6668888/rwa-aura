import { ethers } from 'hardhat';

async function main() {
  const NEW_USER = '0xCC99BAaEcdD41B457850Aec1cE6EaCb38E9a19e4';
  const RWA_ADDRESS = '0xA0752C967DDF5B52Af5bb80BdE1eF376Bc48DBb8';
  
  const [deployer] = await ethers.getSigners();
  console.log('Deployer:', deployer.address);
  
  const rwaAbi = [
    'function transfer(address to, uint256 amount) returns (bool)',
    'function balanceOf(address) view returns (uint256)'
  ];
  
  const rwa = new ethers.Contract(RWA_ADDRESS, rwaAbi, deployer);
  
  const deployerBalance = await rwa.balanceOf(deployer.address);
  console.log('Deployer RWA 余额:', ethers.formatUnits(deployerBalance, 18));
  
  const amount = ethers.parseUnits('10000', 18);
  
  console.log('\n转账 10,000 RWA...');
  const tx = await rwa.transfer(NEW_USER, amount);
  await tx.wait();
  console.log('✅ 完成');
  
  const newBalance = await rwa.balanceOf(NEW_USER);
  console.log('新用户余额:', ethers.formatUnits(newBalance, 18), 'RWA');
}

main().catch(console.error);
