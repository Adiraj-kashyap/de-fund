const hre = require("hardhat");

/**
 * TEST 3: Staking & Profit Distribution
 * Tests: Profit deposit, profit distribution, stake calculations
 * 
 * PREREQUISITE: 
 * - Contract must be deployed
 * - Funding goal must be reached (donations completed)
 */

async function testStaking(contractAddress) {
  console.log("\n🧪 ===========================================");
  console.log("🧪 TEST 3: STAKING & PROFIT DISTRIBUTION");
  console.log("🧪 ===========================================\n");

  try {
    if (!contractAddress) {
      console.log("❌ ERROR: Contract address required!");
      return { success: false, error: "Contract address required" };
    }

    const [deployer, projectOwner, donor] = await hre.ethers.getSigners();
    console.log("📋 Test Setup:");
    console.log("   Contract Address:", contractAddress);
    console.log("   Project Owner:", projectOwner.address);
    console.log("   Donor:", donor.address);
    console.log("");

    // Connect to contract
    const FundingEscrow = await hre.ethers.getContractFactory("FundingEscrow");
    const escrow = FundingEscrow.attach(contractAddress);

    // Verify contract state
    const status = await escrow.getProjectStatus();
    console.log("✅ Checking Contract State:");
    console.log("   Funding Goal Reached:", status._fundingGoalReached);
    console.log("   Funds Raised:", hre.ethers.formatEther(status._fundsRaised), "ETH");
    console.log("");

    if (!status._fundingGoalReached) {
      console.log("⚠️  WARNING: Funding goal not reached!");
      console.log("   Staking/profit distribution requires goal to be reached.");
      console.log("   Please run test2_Donation.js first to reach the goal.");
      return { success: false, error: "Funding goal not reached" };
    }

    // Get donor contribution
    const donorContribution = await escrow.contributions(donor.address);
    console.log("   Donor Contribution:", hre.ethers.formatEther(donorContribution), "ETH");
    console.log("");

    // Test 3.1: Profit Deposit
    console.log("✅ Test 3.1: Profit Deposit");
    const profitAmount = hre.ethers.parseEther("5");
    
    const contractBalanceBefore = await hre.ethers.provider.getBalance(contractAddress);
    console.log("   Project owner depositing", hre.ethers.formatEther(profitAmount), "ETH profit...");
    
    const depositTx = await escrow.connect(projectOwner).depositProfit({ value: profitAmount });
    await depositTx.wait();
    console.log("   ✅ Profit deposited! Tx:", depositTx.hash);

    const contractBalanceAfter = await hre.ethers.provider.getBalance(contractAddress);
    const balanceCheck = contractBalanceAfter === contractBalanceBefore + profitAmount;

    console.log("   📊 Results:");
    console.log(`   ${balanceCheck ? "✅" : "❌"} Contract Balance: ${hre.ethers.formatEther(contractBalanceAfter)} ETH`);
    console.log("");

    // Test 3.2: Profit Share Calculations
    console.log("✅ Test 3.2: Profit Share Calculations");
    const ownerShare = await escrow.calculateOwnerProfitShare(profitAmount);
    const donorShare = await escrow.calculateDonorProfitShare(donor.address, profitAmount);
    
    const expectedOwnerShare = (profitAmount * 2000n) / 10000n; // 20%
    const expectedDonorShare = (profitAmount * 8000n * donorContribution) / (10000n * status._fundsRaised); // 80% * (donor/total)

    console.log("   📊 Calculated Shares:");
    console.log(`   ${ownerShare === expectedOwnerShare ? "✅" : "❌"} Owner Share (20%): ${hre.ethers.formatEther(ownerShare)} ETH`);
    console.log(`   ${Math.abs(Number(donorShare - expectedDonorShare)) < 1000 ? "✅" : "❌"} Donor Share: ${hre.ethers.formatEther(donorShare)} ETH`);
    console.log("");

    // Test 3.3: Profit Distribution
    console.log("✅ Test 3.3: Profit Distribution");
    const ownerBalanceBefore = await hre.ethers.provider.getBalance(projectOwner.address);
    const donorBalanceBefore = await hre.ethers.provider.getBalance(donor.address);

    // Check if owner is also a donor (they will receive both owner share AND donor share)
    const ownerContribution = await escrow.contributions(projectOwner.address);
    const ownerAsDonorShare = ownerContribution > 0n 
      ? await escrow.calculateDonorProfitShare(projectOwner.address, profitAmount)
      : 0n;
    const expectedOwnerTotal = ownerShare + ownerAsDonorShare;

    console.log("   Owner also contributed:", hre.ethers.formatEther(ownerContribution), "ETH");
    if (ownerContribution > 0n) {
      console.log("   Owner will receive owner share + donor share");
    }
    console.log("   Distributing profit...");
    
    const distributeTx = await escrow.connect(projectOwner).distributeProfit(profitAmount);
    const distributeReceipt = await distributeTx.wait();
    const gasUsed = distributeReceipt.gasUsed * distributeReceipt.gasPrice;
    console.log("   ✅ Profit distributed! Tx:", distributeTx.hash);

    const ownerBalanceAfter = await hre.ethers.provider.getBalance(projectOwner.address);
    const donorBalanceAfter = await hre.ethers.provider.getBalance(donor.address);

    const ownerReceived = ownerBalanceAfter - ownerBalanceBefore + gasUsed;
    const donorReceived = donorBalanceAfter - donorBalanceBefore;

    const tolerance = hre.ethers.parseEther("0.001"); // 0.001 ETH tolerance for gas
    const ownerShareCheck = ownerReceived >= expectedOwnerTotal - tolerance && ownerReceived <= expectedOwnerTotal + tolerance;
    const donorShareCheck = donorReceived >= donorShare - tolerance && donorReceived <= donorShare + tolerance;

    console.log("   📊 Results:");
    console.log(`   ${ownerShareCheck ? "✅" : "❌"} Owner Received: ${hre.ethers.formatEther(ownerReceived)} ETH (expected: ${hre.ethers.formatEther(expectedOwnerTotal)} ETH)`);
    if (ownerContribution > 0n) {
      console.log(`      - Owner Share (20%): ${hre.ethers.formatEther(ownerShare)} ETH`);
      console.log(`      - Owner as Donor Share: ${hre.ethers.formatEther(ownerAsDonorShare)} ETH`);
    }
    console.log(`   ${donorShareCheck ? "✅" : "❌"} Donor Received: ${hre.ethers.formatEther(donorReceived)} ETH (expected: ${hre.ethers.formatEther(donorShare)} ETH)`);
    console.log("");

    // Final contract balance check
    const finalBalance = await hre.ethers.provider.getBalance(contractAddress);
    const expectedFinalBalance = contractBalanceAfter - profitAmount;
    const finalBalanceCheck = Math.abs(Number(finalBalance - expectedFinalBalance)) < 1000; // Small tolerance for rounding

    console.log("   📊 Final State:");
    console.log(`   ${finalBalanceCheck ? "✅" : "❌"} Contract Balance: ${hre.ethers.formatEther(finalBalance)} ETH`);
    console.log("");

    // Summary
    const allTestsPassed = balanceCheck && ownerShareCheck && donorShareCheck && finalBalanceCheck;

    console.log("=".repeat(50));
    if (allTestsPassed) {
      console.log("✅ ALL STAKING TESTS PASSED!");
      console.log("✅ Profit distribution is working correctly!");
    } else {
      console.log("❌ SOME STAKING TESTS FAILED!");
    }
    console.log("=".repeat(50) + "\n");

    return { success: allTestsPassed, contractAddress };

  } catch (error) {
    console.error("\n❌ STAKING TEST FAILED:", error.message);
    if (error.message.includes("Funding goal must be reached")) {
      console.error("   ⚠️  Funding goal must be reached first!");
    } else if (error.message.includes("Insufficient contract balance")) {
      console.error("   ⚠️  Contract doesn't have enough balance. Deposit profit first.");
    }
    console.error("Stack:", error.stack);
    return { success: false, error: error.message };
  }
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const contractAddress = args[0];
  
  if (!contractAddress) {
    console.log("❌ ERROR: Contract address required!");
    console.log("   Usage: npx hardhat run scripts/test3_Staking.js --network hardhat <contract_address>");
    process.exit(1);
  }

  testStaking(contractAddress)
    .then((result) => {
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { testStaking };

