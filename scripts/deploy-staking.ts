import { ethers } from "hardhat";

async function main() {
  console.log("Deploying StakingContract...");

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  // Token addresses (replace with actual deployed addresses)
  const usdtTokenAddress = process.env.USDT_TOKEN_ADDRESS || "0x55d398326f99059fF775485246999027B3197955"; // BSC Mainnet USDT
  const rwaTokenAddress = process.env.RWA_TOKEN_ADDRESS || deployer.address; // Placeholder
  
  // System addresses
  const treasuryAddress = process.env.TREASURY_ADDRESS || deployer.address; // Will be Gnosis Safe
  const backendAddress = process.env.BACKEND_ADDRESS || deployer.address;

  console.log("\nConfiguration:");
  console.log("USDT Token:", usdtTokenAddress);
  console.log("RWA Token:", rwaTokenAddress);
  console.log("Treasury:", treasuryAddress);
  console.log("Backend:", backendAddress);

  // Deploy StakingContract
  const StakingContract = await ethers.getContractFactory("StakingContract");
  const stakingContract = await StakingContract.deploy(
    usdtTokenAddress,
    rwaTokenAddress,
    treasuryAddress,
    backendAddress
  );

  await stakingContract.waitForDeployment();
  const contractAddress = await stakingContract.getAddress();

  console.log("\nStakingContract deployed to:", contractAddress);

  // Verify deployment
  const totalStaked = await stakingContract.getTotalStaked();
  const maxRewardPerCall = await stakingContract.maxRewardPerCall();
  
  console.log("\nDeployment verification:");
  console.log("Total staked:", ethers.formatUnits(totalStaked, 18), "USDT");
  console.log("Max reward per call:", ethers.formatUnits(maxRewardPerCall, 18), "USDT");
  console.log("Treasury address:", await stakingContract.treasuryAddress());
  console.log("Backend address:", await stakingContract.backendAddress());

  return contractAddress;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
