import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * 检查最近的质押记录
 * 
 * 使用方式:
 * npx hardhat run scripts/check-recent-stake.ts --network localhost
 */

async function main() {
    console.log("\n=== 检查最近的质押记录 ===\n");

    const userAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
    const referrerAddress = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC";
    const expectedAmount = "1000"; // RWA

    console.log("用户地址:", userAddress);
    console.log("推荐人地址:", referrerAddress);
    console.log("预期金额: 1000 RWA");
    console.log("");

    // 读取部署的合约地址
    const addressesPath = path.join(__dirname, "..", "deployed-addresses-local.json");
    let contractAddresses: Record<string, string> = {};

    if (!fs.existsSync(addressesPath)) {
        console.error("❌ 未找到 deployed-addresses-local.json，请先运行部署脚本");
        process.exit(1);
    }

    const addressesContent = fs.readFileSync(addressesPath, "utf-8");
    contractAddresses = JSON.parse(addressesContent);

    const stakingAddress = contractAddresses.StakingContract;
    if (!stakingAddress) {
        console.error("❌ 未找到 StakingContract 地址");
        process.exit(1);
    }

    console.log("StakingContract 地址:", stakingAddress);
    console.log("");

    // 获取合约实例
    const StakingContract = await ethers.getContractFactory("StakingContract");
    const stakingContract = StakingContract.attach(stakingAddress);

    // 1. 检查 RWA 质押事件（最近10个区块）
    console.log("📊 1. 检查最近的 RWA 质押事件 (RWAStakeEvent):");
    try {
        const currentBlock = await ethers.provider.getBlockNumber();
        const fromBlock = currentBlock > 100 ? BigInt(currentBlock) - 100n : 0n;
        
        console.log(`   查询区块范围: ${fromBlock} - ${currentBlock}`);
        
        const filter = stakingContract.filters.RWAStakeEvent(userAddress);
        const events = await stakingContract.queryFilter(filter, fromBlock, currentBlock);
        
        if (events.length === 0) {
            console.log("   ⚠️  在最近100个区块中未找到 RWA 质押事件");
            console.log("   尝试查询所有区块...");
            
            const allEvents = await stakingContract.queryFilter(filter, 0, currentBlock);
            if (allEvents.length === 0) {
                console.log("   ❌ 未找到任何 RWA 质押事件");
            } else {
                console.log(`   ✅ 找到 ${allEvents.length} 个 RWA 质押事件:`);
                allEvents.forEach((event, index) => {
                    const args = event.args;
                    if (args) {
                        console.log(`   事件 ${index + 1}:`);
                        console.log(`     用户: ${args.user}`);
                        console.log(`     金额: ${ethers.formatEther(args.amount)} RWA`);
                        console.log(`     推荐人: ${args.referrer}`);
                        console.log(`     Stake ID: ${args.stakeId.toString()}`);
                        console.log(`     时间戳: ${new Date(Number(args.timestamp) * 1000).toLocaleString()}`);
                        console.log(`     锁仓期: ${args.lockPeriod.toString()} 天`);
                        console.log(`     交易哈希: ${event.transactionHash}`);
                        console.log(`     区块号: ${event.blockNumber.toString()}`);
                        console.log("");
                    }
                });
            }
        } else {
            console.log(`   ✅ 找到 ${events.length} 个 RWA 质押事件:`);
            events.forEach((event, index) => {
                const args = event.args;
                if (args) {
                    console.log(`   事件 ${index + 1}:`);
                    console.log(`     用户: ${args.user}`);
                    console.log(`     金额: ${ethers.formatEther(args.amount)} RWA`);
                    console.log(`     推荐人: ${args.referrer}`);
                    console.log(`     推荐人匹配: ${args.referrer.toLowerCase() === referrerAddress.toLowerCase() ? '✅ 是' : '❌ 否'}`);
                    console.log(`     Stake ID: ${args.stakeId.toString()}`);
                    console.log(`     时间戳: ${new Date(Number(args.timestamp) * 1000).toLocaleString()}`);
                    console.log(`     锁仓期: ${args.lockPeriod.toString()} 天`);
                    console.log(`     交易哈希: ${event.transactionHash}`);
                    console.log(`     区块号: ${event.blockNumber.toString()}`);
                    console.log("");
                }
            });
        }
    } catch (error: any) {
        console.error("   ❌ 错误:", error.message);
    }
    console.log("");

    // 2. 检查用户的质押信息（使用 getUserStakeInfo）
    console.log("📊 2. 检查用户的质押信息 (getUserStakeInfo):");
    try {
        const userStakeInfo = await stakingContract.getUserStakeInfo(userAddress);
        console.log(`   总质押: ${ethers.formatEther(userStakeInfo.totalStaked)} USDT`);
        console.log(`   RWA 待提取: ${ethers.formatEther(userStakeInfo.rwaPending)} RWA`);
        console.log(`   USDT 奖励: ${ethers.formatEther(userStakeInfo.usdtRewards)} USDT`);
        console.log(`   推荐人: ${userStakeInfo.referrer}`);
        console.log(`   推荐人匹配: ${userStakeInfo.referrer.toLowerCase() === referrerAddress.toLowerCase() ? '✅ 是' : '❌ 否'}`);
        console.log(`   首次质押时间: ${userStakeInfo.firstStakeTime.toString() === '0' ? '未设置' : new Date(Number(userStakeInfo.firstStakeTime) * 1000).toLocaleString()}`);
        console.log(`   节点等级: ${userStakeInfo.nodeLevel.toString()}`);
        console.log(`   是否活跃: ${userStakeInfo.isActive}`);
    } catch (error: any) {
        console.error("   ❌ 错误:", error.message);
    }
    console.log("");

    // 4. 检查所有最近的 RWAStakeEvent（不限制用户）
    console.log("📊 4. 检查所有最近的 RWAStakeEvent（最近10个）:");
    try {
        const currentBlock = await ethers.provider.getBlockNumber();
        const fromBlock = currentBlock > 10 ? BigInt(currentBlock) - 10n : 0n;
        
        const filter = stakingContract.filters.RWAStakeEvent();
        const allEvents = await stakingContract.queryFilter(filter, fromBlock, currentBlock);
        
        if (allEvents.length === 0) {
            console.log("   ⚠️  在最近10个区块中未找到任何 RWAStakeEvent");
        } else {
            console.log(`   ✅ 找到 ${allEvents.length} 个 RWAStakeEvent:`);
            allEvents.forEach((event, index) => {
                const args = event.args;
                if (args) {
                    console.log(`   事件 ${index + 1}:`);
                    console.log(`     用户: ${args.user}`);
                    console.log(`     金额: ${ethers.formatEther(args.amount)} RWA`);
                    console.log(`     推荐人: ${args.referrer}`);
                    console.log(`     Stake ID: ${args.stakeId.toString()}`);
                    console.log(`     区块号: ${event.blockNumber.toString()}`);
                    console.log(`     交易哈希: ${event.transactionHash}`);
                    console.log("");
                }
            });
        }
    } catch (error: any) {
        console.error("   ❌ 错误:", error.message);
    }
    console.log("");

    console.log("=== 检查完成 ===\n");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
