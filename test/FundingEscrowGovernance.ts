import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";

const ONE_ETHER = ethers.parseEther("1");

async function deployEscrowFixture() {
  const [projectOwner, donor1, donor2, other] = await ethers.getSigners();

  const stageAllocations = [ONE_ETHER, ONE_ETHER, ONE_ETHER];
  let fundingGoal = 0n;
  for (const allocation of stageAllocations) {
    fundingGoal += allocation;
  }

  const latestBlockTime = await time.latest();
  const deadline = BigInt(latestBlockTime + 7 * 24 * 60 * 60);

  const FundingEscrow = await ethers.getContractFactory("FundingEscrow");
  const escrow = await FundingEscrow.deploy(
    await projectOwner.getAddress(),
    fundingGoal,
    deadline,
    stageAllocations.length,
    stageAllocations
  );
  await escrow.waitForDeployment();

  return {
    escrow,
    projectOwner,
    donor1,
    donor2,
    other,
    stageAllocations,
    fundingGoal,
    deadline,
  };
}

async function deployEscrowWithGovernanceFixture() {
  const base = await deployEscrowFixture();

  const MilestoneGovernance = await ethers.getContractFactory("MilestoneGovernance");
  const votingPeriod = 3 * 24 * 60 * 60; // 3 days
  const quorumBasisPoints = 5000; // 50%
  const governance = await MilestoneGovernance.deploy(
    base.escrow.target,
    votingPeriod,
    quorumBasisPoints
  );
  await governance.waitForDeployment();

  await base.escrow.connect(base.projectOwner).setGovernance(governance.target);

  return {
    ...base,
    governance,
    votingPeriod,
  };
}

describe("FundingEscrow", function () {
  it("accepts donations up to the funding goal", async function () {
    const { escrow, donor1, donor2, fundingGoal } = await loadFixture(deployEscrowFixture);

    await expect(escrow.connect(donor1).donate({ value: ONE_ETHER }))
      .to.emit(escrow, "FundsDonated")
      .withArgs(await donor1.getAddress(), ONE_ETHER, ONE_ETHER);

    await expect(escrow.connect(donor2).donate({ value: ONE_ETHER * 2n }))
      .to.emit(escrow, "FundsDonated")
      .withArgs(await donor2.getAddress(), ONE_ETHER * 2n, ONE_ETHER * 3n)
      .and.to.emit(escrow, "FundingGoalReached").withArgs(fundingGoal);

    await expect(
      escrow.connect(donor1).donate({ value: 1n })
    ).to.be.revertedWithCustomError(escrow, "GoalExceeded");

    expect(await escrow.fundsRaised()).to.equal(fundingGoal);
  });

  it("allows refunds when funding goal is not met by the deadline", async function () {
    const { escrow, donor1, donor2, deadline } = await loadFixture(deployEscrowFixture);

    await escrow.connect(donor1).donate({ value: ONE_ETHER });
    await escrow.connect(donor2).donate({ value: ONE_ETHER });

    await time.increaseTo(Number(deadline + 1n));

    await expect(() => escrow.connect(donor1).refund()).to.changeEtherBalances(
      [escrow, donor1],
      [-ONE_ETHER, ONE_ETHER]
    );

    await expect(() => escrow.connect(donor2).refund()).to.changeEtherBalances(
      [escrow, donor2],
      [-ONE_ETHER, ONE_ETHER]
    );

    expect(await escrow.refundsEnabled()).to.equal(true);
  });

  it("enforces governance-only cancellation", async function () {
    const { escrow, projectOwner, donor1, other } = await loadFixture(deployEscrowFixture);

    await expect(
      escrow.connect(projectOwner).setGovernance(await other.getAddress())
    ).to.emit(escrow, "GovernanceUpdated");

    await escrow.connect(donor1).donate({ value: ONE_ETHER });

    await expect(escrow.connect(donor1).cancelProject()).to.be.revertedWithCustomError(
      escrow,
      "NotGovernance"
    );

    await expect(escrow.connect(other).cancelProject())
      .to.emit(escrow, "ProjectCancelled")
      .withArgs(await other.getAddress());

    await expect(() => escrow.connect(donor1).refund()).to.changeEtherBalances(
      [escrow, donor1],
      [-ONE_ETHER, ONE_ETHER]
    );
  });
});

describe("MilestoneGovernance", function () {
  it("releases milestone funds after successful quorum", async function () {
    const {
      escrow,
      governance,
      projectOwner,
      donor1,
      donor2,
      stageAllocations,
      votingPeriod,
    } = await loadFixture(deployEscrowWithGovernanceFixture);

    await escrow.connect(donor1).donate({ value: ONE_ETHER * 2n });
    await escrow.connect(donor2).donate({ value: ONE_ETHER });

    const proposalTx = await governance
      .connect(projectOwner)
      .createMilestoneProposal(0, "ipfs://proposal-0");
    await proposalTx.wait();
    const proposalId = await governance.proposalCount();

    await governance.connect(donor1).vote(proposalId, true);
    await governance.connect(donor2).vote(proposalId, true);

    await time.increase(votingPeriod + 1);

    await expect(governance.checkVoteResult(proposalId))
      .to.emit(escrow, "MilestoneFundsReleased")
      .withArgs(0, stageAllocations[0], await projectOwner.getAddress());

    expect(await escrow.currentStage()).to.equal(1);
  });

  it("prevents duplicate proposals for the same stage while active", async function () {
    const { escrow, governance, projectOwner, donor1, donor2 } = await loadFixture(
      deployEscrowWithGovernanceFixture
    );

    await escrow.connect(donor1).donate({ value: ONE_ETHER * 2n });
    await escrow.connect(donor2).donate({ value: ONE_ETHER });

    await governance
      .connect(projectOwner)
      .createMilestoneProposal(0, "ipfs://proposal-0");

    await expect(
      governance.connect(projectOwner).createMilestoneProposal(0, "ipfs://proposal-0")
    ).to.be.revertedWith("Active proposal exists");
  });

  it("blocks non-contributors and repeat voters", async function () {
    const { escrow, governance, projectOwner, donor1, donor2, other, votingPeriod } =
      await loadFixture(deployEscrowWithGovernanceFixture);

    await escrow.connect(donor1).donate({ value: ONE_ETHER * 2n });
    await escrow.connect(donor2).donate({ value: ONE_ETHER });

    await governance
      .connect(projectOwner)
      .createMilestoneProposal(0, "ipfs://proposal-0");
    const proposalId = await governance.proposalCount();

    await expect(governance.connect(other).vote(proposalId, true)).to.be.revertedWith(
      "No voting power"
    );

    await governance.connect(donor1).vote(proposalId, false);
    await expect(
      governance.connect(donor1).vote(proposalId, false)
    ).to.be.revertedWithCustomError(governance, "AlreadyVoted");

    await governance.connect(donor2).vote(proposalId, false);

    await time.increase(votingPeriod + 1);

    await expect(governance.checkVoteResult(proposalId))
      .to.emit(governance, "ProposalDefeated")
      .withArgs(proposalId, 0, 0n, ONE_ETHER * 3n);
  });
});

