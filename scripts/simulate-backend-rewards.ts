import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * 模拟后端分发奖励
 * 用于测试前端显示
 * 
 * 使用方式:
 * npx hardhat run scripts/simulate-backend-rewards.ts --network localhost
 */

async function main() {
    console.log("\n=== 模拟后端分发奖励 ===\n");

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

    const [deployer] = await ethers.getSigners();
    // 使用第一个账户作为用户（您的测试账户）
    const userAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
    const stakingAddress = contractAddresses.StakingContract;
    const rwaTokenAddress = contractAddresses.RWAToken;

    console.log("后端地址（模拟）:", deployer.address);
    console.log("用户地址:", userAddress);
    console.log("StakingContract 地址:", stakingAddress);
    console.log("");

    // 获取合约实例
    const StakingContract = await ethers.getContractFactory("StakingContract");
    const staking = StakingContract.attach(stakingAddress);

    const RWAToken = await ethers.getContractFactory("RWAToken");
    const rwaToken = RWAToken.attach(rwaTokenAddress);

    // 检查用户质押信息
    const userStakeInfo = await staking.getUserStakeInfo(userAddress);
    const totalStaked = userStakeInfo[0];
    
    if (totalStaked === 0n) {
        console.log("⚠️  用户还没有质押，无法分发奖励");
        console.log("   请先质押后再运行此脚本");
        process.exit(1);
    }

    console.log("用户总质押:", ethers.formatEther(totalStaked), "RWA");
    console.log("");

    // 检查当前奖励
    const currentRewards = await staking.getUserRewards(userAddress);
    console.log("当前 RWA 待提取:", ethers.formatEther(currentRewards[0]), "RWA");
    console.log("当前 USDT 奖励:", ethers.formatEther(currentRewards[1]), "USDT");
    console.log("");

    // 模拟分发奖励
    // 假设分发 100 RWA 和 50 USDT
    const rwaReward = ethers.parseEther("100"); // 100 RWA
    const usdtReward = ethers.parseEther("50");  // 50 USDT (18 decimals for internal calculation)
    const stakeId = 1; // 假设 stakeId 为 1

    console.log("准备分发奖励:");
    console.log("  RWA 奖励:", ethers.formatEther(rwaReward), "RWA");
    console.log("  USDT 奖励:", ethers.formatEther(usdtReward), "USDT");
    console.log("  StakeId:", stakeId);
    console.log("");

    // 确保 StakingContract 有足够的 RWA
    const stakingRwaBalance = await rwaToken.balanceOf(stakingAddress);
    console.log("StakingContract RWA 余额:", ethers.formatEther(stakingRwaBalance), "RWA");
    
    if (stakingRwaBalance < rwaReward) {
        console.log("⚠️  StakingContract RWA 余额不足，正在转账...");
        const needed = rwaReward - stakingRwaBalance;
        const tx = await rwaToken.transfer(stakingAddress, needed);
        await tx.wait();
        console.log("✅ 已转账", ethers.formatEther(needed), "RWA 到 StakingContract");
    }

    // 检查后端地址权限
    const backendAddress = await staking.backendAddress();
    console.log("合约中的后端地址:", backendAddress);
    
    if (backendAddress.toLowerCase() !== deployer.address.toLowerCase()) {
        console.log("⚠️  当前账户不是后端地址，尝试使用当前账户...");
        console.log("   如果失败，请使用正确的后端地址");
    }

    // 分发奖励
    try {
        console.log("正在分发奖励...");
        const tx = await staking.connect(deployer).updateUserRewards(
            userAddress,
            rwaReward,
            usdtReward,
            stakeId
        );
        console.log("交易哈希:", tx.hash);
        await tx.wait();
        console.log("✅ 奖励分发成功！");
        console.log("");

        // 检查更新后的奖励
        const newRewards = await staking.getUserRewards(userAddress);
        console.log("更新后 RWA 待提取:", ethers.formatEther(newRewards[0]), "RWA");
        console.log("更新后 USDT 奖励:", ethers.formatEther(newRewards[1]), "USDT");
        console.log("");

        console.log("✅ 现在前端应该能显示 RWA 待提取余额了！");
        console.log("   请刷新前端页面查看");

    } catch (error: any) {
        console.error("❌ 分发奖励失败:", error.message);
        
        if (error.message?.includes("Only backend can call")) {
            console.log("\n💡 解决方案:");
            console.log("   需要将当前账户设置为后端地址");
            console.log("   或者使用正确的后端地址运行此脚本");
        }
        
        throw error;
    }

    console.log("\n=== 完成 ===\n");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
