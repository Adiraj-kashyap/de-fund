const hre = require("hardhat");

/**
 * Example interaction script for testing deployed contracts
 * Update contract addresses after deployment
 */
async function main() {
  // Update these addresses after deployment
  const GOVERNANCE_TOKEN_ADDRESS = "0x...";
  const FUNDING_ESCROW_ADDRESS = "0x...";
  const MILESTONE_GOVERNANCE_ADDRESS = "0x...";

  const [owner, donor, voter] = await hre.ethers.getSigners();

  // Get contract instances
  const GovernanceToken = await hre.ethers.getContractFactory("GovernanceToken");
  const FundingEscrow = await hre.ethers.getContractFactory("FundingEscrow");
  const MilestoneGovernance = await hre.ethers.getContractFactory("MilestoneGovernance");

  const governanceToken = GovernanceToken.attach(GOVERNANCE_TOKEN_ADDRESS);
  const fundingEscrow = FundingEscrow.attach(FUNDING_ESCROW_ADDRESS);
  const milestoneGovernance = MilestoneGovernance.attach(MILESTONE_GOVERNANCE_ADDRESS);

  console.log("Interacting with deployed contracts...\n");

  // Example: Donate to project
  console.log("1. Making a donation...");
  const donationAmount = hre.ethers.parseEther("10");
  const tx1 = await fundingEscrow.connect(donor).donate({ value: donationAmount });
  await tx1.wait();
  console.log("   Donated", donationAmount.toString(), "wei");

  // Example: Check funding progress
  const progress = await fundingEscrow.getFundingProgress();
  console.log("   Funding progress:", progress.toString(), "%");

  // Example: Stake tokens for voting
  console.log("\n2. Staking tokens for voting...");
  const stakeAmount = hre.ethers.parseEther("50");
  await governanceToken.connect(voter).approve(MILESTONE_GOVERNANCE_ADDRESS, stakeAmount);
  const tx2 = await milestoneGovernance.connect(voter).stakeTokens(stakeAmount);
  await tx2.wait();
  console.log("   Staked", stakeAmount.toString(), "tokens");

  // Example: Create milestone proposal (as project owner)
  console.log("\n3. Creating milestone proposal...");
  const evidenceHash = "QmHash123456789"; // IPFS hash
  const tx3 = await milestoneGovernance.createMilestoneProposal(0, evidenceHash);
  await tx3.wait();
  console.log("   Proposal created with evidence hash:", evidenceHash);

  // Example: Vote on proposal
  console.log("\n4. Voting on proposal...");
  const tx4 = await milestoneGovernance.connect(voter).vote(0, true);
  await tx4.wait();
  console.log("   Voted in favor of proposal 0");

  console.log("\n? Interactions completed!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
