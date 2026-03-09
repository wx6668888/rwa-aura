import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * 本地测试部署脚本
 * 部署所有合约到 Hardhat Local 网络
 * 
 * 使用方式:
 * npx hardhat run scripts/deploy-local-test.ts --network localhost
 * 
 * 前置要求:
 * 1. 启动 Hardhat 本地节点: npx hardhat node
 */

async function main() {
    console.log("\n=== 开始本地测试部署 ===\n");

    const [deployer] = await ethers.getSigners();
    console.log("部署账户:", deployer.address);
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("账户余额:", ethers.formatEther(balance), "ETH\n");

    const contractAddresses: Record<string, string> = {};

    try {
        // 1. 部署 TestUSDT
        console.log("1. 部署 TestUSDT...");
        const TestUSDTFactory = await ethers.getContractFactory("TestUSDT");
        const usdtToken = await TestUSDTFactory.deploy();
        await usdtToken.waitForDeployment();
        const usdtAddress = await usdtToken.getAddress();
        contractAddresses.TestUSDT = usdtAddress;
        console.log("   ✅ TestUSDT:", usdtAddress);

        // 2. 部署 RWAToken
        console.log("\n2. 部署 RWAToken...");
        const RWATokenFactory = await ethers.getContractFactory("RWAToken");
        const rwaToken = await RWATokenFactory.deploy(
            "RWA Token",
            "RWA",
            ethers.parseEther("1000000000"), // 1 billion
            deployer.address, // Treasury (临时)
            deployer.address  // Liquidity Fund (临时)
        );
        await rwaToken.waitForDeployment();
        const rwaTokenAddress = await rwaToken.getAddress();
        contractAddresses.RWAToken = rwaTokenAddress;
        console.log("   ✅ RWAToken:", rwaTokenAddress);

        // 3. 部署 StRWA
        console.log("\n3. 部署 StRWA...");
        const StRWAFactory = await ethers.getContractFactory("StRWA");
        const stRWA = await StRWAFactory.deploy();
        await stRWA.waitForDeployment();
        const stRWAAddress = await stRWA.getAddress();
        contractAddresses.StRWA = stRWAAddress;
        console.log("   ✅ StRWA:", stRWAAddress);

        // 4. 部署 TreasuryContract
        console.log("\n4. 部署 TreasuryContract...");
        const TreasuryFactory = await ethers.getContractFactory("TreasuryContract");
        const treasury = await TreasuryFactory.deploy(usdtAddress);
        await treasury.waitForDeployment();
        const treasuryAddress = await treasury.getAddress();
        contractAddresses.TreasuryContract = treasuryAddress;
        console.log("   ✅ TreasuryContract:", treasuryAddress);

        // 5. 部署 StakingContract
        console.log("\n5. 部署 StakingContract...");
        const StakingFactory = await ethers.getContractFactory("StakingContract");
        const staking = await StakingFactory.deploy(
            usdtAddress,
            rwaTokenAddress,
            treasuryAddress,
            deployer.address // Backend (临时)
        );
        await staking.waitForDeployment();
        const stakingAddress = await staking.getAddress();
        contractAddresses.StakingContract = stakingAddress;
        console.log("   ✅ StakingContract:", stakingAddress);

        // 6. 部署 SwapContract
        console.log("\n6. 部署 SwapContract...");
        const SwapFactory = await ethers.getContractFactory("SwapContract");
        const swap = await SwapFactory.deploy(
            rwaTokenAddress,
            stRWAAddress
        );
        await swap.waitForDeployment();
        const swapAddress = await swap.getAddress();
        contractAddresses.SwapContract = swapAddress;
        console.log("   ✅ SwapContract:", swapAddress);

        // 7. 部署 LiquidityManager
        console.log("\n7. 部署 LiquidityManager...");
        const LiquidityFactory = await ethers.getContractFactory("LiquidityManager");
        const liquidity = await LiquidityFactory.deploy(
            rwaTokenAddress,
            usdtAddress  // 只需要 RWA 和 USDT 地址
        );
        await liquidity.waitForDeployment();
        const liquidityAddress = await liquidity.getAddress();
        contractAddresses.LiquidityManager = liquidityAddress;
        console.log("   ✅ LiquidityManager:", liquidityAddress);
        
        // 配置 LiquidityManager
        await liquidity.setSwapContractAddress(swapAddress);
        await liquidity.setTreasuryAddress(treasuryAddress);
        console.log("   ✅ LiquidityManager 配置完成");

        // 8. 部署 PriceStabilizer（跳过，需要 Mock PancakeSwap 合约）
        console.log("\n8. 跳过 PriceStabilizer 部署...");
        console.log("   ⚠️  PriceStabilizer 需要 Mock PancakeSwap 合约，本地测试中跳过");
        console.log("   ℹ️  可以在测试网部署时使用真实的 PancakeSwap 地址");
        // PriceStabilizer 在本地测试中可选，先跳过

        // 9. 部署 EmergencyPause
        console.log("\n9. 部署 EmergencyPause...");
        const EmergencyPauseFactory = await ethers.getContractFactory("EmergencyPause");
        const emergencyPause = await EmergencyPauseFactory.deploy();
        await emergencyPause.waitForDeployment();
        const emergencyPauseAddress = await emergencyPause.getAddress();
        contractAddresses.EmergencyPause = emergencyPauseAddress;
        console.log("   ✅ EmergencyPause:", emergencyPauseAddress);

        // 10. 部署 TeamDividendPool（团队业绩分红池）
        console.log("\n10. 部署 TeamDividendPool...");
        const TeamDividendPoolFactory = await ethers.getContractFactory("TeamDividendPool");
        const reservedGasUsdt = ethers.parseUnits("1000", 6); // 1000 USDT 预留
        const teamDividendPool = await TeamDividendPoolFactory.deploy(
            usdtAddress,
            deployer.address, // backendSigner（本地测试用部署账户）
            deployer.address, // adminSigner（本地测试用部署账户，生产需分离）
            reservedGasUsdt
        );
        await teamDividendPool.waitForDeployment();
        const teamDividendPoolAddress = await teamDividendPool.getAddress();
        contractAddresses.TeamDividendPool = teamDividendPoolAddress;
        console.log("   ✅ TeamDividendPool:", teamDividendPoolAddress);

        // 11. 配置合约关系
        console.log("\n=== 配置合约关系 ===");

        // 配置 StRWA
        console.log("   配置 StRWA...");
        await stRWA.setStakingContract(stakingAddress);
        console.log("   ✅ StRWA 配置完成");

        // 配置 RWAToken
        console.log("   配置 RWAToken...");
        await rwaToken.setWhitelist(stakingAddress, true);
        await rwaToken.setWhitelist(swapAddress, true);
        // PriceStabilizer 已跳过，不设置白名单
        await rwaToken.setWhitelist(liquidityAddress, true);
        // PriceStabilizer 地址暂不设置
        console.log("   ✅ RWAToken 配置完成");

        // 配置 TreasuryContract
        console.log("   配置 TreasuryContract...");
        await treasury.setStakingContractAddress(stakingAddress);
        await treasury.setLiquidityPoolAddress(liquidityAddress);
        await treasury.setReserveFundAddress(deployer.address);
        console.log("   ✅ TreasuryContract 配置完成");
        
        // 配置 StakingContract 的 stRWA token
        console.log("   配置 StakingContract...");
        await staking.setStRWAToken(stRWAAddress);
        console.log("   ✅ StakingContract 配置完成");

        // 配置 SwapContract
        console.log("   配置 SwapContract...");
        // SwapContract 的 token 地址已在构造函数中设置，无需再次配置
        // 可选：初始化流动性池（如果需要）
        // await swap.initializePool(ethers.parseEther("100000"), ethers.parseEther("100000"));
        console.log("   ✅ SwapContract 配置完成（token 地址已在构造函数中设置）");

        // 注册合约到 EmergencyPause
        console.log("   配置 EmergencyPause...");
        await emergencyPause.registerContract(stakingAddress);
        await emergencyPause.registerContract(swapAddress);
        await emergencyPause.registerContract(treasuryAddress);
        await emergencyPause.registerContract(liquidityAddress);
        // PriceStabilizer 已跳过，不注册
        console.log("   ✅ EmergencyPause 配置完成");

        // 12. 向测试地址转入 USDT 和 RWA（Hardhat 账户 #0 = 0xf39Fd...266）
        const TEST_ADDRESS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
        console.log("\n=== 向测试地址分配代币 ===");
        console.log("   测试地址:", TEST_ADDRESS);
        const usdtTestAmount = ethers.parseUnits("100000", 6); // 100,000 USDT (6 decimals)
        const rwaTestAmount = ethers.parseEther("100000");     // 100,000 RWA
        await usdtToken.mint(TEST_ADDRESS, usdtTestAmount);
        console.log("   ✅ 已铸造 100,000 USDT 至测试地址");
        const rwaBalance = await rwaToken.balanceOf(deployer.address);
        if (rwaBalance >= rwaTestAmount && TEST_ADDRESS.toLowerCase() !== deployer.address.toLowerCase()) {
            await rwaToken.transfer(TEST_ADDRESS, rwaTestAmount);
            console.log("   ✅ 已转账 100,000 RWA 至测试地址");
        } else {
            console.log("   ℹ️  测试地址即部署账户，已持有 RWA 初始供应，无需额外转账");
        }

        // 保存合约地址
        const addressesPath = path.join(__dirname, "..", "deployed-addresses-local.json");
        fs.writeFileSync(
            addressesPath,
            JSON.stringify(contractAddresses, null, 2)
        );
        console.log("\n✅ 合约地址已保存到:", addressesPath);

        // 写入 backend .env（本地链 RPC + 合约地址）
        const backendEnvPath = path.join(__dirname, "..", "backend", ".env");
        const envVars: Record<string, string> = {
            RPC_URL: "http://127.0.0.1:8545",
            STAKING_CONTRACT_ADDRESS: contractAddresses.StakingContract,
            USDT_TOKEN_ADDRESS: contractAddresses.TestUSDT,
            RWA_TOKEN_ADDRESS: contractAddresses.RWAToken,
            ST_RWA_ADDRESS: contractAddresses.StRWA,
            SWAP_CONTRACT_ADDRESS: contractAddresses.SwapContract,
            TREASURY_CONTRACT_ADDRESS: contractAddresses.TreasuryContract,
            TEAM_DIVIDEND_POOL_ADDRESS: contractAddresses.TeamDividendPool,
        };
        try {
            let envContent = "";
            if (fs.existsSync(backendEnvPath)) {
                envContent = fs.readFileSync(backendEnvPath, "utf-8");
            }
            const lines = envContent.split(/\r?\n/);
            const keysToSet = new Set(Object.keys(envVars));
            const updated: string[] = [];
            for (const line of lines) {
                const match = line.match(/^([^#=]+)=(.*)$/);
                if (match && keysToSet.has(match[1].trim())) {
                    updated.push(`${match[1].trim()}=${envVars[match[1].trim()]}`);
                    keysToSet.delete(match[1].trim());
                } else {
                    updated.push(line);
                }
            }
            for (const k of keysToSet) {
                updated.push(`${k}=${envVars[k]}`);
            }
            fs.writeFileSync(backendEnvPath, updated.join("\n") + (updated.length && updated[updated.length - 1] !== "" ? "\n" : ""));
            console.log("   ✅ 已更新 backend/.env（RPC_URL、STAKING_CONTRACT_ADDRESS 等）");
        } catch (e) {
            console.log("   ⚠️  更新 backend/.env 失败:", (e as Error).message);
        }

        // 写入 frontend .env.local（本地链合约地址，可选）
        const frontendEnvPath = path.join(__dirname, "..", "frontend", ".env.local");
        const frontendEnvLines = [
            `NEXT_PUBLIC_STAKING_CONTRACT_LOCAL=${contractAddresses.StakingContract}`,
            `NEXT_PUBLIC_USDT_TOKEN_LOCAL=${contractAddresses.TestUSDT}`,
            `NEXT_PUBLIC_RWA_TOKEN_LOCAL=${contractAddresses.RWAToken}`,
            `NEXT_PUBLIC_ST_RWA_LOCAL=${contractAddresses.StRWA}`,
            `NEXT_PUBLIC_SWAP_CONTRACT_LOCAL=${contractAddresses.SwapContract}`,
            `NEXT_PUBLIC_TREASURY_CONTRACT_LOCAL=${contractAddresses.TreasuryContract}`,
            `NEXT_PUBLIC_LIQUIDITY_MANAGER_LOCAL=${contractAddresses.LiquidityManager || ""}`,
            `NEXT_PUBLIC_EMERGENCY_PAUSE_LOCAL=${contractAddresses.EmergencyPause || ""}`,
            `NEXT_PUBLIC_TEAM_DIVIDEND_POOL_LOCAL=${contractAddresses.TeamDividendPool || ""}`,
        ];
        try {
            fs.writeFileSync(frontendEnvPath, frontendEnvLines.join("\n") + "\n");
            console.log("   ✅ 已写入 frontend/.env.local（本地合约地址）");
        } catch (e) {
            console.log("   ⚠️  写入 frontend/.env.local 失败:", (e as Error).message);
        }

        // 同步到前端 addresses.ts（本地链 fallback）
        const frontendAddressesPath = path.join(__dirname, "..", "frontend", "lib", "contracts", "addresses.ts");
        if (fs.existsSync(frontendAddressesPath)) {
            let content = fs.readFileSync(frontendAddressesPath, "utf-8");
            const reps: [RegExp, string][] = [
                [/stakingContract: process\.env\.NEXT_PUBLIC_STAKING_CONTRACT_LOCAL \|\| '[^']*'/, `stakingContract: process.env.NEXT_PUBLIC_STAKING_CONTRACT_LOCAL || '${contractAddresses.StakingContract}'`],
                [/usdtToken: process\.env\.NEXT_PUBLIC_USDT_TOKEN_LOCAL \|\| '[^']*'/, `usdtToken: process.env.NEXT_PUBLIC_USDT_TOKEN_LOCAL || '${contractAddresses.TestUSDT}'`],
                [/rwaToken: process\.env\.NEXT_PUBLIC_RWA_TOKEN_LOCAL \|\| '[^']*'/, `rwaToken: process.env.NEXT_PUBLIC_RWA_TOKEN_LOCAL || '${contractAddresses.RWAToken}'`],
                [/stRWA: process\.env\.NEXT_PUBLIC_ST_RWA_LOCAL \|\| '[^']*'/, `stRWA: process.env.NEXT_PUBLIC_ST_RWA_LOCAL || '${contractAddresses.StRWA}'`],
                [/swapContract: process\.env\.NEXT_PUBLIC_SWAP_CONTRACT_LOCAL \|\| '[^']*'/, `swapContract: process.env.NEXT_PUBLIC_SWAP_CONTRACT_LOCAL || '${contractAddresses.SwapContract || ""}'`],
                [/treasuryContract: process\.env\.NEXT_PUBLIC_TREASURY_CONTRACT_LOCAL \|\| '[^']*'/, `treasuryContract: process.env.NEXT_PUBLIC_TREASURY_CONTRACT_LOCAL || '${contractAddresses.TreasuryContract}'`],
                [/liquidityManager: process\.env\.NEXT_PUBLIC_LIQUIDITY_MANAGER_LOCAL \|\| '[^']*'/, `liquidityManager: process.env.NEXT_PUBLIC_LIQUIDITY_MANAGER_LOCAL || '${contractAddresses.LiquidityManager || "0x0000000000000000000000000000000000000000"}'`],
                [/emergencyPause: process\.env\.NEXT_PUBLIC_EMERGENCY_PAUSE_LOCAL \|\| '[^']*'/, `emergencyPause: process.env.NEXT_PUBLIC_EMERGENCY_PAUSE_LOCAL || '${contractAddresses.EmergencyPause || "0x0000000000000000000000000000000000000000"}'`],
            ];
            for (const [re, replacement] of reps) content = content.replace(re, replacement);
            fs.writeFileSync(frontendAddressesPath, content);
            console.log("   ✅ 已同步到 frontend/lib/contracts/addresses.ts");
        }

        console.log("\n=== 本地测试部署完成 ===\n");
        console.log("合约地址汇总:");
        console.log("=".repeat(60));
        Object.entries(contractAddresses).forEach(([name, address]) => {
            console.log(`${name.padEnd(25)}: ${address}`);
        });
        console.log("=".repeat(60));

        console.log("\n📝 下一步:");
        console.log("1. 前端已自动使用新合约地址，刷新页面即可");
        console.log("2. 在新合约上重新质押后，提现页会显示未锁仓本金");
        console.log("3. 启动前端: cd frontend && npm run dev");

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
