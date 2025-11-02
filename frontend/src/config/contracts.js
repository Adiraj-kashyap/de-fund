// Contract ABIs and addresses
// These will be imported from the Hardhat artifacts in production

export const FUNDING_ESCROW_ABI = [
  "function donate() external payable",
  "function releaseFunds(uint256 _stageIndex) external",
  "function refund() external",
  "function markProjectAsFailed() external",
  "function projectOwner() external view returns (address)",
  "function fundingGoal() external view returns (uint256)",
  "function deadline() external view returns (uint256)",
  "function totalStages() external view returns (uint256)",
  "function currentStage() external view returns (uint256)",
  "function fundsRaised() external view returns (uint256)",
  "function fundingGoalMet() external view returns (bool)",
  "function projectFailed() external view returns (bool)",
  "function fundsAllocatedPerStage(uint256) external view returns (uint256)",
  "function stageFundsReleased(uint256) external view returns (bool)",
  "function donations(address) external view returns (uint256)",
  "function getFundingProgress() external view returns (uint256)",
  "function getAllDonors() external view returns (address[])",
  "event FundsDonated(address indexed donor, uint256 amount, uint256 totalRaised)",
  "event FundsReleased(uint256 indexed stage, uint256 amount)",
  "event RefundIssued(address indexed donor, uint256 amount)",
  "event FundingGoalMet(uint256 totalRaised)",
]

export const MILESTONE_GOVERNANCE_ABI = [
  "function createMilestoneProposal(uint256 _stageIndex, string memory _evidenceHash) external returns (uint256)",
  "function vote(uint256 _proposalId, bool _inFavor) external",
  "function checkVoteResult(uint256 _proposalId) external",
  "function stakeTokens(uint256 _amount) external",
  "function unstakeTokens(uint256 _amount) external",
  "function proposals(uint256) external view returns (uint256 stageIndex, string memory evidenceHash, address proposer, uint256 votingDeadline, uint256 votesFor, uint256 votesAgainst, bool executed, bool passed)",
  "function stakedTokens(address) external view returns (uint256)",
  "function minimumStake() external view returns (uint256)",
  "function proposalCount() external view returns (uint256)",
  "function getProposal(uint256) external view returns (uint256 stageIndex, string memory evidenceHash, address proposer, uint256 votingDeadline, uint256 votesFor, uint256 votesAgainst, bool executed, bool passed)",
  "event ProposalCreated(uint256 indexed proposalId, uint256 indexed stageIndex, address indexed proposer, string evidenceHash, uint256 votingDeadline)",
  "event VoteCast(uint256 indexed proposalId, address indexed voter, bool inFavor, uint256 weight)",
  "event ProposalExecuted(uint256 indexed proposalId, bool passed)",
]

export const GOVERNANCE_TOKEN_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)",
  "function totalSupply() external view returns (uint256)",
  "function allowance(address owner, address spender) external view returns (uint256)",
]

// Contract addresses - update these after deployment
const contractAddresses = import.meta.env.VITE_CONTRACT_ADDRESSES
  ? JSON.parse(import.meta.env.VITE_CONTRACT_ADDRESSES)
  : {}

export const CONTRACT_ADDRESSES = {
  FundingEscrow: contractAddresses.FundingEscrow || '',
  MilestoneGovernance: contractAddresses.MilestoneGovernance || '',
  GovernanceToken: contractAddresses.GovernanceToken || '',
}
