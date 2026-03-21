import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { StRWA, StakingContract, RWAToken } from "../typechain-types";

describe("StakingContract", function () {
    let stakingContract: StakingContract;
    let rwaToken: RWAToken;
    let usdtToken: any;
    let owner: SignerWithAddress;
    let treasury: SignerWithAddress;
    let backend: SignerWithAddress;
    let user1: SignerWithAddress;
    let user2: SignerWithAddress;

    const USDT_DECIMALS = 6;
    const INTERNAL_DECIMALS = 18;
    const PRECISION_MULTIPLIER = 10n ** BigInt(INTERNAL_DECIMALS - USDT_DECIMALS);
    const DEAD_ADDRESS = "0x000000000000000000000000000000000000dEaD";

    beforeEach(async function () {
        [owner, treasury, backend, user1, user2] = await ethers.getSigners();

        const MockERC20 = await ethers.getContractFactory("MockERC20");
        usdtToken = await MockERC20.deploy("Mock USDT", "USDT", USDT_DECIMALS);
        await usdtToken.waitForDeployment();

        const RWATokenFactory = await ethers.getContractFactory("RWAToken");
        rwaToken = await RWATokenFactory.deploy(
            "RWA Token",
            "RWA",
            ethers.parseEther("1000000000"),
            treasury.address,
            treasury.address
        );
        await rwaToken.waitForDeployment();

        const StakingContractFactory = await ethers.getContractFactory("StakingContract");
        stakingContract = await StakingContractFactory.deploy(
            await usdtToken.getAddress(),
            await rwaToken.getAddress(),
            treasury.address,
            backend.address
        );
        await stakingContract.waitForDeployment();

        await usdtToken.mint(user1.address, ethers.parseUnits("10000", USDT_DECIMALS));
        await usdtToken.mint(user2.address, ethers.parseUnits("10000", USDT_DECIMALS));

        await rwaToken.transfer(await stakingContract.getAddress(), ethers.parseUnits("1000000", INTERNAL_DECIMALS));

        await usdtToken.connect(user1).approve(await stakingContract.getAddress(), ethers.MaxUint256);
        await usdtToken.connect(user2).approve(await stakingContract.getAddress(), ethers.MaxUint256);
    });

    async function stakeAndAddRewards(lockPeriod: number = 0, stakeId: bigint = 0n, rwaReward: string = "100") {
        const stakeAmount = ethers.parseUnits("1000", USDT_DECIMALS);
        await stakingContract.connect(user1).stake(stakeAmount, ethers.ZeroAddress, lockPeriod);
        await stakingContract.connect(backend).updateUserRewards(
            user1.address,
            ethers.parseUnits(rwaReward, INTERNAL_DECIMALS),
            ethers.parseUnits("50", INTERNAL_DECIMALS),
            stakeId
        );
    }

    describe("stake flow", function () {
        it("splits USDT stake 50/50 between treasury and contract (flexible and locked)", async function () {
            const stakeAmount = ethers.parseUnits("1000", USDT_DECIMALS);

            const treasuryBalanceBefore = await usdtToken.balanceOf(treasury.address);
            const contractBalanceBefore = await usdtToken.balanceOf(await stakingContract.getAddress());

            await stakingContract.connect(user1).stake(stakeAmount, ethers.ZeroAddress, 0);

            const treasuryBalanceAfter = await usdtToken.balanceOf(treasury.address);
            const contractBalanceAfter = await usdtToken.balanceOf(await stakingContract.getAddress());

            expect(treasuryBalanceAfter - treasuryBalanceBefore).to.equal(stakeAmount / 2n);
            expect(contractBalanceAfter - contractBalanceBefore).to.equal(stakeAmount / 2n);
        });
    });

    describe("immediate RWA withdrawal", function () {
        beforeEach(async function () {
            await stakeAndAddRewards(0, 0n, "200");
        });

        it("applies the new 8% fee split on immediate withdrawals", async function () {
            const withdrawAmount = ethers.parseUnits("100", INTERNAL_DECIMALS);

            const userBefore = await rwaToken.balanceOf(user1.address);
            const treasuryBefore = await rwaToken.balanceOf(treasury.address);
            const deadBefore = await rwaToken.balanceOf(DEAD_ADDRESS);
            const contractBefore = await rwaToken.balanceOf(await stakingContract.getAddress());

            await stakingContract.connect(user1)["withdraw(uint256,bool)"](withdrawAmount, false);

            const userAfter = await rwaToken.balanceOf(user1.address);
            const treasuryAfter = await rwaToken.balanceOf(treasury.address);
            const deadAfter = await rwaToken.balanceOf(DEAD_ADDRESS);
            const contractAfter = await rwaToken.balanceOf(await stakingContract.getAddress());

            expect(userAfter - userBefore).to.equal(ethers.parseUnits("92", INTERNAL_DECIMALS));
            expect(treasuryAfter - treasuryBefore).to.equal(ethers.parseUnits("3", INTERNAL_DECIMALS));
            expect(deadAfter - deadBefore).to.equal(ethers.parseUnits("3", INTERNAL_DECIMALS));
            expect(contractBefore - contractAfter).to.equal(ethers.parseUnits("98", INTERNAL_DECIMALS));
        });

        it("uses the new minimum withdrawal amount of 100 RWA", async function () {
            const belowMinimum = ethers.parseUnits("99", INTERNAL_DECIMALS);

            await expect(
                stakingContract.connect(user1)["withdraw(uint256,bool)"](belowMinimum, false)
            ).to.be.revertedWith("Below minimum withdrawal amount");
        });

        it("keeps the 24 hour cooldown for reward withdrawals", async function () {
            const withdrawAmount = ethers.parseUnits("100", INTERNAL_DECIMALS);

            await stakingContract.connect(user1)["withdraw(uint256,bool)"](withdrawAmount, false);

            await expect(
                stakingContract.connect(user1)["withdraw(uint256,bool)"](withdrawAmount, false)
            ).to.be.revertedWith("Withdrawal cooldown active");

            await time.increase(24 * 60 * 60);

            await expect(
                stakingContract.connect(user1)["withdraw(uint256,bool)"](withdrawAmount, false)
            ).to.not.be.reverted;
        });
    });

    describe("locked USDT emergency exit", function () {
        it("refunds by completed lock days and preserves pending RWA rewards", async function () {
            const stakeAmount = ethers.parseUnits("1000", USDT_DECIMALS);
            await stakingContract.connect(user1).stake(stakeAmount, ethers.ZeroAddress, 30);

            const rwaReward = ethers.parseUnits("20", INTERNAL_DECIMALS);
            const usdtReward = ethers.parseUnits("1", INTERNAL_DECIMALS);
            await stakingContract.connect(backend).updateUserRewards(
                user1.address,
                rwaReward,
                usdtReward,
                0
            );

            await time.increase(6 * 24 * 60 * 60);

            const usdtBefore = await usdtToken.balanceOf(user1.address);
            await stakingContract.connect(user1).emergencyWithdraw(0);
            const usdtAfter = await usdtToken.balanceOf(user1.address);

            expect(usdtAfter - usdtBefore).to.equal(ethers.parseUnits("92", USDT_DECIMALS));

            const [pendingRwa] = await stakingContract.getUserRewards(user1.address);
            expect(pendingRwa).to.equal(rwaReward);

            const userInfo = await stakingContract.users(user1.address);
            expect(userInfo.totalStaked).to.equal(0);
            expect(userInfo.isActive).to.equal(false);
        });
    });

    describe("stRWA mode", function () {
        it("mints 120% stRWA with a real 30-day transfer lock", async function () {
            const StRWAFactory = await ethers.getContractFactory("StRWA");
            const stRwaToken: StRWA = await StRWAFactory.deploy();
            await stRwaToken.waitForDeployment();

            await stRwaToken.setStakingContract(await stakingContract.getAddress());
            await stakingContract.setStRWAToken(await stRwaToken.getAddress());

            await stakeAndAddRewards(0, 0n);
            const balanceBefore = await stRwaToken.balanceOf(user1.address);
            const lockedBefore = await stRwaToken.getLockedBalance(user1.address);

            const withdrawAmount = ethers.parseUnits("100", INTERNAL_DECIMALS);
            await stakingContract.connect(user1)["withdraw(uint256,bool)"](withdrawAmount, true);

            const expectedNetBalance = ethers.parseUnits("70", INTERNAL_DECIMALS);
            const expectedNewLocked = ethers.parseUnits("120", INTERNAL_DECIMALS);
            const totalBalanceAfter = await stRwaToken.balanceOf(user1.address);
            expect(totalBalanceAfter - balanceBefore).to.equal(expectedNetBalance);
            expect((await stRwaToken.getLockedBalance(user1.address)) - lockedBefore).to.equal(expectedNewLocked);

            await expect(
                stRwaToken.connect(user1).transfer(user2.address, totalBalanceAfter)
            ).to.be.revertedWith("StRWA: Amount exceeds unlocked balance");

            await time.increase(30 * 24 * 60 * 60);

            await expect(
                stRwaToken.connect(user1).transfer(user2.address, totalBalanceAfter)
            ).to.not.be.reverted;
        });
    });
});
