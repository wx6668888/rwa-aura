import { ethers } from "hardhat";

/**
 * 部署缺失的核心合约到BSC测试网
 * 
 * 使用方式:
 * npx hardhat run scripts/deploy-missing-contracts.ts --network bscTestnet
 */

async function main() {
    console.log("\n=== 部署缺失的核心合约 ===\n");

    const [deployer] = await ethers.getSigners();
    console.log("部署账户:", deployer.address);
    console.log("账户余额:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "BNB\n");

    // 现有合约地址
    const STAKING_CONTRACT = "0xB4FD045003C402BE6ebaAECFD27105343CB7B3bE";
    const RWA_TOKEN = "0xb2dFB4e2BA97c45c9664f20AB6Df768A9468CdD6";
    const USDT_TOKEN = "0xb2E5F116B70df3148b49CC4b25354A3DD723BAe2";

    try {
        // 1. 部署 StRWA
        console.log("1. 部署 StRWA...");
        const StRWAFactory = await ethers.getContractFactory("StRWA");
        const stRWA = await StRWAFactory.deploy();
        await stRWA.waitForDeployment();
        const stRWAAddress = await stRWA.getAddress();
        console.log("   ✅ StRWA:", stRWAAddress);

        // 2. 部署 ReferralRewardPool
        console.log("\n2. 部署 ReferralRewardPool...");
        const ReferralPoolFactory = await ethers.getContractFactory("ReferralRewardPool");
        const referralPool = await ReferralPoolFactory.deploy(
            STAKING_CONTRACT,
            RWA_TOKEN
        );
        await referralPool.waitForDeployment();
        const referralPoolAddress = await referralPool.getAddress();
        console.log("   ✅ ReferralRewardPool:", referralPoolAddress);

        // 3. 配置 StakingContract
        console.log("\n3. 配置 StakingContract...");
        const staking = await ethers.getContractAt("StakingContract", STAKING_CONTRACT);
        
        console.log("   设置 StRWA 地址...");
        const tx1 = await staking.setStRwaToken(stRWAAddress);
        await tx1.wait();
        console.log("   ✅ StRWA 地址已设置");

        console.log("   设置 ReferralRewardPool 地址...");
        const tx2 = await staking.setReferralRewardPool(referralPoolAddress);
        await tx2.wait();
        console.log("   ✅ ReferralRewardPool 地址已设置");

        // 4. 配置 StRWA
        console.log("\n4. 配置 StRWA...");
        console.log("   设置 StakingContract 为 minter...");
        const tx3 = await stRWA.setStakingContract(STAKING_CONTRACT);
        await tx3.wait();
        console.log("   ✅ StakingContract 已授权");

        // 输出部署信息
        console.log("\n=== 部署完成 ===\n");
        console.log("StRWA:", stRWAAddress);
        console.log("ReferralRewardPool:", referralPoolAddress);
        console.log("\n请更新 .env 文件:");
        console.log(`STRWA_ADDRESS=${stRWAAddress}`);
        console.log(`REFERRAL_POOL_ADDRESS=${referralPoolAddress}`);

    } catch (error) {
        console.error("\n❌ 部署失败:", error);
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
