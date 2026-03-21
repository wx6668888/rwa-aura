import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { TreasuryContract } from "../typechain-types";

describe("TreasuryContract", function () {
  let treasury: TreasuryContract;
  let usdtToken: any; // Mock USDT token
  let stakingContract: SignerWithAddress;
  let liquidityPool: SignerWithAddress;
  let reserveFund: SignerWithAddress;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  const USDT_DECIMALS = 6;

  beforeEach(async function () {
    [owner, stakingContract, liquidityPool, reserveFund, user1, user2] = await ethers.getSigners();

    // Deploy mock USDT token
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    usdtToken = await MockERC20.deploy("Mock USDT", "USDT", USDT_DECIMALS);
    await usdtToken.waitForDeployment();

    // Deploy TreasuryContract
    const TreasuryContractFactory = await ethers.getContractFactory("TreasuryContract");
    treasury = await TreasuryContractFactory.deploy(await usdtToken.getAddress());
    await treasury.waitForDeployment();

    // Set addresses
    await treasury.setStakingContractAddress(stakingContract.address);
    await treasury.setLiquidityPoolAddress(liquidityPool.address);
    await treasury.setReserveFundAddress(reserveFund.address);

    // Mint USDT to staking contract for deposits
    await usdtToken.mint(stakingContract.address, ethers.parseUnits("100000", USDT_DECIMALS));
  });

  describe("Deployment", function () {
    it("Should deploy with correct USDT token address", async function () {
      expect(await treasury.usdtToken()).to.equal(await usdtToken.getAddress());
    });

    it("Should set staking contract address", async function () {
      expect(await treasury.stakingContractAddress()).to.equal(stakingContract.address);
    });
  });

  describe("Deposit", function () {
    it("Should accept deposits from staking contract", async function () {
      const depositAmount = ethers.parseUnits("1000", USDT_DECIMALS);
      
      await usdtToken.connect(stakingContract).approve(await treasury.getAddress(), depositAmount);
      await treasury.connect(stakingContract).deposit(depositAmount, user1.address);

      expect(await treasury.totalDeposited()).to.equal(depositAmount);
      expect(await treasury.getUserInvestmentShare(user1.address)).to.equal(depositAmount);
    });

    it("Should reject deposits from non-staking contract", async function () {
      const depositAmount = ethers.parseUnits("1000", USDT_DECIMALS);
      
      await usdtToken.mint(user1.address, depositAmount);
      await usdtToken.connect(user1).approve(await treasury.getAddress(), depositAmount);

      await expect(
        treasury.connect(user1).deposit(depositAmount, user1.address)
      ).to.be.revertedWith("TreasuryContract: Only staking contract can call");
    });
  });

  describe("Investment", function () {
    beforeEach(async function () {
      // First deposit some funds
      const depositAmount = ethers.parseUnits("10000", USDT_DECIMALS);
      await usdtToken.connect(stakingContract).approve(await treasury.getAddress(), depositAmount);
      await treasury.connect(stakingContract).deposit(depositAmount, user1.address);
    });

    it("Should allow owner to make investments", async function () {
      const investAmount = ethers.parseUnits("5000", USDT_DECIMALS);
      const projectAddress = user2.address;
      const expectedReturn = 200; // 200%

      await treasury.invest(projectAddress, investAmount, expectedReturn);

      expect(await treasury.totalInvested()).to.equal(investAmount);
      expect(await usdtToken.balanceOf(projectAddress)).to.equal(investAmount);
    });

    it("Should record investment correctly", async function () {
      const investAmount = ethers.parseUnits("5000", USDT_DECIMALS);
      const projectAddress = user2.address;
      const expectedReturn = 200;

      const tx = await treasury.invest(projectAddress, investAmount, expectedReturn);
      const receipt = await tx.wait();
      
      // Check event
      const event = receipt?.logs.find((log: any) => {
        try {
          const parsed = treasury.interface.parseLog(log);
          return parsed?.name === "InvestmentMade";
        } catch {
          return false;
        }
      });

      expect(event).to.not.be.undefined;
    });
  });

  describe("Return Distribution", function () {
    beforeEach(async function () {
      // Deposit and invest
      const depositAmount = ethers.parseUnits("10000", USDT_DECIMALS);
      await usdtToken.connect(stakingContract).approve(await treasury.getAddress(), depositAmount);
      await treasury.connect(stakingContract).deposit(depositAmount, user1.address);

      const investAmount = ethers.parseUnits("5000", USDT_DECIMALS);
      await treasury.invest(user2.address, investAmount, 200);
    });

    it("Should distribute returns correctly (40% user, 30% reinvest, 20% liquidity, 10% reserve)", async function () {
      const returnAmount = ethers.parseUnits("10000", USDT_DECIMALS); // 100% return
      await usdtToken.mint(owner.address, returnAmount);
      await usdtToken.approve(await treasury.getAddress(), returnAmount);
      
      const liquidityBalanceBefore = await usdtToken.balanceOf(liquidityPool.address);
      const reserveBalanceBefore = await usdtToken.balanceOf(reserveFund.address);

      await treasury.receiveReturn(0, returnAmount);

      // Check distribution
      const liquidityBalanceAfter = await usdtToken.balanceOf(liquidityPool.address);
      const reserveBalanceAfter = await usdtToken.balanceOf(reserveFund.address);

      // 20% to liquidity = 2000 USDT
      expect(liquidityBalanceAfter - liquidityBalanceBefore).to.equal(
        ethers.parseUnits("2000", USDT_DECIMALS)
      );

      // 10% to reserve = 1000 USDT
      expect(reserveBalanceAfter - reserveBalanceBefore).to.equal(
        ethers.parseUnits("1000", USDT_DECIMALS)
      );

      // 40% user dividend (recorded but not distributed automatically)
      expect(await treasury.totalReturns()).to.equal(returnAmount);
    });
  });

  describe("Withdrawal Limits", function () {
    it("Should enforce daily withdrawal limit", async function () {
      const depositAmount = ethers.parseUnits("10000", USDT_DECIMALS);
      await usdtToken.connect(stakingContract).approve(await treasury.getAddress(), depositAmount);
      await treasury.connect(stakingContract).deposit(depositAmount, user1.address);

      const maxWithdrawal = await treasury.maxWithdrawalPerDay();
      const exceedAmount = maxWithdrawal + ethers.parseUnits("1", USDT_DECIMALS);

      await expect(
        treasury.withdraw(user1.address, exceedAmount, "Test withdrawal")
      ).to.be.revertedWith("TreasuryContract: Daily withdrawal limit exceeded");
    });
  });
});
