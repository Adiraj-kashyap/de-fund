const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time, loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("MilestoneGovernance", function () {
  async function deployGovernanceFixture() {
    const [owner, projectOwner, voter1, voter2, voter3, voter4] = await ethers.getSigners();

    // Deploy governance contract (ETH staking)
    const MilestoneGovernance = await ethers.getContractFactory("MilestoneGovernance");
    const governance = await MilestoneGovernance.deploy(ethers.ZeroAddress); // ETH staking

    // Deploy escrow contract
    const fundingGoal = ethers.parseEther("10");
    const fundingDuration = 30 * 24 * 60 * 60;
    const totalStages = 5;
    const stageAllocations = [2000, 2000, 2000, 2000, 2000];

    const FundingEscrow = await ethers.getContractFactory("FundingEscrow");
    const escrow = await FundingEscrow.deploy(
      projectOwner.address,
      fundingGoal,
      fundingDuration,
      totalStages,
      stageAllocations
    );

    // Set governance contract in escrow
    await escrow.setGovernanceContract(await governance.getAddress());

    return { governance, escrow, owner, projectOwner, voter1, voter2, voter3, voter4, fundingGoal };
  }

  describe("Deployment", function () {
    it("Should deploy with ETH staking", async function () {
      const { governance } = await loadFixture(deployGovernanceFixture);
      expect(await governance.useTokenStaking()).to.be.false;
    });

    it("Should set correct voting period", async function () {
      const { governance } = await loadFixture(deployGovernanceFixture);
      expect(await governance.VOTING_PERIOD()).to.equal(7 * 24 * 60 * 60); // 7 days
    });

    it("Should set correct minimum stake", async function () {
      const { governance } = await loadFixture(deployGovernanceFixture);
      expect(await governance.MINIMUM_STAKE()).to.equal(ethers.parseEther("0.01"));
    });
  });

  describe("Voter Registration", function () {
    it("Should allow registration with sufficient stake", async function () {
      const { governance, voter1 } = await loadFixture(deployGovernanceFixture);
      const stakeAmount = ethers.parseEther("0.05");

      await expect(governance.connect(voter1).registerVoter({ value: stakeAmount }))
        .to.emit(governance, "VoterRegistered")
        .withArgs(voter1.address, stakeAmount);

      const voterInfo = await governance.getVoterInfo(voter1.address);
      expect(voterInfo.stakedAmount).to.equal(stakeAmount);
      expect(voterInfo.isRegistered).to.be.true;
      expect(voterInfo.reputation).to.equal(100); // Initial reputation
    });

    it("Should reject registration with insufficient stake", async function () {
      const { governance, voter1 } = await loadFixture(deployGovernanceFixture);
      const stakeAmount = ethers.parseEther("0.005"); // Less than minimum

      await expect(
        governance.connect(voter1).registerVoter({ value: stakeAmount })
      ).to.be.revertedWith("Insufficient stake amount");
    });

    it("Should not allow double registration", async function () {
      const { governance, voter1 } = await loadFixture(deployGovernanceFixture);

      await governance.connect(voter1).registerVoter({ value: ethers.parseEther("0.05") });

      await expect(
        governance.connect(voter1).registerVoter({ value: ethers.parseEther("0.05") })
      ).to.be.revertedWith("Already registered");
    });

    it("Should allow adding additional stake", async function () {
      const { governance, voter1 } = await loadFixture(deployGovernanceFixture);
      const initialStake = ethers.parseEther("0.05");
      const additionalStake = ethers.parseEther("0.1");

      await governance.connect(voter1).registerVoter({ value: initialStake });
      
      await expect(governance.connect(voter1).addStake({ value: additionalStake }))
        .to.emit(governance, "StakeAdded")
        .withArgs(voter1.address, additionalStake, initialStake + additionalStake);

      const voterInfo = await governance.getVoterInfo(voter1.address);
      expect(voterInfo.stakedAmount).to.equal(initialStake + additionalStake);
    });
  });

  describe("Proposal Creation", function () {
    it("Should allow project owner to create milestone proposal", async function () {
      const { governance, escrow, projectOwner, voter1, fundingGoal } = await loadFixture(deployGovernanceFixture);

      // Fund the project
      await escrow.connect(voter1).donate({ value: fundingGoal });

      const evidenceHash = "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG"; // Example IPFS hash

      await expect(governance.connect(projectOwner).createMilestoneProposal(
        await escrow.getAddress(),
        0,
        evidenceHash
      ))
        .to.emit(governance, "ProposalCreated");

      const proposal = await governance.getProposal(0);
      expect(proposal.stageIndex).to.equal(0);
      expect(proposal.projectOwner).to.equal(projectOwner.address);
      expect(proposal.evidenceHash).to.equal(evidenceHash);
      expect(proposal.status).to.equal(1); // Active
    });

    it("Should not allow non-project-owner to create proposal", async function () {
      const { governance, escrow, voter1, fundingGoal } = await loadFixture(deployGovernanceFixture);

      await escrow.connect(voter1).donate({ value: fundingGoal });

      await expect(
        governance.connect(voter1).createMilestoneProposal(
          await escrow.getAddress(),
          0,
          "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG"
        )
      ).to.be.revertedWith("Only project owner can create proposal");
    });

    it("Should not allow proposal if funding goal not reached", async function () {
      const { governance, escrow, projectOwner } = await loadFixture(deployGovernanceFixture);

      await expect(
        governance.connect(projectOwner).createMilestoneProposal(
          await escrow.getAddress(),
          0,
          "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG"
        )
      ).to.be.revertedWith("Funding goal not reached");
    });

    it("Should not allow proposal for out-of-order stage", async function () {
      const { governance, escrow, projectOwner, voter1, fundingGoal } = await loadFixture(deployGovernanceFixture);

      await escrow.connect(voter1).donate({ value: fundingGoal });

      await expect(
        governance.connect(projectOwner).createMilestoneProposal(
          await escrow.getAddress(),
          1, // Try to create for stage 1 before stage 0
          "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG"
        )
      ).to.be.revertedWith("Must complete stages in order");
    });
  });

  describe("Voting", function () {
    async function setupProposal() {
      const fixture = await loadFixture(deployGovernanceFixture);
      const { governance, escrow, projectOwner, voter1, voter2, voter3, fundingGoal } = fixture;

      // Register voters
      await governance.connect(voter1).registerVoter({ value: ethers.parseEther("1") });
      await governance.connect(voter2).registerVoter({ value: ethers.parseEther("2") });
      await governance.connect(voter3).registerVoter({ value: ethers.parseEther("3") });

      // Fund the project
      await escrow.connect(voter1).donate({ value: fundingGoal });

      // Create proposal
      await governance.connect(projectOwner).createMilestoneProposal(
        await escrow.getAddress(),
        0,
        "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG"
      );

      return { ...fixture, proposalId: 0 };
    }

    it("Should allow registered voter to vote", async function () {
      const { governance, voter1, proposalId } = await setupProposal();

      await expect(governance.connect(voter1).vote(proposalId, true))
        .to.emit(governance, "VoteCast");

      expect(await governance.hasVoted(proposalId, voter1.address)).to.be.true;
    });

    it("Should weight votes by stake and reputation", async function () {
      const { governance, voter1, voter2, proposalId } = await setupProposal();

      await governance.connect(voter1).vote(proposalId, true);
      await governance.connect(voter2).vote(proposalId, true);

      const proposal = await governance.getProposal(proposalId);
      
      // voter1: 1 ETH stake + (100 reputation * 1 ETH / 100) = 2 ETH weight
      // voter2: 2 ETH stake + (100 reputation * 1 ETH / 100) = 3 ETH weight
      // Total: 5 ETH
      expect(proposal.votesFor).to.equal(ethers.parseEther("5"));
    });

    it("Should not allow non-registered voter to vote", async function () {
      const { governance, voter4, proposalId } = await setupProposal();

      await expect(
        governance.connect(voter4).vote(proposalId, true)
      ).to.be.revertedWith("Not a registered voter");
    });

    it("Should not allow voting twice", async function () {
      const { governance, voter1, proposalId } = await setupProposal();

      await governance.connect(voter1).vote(proposalId, true);

      await expect(
        governance.connect(voter1).vote(proposalId, true)
      ).to.be.revertedWith("Already voted on this proposal");
    });

    it("Should not allow voting after period ends", async function () {
      const { governance, voter1, proposalId } = await setupProposal();

      // Move time forward past voting period
      await time.increase(8 * 24 * 60 * 60); // 8 days

      await expect(
        governance.connect(voter1).vote(proposalId, true)
      ).to.be.revertedWith("Voting period ended");
    });

    it("Should count votes for and against separately", async function () {
      const { governance, voter1, voter2, voter3, proposalId } = await setupProposal();

      await governance.connect(voter1).vote(proposalId, true);
      await governance.connect(voter2).vote(proposalId, false);
      await governance.connect(voter3).vote(proposalId, true);

      const proposal = await governance.getProposal(proposalId);
      
      // votesFor: voter1 (2 ETH) + voter3 (4 ETH) = 6 ETH
      // votesAgainst: voter2 (3 ETH)
      expect(proposal.votesFor).to.equal(ethers.parseEther("6"));
      expect(proposal.votesAgainst).to.equal(ethers.parseEther("3"));
    });
  });

  describe("Proposal Execution", function () {
    async function setupVotedProposal(votesFor, votesAgainst) {
      const fixture = await loadFixture(deployGovernanceFixture);
      const { governance, escrow, projectOwner, voter1, voter2, voter3, fundingGoal } = fixture;

      // Register voters with different stakes
      await governance.connect(voter1).registerVoter({ value: ethers.parseEther("2") });
      await governance.connect(voter2).registerVoter({ value: ethers.parseEther("2") });
      await governance.connect(voter3).registerVoter({ value: ethers.parseEther("2") });

      // Fund the project
      await escrow.connect(voter1).donate({ value: fundingGoal });

      // Create proposal
      await governance.connect(projectOwner).createMilestoneProposal(
        await escrow.getAddress(),
        0,
        "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG"
      );

      // Cast votes
      if (votesFor > 0) await governance.connect(voter1).vote(0, true);
      if (votesFor > 1) await governance.connect(voter2).vote(0, true);
      if (votesAgainst > 0 && votesFor < 2) await governance.connect(voter2).vote(0, false);
      if (votesAgainst > 1) await governance.connect(voter3).vote(0, false);

      return { ...fixture, proposalId: 0 };
    }

    it("Should approve proposal with majority and quorum", async function () {
      const { governance, escrow, projectOwner, proposalId } = await setupVotedProposal(2, 0);

      // Move past voting period
      await time.increase(8 * 24 * 60 * 60);

      const projectOwnerBalanceBefore = await ethers.provider.getBalance(projectOwner.address);

      await expect(governance.executeProposal(proposalId))
        .to.emit(governance, "ProposalApproved")
        .to.emit(governance, "ProposalExecuted");

      const proposal = await governance.getProposal(proposalId);
      expect(proposal.status).to.equal(2); // Approved
      expect(proposal.executed).to.be.true;

      // Verify funds were released
      const projectOwnerBalanceAfter = await ethers.provider.getBalance(projectOwner.address);
      expect(projectOwnerBalanceAfter - projectOwnerBalanceBefore).to.equal(ethers.parseEther("2")); // 20% of 10 ETH
    });

    it("Should reject proposal without majority", async function () {
      const { governance, proposalId } = await setupVotedProposal(1, 2);

      await time.increase(8 * 24 * 60 * 60);

      await expect(governance.executeProposal(proposalId))
        .to.emit(governance, "ProposalRejected");

      const proposal = await governance.getProposal(proposalId);
      expect(proposal.status).to.equal(3); // Rejected
    });

    it("Should not execute proposal before voting period ends", async function () {
      const { governance, proposalId } = await setupVotedProposal(2, 0);

      await expect(
        governance.executeProposal(proposalId)
      ).to.be.revertedWith("Voting period not ended");
    });

    it("Should not execute proposal twice", async function () {
      const { governance, proposalId } = await setupVotedProposal(2, 0);

      await time.increase(8 * 24 * 60 * 60);

      await governance.executeProposal(proposalId);

      // After execution, status is no longer Active, so it reverts with "Proposal not active"
      await expect(
        governance.executeProposal(proposalId)
      ).to.be.revertedWith("Proposal not active");
    });
  });

  describe("Stake Withdrawal", function () {
    it("Should allow withdrawal after no active votes", async function () {
      const { governance, escrow, projectOwner, voter1, fundingGoal } = await loadFixture(deployGovernanceFixture);
      const stakeAmount = ethers.parseEther("1");

      await governance.connect(voter1).registerVoter({ value: stakeAmount });
      await escrow.connect(voter1).donate({ value: fundingGoal });

      // Create and vote on proposal
      await governance.connect(projectOwner).createMilestoneProposal(
        await escrow.getAddress(),
        0,
        "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG"
      );
      await governance.connect(voter1).vote(0, true);

      // Complete voting
      await time.increase(8 * 24 * 60 * 60);
      await governance.executeProposal(0);

      // Now can withdraw
      const balanceBefore = await ethers.provider.getBalance(voter1.address);
      const tx = await governance.connect(voter1).withdrawStake();
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      const balanceAfter = await ethers.provider.getBalance(voter1.address);

      expect(balanceAfter - balanceBefore + gasUsed).to.equal(stakeAmount);
    });

    it("Should not allow withdrawal with active votes", async function () {
      const { governance, escrow, projectOwner, voter1, fundingGoal } = await loadFixture(deployGovernanceFixture);

      await governance.connect(voter1).registerVoter({ value: ethers.parseEther("1") });
      await escrow.connect(voter1).donate({ value: fundingGoal });

      await governance.connect(projectOwner).createMilestoneProposal(
        await escrow.getAddress(),
        0,
        "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG"
      );
      await governance.connect(voter1).vote(0, true);

      await expect(
        governance.connect(voter1).withdrawStake()
      ).to.be.revertedWith("Cannot withdraw while having active votes");
    });
  });

  describe("View Functions", function () {
    it("Should return correct total staked", async function () {
      const { governance, voter1, voter2 } = await loadFixture(deployGovernanceFixture);

      await governance.connect(voter1).registerVoter({ value: ethers.parseEther("1") });
      await governance.connect(voter2).registerVoter({ value: ethers.parseEther("2") });

      expect(await governance.getTotalStaked()).to.equal(ethers.parseEther("3"));
    });

    it("Should return correct voter info", async function () {
      const { governance, voter1 } = await loadFixture(deployGovernanceFixture);
      const stakeAmount = ethers.parseEther("0.5");

      await governance.connect(voter1).registerVoter({ value: stakeAmount });

      const voterInfo = await governance.getVoterInfo(voter1.address);
      expect(voterInfo.stakedAmount).to.equal(stakeAmount);
      expect(voterInfo.reputation).to.equal(100);
      expect(voterInfo.isRegistered).to.be.true;
      expect(voterInfo.proposalCount).to.equal(0);
    });
  });
});
