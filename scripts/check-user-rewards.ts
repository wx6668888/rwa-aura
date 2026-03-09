import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * 检查用户奖励状态
 * 
 * 使用方式:
 * npx hardhat run scripts/check-user-rewards.ts --network localhost
 */

async function main() {
    console.log("\n=== 检查用户奖励状态 ===\n");

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
    const stakingAddress = contractAddresses.StakingContract;

    console.log("用户地址:", userAddress);
    console.log("StakingContract 地址:", stakingAddress);
    console.log("");

    // 获取 StakingContract 合约实例
    const StakingContract = await ethers.getContractFactory("StakingContract");
    const staking = StakingContract.attach(stakingAddress);

    // 检查用户质押信息
    console.log("=== 用户质押信息 ===");
    const userStakeInfo = await staking.getUserStakeInfo(userAddress);
    console.log("总质押:", ethers.formatEther(userStakeInfo[0]), "RWA (18 decimals)");
    console.log("RWA 待提取:", ethers.formatEther(userStakeInfo[1]), "RWA");
    console.log("USDT 奖励:", ethers.formatEther(userStakeInfo[2]), "USDT");
    console.log("最后提现时间:", new Date(Number(userStakeInfo[3]) * 1000).toLocaleString());
    console.log("推荐人:", userStakeInfo[4]);
    console.log("节点等级:", userStakeInfo[5]);
    console.log("首次质押时间:", userStakeInfo[6] ? new Date(Number(userStakeInfo[6]) * 1000).toLocaleString() : "未质押");
    console.log("是否活跃:", userStakeInfo[7]);
    console.log("");

    // 检查用户奖励
    console.log("=== 用户奖励信息 ===");
    const userRewards = await staking.getUserRewards(userAddress);
    console.log("RWA 待提取:", ethers.formatEther(userRewards[0]), "RWA");
    console.log("USDT 奖励:", ethers.formatEther(userRewards[1]), "USDT");
    console.log("");

    // 检查是否有质押记录
    if (userStakeInfo[0] === 0n) {
        console.log("⚠️  用户还没有质押");
        console.log("   需要先质押才能看到奖励");
        console.log("");
    } else {
        console.log("✅ 用户已质押");
    }

    // 检查是否有待提取的 RWA
    if (userRewards[0] === 0n) {
        console.log("⚠️  RWA 待提取为 0");
        console.log("   原因可能是：");
        console.log("   1. 还没有质押");
        console.log("   2. 后端还没有分发奖励");
        console.log("   3. 需要调用 updateUserRewards 来更新奖励");
        console.log("");
        console.log("💡 提示：");
        console.log("   - 如果已质押，需要后端调用 updateUserRewards 来分发奖励");
        console.log("   - 或者可以模拟后端分发奖励进行测试");
    } else {
        console.log("✅ 有待提取的 RWA");
    }

    console.log("\n=== 检查完成 ===\n");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
