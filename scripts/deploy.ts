import { ethers, network } from "hardhat";

type DeployConfig = {
  fundingGoalEth: string;
  totalStages: number;
  stageAllocationsEth: string[];
  deadlineDays: number;
  votingPeriodSeconds: number;
  quorumBasisPoints: number;
};

function resolveConfig(): DeployConfig {
  const fundingGoalEth = process.env.FUNDING_GOAL_ETH ?? "3";
  const totalStages = Number(process.env.TOTAL_STAGES ?? "3");
  const deadlineDays = Number(process.env.FUNDING_DEADLINE_DAYS ?? "30");
  const votingPeriodSeconds = Number(process.env.VOTING_PERIOD_SECONDS ?? 3 * 24 * 60 * 60);
  const quorumBasisPoints = Number(process.env.QUORUM_BPS ?? "5000");

  if (!Number.isFinite(totalStages) || totalStages <= 0) {
    throw new Error("TOTAL_STAGES must be a positive integer");
  }
  if (!Number.isFinite(deadlineDays) || deadlineDays <= 0) {
    throw new Error("FUNDING_DEADLINE_DAYS must be a positive integer");
  }
  if (!Number.isFinite(votingPeriodSeconds) || votingPeriodSeconds <= 0) {
    throw new Error("VOTING_PERIOD_SECONDS must be a positive integer");
  }
  if (quorumBasisPoints <= 0 || quorumBasisPoints > 10_000) {
    throw new Error("QUORUM_BPS must be between 1 and 10_000");
  }

  const stageAllocationsEnv = process.env.STAGE_ALLOCATIONS?.split(",").map((value) => value.trim()).filter(Boolean) ?? [];

  if (stageAllocationsEnv.length > 0 && stageAllocationsEnv.length !== totalStages) {
    throw new Error("Length of STAGE_ALLOCATIONS must match TOTAL_STAGES");
  }

  return {
    fundingGoalEth,
    totalStages,
    stageAllocationsEth: stageAllocationsEnv,
    deadlineDays,
    votingPeriodSeconds,
    quorumBasisPoints,
  };
}

function normalizeAllocations(config: DeployConfig, fundingGoalWei: bigint): bigint[] {
  if (config.stageAllocationsEth.length === config.totalStages && config.stageAllocationsEth.length > 0) {
    const allocations = config.stageAllocationsEth.map((segment) => ethers.parseEther(segment));
    const total = allocations.reduce((acc, value) => acc + value, 0n);
    if (total !== fundingGoalWei) {
      throw new Error("Sum of STAGE_ALLOCATIONS (in ETH) must equal FUNDING_GOAL_ETH");
    }
    return allocations;
  }

  const baseShare = fundingGoalWei / BigInt(config.totalStages);
  const remainder = fundingGoalWei % BigInt(config.totalStages);

  return Array.from({ length: config.totalStages }, (_, index) =>
    index < Number(remainder) ? baseShare + 1n : baseShare
  );
}

async function main() {
  const config = resolveConfig();

  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();

  console.log(`\nNetwork: ${network.name}`);
  console.log(`Deployer: ${deployerAddress}`);

  const fundingGoalWei = ethers.parseEther(config.fundingGoalEth);
  const stageAllocations = normalizeAllocations(config, fundingGoalWei);

  const currentTs = Math.floor(Date.now() / 1000);
  const deadline = BigInt(currentTs + config.deadlineDays * 24 * 60 * 60);

  console.log("---------------- Deployment Parameters ----------------");
  console.log(`Funding goal (ETH): ${config.fundingGoalEth}`);
  console.log(`Total stages: ${config.totalStages}`);
  console.log(
    `Stage allocations (ETH): ${stageAllocations.map((value) => ethers.formatEther(value)).join(", ")}`
  );
  console.log(`Funding deadline (unix): ${deadline}`);
  console.log(`Voting period (seconds): ${config.votingPeriodSeconds}`);
  console.log(`Quorum (basis points): ${config.quorumBasisPoints}`);
  console.log("-------------------------------------------------------\n");

  const FundingEscrow = await ethers.getContractFactory("FundingEscrow");
  const fundingEscrow = await FundingEscrow.deploy(
    deployerAddress,
    fundingGoalWei,
    deadline,
    config.totalStages,
    stageAllocations
  );
  await fundingEscrow.waitForDeployment();

  console.log(`FundingEscrow deployed at: ${fundingEscrow.target}`);

  const MilestoneGovernance = await ethers.getContractFactory("MilestoneGovernance");
  const milestoneGovernance = await MilestoneGovernance.deploy(
    fundingEscrow.target,
    config.votingPeriodSeconds,
    config.quorumBasisPoints
  );
  await milestoneGovernance.waitForDeployment();

  console.log(`MilestoneGovernance deployed at: ${milestoneGovernance.target}`);

  const governanceTx = await fundingEscrow.setGovernance(milestoneGovernance.target);
  await governanceTx.wait();

  console.log("Governance contract linked to FundingEscrow");

  console.log("Deployment complete. Consider pinning metadata/evidence URIs via IPFS before opening proposals.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
