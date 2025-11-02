// Contract ABIs (simplified versions for indexing)
export const FUNDING_ESCROW_ABI = [
  "event FundsDonated(address indexed donor, uint256 amount, uint256 totalRaised)",
  "event FundsReleased(uint256 indexed stage, uint256 amount)",
  "event RefundIssued(address indexed donor, uint256 amount)",
  "event FundingGoalMet(uint256 totalRaised)",
  "function fundsRaised() external view returns (uint256)",
  "function fundingGoal() external view returns (uint256)",
]

export const MILESTONE_GOVERNANCE_ABI = [
  "event ProposalCreated(uint256 indexed proposalId, uint256 indexed stageIndex, address indexed proposer, string evidenceHash, uint256 votingDeadline)",
  "event VoteCast(uint256 indexed proposalId, address indexed voter, bool inFavor, uint256 weight)",
  "event ProposalExecuted(uint256 indexed proposalId, bool passed)",
  "function proposalCount() external view returns (uint256)",
  "function getProposal(uint256) external view returns (uint256 stageIndex, string memory evidenceHash, address proposer, uint256 votingDeadline, uint256 votesFor, uint256 votesAgainst, bool executed, bool passed)",
]
