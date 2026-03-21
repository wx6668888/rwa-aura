import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { EmergencyPause } from "../typechain-types";

describe("EmergencyPause", function () {
  let emergencyPause: EmergencyPause;
  let owner: SignerWithAddress;
  let emergencyOperator: SignerWithAddress;
  let user1: SignerWithAddress;
  let pausableContract: any; // Mock pausable contract

  beforeEach(async function () {
    [owner, emergencyOperator, user1] = await ethers.getSigners();

    const EmergencyPauseFactory = await ethers.getContractFactory("EmergencyPause");
    emergencyPause = await EmergencyPauseFactory.deploy();
    await emergencyPause.waitForDeployment();
    await emergencyPause.setEmergencyPauseOperator(emergencyOperator.address);

    const MockPausableFactory = await ethers.getContractFactory("MockPausable");
    pausableContract = await MockPausableFactory.deploy();
    await pausableContract.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set owner correctly", async function () {
      expect(await emergencyPause.owner()).to.equal(owner.address);
    });

    it("Should set emergency operator correctly", async function () {
      expect(await emergencyPause.emergencyPauseOperator()).to.equal(emergencyOperator.address);
    });
  });

  describe("Contract Registration", function () {
    it("Should allow owner to register pausable contracts", async function () {
      await emergencyPause.registerContract(await pausableContract.getAddress());
      
      expect(await emergencyPause.isRegistered(await pausableContract.getAddress())).to.be.true;
    });

    it("Should reject registration from non-owner", async function () {
      await expect(
        emergencyPause.connect(user1).registerContract(await pausableContract.getAddress())
      ).to.be.revertedWithCustomError(emergencyPause, "OwnableUnauthorizedAccount");
    });
  });

  describe("Global Emergency Pause", function () {
    beforeEach(async function () {
      await emergencyPause.registerContract(await pausableContract.getAddress());
    });

    it("Should allow owner to toggle global pause", async function () {
      await emergencyPause.globalPause("test");
      expect(await emergencyPause.globalPauseActive()).to.be.true;

      await emergencyPause.globalUnpause();
      expect(await emergencyPause.globalPauseActive()).to.be.false;
    });

    it("Should reject toggle from unauthorized address", async function () {
      await expect(
        emergencyPause.connect(user1).globalPause("test")
      ).to.be.revertedWith("EmergencyPause: Only owner can call");
    });
  });

  describe("Contract Pausing", function () {
    beforeEach(async function () {
      await emergencyPause.registerContract(await pausableContract.getAddress());
    });

    it("Should allow owner to pause registered contracts", async function () {
      await emergencyPause.pauseContract(await pausableContract.getAddress(), "test");
      expect(await pausableContract.paused()).to.be.true;
    });

    it("Should allow emergency operator to pause registered contracts", async function () {
      await emergencyPause.connect(emergencyOperator).pauseContract(await pausableContract.getAddress(), "test");
      expect(await pausableContract.paused()).to.be.true;
    });

    it("Should allow owner to unpause contracts", async function () {
      await emergencyPause.pauseContract(await pausableContract.getAddress(), "test");
      await emergencyPause.unpauseContract(await pausableContract.getAddress());
      expect(await pausableContract.paused()).to.be.false;
    });

    it("Should reject unpause from emergency operator", async function () {
      await emergencyPause.pauseContract(await pausableContract.getAddress(), "test");
      
      await expect(
        emergencyPause.connect(emergencyOperator).unpauseContract(await pausableContract.getAddress())
      ).to.be.revertedWith("EmergencyPause: Only owner can call");
    });
  });

  describe("Status Checking", function () {
    beforeEach(async function () {
      await emergencyPause.registerContract(await pausableContract.getAddress());
    });

    it("Should return true when global pause is active", async function () {
      await emergencyPause.globalPause("test");
      expect(await emergencyPause.isPaused(await pausableContract.getAddress())).to.be.true;
    });

    it("Should return true when contract is individually paused", async function () {
      await emergencyPause.pauseContract(await pausableContract.getAddress(), "test");
      expect(await emergencyPause.isPaused(await pausableContract.getAddress())).to.be.true;
    });
  });
});
