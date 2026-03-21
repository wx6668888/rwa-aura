import { ethers } from 'hardhat';

async function main() {
  console.log('======== 部署更新的 StakingContract ========\n');
  
  const [deployer] = await ethers.getSigners();
  console.log('部署账户:', deployer.address);
  
  const usdtAddress = '0x365c4BE974f7c429De4B7133c61e8B04Cf6C28DA';
  const rwaAddress = '0x3FF4327E8e3239233aE30cA1Bb882B758e6b594B';
  const stRWAAddress = '0xfF1C231c2810F58BD568252B74557b2Df242d209';
  const treasuryAddress = deployer.address;
  
  console.log('\n部署 StakingContract...');
  const StakingContract = await ethers.getContractFactory('StakingContract');
  const staking = await StakingContract.deploy(
    usdtAddress,
    rwaAddress,
    stRWAAddress,
    treasuryAddress
  );
  await staking.waitForDeployment();
  const stakingAddress = await staking.getAddress();
  
  console.log('✅ StakingContract:', stakingAddress);
  console.log('\n======== 部署完成 ========');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
