import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * 检查用户的推荐关系信息
 * 
 * 使用方式:
 * npx hardhat run scripts/check-referral-info.ts --network localhost
 */

async function main() {
    console.log("\n=== 检查用户推荐关系信息 ===\n");

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

    // 检查用户的推荐信息
    console.log("=== 用户推荐信息 ===");
    const referralInfo = await staking.getReferralInfo(userAddress);
    console.log("推荐人:", referralInfo[0]);
    console.log("是否有推荐人:", referralInfo[1]);
    console.log("");

    // 检查用户质押信息
    const userStakeInfo = await staking.getUserStakeInfo(userAddress);
    console.log("=== 用户质押信息 ===");
    console.log("总质押:", ethers.formatEther(userStakeInfo[0]), "RWA");
    console.log("RWA 待提取:", ethers.formatEther(userStakeInfo[1]), "RWA");
    console.log("USDT 奖励:", ethers.formatEther(userStakeInfo[2]), "USDT");
    console.log("节点等级:", userStakeInfo[5]);
    console.log("");

    // 查询所有质押事件，找出谁推荐了当前用户
    console.log("=== 查询推荐关系 ===");
    const currentBlock = await ethers.provider.getBlockNumber();
    const filter = staking.filters.StakeEvent();
    const allEvents = await staking.queryFilter(filter, 0, currentBlock);

    // 找出当前用户的推荐人
    const userStakeEvents = allEvents.filter((e: any) => e.args.user.toLowerCase() === userAddress.toLowerCase());
    if (userStakeEvents.length > 0) {
        const firstStake = userStakeEvents[0];
        console.log("首次质押时的推荐人:", firstStake.args.referrer);
        console.log("首次质押时间:", new Date(Number(firstStake.args.timestamp) * 1000).toLocaleString());
        console.log("");
    }

    // 找出当前用户推荐的所有人（直推）
    console.log("=== 直推列表 ===");
    const directReferrals: string[] = [];
    const referralEvents = allEvents.filter((e: any) => 
        e.args.referrer.toLowerCase() === userAddress.toLowerCase()
    );

    if (referralEvents.length === 0) {
        console.log("❌ 没有找到直推用户");
    } else {
        console.log(`找到 ${referralEvents.length} 个直推用户:\n`);
        referralEvents.forEach((event, index) => {
            const args = event.args as any;
            const referralAddress = args.user;
            if (!directReferrals.includes(referralAddress)) {
                directReferrals.push(referralAddress);
                
                // 获取被推荐人的质押信息
                staking.getUserStakeInfo(referralAddress).then((info: any) => {
                    console.log(`直推 ${index + 1}:`);
                    console.log("  地址:", referralAddress);
                    console.log("  总质押:", ethers.formatEther(info[0]), "RWA");
                    console.log("  首次质押时间:", new Date(Number(event.args.timestamp) * 1000).toLocaleString());
                    console.log("");
                }).catch(() => {
                    console.log(`直推 ${index + 1}:`);
                    console.log("  地址:", referralAddress);
                    console.log("  首次质押时间:", new Date(Number(event.args.timestamp) * 1000).toLocaleString());
                    console.log("");
                });
            }
        });
    }

    // 检查奖励来源
    console.log("=== 奖励来源分析 ===");
    console.log("RWA 待提取:", ethers.formatEther(userStakeInfo[1]), "RWA");
    console.log("USDT 奖励:", ethers.formatEther(userStakeInfo[2]), "USDT");
    console.log("");
    console.log("⚠️  注意：这些奖励可能是：");
    console.log("   1. 后端分发的真实奖励");
    console.log("   2. 测试脚本模拟的奖励（simulate-backend-rewards.ts）");
    console.log("   3. 需要检查后端服务是否在运行");
    console.log("");

    console.log("=== 检查完成 ===\n");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
