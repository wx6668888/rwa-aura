import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  console.log("=".repeat(60));
  console.log("🌐 Checking Network Connection");
  console.log("=".repeat(60));
  
  try {
    const network = await ethers.provider.getNetwork();
    console.log("\nNetwork Name:", network.name);
    console.log("Chain ID:", network.chainId.toString());
    
    const blockNumber = await ethers.provider.getBlockNumber();
    console.log("Current Block:", blockNumber);
    
    const block = await ethers.provider.getBlock("latest");
    if (block) {
      console.log("Block Timestamp:", new Date(block.timestamp * 1000).toISOString());
    }
    
    console.log("\n✅ Network connection successful!");
    console.log("=".repeat(60));
  } catch (error: any) {
    console.error("\n❌ Network connection failed:");
    console.error(error.message);
    console.log("\nPlease check:");
    console.log("1. RPC URL is correct in .env file");
    console.log("2. Network is accessible");
    console.log("3. Internet connection is working");
    console.log("=".repeat(60));
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
