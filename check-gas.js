const { ethers } = require("hardhat");

async function main() {
  const feeData = await ethers.provider.getFeeData();
  const gasPrice = feeData.gasPrice || feeData.maxFeePerGas;
  const gasPriceGwei = ethers.formatUnits(gasPrice, "gwei");
  
  console.log("当前Gas Price:", gasPriceGwei, "Gwei");
  
  // 估算部署成本
  const deployGas = 30000000; // 约3000万gas部署所有合约
  const costBNB = ethers.formatEther(gasPrice * BigInt(deployGas));
  
  console.log("预估部署成本:", costBNB, "BNB");
  
  // 获取BNB价格（假设600 USD）
  const bnbPrice = 600;
  const costUSD = parseFloat(costBNB) * bnbPrice;
  console.log("预估成本(USD):", costUSD.toFixed(2), "USD");
}

main().catch(console.error);
