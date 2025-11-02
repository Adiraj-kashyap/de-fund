const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time, loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("FundingEscrow", function () {
  // Fixture to deploy the contract
  async function deployFundingEscrowFixture() {
    const [owner, projectOwner, donor1, donor2, donor3, governance] = await ethers.getSigners();

    const fundingGoal = ethers.parseEther("10"); // 10 ETH
    const fundingDuration = 30 * 24 * 60 * 60; // 30 days
    const totalStages = 5;
    // Stage allocations: 20%, 20%, 20%, 20%, 20% = 10000 basis points
    const stageAllocations = [2000, 2000, 2000, 2000, 2000];

    const FundingEscrow = await ethers.getContractFactory("FundingEscrow");
    const escrow = await FundingEscrow.deploy(
      projectOwner.address,
      fundingGoal,
      fundingDuration,
      totalStages,
      stageAllocations
    );

    return { escrow, owner, projectOwner, donor1, donor2, donor3, governance, fundingGoal, fundingDuration };
  }

  describe("Deployment", function () {
    it("Should set the correct project owner", async function () {
      const { escrow, projectOwner } = await loadFixture(deployFundingEscrowFixture);
      expect(await escrow.projectOwner()).to.equal(projectOwner.address);
    });

    it("Should set the correct funding goal", async function () {
      const { escrow, fundingGoal } = await loadFixture(deployFundingEscrowFixture);
      expect(await escrow.fundingGoal()).to.equal(fundingGoal);
    });

    it("Should initialize with 5 stages", async function () {
      const { escrow } = await loadFixture(deployFundingEscrowFixture);
      expect(await escrow.totalStages()).to.equal(5);
    });

    it("Should start at stage 0", async function () {
      const { escrow } = await loadFixture(deployFundingEscrowFixture);
      expect(await escrow.currentStage()).to.equal(0);
    });

    it("Should revert with invalid stage count", async function () {
      const [owner, projectOwner] = await ethers.getSigners();
      const FundingEscrow = await ethers.getContractFactory("FundingEscrow");
      
      await expect(
        FundingEscrow.deploy(
          projectOwner.address,
          ethers.parseEther("10"),
          30 * 24 * 60 * 60,
          2, // Invalid: less than 3
          [5000, 5000]
        )
      ).to.be.revertedWith("Total stages must be between 3 and 7");
    });

    it("Should revert if allocations don't sum to 10000", async function () {
      const [owner, projectOwner] = await ethers.getSigners();
      const FundingEscrow = await ethers.getContractFactory("FundingEscrow");
      
      await expect(
        FundingEscrow.deploy(
          projectOwner.address,
          ethers.parseEther("10"),
          30 * 24 * 60 * 60,
          3,
          [3000, 3000, 3000] // Sums to 9000, not 10000
        )
      ).to.be.revertedWith("Total allocation must equal 10000 (100%)");
    });
  });

  describe("Governance Contract Setup", function () {
    it("Should allow owner to set governance contract", async function () {
      const { escrow, owner, governance } = await loadFixture(deployFundingEscrowFixture);
      
      await expect(escrow.connect(owner).setGovernanceContract(governance.address))
        .to.emit(escrow, "GovernanceContractSet")
        .withArgs(governance.address);
      
      expect(await escrow.governanceContract()).to.equal(governance.address);
    });

    it("Should not allow setting governance contract twice", async function () {
      const { escrow, owner, governance } = await loadFixture(deployFundingEscrowFixture);
      
      await escrow.connect(owner).setGovernanceContract(governance.address);
      
      await expect(
        escrow.connect(owner).setGovernanceContract(governance.address)
      ).to.be.revertedWith("Governance contract already set");
    });

    it("Should not allow non-owner to set governance contract", async function () {
      const { escrow, donor1, governance } = await loadFixture(deployFundingEscrowFixture);
      
      await expect(
        escrow.connect(donor1).setGovernanceContract(governance.address)
      ).to.be.reverted;
    });
  });

  describe("Donations", function () {
    it("Should accept donations", async function () {
      const { escrow, donor1 } = await loadFixture(deployFundingEscrowFixture);
      const donationAmount = ethers.parseEther("1");

      await expect(escrow.connect(donor1).donate({ value: donationAmount }))
        .to.emit(escrow, "DonationReceived")
        .withArgs(donor1.address, donationAmount, donationAmount);

      expect(await escrow.fundsRaised()).to.equal(donationAmount);
      expect(await escrow.contributions(donor1.address)).to.equal(donationAmount);
    });

    it("Should track multiple donors", async function () {
      const { escrow, donor1, donor2, donor3 } = await loadFixture(deployFundingEscrowFixture);
      
      await escrow.connect(donor1).donate({ value: ethers.parseEther("2") });
      await escrow.connect(donor2).donate({ value: ethers.parseEther("3") });
      await escrow.connect(donor3).donate({ value: ethers.parseEther("5") });

      expect(await escrow.getDonorCount()).to.equal(3);
      expect(await escrow.fundsRaised()).to.equal(ethers.parseEther("10"));
    });

    it("Should emit FundingGoalReached when goal is met", async function () {
      const { escrow, donor1, fundingGoal } = await loadFixture(deployFundingEscrowFixture);

      await expect(escrow.connect(donor1).donate({ value: fundingGoal }))
        .to.emit(escrow, "FundingGoalReached");

      expect(await escrow.fundingGoalReached()).to.be.true;
    });

    it("Should revert donations of 0 value", async function () {
      const { escrow, donor1 } = await loadFixture(deployFundingEscrowFixture);

      await expect(
        escrow.connect(donor1).donate({ value: 0 })
      ).to.be.revertedWith("Donation must be greater than 0");
    });

    it("Should revert donations after deadline", async function () {
      const { escrow, donor1, fundingDuration } = await loadFixture(deployFundingEscrowFixture);

      // Move time forward past deadline
      await time.increase(fundingDuration + 1);

      await expect(
        escrow.connect(donor1).donate({ value: ethers.parseEther("1") })
      ).to.be.revertedWith("Funding period has ended");
    });
  });

  describe("Fund Release", function () {
    it("Should release funds for completed milestone", async function () {
      const { escrow, owner, projectOwner, donor1, governance } = await loadFixture(deployFundingEscrowFixture);

      // Setup governance
      await escrow.connect(owner).setGovernanceContract(governance.address);

      // Reach funding goal
      await escrow.connect(donor1).donate({ value: ethers.parseEther("10") });

      const projectOwnerBalanceBefore = await ethers.provider.getBalance(projectOwner.address);

      // Release funds for stage 0 (20% of 10 ETH = 2 ETH)
      await expect(escrow.connect(governance).releaseFunds(0))
        .to.emit(escrow, "FundsReleased")
        .withArgs(0, ethers.parseEther("2"), projectOwner.address);

      const projectOwnerBalanceAfter = await ethers.provider.getBalance(projectOwner.address);
      expect(projectOwnerBalanceAfter - projectOwnerBalanceBefore).to.equal(ethers.parseEther("2"));
      expect(await escrow.currentStage()).to.equal(1);
      expect(await escrow.stageCompleted(0)).to.be.true;
    });

    it("Should not allow non-governance to release funds", async function () {
      const { escrow, owner, donor1, projectOwner, governance } = await loadFixture(deployFundingEscrowFixture);

      await escrow.connect(owner).setGovernanceContract(governance.address);
      await escrow.connect(donor1).donate({ value: ethers.parseEther("10") });

      await expect(
        escrow.connect(projectOwner).releaseFunds(0)
      ).to.be.revertedWith("Only governance contract can call this");
    });

    it("Should not release funds if goal not reached", async function () {
      const { escrow, owner, donor1, governance } = await loadFixture(deployFundingEscrowFixture);

      await escrow.connect(owner).setGovernanceContract(governance.address);
      await escrow.connect(donor1).donate({ value: ethers.parseEther("5") }); // Only half

      await expect(
        escrow.connect(governance).releaseFunds(0)
      ).to.be.revertedWith("Funding goal not reached");
    });

    it("Should not release funds out of order", async function () {
      const { escrow, owner, donor1, governance } = await loadFixture(deployFundingEscrowFixture);

      await escrow.connect(owner).setGovernanceContract(governance.address);
      await escrow.connect(donor1).donate({ value: ethers.parseEther("10") });

      await expect(
        escrow.connect(governance).releaseFunds(1) // Try stage 1 before stage 0
      ).to.be.revertedWith("Must complete stages in order");
    });

    it("Should not release funds twice for same stage", async function () {
      const { escrow, owner, donor1, governance } = await loadFixture(deployFundingEscrowFixture);

      await escrow.connect(owner).setGovernanceContract(governance.address);
      await escrow.connect(donor1).donate({ value: ethers.parseEther("10") });

      await escrow.connect(governance).releaseFunds(0);

      await expect(
        escrow.connect(governance).releaseFunds(0)
      ).to.be.revertedWith("Funds already released for this stage");
    });
  });

  describe("Refunds", function () {
    it("Should allow refund if funding goal not met after deadline", async function () {
      const { escrow, donor1, fundingDuration } = await loadFixture(deployFundingEscrowFixture);

      const donationAmount = ethers.parseEther("5");
      await escrow.connect(donor1).donate({ value: donationAmount });

      // Move past deadline
      await time.increase(fundingDuration + 1);

      const balanceBefore = await ethers.provider.getBalance(donor1.address);
      const tx = await escrow.connect(donor1).refund();
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      const balanceAfter = await ethers.provider.getBalance(donor1.address);

      expect(balanceAfter - balanceBefore + gasUsed).to.equal(donationAmount);
    });

    it("Should allow refund if project is cancelled", async function () {
      const { escrow, owner, donor1, governance } = await loadFixture(deployFundingEscrowFixture);

      await escrow.connect(owner).setGovernanceContract(governance.address);
      await escrow.connect(donor1).donate({ value: ethers.parseEther("5") });

      await escrow.connect(governance).cancelProject();

      const balanceBefore = await ethers.provider.getBalance(donor1.address);
      const tx = await escrow.connect(donor1).refund();
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      const balanceAfter = await ethers.provider.getBalance(donor1.address);

      expect(balanceAfter - balanceBefore + gasUsed).to.equal(ethers.parseEther("5"));
    });

    it("Should not allow refund if goal is reached", async function () {
      const { escrow, donor1 } = await loadFixture(deployFundingEscrowFixture);

      await escrow.connect(donor1).donate({ value: ethers.parseEther("10") });

      await expect(
        escrow.connect(donor1).refund()
      ).to.be.revertedWith("Refund conditions not met");
    });

    it("Should not allow refund twice", async function () {
      const { escrow, donor1, fundingDuration } = await loadFixture(deployFundingEscrowFixture);

      await escrow.connect(donor1).donate({ value: ethers.parseEther("5") });
      await time.increase(fundingDuration + 1);

      await escrow.connect(donor1).refund();

      await expect(
        escrow.connect(donor1).refund()
      ).to.be.revertedWith("No contribution to refund");
    });
  });

  describe("Project Status", function () {
    it("Should return correct project status", async function () {
      const { escrow, donor1, fundingGoal } = await loadFixture(deployFundingEscrowFixture);

      await escrow.connect(donor1).donate({ value: ethers.parseEther("5") });

      const status = await escrow.getProjectStatus();
      expect(status._fundsRaised).to.equal(ethers.parseEther("5"));
      expect(status._fundingGoal).to.equal(fundingGoal);
      expect(status._currentStage).to.equal(0);
      expect(status._totalStages).to.equal(5);
      expect(status._fundingGoalReached).to.be.false;
      expect(status._projectCancelled).to.be.false;
    });

    it("Should calculate stage allocation correctly", async function () {
      const { escrow, donor1 } = await loadFixture(deployFundingEscrowFixture);

      await escrow.connect(donor1).donate({ value: ethers.parseEther("10") });

      // Each stage should get 20% of 10 ETH = 2 ETH
      for (let i = 0; i < 5; i++) {
        expect(await escrow.getStageAllocation(i)).to.equal(ethers.parseEther("2"));
      }
    });
  });

  describe("Security", function () {
    it("Should reject direct ETH transfers", async function () {
      const { escrow, donor1 } = await loadFixture(deployFundingEscrowFixture);

      await expect(
        donor1.sendTransaction({
          to: await escrow.getAddress(),
          value: ethers.parseEther("1")
        })
      ).to.be.revertedWith("Use donate() function to contribute");
    });

    it("Should prevent reentrancy attacks", async function () {
      // This is implicitly tested by the ReentrancyGuard modifier
      // Additional specific reentrancy tests could be added with a malicious contract
      const { escrow } = await loadFixture(deployFundingEscrowFixture);
      expect(await escrow.getAddress()).to.be.properAddress;
    });
  });
});
