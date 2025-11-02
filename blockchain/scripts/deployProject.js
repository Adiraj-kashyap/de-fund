const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * Deploy a FundingEscrow contract for a project
 * Usage: npx hardhat run scripts/deployProject.js --network hardhat
 * Or call from backend with: node -e "require('./scripts/deployProject.js')"
 * 
 * Each deployment uses a different deployer account to ensure unique contract addresses
 */
async function deployProject(projectData) {
  // Support both direct object and environment variables
  let config = projectData;
  
  // If no projectData provided, try reading from environment variables (for backend deployment)
  if (!projectData || Object.keys(projectData).length === 0) {
    if (process.env.DEPLOYMENT_CONFIG) {
      config = JSON.parse(process.env.DEPLOYMENT_CONFIG);
    } else if (process.env.DEPLOYMENT_PROJECT_OWNER) {
      config = {
        projectOwner: process.env.DEPLOYMENT_PROJECT_OWNER,
        fundingGoal: process.env.DEPLOYMENT_FUNDING_GOAL,
        fundingDuration: parseInt(process.env.DEPLOYMENT_FUNDING_DURATION || '0'),
        totalStages: parseInt(process.env.DEPLOYMENT_TOTAL_STAGES || '5'),
        stageAllocations: JSON.parse(process.env.DEPLOYMENT_STAGE_ALLOCATIONS || '[2000,2000,2000,2000,2000]'),
        governanceAddress: process.env.DEPLOYMENT_GOVERNANCE_ADDRESS || hre.ethers.ZeroAddress,
      };
    }
  }
  
  const {
    projectOwner,
    fundingGoal, // in wei (string)
    fundingDuration, // in seconds (number)
    totalStages,
    stageAllocations, // array of basis points [2000, 2000, ...]
    governanceAddress // optional
  } = config;

  console.log("📦 Deploying FundingEscrow contract for project...");
  
  // ============================================
  // UNIQUE ADDRESS GENERATION: Use counter-based deployer account
  // ============================================
  // Read deployment counter from file
  const counterPath = path.join(__dirname, 'deploymentCounter.json');
  let counterData = { counter: 0, lastDeployment: null };
  
  try {
    if (fs.existsSync(counterPath)) {
      counterData = JSON.parse(fs.readFileSync(counterPath, 'utf8'));
    }
  } catch (error) {
    console.warn('⚠️  Could not read deployment counter, starting from 0:', error.message);
  }
  
  // Increment counter for this deployment
  const deploymentCounter = (counterData.counter || 0) + 1;
  
  // Get all available signers
  const signers = await hre.ethers.getSigners();
  
  // Use a different signer based on counter (cycles through available accounts)
  // This ensures each deployment gets a unique contract address
  const deployerIndex = (deploymentCounter - 1) % signers.length;
  const deployer = signers[deployerIndex];
  
  console.log(`🔑 Using deployer account #${deploymentCounter} (signer index ${deployerIndex}):`, deployer.address);
  console.log(`📊 Deployment counter: ${deploymentCounter}`);
  
  // Validate and normalize project owner address (prevent resolveName issues)
  if (!projectOwner || !hre.ethers.isAddress(projectOwner)) {
    throw new Error(`Invalid project owner address: ${projectOwner}`);
  }
  const normalizedOwner = hre.ethers.getAddress(projectOwner); // Normalize to checksum address
  
  // Validate and normalize governance address if provided
  let normalizedGovernance = hre.ethers.ZeroAddress;
  if (governanceAddress && governanceAddress !== '0x0000000000000000000000000000000000000000') {
    if (!hre.ethers.isAddress(governanceAddress)) {
      throw new Error(`Invalid governance address: ${governanceAddress}`);
    }
    normalizedGovernance = hre.ethers.getAddress(governanceAddress);
  }
  
  // Convert stage allocations to numbers if they're strings
  const allocations = stageAllocations.map(a => typeof a === 'string' ? parseInt(a) : a);
  
  // Validate funding goal is a valid number
  const goal = typeof fundingGoal === 'string' ? BigInt(fundingGoal) : BigInt(fundingGoal);
  if (goal <= 0n) {
    throw new Error(`Invalid funding goal: ${fundingGoal}`);
  }
  
  // Deploy FundingEscrow using the selected deployer
  // IMPORTANT: Connect the factory to the specific deployer account to ensure unique addresses
  const FundingEscrow = await hre.ethers.getContractFactory("FundingEscrow", deployer);
  const escrow = await FundingEscrow.deploy(
    normalizedOwner, // Use normalized address to prevent resolveName
    goal.toString(), // Convert back to string for deployment
    parseInt(fundingDuration),
    parseInt(totalStages),
    allocations
  );
  
  await escrow.waitForDeployment();
  const contractAddress = await escrow.getAddress();
  
  console.log("✅ FundingEscrow deployed to:", contractAddress);
  
  // Update deployment counter and save to file
  try {
    const updatedCounter = {
      counter: deploymentCounter,
      lastDeployment: {
        address: contractAddress,
        timestamp: new Date().toISOString(),
        deployer: deployer.address,
      }
    };
    fs.writeFileSync(counterPath, JSON.stringify(updatedCounter, null, 2));
    console.log(`💾 Updated deployment counter to ${deploymentCounter}`);
  } catch (error) {
    console.warn('⚠️  Could not save deployment counter:', error.message);
  }
  
  // Link governance contract if provided
  if (normalizedGovernance !== hre.ethers.ZeroAddress) {
    try {
      const setGovTx = await escrow.setGovernanceContract(normalizedGovernance);
      await setGovTx.wait();
      console.log("✅ Governance contract linked");
    } catch (error) {
      console.warn("⚠️  Could not link governance contract:", error.message);
    }
  }
  
  // Output contract address in a format that's easy to parse
  console.log("\n=== DEPLOYMENT SUCCESS ===");
  console.log("CONTRACT_ADDRESS:", contractAddress);
  console.log("========================");
  
  return {
    contractAddress,
    transactionHash: escrow.deploymentTransaction()?.hash,
  };
}

