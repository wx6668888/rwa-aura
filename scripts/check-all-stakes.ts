import { ethers } from "hardhat";

/**
 * 检查所有质押事件
 */

async function main() {
    console.log("\n=== 检查所有质押事件 ===\n");

    const stakingAddress = "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9";
    const userAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
    const referrerAddress = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC";

    console.log("StakingContract 地址:", stakingAddress);
    console.log("用户地址:", userAddress);
    console.log("推荐人地址:", referrerAddress);
    console.log("");

    // 获取合约实例
    const StakingContract = await ethers.getContractFactory("StakingContract");
    const stakingContract = StakingContract.attach(stakingAddress);

    // 获取当前区块号
    const currentBlock = await ethers.provider.getBlockNumber();
    console.log("当前区块号:", currentBlock.toString());
    console.log("");

    // 1. 查询所有 RWAStakeEvent
    console.log("📊 查询所有 RWAStakeEvent:");
    try {
        const rwaFilter = stakingContract.filters.RWAStakeEvent();
        const rwaEvents = await stakingContract.queryFilter(rwaFilter, 0, currentBlock);
        
        console.log(`   找到 ${rwaEvents.length} 个 RWAStakeEvent`);
        if (rwaEvents.length > 0) {
            rwaEvents.forEach((event, index) => {
                const args = event.args;
                if (args) {
                    const isUserEvent = args.user.toLowerCase() === userAddress.toLowerCase();
                    const isReferrerMatch = args.referrer.toLowerCase() === referrerAddress.toLowerCase();
                    
                    console.log(`\n   事件 ${index + 1} ${isUserEvent ? '✅ (您的交易)' : ''}:`);
                    console.log(`     用户: ${args.user}`);
                    console.log(`     金额: ${ethers.formatEther(args.amount)} RWA`);
                    console.log(`     推荐人: ${args.referrer}`);
                    console.log(`     推荐人匹配: ${isReferrerMatch ? '✅ 是' : '❌ 否'}`);
                    console.log(`     Stake ID: ${args.stakeId.toString()}`);
                    console.log(`     时间戳: ${new Date(Number(args.timestamp) * 1000).toLocaleString()}`);
                    console.log(`     锁仓期: ${args.lockPeriod.toString()} 天`);
                    console.log(`     交易哈希: ${event.transactionHash}`);
                    console.log(`     区块号: ${event.blockNumber.toString()}`);
                }
            });
        }
    } catch (error: any) {
        console.error("   ❌ 错误:", error.message);
    }
    console.log("");

    // 2. 查询所有 StakeEvent (USDT)
    console.log("📊 查询所有 StakeEvent (USDT):");
    try {
        const stakeFilter = stakingContract.filters.StakeEvent();
        const stakeEvents = await stakingContract.queryFilter(stakeFilter, 0, currentBlock);
        
        console.log(`   找到 ${stakeEvents.length} 个 StakeEvent`);
        if (stakeEvents.length > 0) {
            stakeEvents.forEach((event, index) => {
                const args = event.args;
                if (args) {
                    const isUserEvent = args.user.toLowerCase() === userAddress.toLowerCase();
                    const isReferrerMatch = args.referrer.toLowerCase() === referrerAddress.toLowerCase();
                    
                    console.log(`\n   事件 ${index + 1} ${isUserEvent ? '✅ (您的交易)' : ''}:`);
                    console.log(`     用户: ${args.user}`);
                    console.log(`     金额: ${ethers.formatEther(args.amount)} USDT`);
                    console.log(`     推荐人: ${args.referrer}`);
                    console.log(`     推荐人匹配: ${isReferrerMatch ? '✅ 是' : '❌ 否'}`);
                    console.log(`     Stake ID: ${args.stakeId.toString()}`);
                    console.log(`     时间戳: ${new Date(Number(args.timestamp) * 1000).toLocaleString()}`);
                    console.log(`     锁仓期: ${args.lockPeriod.toString()} 天`);
                    console.log(`     交易哈希: ${event.transactionHash}`);
                    console.log(`     区块号: ${event.blockNumber.toString()}`);
                }
            });
        }
    } catch (error: any) {
        console.error("   ❌ 错误:", error.message);
    }
    console.log("");

    // 3. 检查合约是否可访问
    console.log("📊 检查合约状态:");
    try {
        const totalStakedRWA = await stakingContract.totalStakedRWA();
        console.log(`   总 RWA 质押: ${ethers.formatEther(totalStakedRWA)} RWA`);
    } catch (error: any) {
        console.error("   ⚠️  无法读取 totalStakedRWA:", error.message);
    }

    try {
        const code = await ethers.provider.getCode(stakingAddress);
        if (code === "0x") {
            console.log("   ❌ 合约地址没有代码，可能未部署或地址错误");
        } else {
            console.log("   ✅ 合约已部署");
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
