import { ethers } from "hardhat";

/**
 * 部署测试 USDT 合约
 * 用于本地开发和测试
 */

async function main() {
  console.log("=".repeat(60));
  console.log("部署测试 USDT 合约");
  console.log("=".repeat(60));
  console.log("");

  const [deployer] = await ethers.getSigners();
  console.log("部署账户:", deployer.address);
  console.log("账户余额:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");
  console.log("");

  // 部署 TestUSDT
  console.log("部署 TestUSDT...");
  const TestUSDT = await ethers.getContractFactory("TestUSDT");
  const testUSDT = await TestUSDT.deploy();
  await testUSDT.waitForDeployment();
  const testUSDTAddress = await testUSDT.getAddress();
  console.log("✅ TestUSDT 部署成功:", testUSDTAddress);
  console.log("");

  // 验证部署
  console.log("验证部署...");
  const name = await testUSDT.name();
  const symbol = await testUSDT.symbol();
  const decimals = await testUSDT.decimals();
  const totalSupply = await testUSDT.totalSupply();
  const deployerBalance = await testUSDT.balanceOf(deployer.address);
  
  console.log("TestUSDT 信息:");
  console.log("  名称:", name);
  console.log("  符号:", symbol);
  console.log("  精度:", decimals);
  console.log("  总供应量:", ethers.formatUnits(totalSupply, 6), "USDT");
  console.log("  部署者余额:", ethers.formatUnits(deployerBalance, 6), "USDT");
  console.log("");

  // 铸造一些 USDT 给测试账户
  console.log("铸造测试 USDT...");
  const testAccounts = [
    "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", // Account #1
    "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", // Account #2
  ];
  
  for (const account of testAccounts) {
    const amount = ethers.parseUnits("10000", 6); // 10000 USDT
    const tx = await testUSDT.mint(account, amount);
    await tx.wait();
    console.log(`✅ 铸造 10000 USDT 给 ${account}`);
  }
  console.log("");

  // 输出摘要
  console.log("=".repeat(60));
  console.log("部署完成！");
  console.log("=".repeat(60));
  console.log("");
  console.log("TestUSDT 地址:", testUSDTAddress);
  console.log("");
  console.log("请更新以下配置:");
  console.log("1. frontend/lib/contracts/addresses.ts");
  console.log("   - 将 hardhat.usdtToken 改为:", testUSDTAddress);
  console.log("");
  console.log("2. .env 文件");
  console.log(`   USDT_TOKEN_ADDRESS=${testUSDTAddress}`);
  console.log("");
  console.log("测试账户余额:");
  console.log("  部署者:", ethers.formatUnits(deployerBalance, 6), "USDT");
  console.log("  Account #1: 10000 USDT");
  console.log("  Account #2: 10000 USDT");
  console.log("");
  console.log("下一步:");
  console.log("1. 在 MetaMask 中导入测试账户");
  console.log("2. 访问前端 http://localhost:3000");
  console.log("3. 连接钱包");
  console.log("4. 测试质押功能");
  console.log("");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
