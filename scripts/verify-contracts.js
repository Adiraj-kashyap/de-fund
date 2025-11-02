const hre = require("hardhat");

async function main() {
  const network = hre.network.name;
  console.log(`Verifying contracts on ${network}...\n`);

  // Read deployment info
  const fs = require("fs");
  const path = require("path");
  const deploymentPath = path.join(__dirname, "..", "deployments", `${network}.json`);

  if (!fs.existsSync(deploymentPath)) {
    console.error(`Deployment file not found: ${deploymentPath}`);
    console.log("Please deploy contracts first using: npm run deploy:sepolia");
    process.exit(1);
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));

  // Verify each contract
  for (const [contractName, address] of Object.entries(deployment.contracts)) {
    if (!address || address === "") {
      console.log(`??  Skipping ${contractName} - no address`);
      continue;
    }

    try {
      console.log(`Verifying ${contractName} at ${address}...`);
      
      // Note: Contract verification parameters may need to be adjusted
      // based on constructor arguments
      await hre.run("verify:verify", {
        address: address,
        // Add constructor arguments if needed
        // constructorArguments: [...],
      });

      console.log(`? ${contractName} verified\n`);
    } catch (error) {
      if (error.message.includes("Already Verified")) {
        console.log(`? ${contractName} already verified\n`);
      } else {
        console.error(`? Failed to verify ${contractName}:`, error.message);
      }
    }
  }

  console.log("Verification complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
