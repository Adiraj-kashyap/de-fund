import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";

import type { FundingEscrow, MilestoneGovernance, MockGovernanceToken } from "../typechain-types";

describe("MilestoneGovernance", function () {
  async function deployGovernanceFixture() {
    const [projectOwner, voter1, voter2, nonStaker] = await ethers.getSigners();
    const now = await time.latest();

    const fundingGoal = ethers.parseEther("10");
    const stageAllocations = [ethers.parseEther("6"), ethers.parseEther("4")];
    const deadline = now + 7 * 24 * 60 * 60;

    const TokenFactory = await ethers.getContractFactory("MockGovernanceToken");
    const token = (await TokenFactory.deploy()) as MockGovernanceToken;
    await token.waitForDeployment();

    const FundingEscrow = await ethers.getContractFactory("FundingEscrow");
    const escrow = (await FundingEscrow.deploy(
      projectOwner.address,
      fundingGoal,
      deadline,
      stageAllocations,
      projectOwner.address
    )) as FundingEscrow;
    await escrow.waitForDeployment();

    const MilestoneGovernance = await ethers.getContractFactory("MilestoneGovernance");
    const votingPeriod = 3 * 24 * 60 * 60; // 3 days
    const quorumBps = 5_000; // 50%
    const approvalBps = 5_000; // Majority in favour
    const governance = (await MilestoneGovernance.deploy(
      await escrow.getAddress(),
      await token.getAddress(),
      votingPeriod,
      quorumBps,
      approvalBps
    )) as MilestoneGovernance;
    await governance.waitForDeployment();

    await escrow.connect(projectOwner).setGovernance(await governance.getAddress());

    const voterStake = ethers.parseEther("50");
    await token.mint(voter1.address, voterStake);
    await token.mint(voter2.address, voterStake);

    await token.connect(voter1).approve(await governance.getAddress(), voterStake);
    await token.connect(voter2).approve(await governance.getAddress(), voterStake);

    await governance.connect(voter1).stake(voterStake);
    await governance.connect(voter2).stake(voterStake);

    await escrow.connect(voter1).donate({ value: ethers.parseEther("6") });
    await escrow.connect(voter2).donate({ value: ethers.parseEther("4") });

    return {
      escrow,
      governance,
      token,
      projectOwner,
      voter1,
      voter2,
      nonStaker,
      votingPeriod,
      stageAllocations
    };
  }

  it("finalizes successful proposals and triggers fund releases", async function () {
    const { escrow, governance, projectOwner, voter1, voter2, votingPeriod } = await loadFixture(
      deployGovernanceFixture
    );

    const metadataURI = "ipfs://proposal-0";
    await governance.connect(projectOwner).createMilestoneProposal(0, metadataURI);
    const proposalId = await governance.latestProposalByStage(0);

    await governance.connect(voter1).vote(proposalId, true);
    await governance.connect(voter2).vote(proposalId, true);

    await expect(governance.connect(voter1).unstake(ethers.parseEther("10"))).to.be.revertedWithCustomError(
      governance,
      "UnstakeLocked"
    );

    await time.increase(votingPeriod + 1);

    await expect(governance.checkVoteResult(proposalId))
      .to.emit(governance, "ProposalFinalized")
      .withArgs(proposalId, true, ethers.parseEther("100"), 0);

    expect(await escrow.stageReleased(0)).to.equal(true);
    const proposal = await governance.getProposal(proposalId);
    expect(proposal.finalized).to.equal(true);
    expect(proposal.passed).to.equal(true);
    expect(proposal.metadataURI).to.equal(metadataURI);

    await expect(governance.connect(voter1).unstake(ethers.parseEther("10"))).not.to.be.reverted;
  });

  it("allows the DAO to declare project failure after a rejected milestone", async function () {
    const { escrow, governance, projectOwner, voter1, voter2, votingPeriod, nonStaker } = await loadFixture(
      deployGovernanceFixture
    );

    await governance.connect(projectOwner).createMilestoneProposal(0, "ipfs://stage-0");
    const firstProposalId = await governance.latestProposalByStage(0);
    await governance.connect(voter1).vote(firstProposalId, true);
    await governance.connect(voter2).vote(firstProposalId, true);
    await time.increase(votingPeriod + 1);
    await governance.checkVoteResult(firstProposalId);

    await governance.connect(projectOwner).createMilestoneProposal(1, "ipfs://proposal-1");
    const proposalId = await governance.latestProposalByStage(1);

    await governance.connect(voter1).vote(proposalId, false);
    // voter2 abstains to break quorum

    await time.increase(votingPeriod + 1);

    await expect(governance.checkVoteResult(proposalId))
      .to.emit(governance, "ProposalFinalized")
      .withArgs(proposalId, false, 0, ethers.parseEther("50"));

    await expect(governance.connect(nonStaker).declareProjectFailed(proposalId)).to.be.revertedWithCustomError(
      governance,
      "NotAuthorized"
    );

    await expect(governance.connect(voter1).declareProjectFailed(proposalId))
      .to.emit(governance, "ProjectFailureDeclared")
      .withArgs(proposalId);

    expect(await escrow.projectFailed()).to.equal(true);
  });
});
