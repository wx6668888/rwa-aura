import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * 检查用户的质押记录
 * 用于调试为什么新质押不显示
 * 
 * 使用方式:
 * npx hardhat run scripts/check-user-stakes.ts --network localhost
 */

async function main() {
    console.log("\n=== 检查用户质押记录 ===\n");

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

    console.log("用户地址:", userAddress);
    console.log("StakingContract 地址:", stakingAddress);
    console.log("");

    // 获取合约实例
    const StakingContract = await ethers.getContractFactory("StakingContract");
    const staking = StakingContract.attach(stakingAddress);

    // 1. 检查用户质押信息（USDT）
    console.log("1. 检查 USDT 质押信息:");
    const userStakeInfo = await staking.getUserStakeInfo(userAddress);
    console.log("   总质押:", ethers.formatUnits(userStakeInfo[0], 18), "USDT");
    console.log("   RWA 待提取:", ethers.formatUnits(userStakeInfo[1], 18), "RWA");
    console.log("   USDT 奖励:", ethers.formatUnits(userStakeInfo[2], 18), "USDT");
    console.log("   首次质押时间:", new Date(Number(userStakeInfo[6]) * 1000).toLocaleString());
    console.log("");

    // 2. 检查 RWA 质押信息
    console.log("2. 检查 RWA 质押信息:");
    const rwaStakeInfo = await staking.rwaStakes(userAddress);
    console.log("   总 RWA 质押:", ethers.formatUnits(rwaStakeInfo[0], 18), "RWA");
    console.log("   RWA 待提取:", ethers.formatUnits(rwaStakeInfo[1], 18), "RWA");
    console.log("   首次质押时间:", new Date(Number(rwaStakeInfo[4]) * 1000).toLocaleString());
    console.log("");

    // 3. 查询最近的质押事件
    console.log("3. 查询最近的质押事件:");
    const provider = ethers.provider;
    const currentBlock = await provider.getBlockNumber();
    const fromBlock = currentBlock > 1000n ? currentBlock - 1000n : 0n;
    
    console.log("   当前区块:", currentBlock.toString());
    console.log("   查询范围: 从区块", fromBlock.toString(), "到最新");
    console.log("");

    // 查询 StakeEvent (USDT 质押)
    const stakeEventFilter = staking.filters.StakeEvent(userAddress);
    const stakeEvents = await staking.queryFilter(stakeEventFilter, fromBlock);
    console.log(`   ✅ 查询到 ${stakeEvents.length} 个 USDT 质押事件:`);
    for (let i = 0; i < stakeEvents.length; i++) {
        const event = stakeEvents[i];
        const args = event.args as any;
        console.log(`     事件 #${i + 1}:`);
        console.log(`       StakeId: ${args.stakeId.toString()}`);
        console.log(`       金额: ${ethers.formatUnits(args.amount, 6)} USDT`);
        console.log(`       推荐人: ${args.referrer}`);
        console.log(`       时间戳: ${new Date(Number(args.timestamp) * 1000).toLocaleString()}`);
        console.log(`       区块: ${event.blockNumber}`);
        console.log(`       交易哈希: ${event.transactionHash}`);
        console.log("");
    }

    // 查询 RWAStakeEvent (RWA 质押)
    const rwaStakeEventFilter = staking.filters.RWAStakeEvent(userAddress);
    const rwaStakeEvents = await staking.queryFilter(rwaStakeEventFilter, fromBlock);
    console.log(`   ✅ 查询到 ${rwaStakeEvents.length} 个 RWA 质押事件:`);
    for (let i = 0; i < rwaStakeEvents.length; i++) {
        const event = rwaStakeEvents[i];
        const args = event.args as any;
        console.log(`     事件 #${i + 1}:`);
        console.log(`       StakeId: ${args.stakeId.toString()}`);
        console.log(`       金额: ${ethers.formatUnits(args.amount, 18)} RWA`);
        console.log(`       推荐人: ${args.referrer}`);
        console.log(`       时间戳: ${new Date(Number(args.timestamp) * 1000).toLocaleString()}`);
        console.log(`       锁仓期限: ${args.lockPeriod.toString()} 天`);
        console.log(`       区块: ${event.blockNumber}`);
        console.log(`       交易哈希: ${event.transactionHash}`);
        console.log("");
    }

    // 4. 总结
    console.log("4. 总结:");
    console.log(`   总 USDT 质押事件: ${stakeEvents.length}`);
    console.log(`   总 RWA 质押事件: ${rwaStakeEvents.length}`);
    console.log(`   总质押事件: ${stakeEvents.length + rwaStakeEvents.length}`);
    console.log("");

    if (stakeEvents.length === 0 && rwaStakeEvents.length === 0) {
        console.log("⚠️  未查询到质押事件！");
        console.log("   可能的原因:");
        console.log("   1. 质押交易还未确认");
        console.log("   2. 质押交易失败");
        console.log("   3. 事件查询范围太小（当前查询最近 1000 个区块）");
        console.log("");
        console.log("   建议:");
        console.log("   1. 检查交易是否成功");
        console.log("   2. 等待交易确认");
        console.log("   3. 刷新前端页面");
    } else {
        console.log("✅ 质押事件已找到，前端应该能显示！");
        console.log("   如果前端仍不显示，请:");
        console.log("   1. 刷新浏览器页面");
        console.log("   2. 检查浏览器控制台是否有错误");
        console.log("   3. 确认前端使用的合约地址是否正确");
    }

    console.log("\n=== 完成 ===\n");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
