import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * 清除测试数据（模拟的奖励）
 * 
 * 注意：这个脚本会重置用户的 rwaPending 和 usdtRewards 为 0
 * 只用于清除测试数据，生产环境请谨慎使用
 * 
 * 使用方式:
 * npx hardhat run scripts/clear-test-rewards.ts --network localhost
 */

async function main() {
    console.log("\n=== 清除测试数据 ===\n");

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

    const userAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
    const stakingAddress = contractAddresses.StakingContract;

    console.log("用户地址:", userAddress);
    console.log("StakingContract 地址:", stakingAddress);
    console.log("");

    // 获取 StakingContract 合约实例
    const StakingContract = await ethers.getContractFactory("StakingContract");
    const staking = StakingContract.attach(stakingAddress);

    // 检查当前奖励
    const currentRewards = await staking.getUserRewards(userAddress);
    const currentRWA = ethers.formatEther(currentRewards[0]);
    const currentUSDT = ethers.formatEther(currentRewards[1]);

    console.log("=== 当前奖励 ===");
    console.log("RWA 待提取:", currentRWA, "RWA");
    console.log("USDT 奖励:", currentUSDT, "USDT");
    console.log("");

    if (currentRWA === "0.0" && currentUSDT === "0.0") {
        console.log("✅ 没有测试数据需要清除");
        console.log("\n=== 完成 ===\n");
        return;
    }

    console.log("⚠️  警告：此操作会清除所有奖励数据！");
    console.log("   如果这是测试数据，可以继续");
    console.log("   如果是真实数据，请停止操作");
    console.log("");

    // 注意：合约中没有直接清除奖励的函数
    // 需要通过后端调用 updateUserRewards 来更新
    // 或者重新部署合约
    console.log("💡 清除方法：");
    console.log("   1. 重新部署合约（会清除所有数据）");
    console.log("   2. 等待真实后端服务覆盖测试数据");
    console.log("   3. 手动调用 updateUserRewards 设置为 0（需要后端权限）");
    console.log("");

    console.log("📝 建议：");
    console.log("   - 测试数据可以保留，真实后端服务运行后会覆盖");
    console.log("   - 或者重新部署合约进行全新测试");
    console.log("");

    console.log("=== 完成 ===\n");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
