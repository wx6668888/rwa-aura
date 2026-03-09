import { ethers } from "hardhat";

async function main() {
  console.log("========================================");
  console.log("检查并修复 RWA 余额");
  console.log("========================================\n");

  const targetAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
  
  // 合约地址
  const rwaAddress = "0x8A791620dd6260079BF849Dc5567aDC3F2FdC318";
  const usdtAddress = "0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6";
  
  // 获取合约实例
  const rwa = await ethers.getContractAt("RWAToken", rwaAddress);
  const usdt = await ethers.getContractAt("TestUSDT", usdtAddress);
  
  // 检查当前余额
  console.log("1. 检查当前余额...");
  const currentRwaBalance = await rwa.balanceOf(targetAddress);
  const currentUsdtBalance = await usdt.balanceOf(targetAddress);
  
  console.log(`目标地址: ${targetAddress}`);
  console.log(`当前 RWA 余额: ${ethers.formatUnits(currentRwaBalance, 18)} RWA`);
  console.log(`当前 USDT 余额: ${ethers.formatUnits(currentUsdtBalance, 18)} USDT`);
  
  // 检查部署者余额
  const [deployer] = await ethers.getSigners();
  const deployerRwaBalance = await rwa.balanceOf(deployer.address);
  console.log(`\n部署者地址: ${deployer.address}`);
  console.log(`部署者 RWA 余额: ${ethers.formatUnits(deployerRwaBalance, 18)} RWA`);
  
  // 如果目标地址 RWA 余额不足,则转账
  const desiredRwaBalance = ethers.parseUnits("100000", 18); // 100,000 RWA
  
  if (currentRwaBalance < desiredRwaBalance) {
    console.log(`\n2. RWA 余额不足,正在转账...`);
    const amountToTransfer = desiredRwaBalance - currentRwaBalance;
    console.log(`需要转账: ${ethers.formatUnits(amountToTransfer, 18)} RWA`);
    
    const transferTx = await rwa.transfer(targetAddress, amountToTransfer);
    await transferTx.wait();
    console.log(`✓ 转账成功`);
    
    // 再次检查余额
    const newRwaBalance = await rwa.balanceOf(targetAddress);
    console.log(`新的 RWA 余额: ${ethers.formatUnits(newRwaBalance, 18)} RWA`);
  } else {
    console.log(`\n✓ RWA 余额充足,无需转账`);
  }
  
  // 检查 USDT 余额
  const desiredUsdtBalance = ethers.parseUnits("100000", 18); // 100,000 USDT
  
  if (currentUsdtBalance < desiredUsdtBalance) {
    console.log(`\n3. USDT 余额不足,正在铸造...`);
    const amountToMint = desiredUsdtBalance - currentUsdtBalance;
    console.log(`需要铸造: ${ethers.formatUnits(amountToMint, 18)} USDT`);
    
    const mintTx = await usdt.mint(targetAddress, amountToMint);
    await mintTx.wait();
    console.log(`✓ 铸造成功`);
    
    // 再次检查余额
    const newUsdtBalance = await usdt.balanceOf(targetAddress);
    console.log(`新的 USDT 余额: ${ethers.formatUnits(newUsdtBalance, 18)} USDT`);
  } else {
    console.log(`\n✓ USDT 余额充足,无需铸造`);
  }
  
  console.log("\n========================================");
  console.log("✅ 完成！");
  console.log("========================================");
  
  // 最终余额
  const finalRwaBalance = await rwa.balanceOf(targetAddress);
  const finalUsdtBalance = await usdt.balanceOf(targetAddress);
  
  console.log(`\n最终余额:`);
  console.log(`RWA:  ${ethers.formatUnits(finalRwaBalance, 18)}`);
  console.log(`USDT: ${ethers.formatUnits(finalUsdtBalance, 18)}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
