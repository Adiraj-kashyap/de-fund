const hre = require("hardhat");

/**
 * Test project creation flow - simulates what happens when frontend creates a project
 */

async function testProjectCreation() {
  console.log("\n🧪 ===========================================");
  console.log("🧪 TEST: PROJECT CREATION FLOW");
  console.log("🧪 ===========================================\n");

  try {
    const [deployer, projectOwner] = await hre.ethers.getSigners();
    console.log("📋 Simulating Frontend Project Creation:");
    console.log("   Project Owner:", projectOwner.address);
    console.log("");

    // Step 1: Deploy contract (this is what backend does)
    console.log("📦 STEP 1: Backend deploys contract (auto-deployment)...");
    const FundingEscrow = await hre.ethers.getContractFactory("FundingEscrow");
    const fundingGoal = hre.ethers.parseEther("5"); // 5 ETH goal
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

    // Step 2: Verify contract exists on chain
    console.log("🔍 STEP 2: Verify contract exists on chain...");
    const code = await hre.ethers.provider.getCode(contractAddress);
    const hasCode = code && code !== '0x' && code.length > 2;
    console.log(`   ${hasCode ? "✅" : "❌"} Contract code length: ${code.length}`);
    console.log(`   ${hasCode ? "✅" : "❌"} Contract exists: ${hasCode}`);
    
    if (!hasCode) {
      console.log("   ❌ ERROR: Contract code not found! Contract not actually deployed!");
      return { success: false, error: "Contract code not found" };
    }
    console.log("");

    // Step 3: Test contract functionality (simulate frontend trying to use it)
    console.log("🔍 STEP 3: Test contract is usable...");
    try {
      const status = await escrow.getProjectStatus();
      console.log("   ✅ Contract is readable!");
      console.log("   📊 Project Status:");
      console.log("      Funds Raised:", hre.ethers.formatEther(status._fundsRaised), "ETH");
      console.log("      Funding Goal:", hre.ethers.formatEther(status._fundingGoal), "ETH");
      console.log("      Goal Reached:", status._fundingGoalReached);
    } catch (error) {
      console.log("   ❌ ERROR: Cannot read contract!", error.message);
      return { success: false, error: "Cannot read contract" };
    }
    console.log("");

    // Step 4: Test donation (simulate user trying to donate)
    console.log("🔍 STEP 4: Test donation functionality...");
    const donationAmount = hre.ethers.parseEther("0.1");
    console.log("   Attempting to donate", hre.ethers.formatEther(donationAmount), "ETH...");
    
    try {
      const donateTx = await escrow.connect(projectOwner).donate({ value: donationAmount });
      await donateTx.wait();
      console.log("   ✅ Donation successful! Tx:", donateTx.hash);
      
      const newStatus = await escrow.getProjectStatus();
      console.log("   📊 After Donation:");
      console.log("      Funds Raised:", hre.ethers.formatEther(newStatus._fundsRaised), "ETH");
      
      // Check contract balance
      const balance = await hre.ethers.provider.getBalance(contractAddress);
      console.log("      Contract Balance:", hre.ethers.formatEther(balance), "ETH");
      
      if (balance === donationAmount) {
        console.log("   ✅ Contract balance matches donation!");
      } else {
        console.log("   ❌ Contract balance mismatch!");
      }
    } catch (error) {
      console.log("   ❌ ERROR: Donation failed!", error.message);
      console.log("   Error details:", error);
      return { success: false, error: "Donation failed: " + error.message };
    }
    console.log("");

    // Step 5: Verify donation button would work
    console.log("🔍 STEP 5: Verify donation is still available...");
    const currentStatus = await escrow.getProjectStatus();
    const canDonate = !currentStatus._fundingGoalReached && 
                     !currentStatus._projectCancelled &&
                     currentStatus._timeRemaining > 0n;
    
    console.log(`   ${canDonate ? "✅" : "❌"} Donation Available: ${canDonate}`);
    console.log("   Reason:", 
      currentStatus._fundingGoalReached ? "Goal reached" :
      currentStatus._projectCancelled ? "Project cancelled" :
      currentStatus._timeRemaining <= 0n ? "Deadline passed" :
      "✅ All conditions met");
    console.log("");

    console.log("=".repeat(50));
    console.log("✅ PROJECT CREATION TEST PASSED!");
    console.log("✅ Contract is deployed and fully functional!");
    console.log("✅ Donation functionality is working!");
    console.log("\nContract Address:", contractAddress);
    console.log("=".repeat(50) + "\n");

    return { 
      success: true, 
      contractAddress,
      canDonate 
    };

  } catch (error) {
    console.error("\n❌ TEST FAILED:", error.message);
    console.error("Stack:", error.stack);
    return { success: false, error: error.message };
  }
}

if (require.main === module) {
  testProjectCreation()
    .then((result) => {
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { testProjectCreation };

