const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ProjectFactory", function () {
  let factory;
  let governanceToken;
  let owner;
  let projectCreator;

  const VOTING_PERIOD = 7 * 24 * 60 * 60;
  const MINIMUM_STAKE = ethers.parseEther("10");

  beforeEach(async function () {
    [owner, projectCreator] = await ethers.getSigners();

    // Deploy GovernanceToken
    const GovernanceToken = await ethers.getContractFactory("GovernanceToken");
    governanceToken = await GovernanceToken.deploy(
      "Funding Governance Token",
      "FGT",
      ethers.parseEther("10000")
    );
    await governanceToken.waitForDeployment();

    // Deploy ProjectFactory
    const ProjectFactory = await ethers.getContractFactory("ProjectFactory");
    factory = await ProjectFactory.deploy(
      await governanceToken.getAddress(),
      VOTING_PERIOD,
      MINIMUM_STAKE
    );
    await factory.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the correct governance token", async function () {
      expect(await factory.governanceToken()).to.equal(await governanceToken.getAddress());
    });

    it("Should set the correct voting period", async function () {
      expect(await factory.votingPeriod()).to.equal(VOTING_PERIOD);
    });

    it("Should set the correct minimum stake", async function () {
      expect(await factory.minimumStake()).to.equal(MINIMUM_STAKE);
    });
  });

  describe("Project Creation", function () {
    it("Should create a new project with escrow and governance", async function () {
      const FUNDING_GOAL = ethers.parseEther("100");
      const deadline = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
      const fundsAllocatedPerStage = [
        ethers.parseEther("30"),
        ethers.parseEther("40"),
        ethers.parseEther("30"),
      ];

      const tx = await factory
        .connect(projectCreator)
        .createProject(
          FUNDING_GOAL,
          deadline,
          3,
          fundsAllocatedPerStage
        );

      await expect(tx)
        .to.emit(factory, "ProjectCreated")
        .withArgs(
          projectCreator.address,
          async (escrow) => {
            const projects = await factory.getAllProjects();
            return projects.includes(escrow);
          },
          async (governance) => typeof governance === 'string',
          FUNDING_GOAL,
          deadline,
          3
        );

      const projects = await factory.getAllProjects();
      expect(projects.length).to.equal(1);

      const escrowAddress = projects[0];
      const governanceAddress = await factory.projectToGovernance(escrowAddress);
      const projectOwner = await factory.projectToOwner(escrowAddress);

      expect(projectOwner).to.equal(projectCreator.address);
      expect(governanceAddress).to.not.equal(ethers.ZeroAddress);

      // Verify contracts are linked
      const FundingEscrow = await ethers.getContractFactory("FundingEscrow");
      const escrow = FundingEscrow.attach(escrowAddress);
      
      expect(await escrow.projectOwner()).to.equal(projectCreator.address);
      expect(await escrow.governanceContract()).to.equal(governanceAddress);
    });

    it("Should track multiple projects", async function () {
      const deadline = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
      const fundsAllocatedPerStage = [ethers.parseEther("50"), ethers.parseEther("50")];

      await factory.connect(projectCreator).createProject(
        ethers.parseEther("100"),
        deadline,
        2,
        fundsAllocatedPerStage
      );

      await factory.connect(projectCreator).createProject(
        ethers.parseEther("200"),
        deadline,
        2,
        fundsAllocatedPerStage
      );

      expect(await factory.getProjectCount()).to.equal(2);
    });

    it("Should return projects by owner", async function () {
      const deadline = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
      const fundsAllocatedPerStage = [ethers.parseEther("50"), ethers.parseEther("50")];

      await factory.connect(projectCreator).createProject(
        ethers.parseEther("100"),
        deadline,
        2,
        fundsAllocatedPerStage
      );

      const projects = await factory.getProjectsByOwner(projectCreator.address);
      expect(projects.length).to.equal(1);
    });
  });
});
