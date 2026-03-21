import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import {
  RWAToken,
  StRWA,
  StakingContract,
  SwapContract,
  EmergencyPause,
  TestUSDT
} from "../typechain-types";

describe("安全测试", function () {
  let rwaToken: RWAToken;
  let stRwaToken: StRWA;
  let stakingContract: StakingContract;
  let swapContract: SwapContract;
  let emergencyPause: EmergencyPause;
  let usdtToken: TestUSDT;

  let deployer: SignerWithAddress;
  let treasury: SignerWithAddress;
  let backend: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let attacker1: SignerWithAddress;
  let attacker2: SignerWithAddress;
  let attacker3: SignerWithAddress;

  beforeEach(async function () {
    [deployer, treasury, backend, user1, user2, attacker1, attacker2, attacker3] =
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

    const EmergencyPauseFactory = await ethers.getContractFactory("EmergencyPause");
    emergencyPause = await EmergencyPauseFactory.deploy();
    await emergencyPause.waitForDeployment();

    await stRwaToken.setStakingContract(await stakingContract.getAddress());
    await stakingContract.setStRWAToken(await stRwaToken.getAddress());
    await rwaToken.setStakingContract(await stakingContract.getAddress());
    await rwaToken.setWhitelist(await stakingContract.getAddress(), true);
    await rwaToken.setWhitelist(await swapContract.getAddress(), true);

    const initialRwaPool = ethers.parseEther("100000");
    const initialStRwaPool = ethers.parseEther("100000");
    await stRwaToken.setStakingContract(deployer.address);
    await stRwaToken.mint(deployer.address, initialStRwaPool);
    await stRwaToken.setStakingContract(await stakingContract.getAddress());
    await rwaToken.approve(await swapContract.getAddress(), initialRwaPool);
    await stRwaToken.approve(await swapContract.getAddress(), initialStRwaPool);
    await swapContract.initializePool(initialRwaPool, initialStRwaPool);

    const userBalance = ethers.parseUnits("100000", 6);
    for (const user of [user1, user2, attacker1, attacker2, attacker3]) {
      await usdtToken.mint(user.address, userBalance);
      await usdtToken.connect(user).approve(await stakingContract.getAddress(), ethers.MaxUint256);
    }

    await rwaToken.transfer(await stakingContract.getAddress(), ethers.parseEther("10000000"));
  });

  it("should reject stakes below the minimum amount", async function () {
    const tooSmall = ethers.parseUnits("50", 6);

    await expect(
      stakingContract.connect(attacker1).stake(tooSmall, ethers.ZeroAddress, 0)
    ).to.be.revertedWith("Minimum stake: 100 USDT");
  });

  it("should keep a single immutable referrer and ignore self-referral", async function () {
    const amount = ethers.parseUnits("1000", 6);

    await stakingContract.connect(user1).stake(amount, user1.address, 0);
    const [, hasSelfReferrer] = await stakingContract.getReferralInfo(user1.address);
    expect(hasSelfReferrer).to.equal(false);

    await stakingContract.connect(user2).stake(amount, user1.address, 0);
    await stakingContract.connect(user2).stake(amount, attacker1.address, 30);

    const [boundReferrer, hasReferrer] = await stakingContract.getReferralInfo(user2.address);
    expect(hasReferrer).to.equal(true);
    expect(boundReferrer).to.equal(user1.address);
  });

  it("should restrict reward updates to backend and enforce single and daily caps", async function () {
    const stakeAmount = ethers.parseUnits("1000", 6);
    await stakingContract.connect(attacker1).stake(stakeAmount, ethers.ZeroAddress, 0);
    await stakingContract.connect(attacker2).stake(ethers.parseUnits("10000", 6), ethers.ZeroAddress, 0);
    await usdtToken.mint(await stakingContract.getAddress(), ethers.parseUnits("1000", 6));

    await expect(
      stakingContract.connect(user1).updateUserRewards(attacker1.address, 0, ethers.parseUnits("100", 18), 1)
    ).to.be.revertedWith("Only backend can call");

    await expect(
      stakingContract.connect(backend).updateUserRewards(attacker1.address, 0, ethers.parseUnits("501", 18), 2)
    ).to.be.revertedWith("Exceeds single reward cap (50% of staked)");

    await stakingContract.connect(backend).updateUserRewards(
      attacker1.address,
      0,
      ethers.parseUnits("100", 18),
      3
    );

    await expect(
      stakingContract.connect(backend).updateUserRewards(attacker1.address, 0, ethers.parseUnits("100", 18), 4)
    ).to.be.revertedWith("Exceeds daily cap (15% of staked)");
  });

  it("should reject duplicate reward processing for the same stake id", async function () {
    const stakeAmount = ethers.parseUnits("1000", 6);
    await stakingContract.connect(user1).stake(stakeAmount, ethers.ZeroAddress, 0);

    await stakingContract.connect(backend).updateUserRewards(
      user1.address,
      0,
      ethers.parseUnits("100", 18),
      10
    );

    await expect(
      stakingContract.connect(backend).updateUserRewards(user1.address, 0, ethers.parseUnits("50", 18), 10)
    ).to.be.revertedWith("Stake already processed");
  });

  it("should track emergency pause state for registered contracts", async function () {
    await emergencyPause.registerContract(await stakingContract.getAddress());
    await emergencyPause.globalPause("security test");

    expect(await emergencyPause.globalPauseActive()).to.equal(true);
    expect(await emergencyPause.isPaused(await stakingContract.getAddress())).to.equal(true);

    await emergencyPause.globalUnpause();

    expect(await emergencyPause.globalPauseActive()).to.equal(false);
    expect(await emergencyPause.isRegistered(await stakingContract.getAddress())).to.equal(true);
  });

  it("should enforce swap daily limits against repeated swaps", async function () {
    const limit = ethers.parseEther("100");
    await swapContract.setMaxDailySwapPerUser(limit);
    await swapContract.setMaxDailySwapGlobal(ethers.parseEther("1000"));

    await rwaToken.transfer(attacker2.address, ethers.parseEther("101"));
    await rwaToken.connect(attacker2).approve(await swapContract.getAddress(), ethers.parseEther("101"));

    await swapContract.connect(attacker2).swapRWAToStRWA(limit);
    expect(await swapContract.getUserDailySwapAmount(attacker2.address)).to.equal(limit);

    await expect(
      swapContract.connect(attacker2).swapRWAToStRWA(ethers.parseEther("1"))
    ).to.be.revertedWith("SwapContract: Swap limit exceeded");
  });

  it("should restrict owner-only configuration methods", async function () {
    await expect(
      rwaToken.connect(user1).setWhitelist(attacker3.address, true)
    ).to.be.revertedWithCustomError(rwaToken, "OwnableUnauthorizedAccount");

    await rwaToken.setWhitelist(attacker3.address, true);
    expect(await rwaToken.whitelist(attacker3.address)).to.equal(true);
  });
});
