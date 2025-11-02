const hre = require("hardhat");

/**
 * Manual Deployment Script for FundingEscrow Contract
 * 
 * This script allows you to manually deploy a FundingEscrow contract
 * with interactive prompts or command-line arguments.
 * 
 * Usage:
 *   Interactive mode: npx hardhat run scripts/deployManually.js --network hardhat
 *   Command line: npx hardhat run scripts/deployManually.js --network hardhat -- \
 *     <projectOwner> <fundingGoal> <durationDays> <totalStages> <allocations>
 * 
 * Example:
 *   npx hardhat run scripts/deployManually.js --network hardhat -- \
 *     0x70997970C51812dc3A010C7d01b50e0d17dc79C8 \
 *     10 \
 *     30 \
 *     5 \
 *     "[2000,2000,2000,2000,2000]"
 */

async function deployManually() {
  console.log("\n📦 Manual FundingEscrow Contract Deployment\n");
  console.log("=" .repeat(50));
  
  const [deployer] = await hre.ethers.getSigners();
  console.log("🔑 Deploying with account:", deployer.address);
  console.log("💰 Account balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "ETH\n");
  
  // Parse command line arguments
  const args = process.argv.slice(process.argv.indexOf('--') + 1);
  
  let projectOwner, fundingGoal, durationDays, totalStages, stageAllocations, governanceAddress;
  
  if (args.length >= 5) {
    // Command-line mode
    projectOwner = args[0];
    fundingGoal = args[1]; // in ETH (will be converted to wei)
    durationDays = parseInt(args[2]);
    totalStages = parseInt(args[3]);
    stageAllocations = JSON.parse(args[4]);
    governanceAddress = args[5] || hre.ethers.ZeroAddress;
    
    console.log("📋 Using command-line parameters:");
  } else {
    // Interactive mode - use defaults for manual testing
    console.log("⚠️  No parameters provided. Using defaults for testing.\n");
    console.log("💡 For custom parameters, use:");
    console.log("   npx hardhat run scripts/deployManually.js --network hardhat -- \\");
    console.log("     <projectOwner> <fundingGoalETH> <durationDays> <totalStages> <allocationsJSON>\n");
    
    projectOwner = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
    fundingGoal = "10"; // 10 ETH
    durationDays = 30;
    totalStages = 5;
    stageAllocations = [2000, 2000, 2000, 2000, 2000]; // 20% each
    governanceAddress = hre.ethers.ZeroAddress;
    
    console.log("📋 Using default parameters:");
  }
  
  // Validate and normalize addresses
  if (!hre.ethers.isAddress(projectOwner)) {
    throw new Error(`Invalid project owner address: ${projectOwner}`);
  }
  const normalizedOwner = hre.ethers.getAddress(projectOwner);
  
  // Convert funding goal from ETH to wei
  const fundingGoalWei = hre.ethers.parseEther(fundingGoal.toString()).toString();
  const fundingDuration = durationDays * 24 * 60 * 60; // Convert days to seconds
  
  // Validate allocations sum to 10000 (100%)
  const totalAllocation = stageAllocations.reduce((sum, val) => sum + val, 0);
  if (totalAllocation !== 10000) {
    console.warn(`⚠️  Allocations sum to ${totalAllocation}, not 10000. Normalizing...`);
    const factor = 10000 / totalAllocation;
    for (let i = 0; i < stageAllocations.length; i++) {
      stageAllocations[i] = Math.floor(stageAllocations[i] * factor);
    }
    // Adjust last one to ensure sum is exactly 10000
    const finalSum = stageAllocations.reduce((sum, val) => sum + val, 0);
    stageAllocations[stageAllocations.length - 1] += (10000 - finalSum);
  }
  
  // Normalize governance address
  let normalizedGovernance = hre.ethers.ZeroAddress;
  if (governanceAddress && governanceAddress !== '0x0000000000000000000000000000000000000000') {
    if (!hre.ethers.isAddress(governanceAddress)) {
      throw new Error(`Invalid governance address: ${governanceAddress}`);
    }
    normalizedGovernance = hre.ethers.getAddress(governanceAddress);
  }
  
  console.log("   Project Owner:", normalizedOwner);
  console.log("   Funding Goal:", fundingGoal, "ETH (" + fundingGoalWei + " wei)");
  console.log("   Duration:", durationDays, "days (" + fundingDuration + " seconds)");
  console.log("   Total Stages:", totalStages);
  console.log("   Stage Allocations:", stageAllocations.join(", "), "(basis points)");
  console.log("   Governance:", normalizedGovernance === hre.ethers.ZeroAddress ? "None" : normalizedGovernance);
  console.log("");
  
  // Deploy contract
  console.log("🚀 Deploying contract...");
  const FundingEscrow = await hre.ethers.getContractFactory("FundingEscrow");
  
  const escrow = await FundingEscrow.deploy(
    normalizedOwner,
    fundingGoalWei,
    fundingDuration,
    totalStages,
    stageAllocations
  );
  
  console.log("⏳ Waiting for deployment confirmation...");
  await escrow.waitForDeployment();
  const contractAddress = await escrow.getAddress();
  
  console.log("\n✅ CONTRACT DEPLOYED SUCCESSFULLY!\n");
  
  // Link governance if provided
  if (normalizedGovernance !== hre.ethers.ZeroAddress) {
    try {
      console.log("🔗 Linking governance contract...");
      const setGovTx = await escrow.setGovernanceContract(normalizedGovernance);
      await setGovTx.wait();
      console.log("✅ Governance contract linked");
    } catch (error) {
      console.warn("⚠️  Could not link governance contract:", error.message);
    }
  }
  
  // Display deployment info
  console.log("\n" + "=".repeat(50));
  console.log("📄 DEPLOYMENT INFORMATION");
  console.log("=".repeat(50));
  console.log("Contract Address: ", contractAddress);
  console.log("Transaction Hash: ", escrow.deploymentTransaction()?.hash || "N/A");
  console.log("Network:          ", hre.network.name);
  console.log("Project Owner:    ", normalizedOwner);
  console.log("Funding Goal:     ", fundingGoal, "ETH");
  console.log("Duration:         ", durationDays, "days");
  console.log("Total Stages:     ", totalStages);
  console.log("=".repeat(50));
  
  // Verify contract is deployed correctly
  try {
    const deployedOwner = await escrow.projectOwner();
    const deployedGoal = await escrow.fundingGoal();
    const deployedStages = await escrow.totalStages();
    
    console.log("\n✅ Contract Verification:");
    console.log("   Owner:", deployedOwner);
    console.log("   Goal:", hre.ethers.formatEther(deployedGoal), "ETH");
    console.log("   Stages:", deployedStages.toString());
    
    if (deployedOwner.toLowerCase() !== normalizedOwner.toLowerCase()) {
      console.warn("⚠️  WARNING: Deployed owner doesn't match input!");
    }
  } catch (error) {
    console.warn("⚠️  Could not verify contract:", error.message);
  }
  
  // Output for easy copying
  console.log("\n" + "=".repeat(50));
  console.log("📋 COPY THIS TO YOUR PROJECT:");
  console.log("=".repeat(50));
  console.log("CONTRACT_ADDRESS=" + contractAddress);
  console.log("\nOr update your project in the database:");
  console.log(`UPDATE projects SET contract_address = '${contractAddress.toLowerCase()}' WHERE id = YOUR_PROJECT_ID;`);
  console.log("=".repeat(50));
  
  return {
    contractAddress,
    transactionHash: escrow.deploymentTransaction()?.hash,
    projectOwner: normalizedOwner,
    fundingGoal: fundingGoalWei,
    fundingDuration,
    totalStages,
    stageAllocations,
  };
}

// Run if called directly
if (require.main === module) {
  deployManually()
    .then((result) => {
      console.log("\n✅ Deployment complete!");
      console.log("Contract ready for use at:", result.contractAddress);
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ Deployment failed:", error);
      process.exit(1);
    });
}

module.exports = { deployManually };

