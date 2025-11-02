const { testDeployment } = require("./test1_Deployment");
const { testDonation } = require("./test2_Donation");
const { testStaking } = require("./test3_Staking");

/**
 * Sequential Test Suite
 * Runs all tests in order, ensuring each depends on the previous
 */

async function runAllTests() {
  console.log("\n" + "=".repeat(60));
  console.log("🚀 COMPREHENSIVE SEQUENTIAL TEST SUITE");
  console.log("=".repeat(60) + "\n");

  const results = {
    deployment: null,
    donation: null,
    staking: null,
  };

  try {
    // STEP 1: Test Deployment
    console.log("📌 STEP 1: Testing Contract Deployment");
    console.log("-".repeat(60));
    results.deployment = await testDeployment();
    
    if (!results.deployment.success) {
      console.log("\n❌ Deployment failed. Stopping tests.");
      return { success: false, results };
    }

    const contractAddress = results.deployment.contractAddress;
    console.log(`\n✅ Deployment successful! Contract: ${contractAddress}\n`);

    // Wait a bit for contract to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));

    // STEP 2: Test Donations (requires deployed contract)
    console.log("\n📌 STEP 2: Testing Donations");
    console.log("-".repeat(60));
    console.log("   ⚠️  Note: Donations can only work AFTER contract is deployed");
    
    results.donation = await testDonation(contractAddress);
    
    if (!results.donation.success) {
      console.log("\n❌ Donation tests failed. Cannot continue to staking tests.");
      return { success: false, results };
    }

    console.log(`\n✅ Donation tests successful!\n`);

    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 1000));

    // STEP 3: Ensure funding goal is reached for staking tests
    console.log("\n📌 STEP 2.5: Ensuring Funding Goal is Reached");
    console.log("-".repeat(60));
    
    const FundingEscrow = await require("hardhat").ethers.getContractFactory("FundingEscrow");
    const escrow = FundingEscrow.attach(contractAddress);
    const status = await escrow.getProjectStatus();
    
    if (!status._fundingGoalReached) {
      console.log("   Funding goal not reached. Reaching goal for staking tests...");
      const [deployer, projectOwner, donor1, donor2] = await require("hardhat").ethers.getSigners();
      
      const remaining = status._fundingGoal - status._fundsRaised;
      console.log(`   Donating remaining ${require("hardhat").ethers.formatEther(remaining)} ETH...`);
      
      await escrow.connect(donor2).donate({ value: remaining });
      const newStatus = await escrow.getProjectStatus();
      
      if (newStatus._fundingGoalReached) {
        console.log("   ✅ Funding goal reached!");
      } else {
        console.log("   ⚠️  Still need more funds...");
      }
    } else {
      console.log("   ✅ Funding goal already reached!");
    }
    console.log("");

    // STEP 4: Test Staking (requires deployed contract + goal reached)
    console.log("\n📌 STEP 3: Testing Staking & Profit Distribution");
    console.log("-".repeat(60));
    console.log("   ⚠️  Note: Staking requires funding goal to be reached");
    
    results.staking = await testStaking(contractAddress);
    
    if (!results.staking.success) {
      console.log("\n❌ Staking tests failed.");
      return { success: false, results };
    }

    console.log(`\n✅ Staking tests successful!\n`);

    // FINAL SUMMARY
    console.log("\n" + "=".repeat(60));
    console.log("🎉 FINAL TEST SUMMARY");
    console.log("=".repeat(60));
    console.log(`✅ Deployment: ${results.deployment.success ? "PASSED" : "FAILED"}`);
    console.log(`✅ Donations: ${results.donation.success ? "PASSED" : "FAILED"}`);
    console.log(`✅ Staking: ${results.staking.success ? "PASSED" : "FAILED"}`);
    console.log("");
    
    const allPassed = results.deployment.success && results.donation.success && results.staking.success;
    
    if (allPassed) {
      console.log("🎊 ALL TESTS PASSED! ALL FUNCTIONALITIES WORKING!");
      console.log(`\n📋 Contract Address: ${contractAddress}`);
      console.log("   ✅ Contract Deployment: Working");
      console.log("   ✅ Donations: Working (only after deployment)");
      console.log("   ✅ Staking/Profit Distribution: Working");
    } else {
      console.log("❌ SOME TESTS FAILED - CHECK RESULTS ABOVE");
    }
    console.log("=".repeat(60) + "\n");

    return { success: allPassed, results, contractAddress };

  } catch (error) {
    console.error("\n❌ TEST SUITE FAILED:", error.message);
    console.error("Stack:", error.stack);
    return { success: false, results, error: error.message };
  }
}

if (require.main === module) {
  runAllTests()
    .then((result) => {
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { runAllTests };

