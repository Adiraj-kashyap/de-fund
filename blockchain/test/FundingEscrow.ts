import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";

import type { FundingEscrow } from "../typechain-types";

describe("FundingEscrow", function () {
  async function deployEscrowFixture() {
    const [projectOwner, governance, donor1, donor2] = await ethers.getSigners();
    const now = await time.latest();
    const fundingGoal = ethers.parseEther("10");
    const stageAllocations = [ethers.parseEther("6"), ethers.parseEther("4")];
    const deadline = now + 7 * 24 * 60 * 60;

    const FundingEscrow = await ethers.getContractFactory("FundingEscrow");
    const escrow = (await FundingEscrow.deploy(
      projectOwner.address,
      fundingGoal,
      deadline,
      stageAllocations,
      governance.address
    )) as FundingEscrow;
    await escrow.waitForDeployment();

    return { escrow, projectOwner, governance, donor1, donor2, fundingGoal, stageAllocations, deadline };
  }

  it("accepts donations and prevents exceeding the funding goal", async function () {
    const { escrow, donor1, donor2, fundingGoal } = await loadFixture(deployEscrowFixture);

    const firstContribution = ethers.parseEther("6");
    await expect(escrow.connect(donor1).donate({ value: firstContribution }))
      .to.emit(escrow, "DonationReceived")
      .withArgs(donor1.address, firstContribution, firstContribution);

    const secondContribution = ethers.parseEther("4");
    await expect(escrow.connect(donor2).donate({ value: secondContribution }))
      .to.emit(escrow, "FundingGoalReached")
      .withArgs(fundingGoal);

    expect(await escrow.fundsRaised()).to.equal(fundingGoal);
    expect(await escrow.totalShares()).to.equal(fundingGoal);

    await expect(
      escrow.connect(donor1).donate({ value: ethers.parseEther("1") })
    ).to.be.revertedWithCustomError(escrow, "FundingClosed");
  });

  it("allows only governance to release milestone funds", async function () {
    const { escrow, donor1, donor2, governance, projectOwner, stageAllocations } = await loadFixture(
      deployEscrowFixture
    );

    await escrow.connect(donor1).donate({ value: ethers.parseEther("6") });
    await escrow.connect(donor2).donate({ value: ethers.parseEther("4") });

    await expect(escrow.connect(donor1).releaseFunds(0)).to.be.revertedWithCustomError(escrow, "OnlyGovernance");

    const projectOwnerBalanceBefore = await ethers.provider.getBalance(projectOwner.address);

    await expect(escrow.connect(governance).releaseFunds(0))
      .to.emit(escrow, "StageFundsReleased")
      .withArgs(0, stageAllocations[0]);

    const projectOwnerBalanceAfter = await ethers.provider.getBalance(projectOwner.address);
    expect(projectOwnerBalanceAfter - projectOwnerBalanceBefore).to.equal(stageAllocations[0]);
    expect(await escrow.stageReleased(0)).to.equal(true);
  });

  it("refunds contributors when the goal is not met by the deadline", async function () {
    const { escrow, donor1, donor2 } = await loadFixture(deployEscrowFixture);

    const amount = ethers.parseEther("2");
    await escrow.connect(donor1).donate({ value: amount });
    await escrow.connect(donor2).donate({ value: amount });

    await time.increase(8 * 24 * 60 * 60);

    await expect(escrow.connect(donor1).refund())
      .to.emit(escrow, "RefundProcessed")
      .withArgs(donor1.address, amount);
    await expect(escrow.connect(donor2).refund())
      .to.emit(escrow, "RefundProcessed")
      .withArgs(donor2.address, amount);

    expect(await escrow.totalShares()).to.equal(0);
    expect(await escrow.escrowBalance()).to.equal(0);
  });

  it("processes pro-rata refunds on project failure after partial releases", async function () {
    const { escrow, donor1, donor2, governance } = await loadFixture(deployEscrowFixture);

    const donor1Contribution = ethers.parseEther("6");
    const donor2Contribution = ethers.parseEther("4");

    await escrow.connect(donor1).donate({ value: donor1Contribution });
    await escrow.connect(donor2).donate({ value: donor2Contribution });

    await escrow.connect(governance).releaseFunds(0);
    await escrow.connect(governance).markProjectFailed();

    const expectedRemainingBalance = ethers.parseEther("4");
    expect(await escrow.escrowBalance()).to.equal(expectedRemainingBalance);

    const donor1Refund = (expectedRemainingBalance * donor1Contribution) / (donor1Contribution + donor2Contribution);
    const donor2Refund = expectedRemainingBalance - donor1Refund;

    await expect(escrow.connect(donor1).refund())
      .to.emit(escrow, "RefundProcessed")
      .withArgs(donor1.address, donor1Refund);

    await expect(escrow.connect(donor2).refund())
      .to.emit(escrow, "RefundProcessed")
      .withArgs(donor2.address, donor2Refund);

    expect(await escrow.escrowBalance()).to.equal(0);
  });
});
