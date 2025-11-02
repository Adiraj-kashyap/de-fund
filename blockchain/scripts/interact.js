const hre = require("hardhat");
const { ethers } = require("hardhat");

/**
 * Interactive script for testing deployed contracts
 * Usage: node scripts/interact.js <escrow_address> <governance_address>
 */

async function main() {
  // Get contract addresses from command line or use defaults
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log("? Please provide contract addresses:");
    console.log("Usage: npx hardhat run scripts/interact.js --network <network> <escrow_address> <governance_address>");
    process.exit(1);
  }

  const escrowAddress = args[0];
  const governanceAddress = args[1];

  console.log("?? Connecting to contracts...");
  console.log("Network:", hre.network.name);
  console.log("Escrow:", escrowAddress);
  console.log("Governance:", governanceAddress);
  console.log("====================================\n");

  const [user] = await ethers.getSigners();
  console.log("?? Using account:", user.address);
  
  // Get contract instances
  const FundingEscrow = await ethers.getContractFactory("FundingEscrow");
  const escrow = FundingEscrow.attach(escrowAddress);

  const MilestoneGovernance = await ethers.getContractFactory("MilestoneGovernance");
  const governance = MilestoneGovernance.attach(governanceAddress);

  // Display project status
  console.log("\n?? PROJECT STATUS");
  console.log("====================================");
  const status = await escrow.getProjectStatus();
  console.log("Funds Raised:", ethers.formatEther(status._fundsRaised), "ETH");
  console.log("Funding Goal:", ethers.formatEther(status._fundingGoal), "ETH");
  console.log("Current Stage:", status._currentStage.toString());
  console.log("Total Stages:", status._totalStages.toString());
  console.log("Goal Reached:", status._fundingGoalReached);
  console.log("Project Cancelled:", status._projectCancelled);
  console.log("Time Remaining:", status._timeRemaining.toString(), "seconds");

  const progress = (Number(status._fundsRaised) / Number(status._fundingGoal)) * 100;
  console.log("Progress:", progress.toFixed(2) + "%");

  // Display donor information
  const donorCount = await escrow.getDonorCount();
  console.log("\n?? DONOR INFORMATION");
  console.log("====================================");
  console.log("Total Donors:", donorCount.toString());

  // Display user's contribution
  const userContribution = await escrow.contributions(user.address);
  if (userContribution > 0) {
    console.log("Your Contribution:", ethers.formatEther(userContribution), "ETH");
  }

  // Display governance information
  console.log("\n???  GOVERNANCE INFORMATION");
  console.log("====================================");
  const totalStaked = await governance.getTotalStaked();
  console.log("Total Staked:", ethers.formatEther(totalStaked), "ETH");

  const voterInfo = await governance.getVoterInfo(user.address);
  if (voterInfo.isRegistered) {
    console.log("\n? You are a registered voter");
    console.log("Your Stake:", ethers.formatEther(voterInfo.stakedAmount), "ETH");
    console.log("Your Reputation:", voterInfo.reputation.toString());
    console.log("Proposals Voted On:", voterInfo.proposalCount.toString());
  } else {
    console.log("\n? You are not a registered voter");
    console.log("Register with: npx hardhat run scripts/register-voter.js --network", hre.network.name);
  }

  // Display active proposals
  console.log("\n?? ACTIVE PROPOSALS");
  console.log("====================================");
  const proposalCount = await governance.proposalCount();
  console.log("Total Proposals:", proposalCount.toString());

  if (proposalCount > 0) {
    for (let i = 0; i < Number(proposalCount); i++) {
      const proposal = await governance.getProposal(i);
      console.log(`\nProposal #${i}:`);
      console.log("  Stage Index:", proposal.stageIndex.toString());
      console.log("  Evidence Hash:", proposal.evidenceHash);
      console.log("  Votes For:", ethers.formatEther(proposal.votesFor), "ETH");
      console.log("  Votes Against:", ethers.formatEther(proposal.votesAgainst), "ETH");
      console.log("  Status:", ["Pending", "Active", "Approved", "Rejected", "Executed"][proposal.status]);
      console.log("  Executed:", proposal.executed);
      
      const hasVoted = await governance.hasVoted(i, user.address);
      console.log("  You Voted:", hasVoted);
    }
  } else {
    console.log("No proposals yet");
  }

  console.log("\n====================================");
  console.log("? Status check completed!");
  console.log("====================================");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("? Error:", error);
    process.exit(1);
  });
