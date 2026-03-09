import { ethers } from "hardhat";

/**
 * 检查用户质押记录（使用前端实际使用的合约地址）
 */

async function main() {
    console.log("\n=== 检查用户质押记录（区块链） ===\n");

    const userAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
    const referrerAddress = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC";
    
    // 使用前端实际使用的合约地址
    const stakingAddress = "0x610178dA211FEF7D417bC0e6FeD39F05609AD788";

    console.log("用户地址:", userAddress);
    console.log("推荐人地址:", referrerAddress);
    console.log("StakingContract 地址:", stakingAddress);
    console.log("");

    // 获取合约实例
    const StakingContract = await ethers.getContractFactory("StakingContract");
    const stakingContract = StakingContract.attach(stakingAddress);

    // 检查合约代码是否存在
    const code = await ethers.provider.getCode(stakingAddress);
    if (code === "0x") {
        console.error("❌ 合约地址没有代码，请确认合约地址是否正确");
        process.exit(1);
    }
    console.log("✅ 合约已部署");
    console.log("");

    // 获取当前区块号
    const currentBlock = await ethers.provider.getBlockNumber();
    console.log("当前区块号:", currentBlock.toString());
    console.log("");

    // 1. 查询所有 RWAStakeEvent
    console.log("📊 1. 查询所有 RWAStakeEvent:");
    try {
        const rwaFilter = stakingContract.filters.RWAStakeEvent(userAddress);
        const rwaEvents = await stakingContract.queryFilter(rwaFilter, 0, currentBlock);
        
        console.log(`   找到 ${rwaEvents.length} 个 RWAStakeEvent`);
        if (rwaEvents.length > 0) {
            rwaEvents.forEach((event, index) => {
                const args = event.args;
                if (args) {
                    const isReferrerMatch = args.referrer.toLowerCase() === referrerAddress.toLowerCase();
                    console.log(`\n   事件 ${index + 1}:`);
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
        } else {
            console.log("   ⚠️  未找到 RWAStakeEvent");
        }
    } catch (error: any) {
        console.error("   ❌ 错误:", error.message);
    }
    console.log("");

    // 2. 查询所有 RWAStakeEvent（不限制用户，查看最近的）
    console.log("📊 2. 查询所有 RWAStakeEvent（最近10个）:");
    try {
        const allRwaFilter = stakingContract.filters.RWAStakeEvent();
        const fromBlock = currentBlock > 50 ? currentBlock - 50n : 0n;
        const allRwaEvents = await stakingContract.queryFilter(allRwaFilter, fromBlock, currentBlock);
        
        console.log(`   在最近50个区块中找到 ${allRwaEvents.length} 个 RWAStakeEvent`);
        if (allRwaEvents.length > 0) {
            allRwaEvents.forEach((event, index) => {
                const args = event.args;
                if (args) {
                    const isUserEvent = args.user.toLowerCase() === userAddress.toLowerCase();
                    console.log(`\n   事件 ${index + 1} ${isUserEvent ? '✅ (您的交易)' : ''}:`);
                    console.log(`     用户: ${args.user}`);
                    console.log(`     金额: ${ethers.formatEther(args.amount)} RWA`);
                    console.log(`     推荐人: ${args.referrer}`);
                    console.log(`     Stake ID: ${args.stakeId.toString()}`);
                    console.log(`     区块号: ${event.blockNumber.toString()}`);
                    console.log(`     交易哈希: ${event.transactionHash}`);
                }
            });
        }
    } catch (error: any) {
        console.error("   ❌ 错误:", error.message);
    }
    console.log("");

    // 3. 检查用户的 RWA 质押信息
    console.log("📊 3. 检查用户的 RWA 质押信息 (rwaStakes mapping):");
    try {
        const rwaStakeInfo = await stakingContract.rwaStakes(userAddress);
        console.log(`   总 RWA 质押: ${ethers.formatEther(rwaStakeInfo.totalStakedRWA)} RWA`);
        console.log(`   RWA 待提取: ${ethers.formatEther(rwaStakeInfo.rwaPending)} RWA`);
        console.log(`   推荐人: ${rwaStakeInfo.referrer}`);
        console.log(`   推荐人匹配: ${rwaStakeInfo.referrer.toLowerCase() === referrerAddress.toLowerCase() ? '✅ 是' : '❌ 否'}`);
        console.log(`   首次质押时间: ${rwaStakeInfo.firstStakeTime.toString() === '0' ? '未设置' : new Date(Number(rwaStakeInfo.firstStakeTime) * 1000).toLocaleString()}`);
        console.log(`   节点等级: ${rwaStakeInfo.nodeLevel.toString()}`);
        console.log(`   是否活跃: ${rwaStakeInfo.isActive}`);
    } catch (error: any) {
        console.error("   ❌ 错误:", error.message);
    }
    console.log("");

    // 4. 检查用户的锁定本金
    console.log("📊 4. 检查用户的锁定本金 (rwaLockedPrincipals):");
    try {
        const lockedPrincipals = await stakingContract.rwaLockedPrincipals(userAddress);
        console.log(`   锁定本金数量: ${lockedPrincipals.length}`);
        if (lockedPrincipals.length > 0) {
            lockedPrincipals.forEach((principal, index) => {
                console.log(`\n   本金 ${index + 1}:`);
                console.log(`     Stake ID: ${principal.stakeId.toString()}`);
                console.log(`     金额: ${ethers.formatEther(principal.principalAmount)} RWA`);
                console.log(`     锁仓开始: ${new Date(Number(principal.lockStartTime) * 1000).toLocaleString()}`);
                console.log(`     锁仓结束: ${new Date(Number(principal.lockEndTime) * 1000).toLocaleString()}`);
                console.log(`     锁仓期: ${principal.lockPeriod.toString()} 天`);
                console.log(`     是否已提取: ${principal.isWithdrawn}`);
            });
        }
    } catch (error: any) {
        console.error("   ❌ 错误:", error.message);
    }
    console.log("");

    // 5. 检查用户的 UserInfo
    console.log("📊 5. 检查用户的 UserInfo (users mapping):");
    try {
        const userInfo = await stakingContract.users(userAddress);
        console.log(`   总质押: ${ethers.formatEther(userInfo.totalStaked)} USDT`);
        console.log(`   RWA 待提取: ${ethers.formatEther(userInfo.rwaPending)} RWA`);
        console.log(`   USDT 奖励: ${ethers.formatEther(userInfo.usdtRewards)} USDT`);
        console.log(`   推荐人: ${userInfo.referrer}`);
        console.log(`   推荐人匹配: ${userInfo.referrer.toLowerCase() === referrerAddress.toLowerCase() ? '✅ 是' : '❌ 否'}`);
        console.log(`   首次质押时间: ${userInfo.firstStakeTime.toString() === '0' ? '未设置' : new Date(Number(userInfo.firstStakeTime) * 1000).toLocaleString()}`);
        console.log(`   节点等级: ${userInfo.nodeLevel.toString()}`);
        console.log(`   是否活跃: ${userInfo.isActive}`);
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
