const hre = require("hardhat");
const { deployProject } = require("./deployProject");

/**
 * Test the REAL project creation flow exactly as backend does it
 */

async function testRealCreation() {
  console.log("\n🧪 ===========================================");
  console.log("🧪 TEST: REAL PROJECT CREATION FLOW");
  console.log("🧪 Simulating Backend API call");
  console.log("🧪 ===========================================\n");

  try {
    const [deployer, projectOwner] = await hre.ethers.getSigners();
    
    // Simulate what frontend sends
    const projectData = {
      projectOwner: projectOwner.address,
      fundingGoal: hre.ethers.parseEther("5").toString(),
      fundingDuration: 30 * 24 * 60 * 60, // 30 days
      totalStages: 5,
      stageAllocations: [2000, 2000, 2000, 2000, 2000],
      governanceAddress: hre.ethers.ZeroAddress,
    };

    console.log("📦 Step 1: Calling deployProject (as backend does)...");
    console.log("   Project Owner:", projectOwner.address);
    console.log("   Funding Goal:", hre.ethers.formatEther(projectData.fundingGoal), "ETH");
    console.log("");

    const result = await deployProject(projectData);
    
    if (!result || !result.contractAddress) {
      console.log("❌ DEPLOYMENT FAILED!");
      return { success: false, error: "No contract address returned" };
    }

    const contractAddress = result.contractAddress;
    console.log("✅ Contract deployed:", contractAddress);
    console.log("");

    // Step 2: Immediately verify contract exists (as frontend does)
    console.log("🔍 Step 2: Verifying contract exists (as frontend does)...");
    
    // Check contract code
    const code = await hre.ethers.provider.getCode(contractAddress);
    const exists = code && code !== '0x' && code.length > 2;
    
    console.log(`   ${exists ? "✅" : "❌"} Contract Code Found: ${exists ? `Yes (${code.length} bytes)` : "No"}`);
    
    if (!exists) {
      console.log("   ❌ ERROR: Contract doesn't exist on chain!");
      console.log("   This is why frontend shows 'Contract Not Deployed'");
      return { success: false, error: "Contract code not found" };
    }

    // Step 3: Try reading contract (as frontend does)
    console.log("\n🔍 Step 3: Reading contract (as frontend does)...");
    try {
      const FundingEscrow = await hre.ethers.getContractFactory("FundingEscrow");
      const escrow = FundingEscrow.attach(contractAddress);
      
      const status = await escrow.getProjectStatus();
      console.log("   ✅ Contract is readable!");
      console.log("   📊 Status:", {
        fundsRaised: hre.ethers.formatEther(status._fundsRaised),
        fundingGoal: hre.ethers.formatEther(status._fundingGoal),
        goalReached: status._fundingGoalReached,
      });
    } catch (error) {
      console.log("   ❌ ERROR: Cannot read contract!", error.message);
      return { success: false, error: "Cannot read contract: " + error.message };
    }

    // Step 4: Test donation (user trying to donate)
    console.log("\n🔍 Step 4: Testing donation (user action)...");
    const [donor] = await hre.ethers.getSigners();
    const FundingEscrow = await hre.ethers.getContractFactory("FundingEscrow");
    const escrow = FundingEscrow.attach(contractAddress);
    
    try {
      const donateAmount = hre.ethers.parseEther("0.5");
      console.log("   Attempting donation of", hre.ethers.formatEther(donateAmount), "ETH...");
      
      const tx = await escrow.connect(donor).donate({ value: donateAmount });
      await tx.wait();
      
      console.log("   ✅ DONATION SUCCESSFUL!");
      console.log("   Transaction:", tx.hash);
      
      const afterStatus = await escrow.getProjectStatus();
      console.log("   Funds Raised:", hre.ethers.formatEther(afterStatus._fundsRaised), "ETH");
      
    } catch (error) {
      console.log("   ❌ DONATION FAILED:", error.message);
      return { success: false, error: "Donation failed: " + error.message };
    }

    console.log("\n" + "=".repeat(50));
    console.log("✅ ALL TESTS PASSED!");
    console.log("✅ Contract deployment works!");
    console.log("✅ Contract is accessible!");
    console.log("✅ Donations work!");
    console.log("\nContract Address:", contractAddress);
    console.log("This address should work in frontend!");
    console.log("=".repeat(50) + "\n");

    return { success: true, contractAddress };

  } catch (error) {
    console.error("\n❌ TEST FAILED:", error.message);
    console.error("Stack:", error.stack);
    return { success: false, error: error.message };
  }
}

if (require.main === module) {
  testRealCreation()
    .then((result) => {
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { testRealCreation };

