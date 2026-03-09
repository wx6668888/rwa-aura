import { expect } from "chai";
import { ethers } from "hardhat";
import { SwapContract, RWAToken, StRWA } from "../typechain-types";

describe("SwapContract", function () {
  let swapContract: SwapContract;
  let rwaToken: RWAToken;
  let stRwaToken: StRWA;
  let owner: any;
  let user: any;
  let stakingContract: any;

  const INITIAL_POOL_AMOUNT = ethers.parseEther("10000");

  beforeEach(async function () {
    [owner, user, stakingContract] = await ethers.getSigners();
    
    // 部署 RWA Token
    const RWATokenFactory = await ethers.getContractFactory("RWAToken");
    rwaToken = await RWATokenFactory.deploy(
      "RWA Token",
      "RWA",
      ethers.parseEther("1000000000"), // 10亿
      owner.address, // treasury
      owner.address  // liquidity
    );
    await rwaToken.waitForDeployment();
    
    // 部署 StRWA
    const StRWAFactory = await ethers.getContractFactory("StRWA");
    stRwaToken = await StRWAFactory.deploy();
    await stRwaToken.waitForDeployment();
    
    // 设置 StRWA 的 stakingContract（用于 mint）
    await stRwaToken.setStakingContract(stakingContract.address);
    
    // 部署 SwapContract
    const SwapContractFactory = await ethers.getContractFactory("SwapContract");
    swapContract = await SwapContractFactory.deploy(
      await rwaToken.getAddress(),
      await stRwaToken.getAddress()
    );
    await swapContract.waitForDeployment();
    
    // 初始化池子
    await rwaToken.approve(await swapContract.getAddress(), INITIAL_POOL_AMOUNT);
    await stRwaToken.connect(stakingContract).mint(owner.address, INITIAL_POOL_AMOUNT);
    await stRwaToken.approve(await swapContract.getAddress(), INITIAL_POOL_AMOUNT);
    
    await swapContract.initializePool(INITIAL_POOL_AMOUNT, INITIAL_POOL_AMOUNT);
  });

  describe("Deployment", function () {
    it("Should deploy with correct token addresses", async function () {
      expect(await swapContract.rwaToken()).to.equal(await rwaToken.getAddress());
      expect(await swapContract.stRwaToken()).to.equal(await stRwaToken.getAddress());
    });

    it("Should initialize pool correctly", async function () {
      expect(await swapContract.rwaPoolBalance()).to.equal(INITIAL_POOL_AMOUNT);
      expect(await swapContract.stRwaPoolBalance()).to.equal(INITIAL_POOL_AMOUNT);
    });

    it("Should have swap enabled by default", async function () {
      expect(await swapContract.swapEnabled()).to.be.true;
    });
  });

  describe("Swap stRWA to RWA", function () {
    beforeEach(async function () {
      // 给用户 mint stRWA
      const swapAmount = ethers.parseEther("100");
      await stRwaToken.connect(stakingContract).mint(user.address, swapAmount);
      await stRwaToken.connect(user).approve(await swapContract.getAddress(), swapAmount);
    });

    it("Should swap stRWA to RWA (1:1)", async function () {
      const swapAmount = ethers.parseEther("100");
      const initialRwaBalance = await rwaToken.balanceOf(user.address);
      const [expectedOutput] = await swapContract.getSwapRate(swapAmount, true);
      
      await swapContract.connect(user).swapStRWAToRWA(swapAmount);
      
      expect(await rwaToken.balanceOf(user.address)).to.equal(initialRwaBalance + expectedOutput);
      expect(await stRwaToken.balanceOf(user.address)).to.equal(0);
      expect(await swapContract.rwaPoolBalance()).to.equal(INITIAL_POOL_AMOUNT - expectedOutput);
      expect(await swapContract.stRwaPoolBalance()).to.equal(INITIAL_POOL_AMOUNT + swapAmount);
    });

    it("Should emit SwapStRWAToRWA event", async function () {
      const swapAmount = ethers.parseEther("100");
      const [expectedOutput] = await swapContract.getSwapRate(swapAmount, true);
      
      await expect(swapContract.connect(user).swapStRWAToRWA(swapAmount))
        .to.emit(swapContract, "SwapStRWAToRWA")
        .withArgs(user.address, swapAmount, expectedOutput);
    });

    it("Should reject swap when disabled", async function () {
      await swapContract.setSwapEnabled(false);
      
      const swapAmount = ethers.parseEther("100");
      await expect(swapContract.connect(user).swapStRWAToRWA(swapAmount))
        .to.be.revertedWith("SwapContract: Swap is disabled");
    });

    it("Should price large swaps below the full pool amount", async function () {
      const swapAmount = INITIAL_POOL_AMOUNT + ethers.parseEther("1");
      await stRwaToken.connect(stakingContract).mint(user.address, swapAmount);
      await stRwaToken.connect(user).approve(await swapContract.getAddress(), swapAmount);

      const [expectedOutput] = await swapContract.getSwapRate(swapAmount, true);
      expect(expectedOutput).to.be.lt(INITIAL_POOL_AMOUNT);
    });
  });

  describe("Swap RWA to stRWA", function () {
    beforeEach(async function () {
      // 给用户转账 RWA
      const swapAmount = ethers.parseEther("100");
      await rwaToken.transfer(user.address, swapAmount);
      await rwaToken.connect(user).approve(await swapContract.getAddress(), swapAmount);
    });

    it("Should swap RWA to stRWA (1:1)", async function () {
      const swapAmount = ethers.parseEther("100");
      const initialStRwaBalance = await stRwaToken.balanceOf(user.address);
      const [expectedOutput] = await swapContract.getSwapRate(swapAmount, false);
      
      await swapContract.connect(user).swapRWAToStRWA(swapAmount);
      
      expect(await stRwaToken.balanceOf(user.address)).to.equal(initialStRwaBalance + expectedOutput);
      expect(await rwaToken.balanceOf(user.address)).to.equal(0);
      expect(await swapContract.rwaPoolBalance()).to.equal(INITIAL_POOL_AMOUNT + swapAmount);
      expect(await swapContract.stRwaPoolBalance()).to.equal(INITIAL_POOL_AMOUNT - expectedOutput);
    });

    it("Should emit SwapRWAToStRWA event", async function () {
      const swapAmount = ethers.parseEther("100");
      const [expectedOutput] = await swapContract.getSwapRate(swapAmount, false);
      
      await expect(swapContract.connect(user).swapRWAToStRWA(swapAmount))
        .to.emit(swapContract, "SwapRWAToStRWA")
        .withArgs(user.address, swapAmount, expectedOutput);
    });
  });

  describe("Pool Management", function () {
    it("Should allow owner to add liquidity", async function () {
      const rwaAmount = ethers.parseEther("1000");
      const stRwaAmount = ethers.parseEther("1000");
      
      await rwaToken.approve(await swapContract.getAddress(), rwaAmount);
      await stRwaToken.connect(stakingContract).mint(owner.address, stRwaAmount);
      await stRwaToken.approve(await swapContract.getAddress(), stRwaAmount);
      
      await swapContract.addLiquidity(rwaAmount, stRwaAmount);
      
      expect(await swapContract.rwaPoolBalance()).to.equal(INITIAL_POOL_AMOUNT + rwaAmount);
      expect(await swapContract.stRwaPoolBalance()).to.equal(INITIAL_POOL_AMOUNT + stRwaAmount);
    });

    it("Should allow owner to set swap enabled", async function () {
      await swapContract.setSwapEnabled(false);
      expect(await swapContract.swapEnabled()).to.be.false;
      
      await swapContract.setSwapEnabled(true);
      expect(await swapContract.swapEnabled()).to.be.true;
    });

    it("Should reject setSwapEnabled from non-owner", async function () {
      await expect(swapContract.connect(user).setSwapEnabled(false))
        .to.be.revertedWithCustomError(swapContract, "OwnableUnauthorizedAccount");
    });
  });

  describe("Query Functions", function () {
    it("Should return correct pool status", async function () {
      const status = await swapContract.getPoolStatus();
      
      expect(status[0]).to.equal(INITIAL_POOL_AMOUNT); // rwaBalance
      expect(status[1]).to.equal(INITIAL_POOL_AMOUNT); // stRwaBalance
      expect(status[2]).to.equal(INITIAL_POOL_AMOUNT * INITIAL_POOL_AMOUNT); // constant product
      expect(status[3]).to.equal(99); // AMM quote for 1 token in a balanced pool
    });

    it("Should return AMM swap output and rate for a sample amount", async function () {
      const amount = ethers.parseEther("100");
      const [outputAmount, swapRate] = await swapContract.getSwapRate(amount, true);
      expect(outputAmount).to.equal(ethers.parseEther("99.0099009900990099"));
      expect(swapRate).to.equal(99);
    });
  });
});
