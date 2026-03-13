import { ethers } from 'hardhat';

async function main() {
  const RWA_ADDRESS = '0xA0752C967DDF5B52Af5bb80BdE1eF376Bc48DBb8';
  const [deployer] = await ethers.getSigners();
  
  const rwaAbi = [
    'function owner() view returns (address)',
    'function mint(address to, uint256 amount) external',
    'function balanceOf(address) view returns (uint256)'
  ];
  
  const rwa = new ethers.Contract(RWA_ADDRESS, rwaAbi, deployer);
  
  const owner = await rwa.owner();
  console.log('RWA Token Owner:', owner);
  console.log('Deployer:', deployer.address);
  console.log('是否匹配:', owner.toLowerCase() === deployer.address.toLowerCase());
  
  if (owner.toLowerCase() === deployer.address.toLowerCase()) {
    console.log('\n✅ 权限正确，可以 mint');
    
    const NEW_USER = '0xCC99BAaEcdD41B457850Aec1cE6EaCb38E9a19e4';
    const amount = ethers.parseUnits('10000', 18);
    
    console.log('\n发送 10,000 RWA...');
    const tx = await rwa.mint(NEW_USER, amount);
    await tx.wait();
    console.log('✅ 完成');
    
    const balance = await rwa.balanceOf(NEW_USER);
    console.log('新余额:', ethers.formatUnits(balance, 18), 'RWA');
  } else {
    console.log('\n❌ 权限不匹配，无法 mint');
  }
}

main().catch(console.error);
