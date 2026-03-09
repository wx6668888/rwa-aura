import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * 部署所有合约到 BSC Testnet
 * 
 * 使用方式:
 * npx hardhat run scripts/deploy-to-bsc-testnet.ts --network bscTestnet
 */

async function main() {
    console.log("\n=== 开始部署到 BSC Testnet ===\n");

    const [deployer] = await ethers.getSigners();
    console.log("部署账户:", deployer.address);
    console.log("账户余额:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "BNB\n");

    const contractAddresses: Record<string, string> = {};

    try {
        // 1. 部署 RWAToken
        console.log("1. 部署 RWAToken...");
        const RWATokenFactory = await ethers.getContractFactory("RWAToken");
        const rwaToken = await RWATokenFactory.deploy(
            "RWA Token",
            "RWA",
            ethers.parseEther("1000000000"), // 1 billion
            deployer.address, // Treasury (临时，稍后更新)
            deployer.address  // Liquidity Fund (临时，稍后更新)
        );
        await rwaToken.waitForDeployment();
        const rwaTokenAddress = await rwaToken.getAddress();
        contractAddresses.RWAToken = rwaTokenAddress;
        console.log("   ✅ RWAToken:", rwaTokenAddress);

        // 2. 部署 StRWA
        console.log("\n2. 部署 StRWA...");
        const StRWAFactory = await ethers.getContractFactory("StRWA");
        const stRWA = await StRWAFactory.deploy();
        await stRWA.waitForDeployment();
        const stRWAAddress = await stRWA.getAddress();
        contractAddresses.StRWA = stRWAAddress;
        console.log("   ✅ StRWA:", stRWAAddress);

        // 3. 部署 TreasuryContract
        console.log("\n3. 部署 TreasuryContract...");
        // 需要先部署 TestUSDT 或使用真实 USDT 地址
        // 这里假设使用 TestUSDT
        const TestUSDTFactory = await ethers.getContractFactory("TestUSDT");
        const usdtToken = await TestUSDTFactory.deploy();
        await usdtToken.waitForDeployment();
        const usdtAddress = await usdtToken.getAddress();
        contractAddresses.TestUSDT = usdtAddress;
        console.log("   ✅ TestUSDT:", usdtAddress);

        const TreasuryFactory = await ethers.getContractFactory("TreasuryContract");
        const treasury = await TreasuryFactory.deploy(usdtAddress);
        await treasury.waitForDeployment();
        const treasuryAddress = await treasury.getAddress();
        contractAddresses.TreasuryContract = treasuryAddress;
        console.log("   ✅ TreasuryContract:", treasuryAddress);

        // 4. 部署 StakingContract
        console.log("\n4. 部署 StakingContract...");
        const StakingFactory = await ethers.getContractFactory("StakingContract");
        const staking = await StakingFactory.deploy(
            usdtAddress,
            rwaTokenAddress,
            treasuryAddress,
            deployer.address // Backend (临时，稍后更新)
        );
        await staking.waitForDeployment();
        const stakingAddress = await staking.getAddress();
        contractAddresses.StakingContract = stakingAddress;
        console.log("   ✅ StakingContract:", stakingAddress);

        // 5. 部署 SwapContract
        console.log("\n5. 部署 SwapContract...");
        const SwapFactory = await ethers.getContractFactory("SwapContract");
        const swap = await SwapFactory.deploy(
            rwaTokenAddress,
            stRWAAddress
        );
        await swap.waitForDeployment();
        const swapAddress = await swap.getAddress();
        contractAddresses.SwapContract = swapAddress;
        console.log("   ✅ SwapContract:", swapAddress);

        // 6. 部署 LiquidityManager
        console.log("\n6. 部署 LiquidityManager...");
        const LiquidityFactory = await ethers.getContractFactory("LiquidityManager");
        const liquidity = await LiquidityFactory.deploy(
            rwaTokenAddress,
            stRWAAddress,
            swapAddress,
            treasuryAddress
        );
        await liquidity.waitForDeployment();
        const liquidityAddress = await liquidity.getAddress();
        contractAddresses.LiquidityManager = liquidityAddress;
        console.log("   ✅ LiquidityManager:", liquidityAddress);

        // 7. 部署 PriceStabilizer
        console.log("\n7. 部署 PriceStabilizer...");
        // 需要 PancakeSwap Router 和 Factory 地址
        const PANCAKESWAP_ROUTER = "0xD99D1c33F9fC3444f8101754aBC46c52416550D1"; // BSC Testnet
        const PANCAKESWAP_FACTORY = "0x6725F303b657a9451d8BA641348b6761A6CC7a17"; // BSC Testnet
        
        const PriceStabilizerFactory = await ethers.getContractFactory("PriceStabilizer");
        const priceStabilizer = await PriceStabilizerFactory.deploy(
            rwaTokenAddress,
            usdtAddress,
            PANCAKESWAP_ROUTER,
            PANCAKESWAP_FACTORY
        );
        await priceStabilizer.waitForDeployment();
        const priceStabilizerAddress = await priceStabilizer.getAddress();
        contractAddresses.PriceStabilizer = priceStabilizerAddress;
        console.log("   ✅ PriceStabilizer:", priceStabilizerAddress);

        // 8. 部署 EmergencyPause
        console.log("\n8. 部署 EmergencyPause...");
        const EmergencyPauseFactory = await ethers.getContractFactory("EmergencyPause");
        const emergencyPause = await EmergencyPauseFactory.deploy();
        await emergencyPause.waitForDeployment();
        const emergencyPauseAddress = await emergencyPause.getAddress();
        contractAddresses.EmergencyPause = emergencyPauseAddress;
        console.log("   ✅ EmergencyPause:", emergencyPauseAddress);

        // 9. 配置合约关系
        console.log("\n=== 配置合约关系 ===");

        // 配置 StRWA
        await stRWA.setStakingContract(stakingAddress);
        console.log("   ✅ StRWA 配置完成");

        // 配置 RWAToken
        await rwaToken.setWhitelist(stakingAddress, true);
        await rwaToken.setWhitelist(swapAddress, true);
        await rwaToken.setWhitelist(priceStabilizerAddress, true);
        await rwaToken.setWhitelist(liquidityAddress, true);
        await rwaToken.setPriceStabilizerAddress(priceStabilizerAddress);
        console.log("   ✅ RWAToken 配置完成");

        // 配置 TreasuryContract
        await treasury.setStakingContractAddress(stakingAddress);
        await treasury.setLiquidityPoolAddress(liquidityAddress);
        await treasury.setReserveFundAddress(deployer.address); // 临时，稍后更新
        console.log("   ✅ TreasuryContract 配置完成");

        // 配置 SwapContract
        await swap.setRWAToken(rwaTokenAddress);
        await swap.setStRWAToken(stRWAAddress);
        console.log("   ✅ SwapContract 配置完成");

        // 注册合约到 EmergencyPause
        await emergencyPause.registerContract(stakingAddress);
        await emergencyPause.registerContract(swapAddress);
        await emergencyPause.registerContract(treasuryAddress);
        await emergencyPause.registerContract(liquidityAddress);
        await emergencyPause.registerContract(priceStabilizerAddress);
        console.log("   ✅ EmergencyPause 配置完成");

        // 保存合约地址
        const addressesPath = path.join(__dirname, "..", "deployed-addresses.json");
        fs.writeFileSync(
            addressesPath,
            JSON.stringify(contractAddresses, null, 2)
        );
        console.log("\n✅ 合约地址已保存到:", addressesPath);

        console.log("\n=== 部署完成 ===\n");
        console.log("合约地址汇总:");
        Object.entries(contractAddresses).forEach(([name, address]) => {
            console.log(`  ${name}: ${address}`);
        });

    } catch (error) {
        console.error("\n❌ 部署失败:", error);
        throw error;
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
