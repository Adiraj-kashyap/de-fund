const hre = require("hardhat");

/**
 * TEST 2: Donation Functionality
 * Tests: Donations, contribution tracking, balance updates
 * 
 * PREREQUISITE: Contract must be deployed first
 */

async function testDonation(contractAddress) {
  console.log("\n🧪 ===========================================");
  console.log("🧪 TEST 2: DONATION FUNCTIONALITY");
  console.log("🧪 ===========================================\n");

  try {
    if (!contractAddress) {
      console.log("❌ ERROR: Contract address required!");
      console.log("   Usage: First run test1_Deployment.js, then pass the contract address");
      return { success: false, error: "Contract address required" };
    }

    const [deployer, donor1, donor2] = await hre.ethers.getSigners();
    console.log("📋 Test Setup:");
    console.log("   Contract Address:", contractAddress);
    console.log("   Donor 1:", donor1.address);
    console.log("   Donor 2:", donor2.address);
    console.log("");

    // Connect to deployed contract
    const FundingEscrow = await hre.ethers.getContractFactory("FundingEscrow");
    const escrow = FundingEscrow.attach(contractAddress);

    // Verify contract is deployed
    const code = await hre.ethers.provider.getCode(contractAddress);
    if (code === "0x") {
      console.log("❌ ERROR: Contract not deployed at this address!");
      console.log("   Please deploy contract first using test1_Deployment.js");
      return { success: false, error: "Contract not deployed" };
    }
    console.log("✅ Contract verified at address");
    console.log("");

    // Test 2.1: First Donation
    console.log("✅ Test 2.1: First Donation");
    const donation1Amount = hre.ethers.parseEther("2");
    
    const balanceBefore1 = await hre.ethers.provider.getBalance(contractAddress);
    const contributionBefore1 = await escrow.contributions(donor1.address);
    
    console.log("   Donor 1 donating", hre.ethers.formatEther(donation1Amount), "ETH...");
    const tx1 = await escrow.connect(donor1).donate({ value: donation1Amount });
    const receipt1 = await tx1.wait();
    console.log("   ✅ Transaction confirmed! Hash:", tx1.hash);

    const balanceAfter1 = await hre.ethers.provider.getBalance(contractAddress);
    const contributionAfter1 = await escrow.contributions(donor1.address);
    const status1 = await escrow.getProjectStatus();

    // Verify balances
    const balanceCheck1 = balanceAfter1 === balanceBefore1 + donation1Amount;
    const contributionCheck1 = contributionAfter1 === contributionBefore1 + donation1Amount;
    const fundsRaisedCheck1 = status1._fundsRaised === donation1Amount;

    console.log("   📊 Results:");
    console.log(`   ${balanceCheck1 ? "✅" : "❌"} Contract Balance: ${hre.ethers.formatEther(balanceAfter1)} ETH`);
    console.log(`   ${contributionCheck1 ? "✅" : "❌"} Donor 1 Contribution: ${hre.ethers.formatEther(contributionAfter1)} ETH`);
    console.log(`   ${fundsRaisedCheck1 ? "✅" : "❌"} Total Funds Raised: ${hre.ethers.formatEther(status1._fundsRaised)} ETH`);
    console.log("");

    // Test 2.2: Second Donation (from different donor)
    console.log("✅ Test 2.2: Second Donation (Different Donor)");
    const donation2Amount = hre.ethers.parseEther("3");
    
    const balanceBefore2 = balanceAfter1;
    const contributionBefore2 = await escrow.contributions(donor2.address);
    
    console.log("   Donor 2 donating", hre.ethers.formatEther(donation2Amount), "ETH...");
    const tx2 = await escrow.connect(donor2).donate({ value: donation2Amount });
    await tx2.wait();
    console.log("   ✅ Transaction confirmed! Hash:", tx2.hash);

    const balanceAfter2 = await hre.ethers.provider.getBalance(contractAddress);
    const contributionAfter2 = await escrow.contributions(donor2.address);
    const status2 = await escrow.getProjectStatus();

    // Verify balances
    const balanceCheck2 = balanceAfter2 === balanceBefore2 + donation2Amount;
    const contributionCheck2 = contributionAfter2 === contributionBefore2 + donation2Amount;
    const expectedTotal = donation1Amount + donation2Amount;
    const fundsRaisedCheck2 = status2._fundsRaised === expectedTotal;

    console.log("   📊 Results:");
    console.log(`   ${balanceCheck2 ? "✅" : "❌"} Contract Balance: ${hre.ethers.formatEther(balanceAfter2)} ETH`);
    console.log(`   ${contributionCheck2 ? "✅" : "❌"} Donor 2 Contribution: ${hre.ethers.formatEther(contributionAfter2)} ETH`);
    console.log(`   ${fundsRaisedCheck2 ? "✅" : "❌"} Total Funds Raised: ${hre.ethers.formatEther(status2._fundsRaised)} ETH (expected: ${hre.ethers.formatEther(expectedTotal)} ETH)`);
    console.log("");

    // Test 2.3: Donor List Tracking
    console.log("✅ Test 2.3: Donor List Tracking");
    const donorCount = await escrow.getDonorCount();
    const isDonor1 = await escrow.isDonor(donor1.address);
    const isDonor2 = await escrow.isDonor(donor2.address);
    
    console.log(`   ${donorCount >= 2n ? "✅" : "❌"} Donor Count: ${donorCount}`);
    console.log(`   ${isDonor1 ? "✅" : "❌"} Donor 1 registered: ${isDonor1}`);
    console.log(`   ${isDonor2 ? "✅" : "❌"} Donor 2 registered: ${isDonor2}`);
    console.log("");

    // Summary
    const allTestsPassed = balanceCheck1 && contributionCheck1 && fundsRaisedCheck1 &&
                          balanceCheck2 && contributionCheck2 && fundsRaisedCheck2 &&
                          donorCount >= 2n && isDonor1 && isDonor2;

    console.log("=".repeat(50));
    if (allTestsPassed) {
      console.log("✅ ALL DONATION TESTS PASSED!");
      console.log("✅ Donations are working correctly!");
    } else {
      console.log("❌ SOME DONATION TESTS FAILED!");
    }
    console.log("=".repeat(50) + "\n");

    return { 
      success: allTestsPassed, 
      contractAddress,
      totalDonated: balanceAfter2.toString()
    };

  } catch (error) {
    console.error("\n❌ DONATION TEST FAILED:", error.message);
    if (error.message.includes("Funding period has ended")) {
      console.error("   ⚠️  Funding deadline has passed. Deploy a new contract to test.");
    } else if (error.message.includes("Funding goal already reached")) {
      console.error("   ⚠️  Funding goal already reached. Deploy a new contract to test.");
    }
    console.error("Stack:", error.stack);
    return { success: false, error: error.message };
  }
}

// If contract address provided as CLI argument
if (require.main === module) {
  const args = process.argv.slice(2);
  const contractAddress = args[0];
  
  if (!contractAddress) {
    console.log("❌ ERROR: Contract address required!");
    console.log("   Usage: npx hardhat run scripts/test2_Donation.js --network hardhat <contract_address>");
    console.log("   Or first run: npx hardhat run scripts/test1_Deployment.js --network hardhat");
    process.exit(1);
  }

  testDonation(contractAddress)
    .then((result) => {
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { testDonation };

