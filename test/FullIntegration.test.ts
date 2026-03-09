import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import {
  RWAToken,
  StakingContract,
  StRWA,
  SwapContract,
  TreasuryContract,
  TestUSDT
} from "../typechain-types";

describe("完整集成测试 - 端到端流程", function () {
  let rwaToken: RWAToken;
  let stRwaToken: StRWA;
  let stakingContract: StakingContract;
  let swapContract: SwapContract;
  let treasuryContract: TreasuryContract;
  let usdtToken: TestUSDT;

  let deployer: SignerWithAddress;
  let treasury: SignerWithAddress;
  let backend: SignerWithAddress;
  let liquidityPool: SignerWithAddress;
  let reserveFund: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let user3: SignerWithAddress;
  let referrer: SignerWithAddress;

  beforeEach(async function () {
    [deployer, treasury, backend, liquidityPool, reserveFund, user1, user2, user3, referrer] =
      await ethers.getSigners();

    const TestUSDTFactory = await ethers.getContractFactory("TestUSDT");
    usdtToken = await TestUSDTFactory.deploy();
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

    const StRWAFactory = await ethers.getContractFactory("StRWA");
    stRwaToken = await StRWAFactory.deploy();
    await stRwaToken.waitForDeployment();

    const TreasuryFactory = await ethers.getContractFactory("TreasuryContract");
    treasuryContract = await TreasuryFactory.deploy(await usdtToken.getAddress());
    await treasuryContract.waitForDeployment();
    await treasuryContract.setLiquidityPoolAddress(liquidityPool.address);
    await treasuryContract.setReserveFundAddress(reserveFund.address);

    const StakingFactory = await ethers.getContractFactory("StakingContract");
    stakingContract = await StakingFactory.deploy(
      await usdtToken.getAddress(),
      await rwaToken.getAddress(),
      treasury.address,
      backend.address
    );
    await stakingContract.waitForDeployment();

    const SwapFactory = await ethers.getContractFactory("SwapContract");
    swapContract = await SwapFactory.deploy(
      await rwaToken.getAddress(),
      await stRwaToken.getAddress()
    );
    await swapContract.waitForDeployment();

    await stRwaToken.setStakingContract(await stakingContract.getAddress());
    await stakingContract.setStRWAToken(await stRwaToken.getAddress());
    await treasuryContract.setStakingContractAddress(await stakingContract.getAddress());
    await rwaToken.setStakingContract(await stakingContract.getAddress());
    await rwaToken.setWhitelist(await stakingContract.getAddress(), true);
    await rwaToken.setWhitelist(await swapContract.getAddress(), true);

    const initialRWA = ethers.parseEther("100000");
    const initialStRWA = ethers.parseEther("100000");
    await stRwaToken.setStakingContract(deployer.address);
    await stRwaToken.mint(deployer.address, initialStRWA);
    await stRwaToken.setStakingContract(await stakingContract.getAddress());
    await rwaToken.approve(await swapContract.getAddress(), initialRWA);
    await stRwaToken.approve(await swapContract.getAddress(), initialStRWA);
    await swapContract.initializePool(initialRWA, initialStRWA);

    const userBalance = ethers.parseUnits("50000", 6);
    await usdtToken.mint(user1.address, userBalance);
    await usdtToken.mint(user2.address, userBalance);
    await usdtToken.mint(user3.address, userBalance);
    await usdtToken.mint(referrer.address, userBalance);

    await usdtToken.connect(user1).approve(await stakingContract.getAddress(), ethers.MaxUint256);
    await usdtToken.connect(user2).approve(await stakingContract.getAddress(), ethers.MaxUint256);
    await usdtToken.connect(user3).approve(await stakingContract.getAddress(), ethers.MaxUint256);
    await usdtToken.connect(referrer).approve(await stakingContract.getAddress(), ethers.MaxUint256);

    await rwaToken.transfer(await stakingContract.getAddress(), ethers.parseEther("10000000"));
  });

  it("should complete stake -> reward -> stRWA withdrawal flow", async function () {
    await stakingContract.connect(user1).stake(ethers.parseUnits("5000", 6), ethers.ZeroAddress, 0);

    const baseStRwaBalance = await stRwaToken.balanceOf(user1.address);
    expect(baseStRwaBalance).to.equal(ethers.parseUnits("2500", 18));

    await stakingContract.connect(backend).updateUserRewards(
      user1.address,
      ethers.parseEther("100"),
      ethers.parseUnits("50", 18),
      0
    );

    await stakingContract.connect(user1)["withdraw(uint256,bool)"](ethers.parseEther("100"), true);

    expect(await stRwaToken.getLockedBalance(user1.address)).to.equal(ethers.parseEther("120"));

    await expect(
      stRwaToken.connect(user1).transfer(user2.address, await stRwaToken.balanceOf(user1.address))
    ).to.be.revertedWith("StRWA: Amount exceeds unlocked balance");

    await time.increase(30 * 24 * 60 * 60);

    await expect(
      stRwaToken.connect(user1).transfer(user2.address, await stRwaToken.balanceOf(user1.address))
    ).to.not.be.reverted;
  });

  it("should complete swap flow using current AMM pricing", async function () {
    await stakingContract.connect(user1).stake(ethers.parseUnits("5000", 6), ethers.ZeroAddress, 0);

    const stRwaAmount = ethers.parseEther("100");
    const [expectedRwaOut] = await swapContract.getSwapRate(stRwaAmount, true);

    await stRwaToken.connect(user1).approve(await swapContract.getAddress(), stRwaAmount);
    const rwaBefore = await rwaToken.balanceOf(user1.address);
    await swapContract.connect(user1).swapStRWAToRWA(stRwaAmount);
    const rwaAfter = await rwaToken.balanceOf(user1.address);
    expect(rwaAfter - rwaBefore).to.equal(expectedRwaOut);

    await rwaToken.connect(user1).approve(await swapContract.getAddress(), expectedRwaOut);
    const [expectedStRwaOut] = await swapContract.getSwapRate(expectedRwaOut, false);
    const stRwaBefore = await stRwaToken.balanceOf(user1.address);
    await swapContract.connect(user1).swapRWAToStRWA(expectedRwaOut);
    const stRwaAfter = await stRwaToken.balanceOf(user1.address);
    expect(stRwaAfter - stRwaBefore).to.equal(expectedStRwaOut);
  });

  it("should distribute treasury returns using current contract flow", async function () {
    const seedAmount = ethers.parseUnits("10000", 6);
    await usdtToken.mint(await treasuryContract.getAddress(), seedAmount);

    await treasuryContract.invest(user2.address, ethers.parseUnits("5000", 6), ethers.parseUnits("10000", 6));

    const returnAmount = ethers.parseUnits("2000", 6);
    await usdtToken.mint(deployer.address, returnAmount);
    await usdtToken.approve(await treasuryContract.getAddress(), returnAmount);

    const liquidityBefore = await usdtToken.balanceOf(liquidityPool.address);
    const reserveBefore = await usdtToken.balanceOf(reserveFund.address);

    await treasuryContract.receiveReturn(0, returnAmount);

    const liquidityAfter = await usdtToken.balanceOf(liquidityPool.address);
    const reserveAfter = await usdtToken.balanceOf(reserveFund.address);

    expect(liquidityAfter - liquidityBefore).to.equal(ethers.parseUnits("400", 6));
    expect(reserveAfter - reserveBefore).to.equal(ethers.parseUnits("200", 6));
    expect(await treasuryContract.totalReturns()).to.equal(returnAmount);
  });
});
