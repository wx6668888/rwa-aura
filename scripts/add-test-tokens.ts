import { ethers } from "hardhat";
import { CONTRACT_ADDRESSES } from "../frontend/lib/contracts/addresses";

/**
 * 给测试账户添加 RWA 和 USDT 代币
 * 
 * 使用方式:
 * npx hardhat run scripts/add-test-tokens.ts --network localhost
 */

async function main() {
    console.log("\n=== 给测试账户添加 RWA 和 USDT ===\n");

    const [deployer] = await ethers.getSigners();
    console.log("部署账户:", deployer.address);

    // 从 addresses.ts 获取合约地址（Hardhat Local Chain ID: 31337）
    const HARDHAT_CHAIN_ID = 31337;
    const addresses = CONTRACT_ADDRESSES[HARDHAT_CHAIN_ID as keyof typeof CONTRACT_ADDRESSES];
    
    if (!addresses) {
        console.error("❌ 未找到 Hardhat 本地网络地址配置");
        process.exit(1);
    }

    const usdtTokenAddress = addresses.usdtToken;
    const rwaTokenAddress = addresses.rwaToken;

    if (!usdtTokenAddress || !rwaTokenAddress) {
        console.error("❌ 未找到 USDT 或 RWA Token 地址");
        console.log("USDT:", usdtTokenAddress);
        console.log("RWA:", rwaTokenAddress);
        process.exit(1);
    }

    console.log("TestUSDT 地址:", usdtTokenAddress);
    console.log("RWAToken 地址:", rwaTokenAddress);

    // 获取合约实例
    const TestUSDT = await ethers.getContractFactory("TestUSDT");
    const usdtToken = TestUSDT.attach(usdtTokenAddress);

    const RWAToken = await ethers.getContractFactory("RWAToken");
    const rwaToken = RWAToken.attach(rwaTokenAddress);

    // 要 mint 的地址列表（Hardhat 默认账户）
    const accounts = await ethers.getSigners();
    const usdtAmount = ethers.parseUnits("100000", 6); // 100,000 USDT (6 decimals)
    const rwaAmount = ethers.parseEther("1000000"); // 1,000,000 RWA (18 decimals)

    console.log("\n开始 Mint 代币...\n");

    for (let i = 0; i < Math.min(10, accounts.length); i++) {
        const account = accounts[i];
        
        // Mint USDT
        try {
            const usdtBalanceBefore = await usdtToken.balanceOf(account.address);
            const tx1 = await usdtToken.mint(account.address, usdtAmount);
            await tx1.wait();
            const usdtBalanceAfter = await usdtToken.balanceOf(account.address);
            const usdtReceived = usdtBalanceAfter - usdtBalanceBefore;
            
            console.log(`✅ 账户 ${i + 1}: ${account.address}`);
            console.log(`   USDT 余额: ${ethers.formatUnits(usdtBalanceAfter, 6)} USDT`);
            console.log(`   USDT 新增: ${ethers.formatUnits(usdtReceived, 6)} USDT`);
        } catch (error: any) {
            console.log(`⚠️  账户 ${i + 1} USDT Mint 失败: ${error.message}`);
        }

        // Mint RWA
        try {
            // 检查是否有 mint 权限（通常只有 owner 可以 mint）
            const rwaBalanceBefore = await rwaToken.balanceOf(account.address);
            
            // 尝试直接转账（如果 deployer 有余额）
            const deployerRwaBalance = await rwaToken.balanceOf(deployer.address);
            if (deployerRwaBalance >= rwaAmount) {
                const tx2 = await rwaToken.transfer(account.address, rwaAmount);
                await tx2.wait();
                const rwaBalanceAfter = await rwaToken.balanceOf(account.address);
                const rwaReceived = rwaBalanceAfter - rwaBalanceBefore;
                console.log(`   RWA 余额: ${ethers.formatEther(rwaBalanceAfter)} RWA`);
                console.log(`   RWA 新增: ${ethers.formatEther(rwaReceived)} RWA\n`);
            } else {
                // 如果 deployer 余额不足，尝试 mint（需要检查合约是否有 mint 函数）
                try {
                    // 检查是否有 mint 函数
                    const mintTx = await rwaToken.mint(account.address, rwaAmount);
                    await mintTx.wait();
                    const rwaBalanceAfter = await rwaToken.balanceOf(account.address);
                    const rwaReceived = rwaBalanceAfter - rwaBalanceBefore;
                    console.log(`   RWA 余额: ${ethers.formatEther(rwaBalanceAfter)} RWA`);
                    console.log(`   RWA 新增: ${ethers.formatEther(rwaReceived)} RWA\n`);
                } catch (mintError: any) {
                    console.log(`   ⚠️  RWA Mint 失败（可能没有 mint 函数）: ${mintError.message}`);
                    console.log(`   💡 建议：从 deployer 账户手动转账 RWA\n`);
                }
            }
        } catch (error: any) {
            console.log(`   ⚠️  RWA 转账失败: ${error.message}\n`);
        }
    }

    // 特别处理第一个账户（通常是 MetaMask 使用的账户）
    const mainAccount = accounts[0];
    console.log(`\n📋 主账户信息:`);
    console.log(`   地址: ${mainAccount.address}`);
    const finalUsdtBalance = await usdtToken.balanceOf(mainAccount.address);
    const finalRwaBalance = await rwaToken.balanceOf(mainAccount.address);
    console.log(`   USDT 余额: ${ethers.formatUnits(finalUsdtBalance, 6)} USDT`);
    console.log(`   RWA 余额: ${ethers.formatEther(finalRwaBalance)} RWA`);

    console.log("\n=== 完成 ===\n");
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