// If called directly from command line
if (require.main === module) {
  // Check for environment variables first (preferred method from backend)
  if (process.env.DEPLOYMENT_PROJECT_OWNER) {
    deployProject({}) // Empty object, will read from env vars
      .then((result) => {
        console.log("\n✅ Deployment result:", JSON.stringify(result));
        process.exit(0);
      })
      .catch((error) => {
        console.error("❌ Deployment failed:", error);
        process.exit(1);
      });
  } else {
    // Fallback: Parse command line arguments (for direct CLI usage)
    // Skip everything before the script name
    const scriptIndex = process.argv.findIndex(arg => arg.includes('deployProject.js'));
    const args = process.argv.slice(scriptIndex + 1).filter(arg => arg !== '--network' && arg !== 'hardhat' && arg !== '--');
    
    // Normalize addresses from command line to prevent resolveName issues
    let projectOwner = args[0] || "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
    if (projectOwner && hre.ethers.isAddress(projectOwner)) {
      projectOwner = hre.ethers.getAddress(projectOwner);
    }
    
    let governanceAddr = args[5] || hre.ethers.ZeroAddress;
    if (governanceAddr && governanceAddr !== hre.ethers.ZeroAddress && hre.ethers.isAddress(governanceAddr)) {
      governanceAddr = hre.ethers.getAddress(governanceAddr);
    } else if (!governanceAddr || governanceAddr === '0x0000000000000000000000000000000000000000') {
      governanceAddr = hre.ethers.ZeroAddress;
    }
    
    deployProject({
      projectOwner: projectOwner,
      fundingGoal: args[1] || hre.ethers.parseEther("10").toString(),
      fundingDuration: parseInt(args[2] || "2592000"), // 30 days
      totalStages: parseInt(args[3] || "5"),
      stageAllocations: args[4] ? JSON.parse(args[4]) : [2000, 2000, 2000, 2000, 2000],
      governanceAddress: governanceAddr,
    })
      .then((result) => {
        console.log("\n✅ Deployment result:", JSON.stringify(result));
        process.exit(0);
      })
      .catch((error) => {
        console.error("❌ Deployment failed:", error);
        process.exit(1);
      });
  }
}

module.exports = { deployProject };

