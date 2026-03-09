import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const signers = await ethers.getSigners();
  
  if (signers.length === 0) {
    console.log("=".repeat(60));
    console.log("❌ No accounts found!");
    console.log("=".repeat(60));
    console.log("\nPlease configure PRIVATE_KEY in .env file");
    console.log("Example:");
    console.log("PRIVATE_KEY=your_private_key_here");
    process.exit(1);
  }
  
  const deployer = signers[0];
  
  console.log("=".repeat(60));
  console.log("💰 Checking Account Balance");
  console.log("=".repeat(60));
  console.log("\nAccount:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  const balanceInBNB = ethers.formatEther(balance);
  
  console.log("Balance:", balanceInBNB, "BNB");
  console.log("");
  
  if (parseFloat(balanceInBNB) < 0.1) {
    console.log("⚠️  WARNING: Balance is less than 0.1 BNB");
    console.log("   You may not have enough funds for deployment.");
    console.log("   Get testnet BNB from: https://testnet.bnbchain.org/faucet-smart");
  } else {
    console.log("✅ Balance is sufficient for deployment");
  }
  
  console.log("");
  console.log("=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
