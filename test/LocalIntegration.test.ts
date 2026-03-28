import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { RWAToken, StRWA, StakingContract, TestUSDT } from "../typechain-types";
import { mintStRwaViaStakingContract } from "./helpers/stakingStrwa";

describe("本地集成测试", function () {
  let rwaToken: RWAToken;
  let stRwaToken: StRWA;
  let stakingContract: StakingContract;
  let testUSDT: TestUSDT;

  let deployer: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let treasury: SignerWithAddress;
  let backend: SignerWithAddress;

  const INITIAL_USDT_BALANCE = ethers.parseUnits("10000", 6);
  const STAKE_AMOUNT = ethers.parseUnits("1000", 6);

  beforeEach(async function () {
    [deployer, user1, user2, treasury, backend] = await ethers.getSigners();

    const RWATokenFactory = await ethers.getContractFactory("RWAToken");
    rwaToken = await RWATokenFactory.deploy(
      "RWA Token",
      "RWA",
      ethers.parseEther("1000000000"),
      treasury.address,
      treasury.address
    );
    await rwaToken.waitForDeployment();

    const TestUSDTFactory = await ethers.getContractFactory("TestUSDT");
    testUSDT = await TestUSDTFactory.deploy();
    await testUSDT.waitForDeployment();

    const StRWAFactory = await ethers.getContractFactory("StRWA");
    stRwaToken = await StRWAFactory.deploy();
    await stRwaToken.waitForDeployment();

    const StakingContractFactory = await ethers.getContractFactory("StakingContract");
    stakingContract = await StakingContractFactory.deploy(
      await testUSDT.getAddress(),
      await rwaToken.getAddress(),
      treasury.address,
      backend.address
    );
    await stakingContract.waitForDeployment();

    await stRwaToken.setStakingContract(await stakingContract.getAddress());
    await stakingContract.setStRWAToken(await stRwaToken.getAddress());
    await rwaToken.setWhitelist(await stakingContract.getAddress(), true);

    await testUSDT.mint(user1.address, INITIAL_USDT_BALANCE);
    await testUSDT.mint(user2.address, INITIAL_USDT_BALANCE);
    await testUSDT.connect(user1).approve(await stakingContract.getAddress(), ethers.MaxUint256);
    await testUSDT.connect(user2).approve(await stakingContract.getAddress(), ethers.MaxUint256);

    await rwaToken.transfer(await stakingContract.getAddress(), ethers.parseEther("10000000"));
  });

  it("should deploy local contracts with expected wiring", async function () {
    expect(await stakingContract.usdtToken()).to.equal(await testUSDT.getAddress());
    expect(await stakingContract.rwaToken()).to.equal(await rwaToken.getAddress());
    expect(await stakingContract.treasuryAddress()).to.equal(treasury.address);
    expect(await stRwaToken.stakingContract()).to.equal(await stakingContract.getAddress());
  });

  it("should complete stake -> reward update -> immediate withdraw flow", async function () {
    await stakingContract.connect(user1).stake(STAKE_AMOUNT, ethers.ZeroAddress, 0);

    const userStakeInfo = await stakingContract.getUserStakeInfo(user1.address);
    expect(userStakeInfo.totalStaked_).to.equal(ethers.parseUnits("1000", 18));

    await stakingContract.connect(backend).updateUserRewards(
      user1.address,
      ethers.parseEther("100"),
      ethers.parseUnits("50", 18),
      0
    );

    await mintStRwaViaStakingContract(
      stRwaToken,
      await stakingContract.getAddress(),
      user1.address,
      ethers.parseEther("10000")
    );
    await time.increase(24 * 60 * 60 + 1);

    const balanceBefore = await rwaToken.balanceOf(user1.address);
    await stakingContract.connect(user1)["withdraw(uint256,bool)"](ethers.parseEther("100"), false);
    const balanceAfter = await rwaToken.balanceOf(user1.address);

    expect(balanceAfter - balanceBefore).to.equal(ethers.parseEther("92"));
  });

  it("should bind referrer and preserve it across later stakes", async function () {
    await stakingContract.connect(user2).stake(STAKE_AMOUNT, user1.address, 0);
    await stakingContract.connect(user2).stake(STAKE_AMOUNT, treasury.address, 30);

    const [referrerAddress, hasReferrer] = await stakingContract.getReferralInfo(user2.address);
    expect(hasReferrer).to.equal(true);
    expect(referrerAddress).to.equal(user1.address);
  });

  it("should allow locked USDT emergency exit by elapsed days", async function () {
    await stakingContract.connect(user1).stake(STAKE_AMOUNT, ethers.ZeroAddress, 30);
    await mintStRwaViaStakingContract(
      stRwaToken,
      await stakingContract.getAddress(),
      user1.address,
      ethers.parseEther("10000")
    );
    await time.increase(6 * 24 * 60 * 60);

    const usdtBefore = await testUSDT.balanceOf(user1.address);
    await stakingContract.connect(user1).emergencyWithdraw(0);
    const usdtAfter = await testUSDT.balanceOf(user1.address);

    expect(usdtAfter - usdtBefore).to.equal(ethers.parseUnits("92", 6));
  });
});
