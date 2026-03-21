import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * 检查用户的质押事件
 * 
 * 使用方式:
 * npx hardhat run scripts/check-stake-events.ts --network localhost
 */

async function main() {
    console.log("\n=== 检查用户质押事件 ===\n");

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

    // 获取当前区块
    const currentBlock = await ethers.provider.getBlockNumber();
    console.log("当前区块:", currentBlock);
    console.log("");

    // 查询 StakeEvent 事件（从区块 0 开始）
    console.log("查询质押事件（从区块 0 到最新）...");
    const filter = staking.filters.StakeEvent(userAddress);
    const events = await staking.queryFilter(filter, 0, currentBlock);

    console.log(`找到 ${events.length} 个质押事件\n`);

    if (events.length === 0) {
        console.log("⚠️  没有找到质押事件");
        console.log("   可能原因：");
        console.log("   1. 用户还没有质押");
        console.log("   2. 质押发生在其他网络");
        console.log("   3. 合约地址不正确");
    } else {
        events.forEach((event, index) => {
            const args = event.args as any;
            console.log(`=== 质押 ${index + 1} ===`);
            console.log("StakeId:", args.stakeId?.toString());
            console.log("金额:", ethers.formatUnits(args.amount, 6), "USDT");
            console.log("推荐人:", args.referrer);
            console.log("时间戳:", new Date(Number(args.timestamp) * 1000).toLocaleString());
            console.log("区块号:", event.blockNumber);
            console.log("交易哈希:", event.transactionHash);
            console.log("");
        });
    }

    // 检查用户质押信息
    console.log("=== 用户质押信息 ===");
    const userStakeInfo = await staking.getUserStakeInfo(userAddress);
    console.log("总质押:", ethers.formatEther(userStakeInfo[0]), "RWA");
    console.log("");

    console.log("=== 检查完成 ===\n");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
