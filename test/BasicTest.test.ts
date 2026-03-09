import { expect } from "chai";
import { ethers } from "hardhat";

describe("Basic Contract Tests", function () {
    describe("RWAToken", function () {
        it("Should deploy RWAToken successfully", async function () {
            const [owner, treasury, liquidityFund] = await ethers.getSigners();
            
            const RWAToken = await ethers.getContractFactory("RWAToken");
            const rwaToken = await RWAToken.deploy(
                "RWA Token",
                "RWA",
                ethers.parseEther("1000000000"), // 1 billion
                treasury.address,
                liquidityFund.address
            );
            
            expect(await rwaToken.name()).to.equal("RWA Token");
            expect(await rwaToken.symbol()).to.equal("RWA");
            expect(await rwaToken.decimals()).to.equal(18);
        });
        
        it("Should have correct initial supply", async function () {
            const [owner, treasury, liquidityFund] = await ethers.getSigners();
            
            const RWAToken = await ethers.getContractFactory("RWAToken");
            const rwaToken = await RWAToken.deploy(
                "RWA Token",
                "RWA",
                ethers.parseEther("1000000000"), // 1 billion
                treasury.address,
                liquidityFund.address
            );
            
            const totalSupply = await rwaToken.totalSupply();
            expect(totalSupply).to.equal(ethers.parseEther("1000000000")); // 1 billion
        });
    });
    
    describe("StakingContract", function () {
        it("Should deploy StakingContract successfully", async function () {
            const [owner, treasury, backend] = await ethers.getSigners();
            
            // Deploy mock USDT
            const MockERC20 = await ethers.getContractFactory("MockERC20");
            const usdtToken = await MockERC20.deploy("Mock USDT", "USDT", 6);
            
            // Deploy RWA Token
            const RWAToken = await ethers.getContractFactory("RWAToken");
            const rwaToken = await RWAToken.deploy(
                "RWA Token",
                "RWA",
                ethers.parseEther("1000000000"),
                treasury.address,
                treasury.address
            );
            
            // Deploy Staking Contract
            const StakingContract = await ethers.getContractFactory("StakingContract");
            const stakingContract = await StakingContract.deploy(
                await usdtToken.getAddress(),
                await rwaToken.getAddress(),
                treasury.address,
                backend.address
            );
            
            expect(await stakingContract.treasuryAddress()).to.equal(treasury.address);
            expect(await stakingContract.backendAddress()).to.equal(backend.address);
        });
    });
});
