const hre = require("hardhat");

async function main() {
  console.log("Deploying ProjectFactory...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString(), "\n");

  // Configuration
  const GOVERNANCE_TOKEN_ADDRESS = process.env.GOVERNANCE_TOKEN_ADDRESS || ""; // Deploy separately or use existing
  const VOTING_PERIOD = 7 * 24 * 60 * 60; // 7 days
  const MINIMUM_STAKE = hre.ethers.parseEther("10"); // 10 tokens

  if (!GOVERNANCE_TOKEN_ADDRESS) {
    console.log("??  GOVERNANCE_TOKEN_ADDRESS not set. Deploying GovernanceToken first...\n");
    
    // Deploy GovernanceToken
    const GovernanceToken = await hre.ethers.getContractFactory("GovernanceToken");
    const governanceToken = await GovernanceToken.deploy(
      "Funding Governance Token",
      "FGT",
      hre.ethers.parseEther("1000000") // 1M initial supply
    );
    await governanceToken.waitForDeployment();
    const tokenAddress = await governanceToken.getAddress();
    console.log("? GovernanceToken deployed to:", tokenAddress);
    
    // Deploy ProjectFactory
    const ProjectFactory = await hre.ethers.getContractFactory("ProjectFactory");
    const factory = await ProjectFactory.deploy(
      tokenAddress,
      VOTING_PERIOD,
      MINIMUM_STAKE
    );
    await factory.waitForDeployment();
    const factoryAddress = await factory.getAddress();
    
    console.log("\n? ProjectFactory deployed to:", factoryAddress);
    console.log("\nContract Addresses:");
    console.log("===================");
    console.log("GovernanceToken:", tokenAddress);
    console.log("ProjectFactory:", factoryAddress);
    
    // Save deployment info
    const deploymentInfo = {
      network: hre.network.name,
      timestamp: new Date().toISOString(),
      contracts: {
        GovernanceToken: tokenAddress,
        ProjectFactory: factoryAddress,
      },
      configuration: {
        votingPeriod: VOTING_PERIOD,
        minimumStake: MINIMUM_STAKE.toString(),
      },
    };

    const fs = require("fs");
    const path = require("path");
    const deploymentPath = path.join(__dirname, "..", "deployments", `factory-${hre.network.name}.json`);
    fs.mkdirSync(path.dirname(deploymentPath), { recursive: true });
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    console.log("\n?? Deployment info saved to:", deploymentPath);
  } else {
    // Deploy ProjectFactory with existing token
    const ProjectFactory = await hre.ethers.getContractFactory("ProjectFactory");
    const factory = await ProjectFactory.deploy(
      GOVERNANCE_TOKEN_ADDRESS,
      VOTING_PERIOD,
      MINIMUM_STAKE
    );
    await factory.waitForDeployment();
    const factoryAddress = await factory.getAddress();
    
    console.log("? ProjectFactory deployed to:", factoryAddress);
    console.log("\nUse this factory to create new projects!");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
