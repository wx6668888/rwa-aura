import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Hardhat Local 网络诊断脚本
 * 
 * 检查项:
 * 1. 网络连接
 * 2. 合约部署状态
 * 3. 前端配置
 * 4. 账户余额
 */

async function main() {
  console.log("=".repeat(60));
  console.log("Hardhat Local 网络诊断");
  console.log("=".repeat(60));
  console.log("");

  let hasErrors = false;

  // 1. 检查网络连接
  console.log("1. 检查网络连接...");
  try {
    const network = await ethers.provider.getNetwork();
    const blockNumber = await ethers.provider.getBlockNumber();
    console.log("✅ 网络连接正常");
    console.log("   Chain ID:", network.chainId.toString());
    console.log("   当前区块:", blockNumber);
    console.log("");
  } catch (error) {
    console.log("❌ 网络连接失败");
    console.log("   错误:", error);
    console.log("");
    console.log("解决方案:");
    console.log("   1. 确保 Hardhat 节点正在运行: npx hardhat node");
    console.log("   2. 检查端口 8545 是否被占用");
    console.log("");
    hasErrors = true;
    return;
  }

  // 2. 读取前端配置
  console.log("2. 检查前端配置...");
  const addressesPath = path.join(__dirname, "../frontend/lib/contracts/addresses.ts");
  let stakingAddress = "";
  let usdtAddress = "";
  let rwaAddress = "";

  try {
    const addressesContent = fs.readFileSync(addressesPath, "utf-8");
    
    // 提取 Hardhat 配置中的地址
    const hardhatMatch = addressesContent.match(/\[HARDHAT_CHAIN_ID\]:\s*{([^}]+)}/s);
    if (hardhatMatch) {
      const hardhatConfig = hardhatMatch[1];
      
      const stakingMatch = hardhatConfig.match(/stakingContract:\s*['"]([^'"]+)['"]/);
      const usdtMatch = hardhatConfig.match(/usdtToken:\s*['"]([^'"]+)['"]/);
      const rwaMatch = hardhatConfig.match(/rwaToken:\s*['"]([^'"]+)['"]/);
      
      if (stakingMatch) stakingAddress = stakingMatch[1];
      if (usdtMatch) usdtAddress = usdtMatch[1];
      if (rwaMatch) rwaAddress = rwaMatch[1];
      
      console.log("✅ 前端配置文件存在");
      console.log("   StakingContract:", stakingAddress);
      console.log("   USDT Token:", usdtAddress);
      console.log("   RWA Token:", rwaAddress);
      console.log("");
    } else {
      console.log("⚠️  未找到 Hardhat 配置");
      console.log("");
    }
  } catch (error) {
    console.log("❌ 无法读取前端配置");
    console.log("   错误:", error);
    console.log("");
    hasErrors = true;
  }

  // 3. 检查合约部署状态
  console.log("3. 检查合约部署状态...");
  
  // 检查 USDT
  if (usdtAddress && usdtAddress !== "0x0000000000000000000000000000000000000000") {
    try {
      const code = await ethers.provider.getCode(usdtAddress);
      if (code === "0x") {
        console.log("❌ USDT 合约未部署");
        console.log("   地址:", usdtAddress);
        hasErrors = true;
      } else {
        const TestUSDT = await ethers.getContractFactory("TestUSDT");
        const usdt = TestUSDT.attach(usdtAddress);
        const name = await usdt.name();
        const symbol = await usdt.symbol();
        console.log("✅ USDT 合约已部署");
        console.log("   地址:", usdtAddress);
        console.log("   名称:", name);
        console.log("   符号:", symbol);
      }
    } catch (error) {
      console.log("❌ USDT 合约检查失败");
      console.log("   错误:", error);
      hasErrors = true;
    }
  } else {
    console.log("⚠️  USDT 地址未配置");
    hasErrors = true;
  }
  console.log("");

  // 检查 RWA Token
  if (rwaAddress && rwaAddress !== "0x0000000000000000000000000000000000000000") {
    try {
      const code = await ethers.provider.getCode(rwaAddress);
      if (code === "0x") {
        console.log("❌ RWA Token 合约未部署");
        console.log("   地址:", rwaAddress);
        hasErrors = true;
      } else {
        const RWAToken = await ethers.getContractFactory("RWAToken");
        const rwa = RWAToken.attach(rwaAddress);
        const name = await rwa.name();
        const symbol = await rwa.symbol();
        const totalSupply = await rwa.totalSupply();
        console.log("✅ RWA Token 合约已部署");
        console.log("   地址:", rwaAddress);
        console.log("   名称:", name);
        console.log("   符号:", symbol);
        console.log("   总供应量:", ethers.formatEther(totalSupply));
      }
    } catch (error) {
      console.log("❌ RWA Token 合约检查失败");
      console.log("   错误:", error);
      hasErrors = true;
    }
  } else {
    console.log("⚠️  RWA Token 地址未配置");
    hasErrors = true;
  }
  console.log("");

  // 检查 Staking Contract
  if (stakingAddress && stakingAddress !== "0x0000000000000000000000000000000000000000") {
    try {
      const code = await ethers.provider.getCode(stakingAddress);
      if (code === "0x") {
        console.log("❌ Staking 合约未部署");
        console.log("   地址:", stakingAddress);
        hasErrors = true;
      } else {
        const StakingContract = await ethers.getContractFactory("StakingContract");
        const staking = StakingContract.attach(stakingAddress);
        const usdtToken = await staking.usdtToken();
        const rwaToken = await staking.rwaToken();
        const treasury = await staking.treasuryAddress();
        console.log("✅ Staking 合约已部署");
        console.log("   地址:", stakingAddress);
        console.log("   USDT Token:", usdtToken);
        console.log("   RWA Token:", rwaToken);
        console.log("   Treasury:", treasury);
      }
    } catch (error) {
      console.log("❌ Staking 合约检查失败");
      console.log("   错误:", error);
      hasErrors = true;
    }
  } else {
    console.log("⚠️  Staking 合约地址未配置");
    hasErrors = true;
  }
  console.log("");

  // 4. 检查测试账户
  console.log("4. 检查测试账户...");
  const [deployer, account1, account2] = await ethers.getSigners();
  
  console.log("Deployer:", deployer.address);
  const deployerEth = await ethers.provider.getBalance(deployer.address);
  console.log("  ETH:", ethers.formatEther(deployerEth));
  
  if (usdtAddress && usdtAddress !== "0x0000000000000000000000000000000000000000") {
    try {
      const TestUSDT = await ethers.getContractFactory("TestUSDT");
      const usdt = TestUSDT.attach(usdtAddress);
      const deployerUsdt = await usdt.balanceOf(deployer.address);
      console.log("  USDT:", ethers.formatUnits(deployerUsdt, 6));
    } catch (error) {
      console.log("  USDT: 无法查询");
    }
  }
  
  if (rwaAddress && rwaAddress !== "0x0000000000000000000000000000000000000000") {
    try {
      const RWAToken = await ethers.getContractFactory("RWAToken");
      const rwa = RWAToken.attach(rwaAddress);
      const deployerRwa = await rwa.balanceOf(deployer.address);
      console.log("  RWA:", ethers.formatEther(deployerRwa));
    } catch (error) {
      console.log("  RWA: 无法查询");
    }
  }
  console.log("");

  console.log("Account #1:", account1.address);
  const account1Eth = await ethers.provider.getBalance(account1.address);
  console.log("  ETH:", ethers.formatEther(account1Eth));
  
  if (usdtAddress && usdtAddress !== "0x0000000000000000000000000000000000000000") {
    try {
      const TestUSDT = await ethers.getContractFactory("TestUSDT");
      const usdt = TestUSDT.attach(usdtAddress);
      const account1Usdt = await usdt.balanceOf(account1.address);
      console.log("  USDT:", ethers.formatUnits(account1Usdt, 6));
    } catch (error) {
      console.log("  USDT: 无法查询");
    }
  }
  console.log("");

  // 5. 输出诊断结果
  console.log("=".repeat(60));
  if (hasErrors) {
    console.log("❌ 诊断发现问题");
    console.log("=".repeat(60));
    console.log("");
    console.log("建议的修复步骤:");
    console.log("");
    console.log("1. 确保 Hardhat 节点正在运行:");
    console.log("   npx hardhat node");
    console.log("");
    console.log("2. 重新部署合约:");
    console.log("   npx hardhat run scripts/deploy-local.ts --network localhost");
    console.log("");
    console.log("3. 更新前端配置:");
    console.log("   编辑 frontend/lib/contracts/addresses.ts");
    console.log("   将部署输出的地址复制到 [HARDHAT_CHAIN_ID] 配置中");
    console.log("");
    console.log("4. 重新运行诊断:");
    console.log("   npx hardhat run scripts/diagnose-hardhat-local.ts --network localhost");
    console.log("");
  } else {
    console.log("✅ 所有检查通过！");
    console.log("=".repeat(60));
    console.log("");
    console.log("你可以开始测试了:");
    console.log("1. 在 MetaMask 中添加 Hardhat Local 网络 (Chain ID: 31337)");
    console.log("2. 导入测试账户私钥");
    console.log("3. 启动前端: cd frontend && npm run dev");
    console.log("4. 访问 http://localhost:3000");
    console.log("");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
