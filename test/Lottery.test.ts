import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { LotteryContractSimple, RWAToken } from "../typechain-types";

describe("LotteryContractSimple", function () {
  let lottery: LotteryContractSimple;
  let rwaToken: RWAToken;
  let owner: SignerWithAddress;
  let treasury: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  beforeEach(async function () {
    [owner, treasury, user1, user2] = await ethers.getSigners();

    const RWATokenFactory = await ethers.getContractFactory("RWAToken");
    rwaToken = await RWATokenFactory.deploy(
      "RWA Token",
      "RWA",
      ethers.parseEther("1000000000"),
      treasury.address,
      treasury.address
    );
    await rwaToken.waitForDeployment();

    const LotteryFactory = await ethers.getContractFactory("LotteryContractSimple");
    lottery = await LotteryFactory.deploy(await rwaToken.getAddress(), treasury.address);
    await lottery.waitForDeployment();

    const amount = ethers.parseEther("10000");
    await rwaToken.transfer(user1.address, amount);
    await rwaToken.transfer(user2.address, amount);
  });

  it("should deploy with current ticket prices and rounds", async function () {
    expect(await lottery.WEEKLY_TICKET_PRICE()).to.equal(ethers.parseEther("10"));
    expect(await lottery.MONTHLY_TICKET_PRICE()).to.equal(ethers.parseEther("50"));
    expect(await lottery.REALTIME_TICKET_PRICE()).to.equal(ethers.parseEther("2"));
    expect(await lottery.ANNUAL_TICKET_PRICE()).to.equal(ethers.parseEther("200"));
    expect(await lottery.weeklyRound()).to.equal(1);
    expect(await lottery.monthlyRound()).to.equal(1);
    expect(await lottery.realTimeRound()).to.equal(1);
    expect(await lottery.annualRound()).to.equal(1);
    expect(await lottery.treasury()).to.equal(treasury.address);
  });

  it("should allow users to buy weekly tickets and record ticket details", async function () {
    const quantity = 3;
    const totalCost = ethers.parseEther("30");

    await rwaToken.connect(user1).approve(await lottery.getAddress(), totalCost);
    await lottery.connect(user1).buyTickets(quantity, 0);

    const userTickets = await lottery.getUserTickets(user1.address);
    expect(userTickets.length).to.equal(quantity);
    expect(await lottery.weeklyPrizePool()).to.equal(totalCost);

    const firstTicket = await lottery.getTicket(userTickets[0]);
    expect(firstTicket.owner).to.equal(user1.address);
    expect(firstTicket.poolType).to.equal(0);
    expect(firstTicket.round).to.equal(1);
    expect(firstTicket.number).to.be.gte(100000);
    expect(firstTicket.number).to.be.lte(999999);
  });

  it("should reject invalid ticket counts", async function () {
    await expect(lottery.connect(user1).buyTickets(0, 0)).to.be.revertedWith("Invalid ticket count");
    await expect(lottery.connect(user1).buyTickets(101, 0)).to.be.revertedWith("Invalid ticket count");
  });

  it("should expose current pool info for purchased tickets", async function () {
    await rwaToken.connect(user1).approve(await lottery.getAddress(), ethers.parseEther("20"));
    await lottery.connect(user1).buyTickets(2, 0);

    const poolInfo = await lottery.getCurrentPoolInfo(0);
    expect(poolInfo[0]).to.equal(1);
    expect(poolInfo[1]).to.equal(ethers.parseEther("20"));
    expect(poolInfo[3]).to.equal(2);
    expect(poolInfo[4]).to.equal(ethers.parseEther("10"));
  });

  it("should only allow owner to draw and send 5% to treasury", async function () {
    const totalCost = ethers.parseEther("4");
    await rwaToken.connect(user1).approve(await lottery.getAddress(), totalCost);
    await lottery.connect(user1).buyTickets(2, 2);

    await expect(lottery.connect(user1).draw(2)).to.be.revertedWithCustomError(
      lottery,
      "OwnableUnauthorizedAccount"
    );

    const treasuryBefore = await rwaToken.balanceOf(treasury.address);
    const nextDraw = await lottery.nextRealTimeDraw();
    await time.increaseTo(Number(nextDraw));

    await lottery.draw(2);

    const treasuryAfter = await rwaToken.balanceOf(treasury.address);
    expect(treasuryAfter - treasuryBefore).to.equal(ethers.parseEther("0.2"));
    expect(await lottery.realTimeRound()).to.equal(2);

    const drawRecord = await lottery.getDraw(2, 1);
    expect(drawRecord.completed).to.equal(true);
    expect(drawRecord.totalPrize).to.equal(totalCost);
  });
});
