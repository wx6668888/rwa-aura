import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * 检查用户地址的 RWA 余额
 * 
 * 使用方式:
 * npx hardhat run scripts/check-rwa-balance.ts --network localhost
 */

async function main() {
    console.log("\n=== 检查 RWA 余额 ===\n");

    // 读取部署的合约地址
    const addressesPath = path.join(__dirname, "..", "deployed-addresses-local.json");
    let contractAddresses: Record<string, string> = {};

    if (!fs.existsSync(addressesPath)) {
        console.error("❌ 未找到 deployed-addresses-local.json，请先运行部署脚本");
        process.exit(1);
    }

    const addressesContent = fs.readFileSync(addressesPath, "utf-8");
    contractAddresses = JSON.parse(addressesContent);

    const rwaTokenAddress = contractAddresses.RWAToken;
    if (!rwaTokenAddress) {
        console.error("❌ 未找到 RWAToken 地址");
        process.exit(1);
    }

    console.log("RWAToken 地址:", rwaTokenAddress);

    // 获取 RWAToken 合约实例
    const RWAToken = await ethers.getContractFactory("RWAToken");
    const rwaToken = RWAToken.attach(rwaTokenAddress);

    // 检查用户地址
    const userAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
    console.log("\n检查地址:", userAddress);

    // 检查 RWA 余额
    const balance = await rwaToken.balanceOf(userAddress);
    const formattedBalance = ethers.formatEther(balance);
    
    console.log("\n📊 RWA 余额:");
    console.log(`   原始值: ${balance.toString()}`);
    console.log(`   格式化: ${formattedBalance} RWA`);

    // 检查总供应量
    const totalSupply = await rwaToken.totalSupply();
    const formattedSupply = ethers.formatEther(totalSupply);
    
    console.log("\n📊 RWA 总供应量:");
    console.log(`   原始值: ${totalSupply.toString()}`);
    console.log(`   格式化: ${formattedSupply} RWA`);

    // 检查部署者余额
    const [deployer] = await ethers.getSigners();
    const deployerBalance = await rwaToken.balanceOf(deployer.address);
    const formattedDeployerBalance = ethers.formatEther(deployerBalance);
    
    console.log("\n📊 部署者余额:");
    console.log(`   地址: ${deployer.address}`);
    console.log(`   余额: ${formattedDeployerBalance} RWA`);

    // 检查是否有转账记录（通过事件）
    console.log("\n📊 分析:");
    if (balance > 0n) {
        console.log(`   ✅ 用户地址有 ${formattedBalance} RWA`);
        console.log(`   ℹ️  这些 RWA 可能来自:`);
        console.log(`      1. RWAToken 部署时的初始供应量（10亿 RWA）全部 mint 给了部署者`);
        console.log(`      2. 部署者可能转账了一部分给用户地址`);
        console.log(`      3. 或者用户地址就是部署者地址`);
    } else {
        console.log(`   ⚠️  用户地址没有 RWA 余额`);
        console.log(`   💡 如果需要测试，可以运行脚本给用户地址转账 RWA`);
    }

    // 检查用户地址是否是部署者
    if (userAddress.toLowerCase() === deployer.address.toLowerCase()) {
        console.log("\n✅ 用户地址就是部署者地址！");
        console.log(`   所以用户有 ${formattedBalance} RWA（来自初始供应量）`);
    } else {
        console.log("\nℹ️  用户地址不是部署者地址");
        console.log(`   如果用户有余额，说明部署者已经转账了 RWA 给用户`);
    }

    console.log("\n=== 检查完成 ===\n");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
