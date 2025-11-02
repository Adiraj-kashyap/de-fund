const hre = require("hardhat");

/**
 * TEST 1: Contract Deployment
 * Tests: Deployment, initial state, contract initialization
 */

async function testDeployment() {
  console.log("\n🧪 ===========================================");
  console.log("🧪 TEST 1: CONTRACT DEPLOYMENT");
  console.log("🧪 ===========================================\n");

  try {
    const [deployer, projectOwner] = await hre.ethers.getSigners();
    console.log("📋 Test Setup:");
    console.log("   Deployer:", deployer.address);
    console.log("   Project Owner:", projectOwner.address);
    console.log("");

    // Test deployment
    console.log("✅ Testing: Contract Deployment");
    const FundingEscrow = await hre.ethers.getContractFactory("FundingEscrow");
    const fundingGoal = hre.ethers.parseEther("10");
    const fundingDuration = 30 * 24 * 60 * 60; // 30 days
    const totalStages = 5;
    const stageAllocations = [2000, 2000, 2000, 2000, 2000];

    const escrow = await FundingEscrow.deploy(
      projectOwner.address,
      fundingGoal.toString(),
      fundingDuration,
      totalStages,
      stageAllocations
    );

    await escrow.waitForDeployment();
    const contractAddress = await escrow.getAddress();
    console.log("   ✅ Contract deployed at:", contractAddress);
    console.log("");

    // Test initial state
    console.log("✅ Testing: Initial State Verification");
    const status = await escrow.getProjectStatus();
    
    // Verify initial values
    const checks = [
      { name: "Funds Raised", actual: status._fundsRaised, expected: 0n, passed: status._fundsRaised === 0n },
      { name: "Funding Goal", actual: status._fundingGoal, expected: fundingGoal, passed: status._fundingGoal === fundingGoal },
      { name: "Goal Reached", actual: status._fundingGoalReached, expected: false, passed: status._fundingGoalReached === false },
      { name: "Project Cancelled", actual: status._projectCancelled, expected: false, passed: status._projectCancelled === false },
      { name: "Current Stage", actual: status._currentStage, expected: 0n, passed: status._currentStage === 0n },
      { name: "Total Stages", actual: status._totalStages, expected: BigInt(totalStages), passed: status._totalStages === BigInt(totalStages) },
    ];

    let allPassed = true;
    checks.forEach(check => {
      const symbol = check.passed ? "✅" : "❌";
      console.log(`   ${symbol} ${check.name}: ${check.actual.toString()} (expected: ${check.expected.toString()})`);
      if (!check.passed) allPassed = false;
    });

    // Verify project owner
    const owner = await escrow.projectOwner();
    console.log(`   ${owner.toLowerCase() === projectOwner.address.toLowerCase() ? "✅" : "❌"} Project Owner: ${owner}`);
    if (owner.toLowerCase() !== projectOwner.address.toLowerCase()) allPassed = false;

    // Verify contract has no balance initially
    const balance = await hre.ethers.provider.getBalance(contractAddress);
    console.log(`   ${balance === 0n ? "✅" : "❌"} Initial Balance: ${hre.ethers.formatEther(balance)} ETH (expected: 0 ETH)`);
    if (balance !== 0n) allPassed = false;

    console.log("\n" + "=".repeat(50));
    if (allPassed) {
      console.log("✅ ALL DEPLOYMENT TESTS PASSED!");
      console.log("✅ Contract is ready for donations!");
    } else {
      console.log("❌ SOME DEPLOYMENT TESTS FAILED!");
    }
    console.log("=".repeat(50) + "\n");

    return { success: allPassed, contractAddress };

  } catch (error) {
    console.error("\n❌ DEPLOYMENT TEST FAILED:", error.message);
    console.error("Stack:", error.stack);
    return { success: false, error: error.message };
  }
}

if (require.main === module) {
  testDeployment()
    .then((result) => {
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { testDeployment };

