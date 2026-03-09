import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * 给测试账户 Mint USDT
 * 
 * 使用方式:
 * npx hardhat run scripts/mint-test-usdt.ts --network localhost
 */

async function main() {
    console.log("\n=== 给测试账户 Mint USDT ===\n");

    const [deployer] = await ethers.getSigners();
    console.log("部署账户:", deployer.address);

    // 读取部署的合约地址
    const addressesPath = path.join(__dirname, "..", "deployed-addresses-local.json");
    let contractAddresses: Record<string, string> = {};

    if (fs.existsSync(addressesPath)) {
        const addressesContent = fs.readFileSync(addressesPath, "utf-8");
        contractAddresses = JSON.parse(addressesContent);
    } else {
        console.error("❌ 未找到 deployed-addresses-local.json，请先运行部署脚本");
        process.exit(1);
    }

    const testUSDTAddress = contractAddresses.TestUSDT;
    if (!testUSDTAddress) {
        console.error("❌ 未找到 TestUSDT 地址");
        process.exit(1);
    }

    console.log("TestUSDT 地址:", testUSDTAddress);

    // 获取 TestUSDT 合约实例
    const TestUSDT = await ethers.getContractFactory("TestUSDT");
    const usdtToken = TestUSDT.attach(testUSDTAddress);

    // 要 mint 的地址列表（Hardhat 默认账户）
    const accounts = await ethers.getSigners();
    const mintAmount = ethers.parseUnits("100000", 6); // 100,000 USDT (6 decimals)

    console.log("\n开始 Mint USDT...\n");

    for (let i = 0; i < Math.min(10, accounts.length); i++) {
        const account = accounts[i];
        const balanceBefore = await usdtToken.balanceOf(account.address);
        
        // Mint USDT
        const tx = await usdtToken.mint(account.address, mintAmount);
        await tx.wait();
        
        const balanceAfter = await usdtToken.balanceOf(account.address);
        const received = balanceAfter - balanceBefore;
        
        console.log(`✅ 账户 ${i + 1}: ${account.address}`);
        console.log(`   余额: ${ethers.formatUnits(balanceAfter, 6)} USDT`);
        console.log(`   新增: ${ethers.formatUnits(received, 6)} USDT\n`);
    }

    // 特别处理用户指定的地址
    const userAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
    const userBalance = await usdtToken.balanceOf(userAddress);
    
    if (userBalance === 0n) {
        console.log(`\n给用户地址 Mint USDT: ${userAddress}`);
        const tx = await usdtToken.mint(userAddress, mintAmount);
        await tx.wait();
        const newBalance = await usdtToken.balanceOf(userAddress);
        console.log(`✅ 完成！余额: ${ethers.formatUnits(newBalance, 6)} USDT\n`);
    } else {
        console.log(`\n用户地址已有余额: ${ethers.formatUnits(userBalance, 6)} USDT`);
    }

    console.log("=== Mint 完成 ===\n");
    console.log("📝 现在可以开始测试了！");
    console.log("   1. 连接 MetaMask 到 Hardhat Local 网络");
    console.log("   2. 导入账户私钥: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80");
    console.log("   3. 访问前端: http://localhost:3000");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
