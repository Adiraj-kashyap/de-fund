const hre = require("hardhat");

async function main() {
  console.log("Starting deployment to", hre.network.name, "network...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString(), "\n");

  // Configuration - Update these values for your project
  const PROJECT_OWNER = deployer.address; // Change to actual project owner address
  const FUNDING_GOAL = hre.ethers.parseEther("100"); // 100 ETH
  const DEADLINE = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60; // 30 days from now
  const TOTAL_STAGES = 3;
  const FUNDS_ALLOCATED_PER_STAGE = [
    hre.ethers.parseEther("30"), // Stage 0: 30 ETH
    hre.ethers.parseEther("40"), // Stage 1: 40 ETH
    hre.ethers.parseEther("30"), // Stage 2: 30 ETH
  ];
  const VOTING_PERIOD = 7 * 24 * 60 * 60; // 7 days
  const MINIMUM_STAKE = hre.ethers.parseEther("10"); // 10 tokens minimum to vote

  // Step 1: Deploy GovernanceToken
  console.log("1. Deploying GovernanceToken...");
  const GovernanceToken = await hre.ethers.getContractFactory("GovernanceToken");
  const governanceToken = await GovernanceToken.deploy(
    "Funding Governance Token",
    "FGT",
    hre.ethers.parseEther("10000") // Initial supply
  );
  await governanceToken.waitForDeployment();
  const governanceTokenAddress = await governanceToken.getAddress();
  console.log("   GovernanceToken deployed to:", governanceTokenAddress);

  // Step 2: Deploy FundingEscrow
  console.log("\n2. Deploying FundingEscrow...");
  const FundingEscrow = await hre.ethers.getContractFactory("FundingEscrow");
  const fundingEscrow = await FundingEscrow.deploy(
    PROJECT_OWNER,
    FUNDING_GOAL,
    DEADLINE,
    TOTAL_STAGES,
    FUNDS_ALLOCATED_PER_STAGE
  );
  await fundingEscrow.waitForDeployment();
  const fundingEscrowAddress = await fundingEscrow.getAddress();
  console.log("   FundingEscrow deployed to:", fundingEscrowAddress);

  // Step 3: Deploy MilestoneGovernance
  console.log("\n3. Deploying MilestoneGovernance...");
  const MilestoneGovernance = await hre.ethers.getContractFactory("MilestoneGovernance");
  const milestoneGovernance = await MilestoneGovernance.deploy(
    governanceTokenAddress,
    VOTING_PERIOD,
    MINIMUM_STAKE
  );
  await milestoneGovernance.waitForDeployment();
  const milestoneGovernanceAddress = await milestoneGovernance.getAddress();
  console.log("   MilestoneGovernance deployed to:", milestoneGovernanceAddress);

  // Step 4: Link contracts
  console.log("\n4. Linking contracts...");
  await fundingEscrow.setGovernanceContract(milestoneGovernanceAddress);
  console.log("   FundingEscrow governance contract set");
  
  await milestoneGovernance.setEscrowContract(fundingEscrowAddress);
  console.log("   MilestoneGovernance escrow contract set");

  // Step 5: Authorize FundingEscrow to mint tokens (optional - for future enhancement)
  // await governanceToken.addMinter(fundingEscrowAddress);
  // console.log("   GovernanceToken minter authorized");

  console.log("\n? Deployment completed successfully!\n");
  console.log("Contract Addresses:");
  console.log("===================");
  console.log("GovernanceToken:    ", governanceTokenAddress);
  console.log("FundingEscrow:      ", fundingEscrowAddress);
  console.log("MilestoneGovernance:", milestoneGovernanceAddress);
  console.log("\nNext steps:");
  console.log("1. Verify contracts on Etherscan (if on testnet/mainnet)");
  console.log("2. Distribute governance tokens to donors");
  console.log("3. Create your first project milestone proposal");
  
  // Save deployment info
  const deploymentInfo = {
    network: hre.network.name,
    timestamp: new Date().toISOString(),
    contracts: {
      GovernanceToken: governanceTokenAddress,
      FundingEscrow: fundingEscrowAddress,
      MilestoneGovernance: milestoneGovernanceAddress,
    },
    configuration: {
      projectOwner: PROJECT_OWNER,
      fundingGoal: FUNDING_GOAL.toString(),
      deadline: DEADLINE,
      totalStages: TOTAL_STAGES,
      fundsAllocatedPerStage: FUNDS_ALLOCATED_PER_STAGE.map(a => a.toString()),
      votingPeriod: VOTING_PERIOD,
      minimumStake: MINIMUM_STAKE.toString(),
    },
  };

  const fs = require("fs");
  const path = require("path");
  const deploymentPath = path.join(__dirname, "..", "deployments", `${hre.network.name}.json`);
  fs.mkdirSync(path.dirname(deploymentPath), { recursive: true });
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log("\n?? Deployment info saved to:", deploymentPath);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
