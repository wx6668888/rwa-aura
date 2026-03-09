import { ethers } from "hardhat";

/**
 * 检查账户余额脚本
 */

async function main() {
  console.log("=".repeat(60));
  console.log("检查账户余额");
  console.log("=".repeat(60));
  console.log("");

  const [deployer] = await ethers.getSigners();
  
  // 合约地址
  const RWA_TOKEN_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const STAKING_CONTRACT_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
  const TEST_USDT_ADDRESS = "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9";

  console.log("部署者地址:", deployer.address);
  console.log("");

  // 检查 ETH 余额
  const ethBalance = await ethers.provider.getBalance(deployer.address);
  console.log("ETH 余额:", ethers.formatEther(ethBalance), "ETH");
  console.log("");

  // 获取合约实例
  const RWAToken = await ethers.getContractFactory("RWAToken");
  const rwaToken = RWAToken.attach(RWA_TOKEN_ADDRESS);

  const TestUSDT = await ethers.getContractFactory("TestUSDT");
  const testUSDT = TestUSDT.attach(TEST_USDT_ADDRESS);

  // 检查 RWA 余额
  console.log("--- RWA Token ---");
  try {
    const rwaBalance = await rwaToken.balanceOf(deployer.address);
    console.log("RWA 余额:", ethers.formatEther(rwaBalance), "RWA");
    
    const rwaName = await rwaToken.name();
    const rwaSymbol = await rwaToken.symbol();
    console.log("代币名称:", rwaName);
    console.log("代币符号:", rwaSymbol);
  } catch (error: any) {
    console.log("❌ 读取 RWA 失败:", error.message);
  }
  console.log("");

  // 检查 USDT 余额
  console.log("--- Test USDT ---");
  try {
    const usdtBalance = await testUSDT.balanceOf(deployer.address);
    console.log("USDT 余额:", ethers.formatUnits(usdtBalance, 6), "USDT");
    
    const usdtName = await testUSDT.name();
    const usdtSymbol = await testUSDT.symbol();
    console.log("代币名称:", usdtName);
    console.log("代币符号:", usdtSymbol);
  } catch (error: any) {
    console.log("❌ 读取 USDT 失败:", error.message);
  }
  console.log("");

  // 检查合约地址是否正确
  console.log("=".repeat(60));
  console.log("合约地址验证");
  console.log("=".repeat(60));
  console.log("RWA Token:", RWA_TOKEN_ADDRESS);
  console.log("Test USDT:", TEST_USDT_ADDRESS);
  console.log("Staking Contract:", STAKING_CONTRACT_ADDRESS);
  console.log("");

  // 检查合约代码
  const rwaCode = await ethers.provider.getCode(RWA_TOKEN_ADDRESS);
  const usdtCode = await ethers.provider.getCode(TEST_USDT_ADDRESS);
  const stakingCode = await ethers.provider.getCode(STAKING_CONTRACT_ADDRESS);

  console.log("RWA Token 已部署:", rwaCode !== "0x" ? "✅" : "❌");
  console.log("Test USDT 已部署:", usdtCode !== "0x" ? "✅" : "❌");
  console.log("Staking Contract 已部署:", stakingCode !== "0x" ? "✅" : "❌");
  console.log("");

  console.log("=".repeat(60));
  console.log("检查完成");
  console.log("=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
