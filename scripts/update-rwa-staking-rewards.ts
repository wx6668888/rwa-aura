import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * 更新 RWA 质押奖励
 * 用于测试前端显示待提取 RWA 代币
 * 
 * 使用方式:
 * npx hardhat run scripts/update-rwa-staking-rewards.ts --network localhost
 */

async function main() {
    console.log("\n=== 更新 RWA 质押奖励 ===\n");

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
    const userAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"; // Deployer 地址
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

    // 检查用户 RWA 质押信息
    const rwaStakeInfo = await staking.rwaStakes(userAddress);
    const totalStakedRWA = rwaStakeInfo[0];
    const firstStakeTime = Number(rwaStakeInfo[4]);
    
    if (totalStakedRWA === 0n) {
        console.log("⚠️  用户还没有 RWA 质押，无法更新奖励");
        console.log("   请先质押 RWA 后再运行此脚本");
        process.exit(1);
    }

    console.log("用户总 RWA 质押:", ethers.formatEther(totalStakedRWA), "RWA");
    console.log("首次质押时间:", new Date(firstStakeTime * 1000).toLocaleString());
    console.log("");

    // 检查当前奖励
    const currentRwaPending = rwaStakeInfo[1];
    console.log("当前 RWA 待提取:", ethers.formatEther(currentRwaPending), "RWA");
    console.log("");

    // 计算收益
    const now = Math.floor(Date.now() / 1000);
    const elapsedSeconds = Math.max(0, now - firstStakeTime);
    const elapsedDays = elapsedSeconds / 86400;

    // RWA 质押收益计算
    // 每日收益 = 质押金额 × 0.8% × 锁仓倍数
    const baseDailyRate = 0.008; // 0.8%
    const lockMultiplier = 1.0; // 假设是灵活锁仓（如果是锁仓，需要从合约读取）
    const dailyRate = baseDailyRate * lockMultiplier;
    
    // 计算每日收益（USDT 等值）
    const totalStakedUSDT = parseFloat(ethers.formatEther(totalStakedRWA)) * 0.85; // 假设 1 RWA = 0.85 USDT
    const dailyUSDTYield = totalStakedUSDT * dailyRate;
    const dailyRWAYield = dailyUSDTYield / 0.85; // 转换为 RWA
    
    // 总收益（按天数计算）
    const totalRWAYield = dailyRWAYield * elapsedDays;

    console.log("💰 收益计算:");
    console.log("  经过秒数:", elapsedSeconds);
    console.log("  经过天数:", elapsedDays.toFixed(4));
    console.log("  每日 RWA 收益:", dailyRWAYield.toFixed(6), "RWA");
    console.log("  总 RWA 收益:", totalRWAYield.toFixed(6), "RWA");
    console.log("");

    // 确保 StakingContract 有足够的 RWA
    const stakingRwaBalance = await rwaToken.balanceOf(stakingAddress);
    const neededRWA = ethers.parseEther(totalRWAYield.toFixed(18));
    
    console.log("StakingContract RWA 余额:", ethers.formatEther(stakingRwaBalance), "RWA");
    console.log("需要 RWA 奖励:", ethers.formatEther(neededRWA), "RWA");
    
    if (stakingRwaBalance < neededRWA) {
        console.log("⚠️  StakingContract RWA 余额不足，正在转账...");
        const needed = neededRWA - stakingRwaBalance;
        const tx = await rwaToken.transfer(stakingAddress, needed);
        await tx.wait();
        console.log("✅ 已转账", ethers.formatEther(needed), "RWA 到 StakingContract");
    }

    // 检查后端地址权限
    const backendAddress = await staking.backendAddress();
    console.log("合约中的后端地址:", backendAddress);
    
    if (backendAddress.toLowerCase() !== deployer.address.toLowerCase()) {
        console.log("⚠️  当前账户不是后端地址，尝试设置...");
        try {
            const owner = await staking.owner();
            if (owner.toLowerCase() === deployer.address.toLowerCase()) {
                const tx = await staking.setBackendAddress(deployer.address);
                await tx.wait();
                console.log("✅ 后端地址已设置为当前账户");
            } else {
                console.log("❌ 当前账户不是合约 owner，无法设置后端地址");
                console.log("   请使用 owner 账户或后端地址运行此脚本");
                process.exit(1);
            }
        } catch (error: any) {
            console.log("❌ 设置后端地址失败:", error.message);
            process.exit(1);
        }
    }

    // 生成唯一的 stakeId
    const stakeId = BigInt(now) * 10000n + BigInt(Math.floor(Math.random() * 10000));

    // 分发奖励（RWA 质押奖励，usdtAmount = 0）
    try {
        console.log("正在更新 RWA 质押奖励...");
        console.log("  Stake ID:", stakeId.toString());
        console.log("  RWA 奖励:", ethers.formatEther(neededRWA), "RWA");
        console.log("  USDT 奖励: 0 USDT (RWA 质押只有 RWA 奖励)");
        console.log("");

        const tx = await staking.connect(deployer).updateUserRewards(
            userAddress,
            neededRWA, // rwAmount
            0, // usdtAmount = 0 表示这是 RWA 质押奖励
            stakeId
        );
        console.log("交易哈希:", tx.hash);
        await tx.wait();
        console.log("✅ 奖励更新成功！");
        console.log("");

        // 检查更新后的奖励
        const newRwaStakeInfo = await staking.rwaStakes(userAddress);
        const newRwaPending = ethers.formatEther(newRwaStakeInfo[1]);
        console.log("更新后 RWA 待提取:", newRwaPending, "RWA");
        console.log("");

        console.log("✅ 现在前端应该能显示 RWA 待提取余额了！");
        console.log("   请刷新前端页面 http://localhost:3000/dashboard 查看");

    } catch (error: any) {
        console.error("❌ 更新奖励失败:", error.message);
        
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
