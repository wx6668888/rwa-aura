import { ethers } from "hardhat";

async function main() {
  console.log("Deploying RWAToken...");

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  // Token parameters
  const name = "RWA Token";
  const symbol = "RWA";
  const initialSupply = ethers.parseUnits("1000000000", 18); // 1 billion tokens
  
  // Placeholder addresses (will be replaced with actual addresses)
  const treasuryAddress = deployer.address; // Temporary, will be Gnosis Safe
  const liquidityFundAddress = deployer.address; // Temporary

  // Deploy RWAToken
  const RWAToken = await ethers.getContractFactory("RWAToken");
  const rwaToken = await RWAToken.deploy(
    name,
    symbol,
    initialSupply,
    treasuryAddress,
    liquidityFundAddress
  );

  await rwaToken.waitForDeployment();
  const tokenAddress = await rwaToken.getAddress();

  console.log("RWAToken deployed to:", tokenAddress);
  console.log("Initial supply:", ethers.formatUnits(initialSupply, 18), "RWA");
  console.log("Treasury address:", treasuryAddress);
  console.log("Liquidity fund address:", liquidityFundAddress);

  // Verify deployment
  const totalSupply = await rwaToken.totalSupply();
  const deployerBalance = await rwaToken.balanceOf(deployer.address);
  
  console.log("\nDeployment verification:");
  console.log("Total supply:", ethers.formatUnits(totalSupply, 18), "RWA");
  console.log("Deployer balance:", ethers.formatUnits(deployerBalance, 18), "RWA");
  console.log("Deployer whitelisted:", await rwaToken.isWhitelisted(deployer.address));

  return tokenAddress;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
