import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * 检查用户地址的质押状态
 * 
 * 使用方式:
 * npx hardhat run scripts/check-user-stake-status.ts --network localhost
 */

async function main() {
    console.log("\n=== 检查用户质押状态 ===\n");

    const userAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
    console.log("用户地址:", userAddress, "\n");

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
    const rwaTokenAddress = contractAddresses.RWAToken;
    const stRwaAddress = contractAddresses.StRWA;
    const usdtAddress = contractAddresses.TestUSDT;

    if (!stakingAddress || !rwaTokenAddress || !stRwaAddress || !usdtAddress) {
        console.error("❌ 未找到合约地址");
        process.exit(1);
    }

    console.log("合约地址:");
    console.log("  StakingContract:", stakingAddress);
    console.log("  RWAToken:", rwaTokenAddress);
    console.log("  StRWA:", stRwaAddress);
    console.log("  TestUSDT:", usdtAddress);
    console.log();

    // 获取合约实例
    const StakingContract = await ethers.getContractFactory("StakingContract");
    const stakingContract = StakingContract.attach(stakingAddress);

    const RWAToken = await ethers.getContractFactory("RWAToken");
    const rwaToken = RWAToken.attach(rwaTokenAddress);

    const StRWA = await ethers.getContractFactory("StRWA");
    const stRwaToken = StRWA.attach(stRwaAddress);

    const TestUSDT = await ethers.getContractFactory("TestUSDT");
    const usdtToken = TestUSDT.attach(usdtAddress);

    console.log("📊 1. 检查代币余额:");
    const rwaBalance = await rwaToken.balanceOf(userAddress);
    const stRwaBalance = await stRwaToken.balanceOf(userAddress);
    const usdtBalance = await usdtToken.balanceOf(userAddress);
    
    console.log(`   RWA 余额: ${ethers.formatEther(rwaBalance)} RWA`);
    console.log(`   stRWA 余额: ${ethers.formatEther(stRwaBalance)} stRWA`);
    console.log(`   USDT 余额: ${ethers.formatUnits(usdtBalance, 6)} USDT`);
    console.log();

    console.log("📊 2. 检查 USDT 质押信息 (getUserStakeInfo):");
    try {
        const userStakeInfo = await stakingContract.getUserStakeInfo(userAddress);
        console.log(`   totalStaked: ${ethers.formatUnits(userStakeInfo[0], 18)} (18 decimals)`);
        console.log(`   rwaPending: ${ethers.formatEther(userStakeInfo[1])} RWA`);
        console.log(`   usdtRewards: ${ethers.formatUnits(userStakeInfo[2], 18)} USDT`);
        console.log(`   lastWithdrawTime: ${userStakeInfo[3].toString()}`);
        console.log(`   referrer: ${userStakeInfo[4]}`);
        console.log(`   nodeLevel: ${userStakeInfo[5].toString()}`);
        console.log(`   firstStakeTime: ${userStakeInfo[6]?.toString() || 'N/A'}`);
    } catch (error: any) {
        console.error("   ❌ 错误:", error.message);
    }
    console.log();

    console.log("📊 3. 检查 RWA 质押信息 (rwaStakes mapping):");
    try {
        const rwaStakeInfo = await stakingContract.rwaStakes(userAddress);
        console.log(`   totalStakedRWA: ${ethers.formatEther(rwaStakeInfo.totalStakedRWA)} RWA`);
        console.log(`   rwaPending: ${ethers.formatEther(rwaStakeInfo.rwaPending)} RWA`);
        console.log(`   lastWithdrawTime: ${rwaStakeInfo.lastWithdrawTime.toString()}`);
        console.log(`   referrer: ${rwaStakeInfo.referrer}`);
        console.log(`   firstStakeTime: ${rwaStakeInfo.firstStakeTime.toString()}`);
        console.log(`   nodeLevel: ${rwaStakeInfo.nodeLevel.toString()}`);
        console.log(`   isActive: ${rwaStakeInfo.isActive}`);
    } catch (error: any) {
        console.error("   ❌ 错误:", error.message);
    }
    console.log();

    console.log("📊 4. 检查用户数据 (users mapping):");
    try {
        const userData = await stakingContract.users(userAddress);
        console.log(`   totalStaked: ${ethers.formatUnits(userData.totalStaked, 18)} (18 decimals)`);
        console.log(`   rwaPending: ${ethers.formatEther(userData.rwaPending)} RWA`);
        console.log(`   usdtRewards: ${ethers.formatUnits(userData.usdtRewards, 18)} USDT`);
        console.log(`   lastWithdrawTime: ${userData.lastWithdrawTime.toString()}`);
        console.log(`   referrer: ${userData.referrer}`);
        console.log(`   nodeLevel: ${userData.nodeLevel.toString()}`);
        console.log(`   firstStakeTime: ${userData.firstStakeTime.toString()}`);
        console.log(`   isActive: ${userData.isActive}`);
    } catch (error: any) {
        console.error("   ❌ 错误:", error.message);
    }
    console.log();

    console.log("📊 5. 检查 RWA 质押事件 (RWAStakeEvent):");
    try {
        const filter = stakingContract.filters.RWAStakeEvent(userAddress);
        const events = await stakingContract.queryFilter(filter);
        
        if (events.length === 0) {
            console.log("   ⚠️  没有找到 RWA 质押事件");
        } else {
            console.log(`   ✅ 找到 ${events.length} 个 RWA 质押事件:`);
            events.forEach((event, index) => {
                const args = event.args;
                if (args) {
                    console.log(`   事件 ${index + 1}:`);
                    console.log(`     用户: ${args.user}`);
                    console.log(`     金额: ${ethers.formatEther(args.amount)} RWA`);
                    console.log(`     推荐人: ${args.referrer}`);
                    console.log(`     Stake ID: ${args.stakeId.toString()}`);
                    console.log(`     时间戳: ${new Date(Number(args.timestamp) * 1000).toLocaleString()}`);
                    console.log(`     锁仓期: ${args.lockPeriod.toString()} 天`);
                }
            });
        }
    } catch (error: any) {
        console.error("   ❌ 错误:", error.message);
    }
    console.log();

    console.log("📊 6. 检查 USDT 质押事件 (StakeEvent):");
    try {
        const filter = stakingContract.filters.StakeEvent(userAddress);
        const events = await stakingContract.queryFilter(filter);
        
        if (events.length === 0) {
            console.log("   ⚠️  没有找到 USDT 质押事件");
        } else {
            console.log(`   ✅ 找到 ${events.length} 个 USDT 质押事件:`);
            events.forEach((event, index) => {
                const args = event.args;
                if (args) {
                    console.log(`   事件 ${index + 1}:`);
                    console.log(`     用户: ${args.user}`);
                    console.log(`     金额: ${ethers.formatUnits(args.amount, 6)} USDT`);
                    console.log(`     推荐人: ${args.referrer}`);
                    console.log(`     Stake ID: ${args.stakeId.toString()}`);
                    console.log(`     时间戳: ${new Date(Number(args.timestamp) * 1000).toLocaleString()}`);
                }
            });
        }
    } catch (error: any) {
        console.error("   ❌ 错误:", error.message);
    }
    console.log();

    console.log("📊 7. 检查全局统计:");
    try {
        const totalStaked = await stakingContract.totalStaked();
        const totalStakedRWA = await stakingContract.totalStakedRWA();
        console.log(`   总 USDT 质押: ${ethers.formatUnits(totalStaked, 18)} (18 decimals)`);
        console.log(`   总 RWA 质押: ${ethers.formatEther(totalStakedRWA)} RWA`);
    } catch (error: any) {
        console.error("   ❌ 错误:", error.message);
    }
    console.log();

    console.log("=== 检查完成 ===\n");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
