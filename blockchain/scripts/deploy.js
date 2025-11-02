const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  console.log("?? Starting deployment to", hre.network.name);
  console.log("====================================");

  const [deployer] = await ethers.getSigners();
  console.log("?? Deploying contracts with account:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("?? Account balance:", ethers.formatEther(balance), "ETH");
  console.log("====================================\n");

  // Configuration for the escrow contract
  const projectOwner = deployer.address; // Change this to actual project owner
  const fundingGoal = ethers.parseEther("10"); // 10 ETH funding goal
  const fundingDuration = 30 * 24 * 60 * 60; // 30 days
  const totalStages = 5; // 5 milestone stages
  const stageAllocations = [2000, 2000, 2000, 2000, 2000]; // 20% each stage

  console.log("?? Deployment Configuration:");
  console.log("  Project Owner:", projectOwner);
  console.log("  Funding Goal:", ethers.formatEther(fundingGoal), "ETH");
  console.log("  Funding Duration:", fundingDuration / (24 * 60 * 60), "days");
  console.log("  Total Stages:", totalStages);
  console.log("  Stage Allocations:", stageAllocations.map(a => a / 100 + "%").join(", "));
  console.log("====================================\n");

  // Deploy MilestoneGovernance contract
  console.log("?? Deploying MilestoneGovernance contract...");
  const MilestoneGovernance = await ethers.getContractFactory("MilestoneGovernance");
  const governance = await MilestoneGovernance.deploy(ethers.ZeroAddress); // Use ETH staking
  await governance.waitForDeployment();
  const governanceAddress = await governance.getAddress();
  console.log("? MilestoneGovernance deployed to:", governanceAddress);
  console.log("====================================\n");

  // Deploy FundingEscrow contract
  console.log("?? Deploying FundingEscrow contract...");
  const FundingEscrow = await ethers.getContractFactory("FundingEscrow");
  const escrow = await FundingEscrow.deploy(
    projectOwner,
    fundingGoal,
    fundingDuration,
    totalStages,
    stageAllocations
  );
  await escrow.waitForDeployment();
  const escrowAddress = await escrow.getAddress();
  console.log("? FundingEscrow deployed to:", escrowAddress);
  console.log("====================================\n");

  // Link contracts
  console.log("?? Linking contracts...");
  const setGovTx = await escrow.setGovernanceContract(governanceAddress);
  await setGovTx.wait();
  console.log("? Governance contract linked to Escrow");
  console.log("====================================\n");

  // Display deployment summary
  console.log("?? DEPLOYMENT SUMMARY");
  console.log("====================================");
  console.log("Network:", hre.network.name);
  console.log("Deployer:", deployer.address);
  console.log("\n?? Contract Addresses:");
  console.log("  MilestoneGovernance:", governanceAddress);
  console.log("  FundingEscrow:", escrowAddress);
  
  console.log("\n?? Verification Commands:");
  console.log(`  npx hardhat verify --network ${hre.network.name} ${governanceAddress} "${ethers.ZeroAddress}"`);
  console.log(`  npx hardhat verify --network ${hre.network.name} ${escrowAddress} "${projectOwner}" "${fundingGoal}" "${fundingDuration}" "${totalStages}" "[${stageAllocations}]"`);
  
  console.log("\n?? Block Explorer URLs:");
  if (hre.network.name === "sepolia") {
    console.log("  MilestoneGovernance:", `https://sepolia.etherscan.io/address/${governanceAddress}`);
    console.log("  FundingEscrow:", `https://sepolia.etherscan.io/address/${escrowAddress}`);
  }
  
  console.log("\n====================================");
  console.log("? Deployment completed successfully!");
  console.log("====================================");

  // Save deployment info to file
  const fs = require("fs");
  const deploymentInfo = {
    network: hre.network.name,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      MilestoneGovernance: governanceAddress,
      FundingEscrow: escrowAddress,
    },
    configuration: {
      projectOwner,
      fundingGoal: fundingGoal.toString(),
      fundingDuration,
      totalStages,
      stageAllocations,
    },
  };

  const deploymentDir = "./deployments";
  if (!fs.existsSync(deploymentDir)) {
    fs.mkdirSync(deploymentDir);
  }

  const filename = `${deploymentDir}/${hre.network.name}-${Date.now()}.json`;
  fs.writeFileSync(filename, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\n?? Deployment info saved to: ${filename}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("? Deployment failed:", error);
    process.exit(1);
  });
