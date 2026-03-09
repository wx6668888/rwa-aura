import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * 检查授权状态
 * 
 * 使用方式:
 * npx hardhat run scripts/check-authorization.ts --network localhost
 */

async function main() {
    console.log("\n=== 检查授权状态 ===\n");

    // 读取部署的合约地址
    const addressesPath = path.join(__dirname, "..", "deployed-addresses-local.json");
    let contractAddresses: Record<string, string> = {};

    if (fs.existsSync(addressesPath)) {
        const addressesContent = fs.readFileSync(addressesPath, "utf-8");
        contractAddresses = JSON.parse(addressesContent);
    } else {
        console.error("❌ 未找到 deployed-addresses-local.json");
        process.exit(1);
    }

    const [user] = await ethers.getSigners();
    const userAddress = user.address;
    const usdtAddress = contractAddresses.TestUSDT;
    const stakingAddress = contractAddresses.StakingContract;

    console.log("用户地址:", userAddress);
    console.log("USDT 地址:", usdtAddress);
    console.log("StakingContract 地址:", stakingAddress);
    console.log("");

    // 获取 TestUSDT 合约实例
    const TestUSDT = await ethers.getContractFactory("TestUSDT");
    const usdtToken = TestUSDT.attach(usdtAddress);

    // 检查余额
    const balance = await usdtToken.balanceOf(userAddress);
    console.log("USDT 余额:", ethers.formatUnits(balance, 6), "USDT");

    // 检查授权额度
    const allowance = await usdtToken.allowance(userAddress, stakingAddress);
    console.log("授权额度:", ethers.formatUnits(allowance, 6), "USDT");
    console.log("");

    if (allowance === 0n) {
        console.log("⚠️  授权额度为 0，需要授权");
        console.log("\n执行授权...");
        
        const maxAmount = ethers.MaxUint256;
        const tx = await usdtToken.approve(stakingAddress, maxAmount);
        console.log("交易哈希:", tx.hash);
        
        await tx.wait();
        console.log("✅ 授权成功！");
        
        // 再次检查授权额度
        const newAllowance = await usdtToken.allowance(userAddress, stakingAddress);
        console.log("新授权额度:", ethers.formatUnits(newAllowance, 6), "USDT");
    } else {
        console.log("✅ 已有授权额度，无需再次授权");
    }

    console.log("\n=== 检查完成 ===\n");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
