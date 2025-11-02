const { expect } = require("chai");
const { ethers } = require("hardhat");
const hre = require("hardhat");

describe("FundingEscrow", function () {
  let fundingEscrow;
  let governanceToken;
  let milestoneGovernance;
  let owner;
  let projectOwner;
  let donor1;
  let donor2;
  let donor3;

  const FUNDING_GOAL = ethers.parseEther("100"); // 100 ETH
  const VOTING_PERIOD = 7 * 24 * 60 * 60; // 7 days
  const MINIMUM_STAKE = ethers.parseEther("10"); // 10 tokens

  beforeEach(async function () {
    [owner, projectOwner, donor1, donor2, donor3] = await ethers.getSigners();

    // Deploy GovernanceToken
    const GovernanceToken = await ethers.getContractFactory("GovernanceToken");
    governanceToken = await GovernanceToken.deploy(
      "Funding Governance Token",
      "FGT",
      ethers.parseEther("10000") // Initial supply
    );
    await governanceToken.waitForDeployment();

    // Deploy MilestoneGovernance
    const MilestoneGovernance = await ethers.getContractFactory("MilestoneGovernance");
    milestoneGovernance = await MilestoneGovernance.deploy(
      await governanceToken.getAddress(),
      VOTING_PERIOD,
      MINIMUM_STAKE
    );
    await milestoneGovernance.waitForDeployment();

    // Set up funding allocations for 3 stages
    const fundsAllocatedPerStage = [
      ethers.parseEther("30"), // Stage 0: 30 ETH
      ethers.parseEther("40"), // Stage 1: 40 ETH
      ethers.parseEther("30"), // Stage 2: 30 ETH
    ];

    const deadline = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60; // 30 days from now

    // Deploy FundingEscrow
    const FundingEscrow = await ethers.getContractFactory("FundingEscrow");
    fundingEscrow = await FundingEscrow.deploy(
      projectOwner.address,
      FUNDING_GOAL,
      deadline,
      3, // totalStages
      fundsAllocatedPerStage
    );
    await fundingEscrow.waitForDeployment();

    // Link contracts
    await fundingEscrow.setGovernanceContract(await milestoneGovernance.getAddress());
    await milestoneGovernance.setEscrowContract(await fundingEscrow.getAddress());
  });

  describe("Deployment", function () {
    it("Should set the correct project owner", async function () {
      expect(await fundingEscrow.projectOwner()).to.equal(projectOwner.address);
    });

    it("Should set the correct funding goal", async function () {
      expect(await fundingEscrow.fundingGoal()).to.equal(FUNDING_GOAL);
    });

    it("Should set the correct total stages", async function () {
      expect(await fundingEscrow.totalStages()).to.equal(3);
    });

    it("Should initialize with zero funds raised", async function () {
      expect(await fundingEscrow.fundsRaised()).to.equal(0);
    });

    it("Should reject invalid constructor parameters", async function () {
      const FundingEscrow = await ethers.getContractFactory("FundingEscrow");
      const deadline = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
      const invalidAllocations = [ethers.parseEther("50"), ethers.parseEther("60")]; // Sums to 110, not 100

      await expect(
        FundingEscrow.deploy(
          projectOwner.address,
          FUNDING_GOAL,
          deadline,
          2,
          invalidAllocations
        )
      ).to.be.revertedWith("Stage allocations must sum to funding goal");
    });
  });

  describe("Donations", function () {
    it("Should accept donations", async function () {
      const donationAmount = ethers.parseEther("10");
      await expect(fundingEscrow.connect(donor1).donate({ value: donationAmount }))
        .to.emit(fundingEscrow, "FundsDonated")
        .withArgs(donor1.address, donationAmount, donationAmount);

      expect(await fundingEscrow.fundsRaised()).to.equal(donationAmount);
      expect(await fundingEscrow.donations(donor1.address)).to.equal(donationAmount);
    });

    it("Should track multiple donors", async function () {
      await fundingEscrow.connect(donor1).donate({ value: ethers.parseEther("30") });
      await fundingEscrow.connect(donor2).donate({ value: ethers.parseEther("40") });
      await fundingEscrow.connect(donor3).donate({ value: ethers.parseEther("30") });

      expect(await fundingEscrow.fundsRaised()).to.equal(FUNDING_GOAL);
      expect(await fundingEscrow.donations(donor1.address)).to.equal(ethers.parseEther("30"));
      expect(await fundingEscrow.donations(donor2.address)).to.equal(ethers.parseEther("40"));
      expect(await fundingEscrow.donations(donor3.address)).to.equal(ethers.parseEther("30"));
      expect(await fundingEscrow.getDonorCount()).to.equal(3);
    });

    it("Should emit FundingGoalMet when goal is reached", async function () {
      await fundingEscrow.connect(donor1).donate({ value: FUNDING_GOAL });

      expect(await fundingEscrow.fundingGoalMet()).to.be.true;
    });

    it("Should reject donations after deadline", async function () {
      // Use Hardhat's time manipulation
      const FundingEscrow = await ethers.getContractFactory("FundingEscrow");
      const currentTime = await ethers.provider.getBlock("latest").then(b => b.timestamp);
      const pastDeadline = currentTime - 1000; // Past deadline
      
      // This test is skipped because constructor validates deadline must be in future
      // To test deadline, we'd need to deploy with future deadline then advance time
      const futureDeadline = currentTime + 1000;
      const escrow = await FundingEscrow.deploy(
        projectOwner.address,
        FUNDING_GOAL,
        futureDeadline,
        3,
        [ethers.parseEther("30"), ethers.parseEther("40"), ethers.parseEther("30")]
      );
      await escrow.waitForDeployment();
      
      // Advance time past deadline
      await ethers.provider.send("evm_increaseTime", [2000]);
      await ethers.provider.send("evm_mine", []);

      await expect(
        escrow.connect(donor1).donate({ value: ethers.parseEther("10") })
      ).to.be.revertedWith("Funding deadline has passed");
    });

    it("Should reject zero donations", async function () {
      await expect(
        fundingEscrow.connect(donor1).donate({ value: 0 })
      ).to.be.revertedWith("Donation must be greater than zero");
    });
  });

  describe("Fund Release", function () {
    beforeEach(async function () {
      // Fund the project to goal
      await fundingEscrow.connect(donor1).donate({ value: FUNDING_GOAL });
    });

    it("Should release funds for a milestone", async function () {
      const stage0Allocation = ethers.parseEther("30");
      const initialBalance = await ethers.provider.getBalance(projectOwner.address);

      // Impersonate the governance contract to call releaseFunds
      const governanceAddress = await milestoneGovernance.getAddress();
      await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [governanceAddress],
      });
      
      // Fund the governance address to pay for gas
      await hre.network.provider.request({
        method: "hardhat_setBalance",
        params: [governanceAddress, "0x1000000000000000000"], // 1 ETH
      });

      const governanceSigner = await ethers.getSigner(governanceAddress);
      await fundingEscrow.connect(governanceSigner).releaseFunds(0);

      // Stop impersonating
      await hre.network.provider.request({
        method: "hardhat_stopImpersonatingAccount",
        params: [governanceAddress],
      });

      expect(await fundingEscrow.stageFundsReleased(0)).to.be.true;
      expect(await fundingEscrow.currentStage()).to.equal(1);
      
      const finalBalance = await ethers.provider.getBalance(projectOwner.address);
      expect(finalBalance - initialBalance).to.equal(stage0Allocation);
    });

    it("Should only allow governance to release funds", async function () {
      await expect(
        fundingEscrow.connect(projectOwner).releaseFunds(0)
      ).to.be.revertedWith("Only governance contract can call this");
    });

    it("Should reject release if funding goal not met", async function () {
      const FundingEscrow = await ethers.getContractFactory("FundingEscrow");
      const deadline = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
      const newEscrow = await FundingEscrow.deploy(
        projectOwner.address,
        FUNDING_GOAL,
        deadline,
        3,
        [ethers.parseEther("30"), ethers.parseEther("40"), ethers.parseEther("30")]
      );
      await newEscrow.waitForDeployment();
      await newEscrow.setGovernanceContract(await milestoneGovernance.getAddress());

      const governanceAddress = await milestoneGovernance.getAddress();
      await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [governanceAddress],
      });
      await hre.network.provider.request({
        method: "hardhat_setBalance",
        params: [governanceAddress, "0x1000000000000000000"], // 1 ETH
      });
      const governanceSigner = await ethers.getSigner(governanceAddress);

      await expect(
        newEscrow.connect(governanceSigner).releaseFunds(0)
      ).to.be.revertedWith("Funding goal must be met before releasing funds");
      
      await hre.network.provider.request({
        method: "hardhat_stopImpersonatingAccount",
        params: [governanceAddress],
      });
    });

    it("Should reject release for wrong stage", async function () {
      const governanceAddress = await milestoneGovernance.getAddress();
      await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [governanceAddress],
      });
      await hre.network.provider.request({
        method: "hardhat_setBalance",
        params: [governanceAddress, "0x1000000000000000000"], // 1 ETH
      });
      const governanceSigner = await ethers.getSigner(governanceAddress);
      
      await fundingEscrow.connect(governanceSigner).releaseFunds(0);
      
      await expect(
        fundingEscrow.connect(governanceSigner).releaseFunds(0)
      ).to.be.revertedWith("Can only release funds for current stage");
      
      await hre.network.provider.request({
        method: "hardhat_stopImpersonatingAccount",
        params: [governanceAddress],
      });
    });
  });

  describe("Refunds", function () {
    it("Should refund donors if goal not met by deadline", async function () {
      const FundingEscrow = await ethers.getContractFactory("FundingEscrow");
      const currentTime = await ethers.provider.getBlock("latest").then(b => b.timestamp);
      const futureDeadline = currentTime + 1000;
      const escrow = await FundingEscrow.deploy(
        projectOwner.address,
        FUNDING_GOAL,
        futureDeadline,
        3,
        [ethers.parseEther("30"), ethers.parseEther("40"), ethers.parseEther("30")]
      );
      await escrow.waitForDeployment();

      await escrow.connect(donor1).donate({ value: ethers.parseEther("50") });
      
      // Advance time past deadline
      await ethers.provider.send("evm_increaseTime", [2000]);
      await ethers.provider.send("evm_mine", []);
      
      const donor1BalanceBefore = await ethers.provider.getBalance(donor1.address);
      await escrow.refund();
      const donor1BalanceAfter = await ethers.provider.getBalance(donor1.address);

      expect(donor1BalanceAfter - donor1BalanceBefore).to.equal(ethers.parseEther("50"));
    });

    it("Should refund if project marked as failed", async function () {
      await fundingEscrow.connect(donor1).donate({ value: FUNDING_GOAL });
      
      const governanceAddress = await milestoneGovernance.getAddress();
      await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [governanceAddress],
      });
      await hre.network.provider.request({
        method: "hardhat_setBalance",
        params: [governanceAddress, "0x1000000000000000000"], // 1 ETH
      });
      const governanceSigner = await ethers.getSigner(governanceAddress);
      
      await fundingEscrow.connect(governanceSigner).markProjectAsFailed();
      
      await hre.network.provider.request({
        method: "hardhat_stopImpersonatingAccount",
        params: [governanceAddress],
      });

      const donor1BalanceBefore = await ethers.provider.getBalance(donor1.address);
      await fundingEscrow.refund();
      const donor1BalanceAfter = await ethers.provider.getBalance(donor1.address);

      expect(donor1BalanceAfter - donor1BalanceBefore).to.equal(FUNDING_GOAL);
    });
  });

  describe("Helper Functions", function () {
    it("Should return correct funding progress", async function () {
      await fundingEscrow.connect(donor1).donate({ value: ethers.parseEther("50") });
      
      const progress = await fundingEscrow.getFundingProgress();
      expect(progress).to.equal(50); // 50%
    });

    it("Should return all donors", async function () {
      await fundingEscrow.connect(donor1).donate({ value: ethers.parseEther("30") });
      await fundingEscrow.connect(donor2).donate({ value: ethers.parseEther("40") });

      const donors = await fundingEscrow.getAllDonors();
      expect(donors.length).to.equal(2);
      expect(donors).to.include(donor1.address);
      expect(donors).to.include(donor2.address);
    });
  });
});
