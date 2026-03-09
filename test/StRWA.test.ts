import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { StRWA } from "../typechain-types";

describe("StRWA", function () {
  let stRWA: StRWA;
  let owner: any;
  let stakingContract: any;
  let user: any;

  beforeEach(async function () {
    [owner, stakingContract, user] = await ethers.getSigners();
    
    const StRWAFactory = await ethers.getContractFactory("StRWA");
    stRWA = await StRWAFactory.deploy();
    await stRWA.waitForDeployment();
    
    // 设置 stakingContract
    await stRWA.setStakingContract(stakingContract.address);
  });

  describe("Deployment", function () {
    it("Should deploy with correct name and symbol", async function () {
      expect(await stRWA.name()).to.equal("Staked RWA");
      expect(await stRWA.symbol()).to.equal("stRWA");
    });

    it("Should set owner correctly", async function () {
      expect(await stRWA.owner()).to.equal(owner.address);
    });

    it("Should set stakingContract correctly", async function () {
      expect(await stRWA.stakingContract()).to.equal(stakingContract.address);
    });
  });

  describe("Minting", function () {
    it("Should mint stRWA tokens", async function () {
      const amount = ethers.parseEther("1000");
      
      await stRWA.connect(stakingContract).mint(user.address, amount);
      
      expect(await stRWA.balanceOf(user.address)).to.equal(amount);
      expect(await stRWA.totalSupply()).to.equal(amount);
    });

    it("Should emit Minted event", async function () {
      const amount = ethers.parseEther("1000");
      
      await expect(stRWA.connect(stakingContract).mint(user.address, amount))
        .to.emit(stRWA, "Minted")
        .withArgs(user.address, amount);
    });

    it("Should reject mint from non-staking contract", async function () {
      const amount = ethers.parseEther("1000");
      
      await expect(stRWA.connect(user).mint(user.address, amount))
        .to.be.revertedWith("StRWA: Only staking contract");
    });

    it("Should reject mint with zero amount", async function () {
      await expect(stRWA.connect(stakingContract).mint(user.address, 0))
        .to.be.revertedWith("StRWA: Amount must be greater than zero");
    });

    it("Should reject mint to zero address", async function () {
      const amount = ethers.parseEther("1000");
      
      await expect(stRWA.connect(stakingContract).mint(ethers.ZeroAddress, amount))
        .to.be.revertedWith("StRWA: Invalid address");
    });

    it("Should mint locked balance with unlock time", async function () {
      const amount = ethers.parseEther("120");
      const lockDuration = 30 * 24 * 60 * 60;

      await stRWA.connect(stakingContract).mintLocked(user.address, amount, lockDuration);

      expect(await stRWA.balanceOf(user.address)).to.equal(amount);
      expect(await stRWA.getLockedBalance(user.address)).to.equal(amount);
      expect(await stRWA.availableBalanceOf(user.address)).to.equal(0);
    });

    it("Should block transfers until the lock expires", async function () {
      const amount = ethers.parseEther("120");
      const lockDuration = 30 * 24 * 60 * 60;

      await stRWA.connect(stakingContract).mintLocked(user.address, amount, lockDuration);

      await expect(
        stRWA.connect(user).transfer(owner.address, amount)
      ).to.be.revertedWith("StRWA: Amount exceeds unlocked balance");

      await time.increase(lockDuration);

      await expect(
        stRWA.connect(user).transfer(owner.address, amount)
      ).to.not.be.reverted;
    });
  });

  describe("Burning", function () {
    beforeEach(async function () {
      // 先 mint 一些代币
      const amount = ethers.parseEther("1000");
      await stRWA.connect(stakingContract).mint(user.address, amount);
    });

    it("Should burn stRWA tokens", async function () {
      const amount = ethers.parseEther("500");
      
      await stRWA.connect(stakingContract).burn(user.address, amount);
      
      expect(await stRWA.balanceOf(user.address)).to.equal(ethers.parseEther("500"));
      expect(await stRWA.totalSupply()).to.equal(ethers.parseEther("500"));
    });

    it("Should emit Burned event", async function () {
      const amount = ethers.parseEther("500");
      
      await expect(stRWA.connect(stakingContract).burn(user.address, amount))
        .to.emit(stRWA, "Burned")
        .withArgs(user.address, amount);
    });

    it("Should reject burn from non-staking contract", async function () {
      const amount = ethers.parseEther("500");
      
      await expect(stRWA.connect(user).burn(user.address, amount))
        .to.be.revertedWith("StRWA: Only staking contract");
    });

    it("Should reject burn with insufficient balance", async function () {
      const amount = ethers.parseEther("2000");
      
      await expect(stRWA.connect(stakingContract).burn(user.address, amount))
        .to.be.revertedWith("StRWA: Insufficient balance");
    });
  });

  describe("Batch Transfer", function () {
    beforeEach(async function () {
      // Owner mint 一些代币用于批量转账
      const amount = ethers.parseEther("10000");
      await stRWA.connect(stakingContract).mint(owner.address, amount);
    });

    it("Should batch transfer tokens", async function () {
      const recipients = [user.address, stakingContract.address];
      const amounts = [ethers.parseEther("1000"), ethers.parseEther("2000")];
      
      await stRWA.batchTransfer(recipients, amounts);
      
      expect(await stRWA.balanceOf(user.address)).to.equal(amounts[0]);
      expect(await stRWA.balanceOf(stakingContract.address)).to.equal(amounts[1]);
    });

    it("Should reject batch transfer from non-owner", async function () {
      const recipients = [user.address];
      const amounts = [ethers.parseEther("1000")];
      
      await expect(stRWA.connect(user).batchTransfer(recipients, amounts))
        .to.be.revertedWithCustomError(stRWA, "OwnableUnauthorizedAccount");
    });

    it("Should reject batch transfer with mismatched arrays", async function () {
      const recipients = [user.address, stakingContract.address];
      const amounts = [ethers.parseEther("1000")];
      
      await expect(stRWA.batchTransfer(recipients, amounts))
        .to.be.revertedWith("StRWA: Arrays length mismatch");
    });
  });

  describe("Access Control", function () {
    it("Should allow owner to update stakingContract", async function () {
      const newStakingContract = user.address;
      
      await expect(stRWA.setStakingContract(newStakingContract))
        .to.emit(stRWA, "StakingContractUpdated")
        .withArgs(stakingContract.address, newStakingContract);
      
      expect(await stRWA.stakingContract()).to.equal(newStakingContract);
    });

    it("Should reject update from non-owner", async function () {
      await expect(stRWA.connect(user).setStakingContract(user.address))
        .to.be.revertedWithCustomError(stRWA, "OwnableUnauthorizedAccount");
    });

    it("Should reject zero address", async function () {
      await expect(stRWA.setStakingContract(ethers.ZeroAddress))
        .to.be.revertedWith("StRWA: Invalid address");
    });
  });
});
