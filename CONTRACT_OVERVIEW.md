# Smart Contract Overview

## Contract Interactions Flow

```
1. Deployment Flow:
   GovernanceToken ? FundingEscrow ? MilestoneGovernance
   (Link contracts together)

2. Funding Flow:
   Donor ? FundingEscrow.donate() ? Funds Escrowed
   (Once goal met ? fundingGoalMet = true)

3. Milestone Verification Flow:
   ProjectOwner ? MilestoneGovernance.createMilestoneProposal()
   ?
   Voters ? MilestoneGovernance.vote() (must stake tokens first)
   ?
   Anyone ? MilestoneGovernance.checkVoteResult()
   ?
   If passed ? FundingEscrow.releaseFunds() (called automatically)
```

## FundingEscrow Contract

### State Variables
- `projectOwner`: Address of project creator
- `fundingGoal`: Total ETH needed (wei)
- `deadline`: Unix timestamp when funding ends
- `totalStages`: Number of milestones
- `currentStage`: Current milestone index (0-based)
- `fundsRaised`: Total ETH donated
- `fundingGoalMet`: Boolean flag when goal reached
- `fundsAllocatedPerStage`: Mapping of stage ? allocation
- `stageFundsReleased`: Mapping of stage ? release status

### Critical Functions

**donate()**
- Accepts ETH donations
- Tracks donors
- Emits `FundsDonated` event
- Sets `fundingGoalMet` when goal reached

**releaseFunds(uint256 stageIndex)**
- Only callable by governance contract
- Releases funds for specific milestone
- Increments `currentStage`
- Transfers ETH to `projectOwner`

**refund()**
- Refunds all donors if:
  - Deadline passed AND goal not met, OR
  - Project marked as failed
- Iterates through all donors

### Security Features
- ReentrancyGuard on external calls
- Only governance can release funds
- Sequential stage release enforcement
- Goal must be met before any release

## MilestoneGovernance Contract

### State Variables
- `governanceToken`: ERC20 token address
- `escrowContract`: FundingEscrow address
- `proposals`: Mapping of proposalId ? Proposal struct
- `hasVoted`: Mapping of (proposalId, voter) ? voted status
- `stakedTokens`: Mapping of voter ? staked amount
- `votingPeriod`: Duration in seconds
- `minimumStake`: Minimum tokens to vote

### Proposal Structure
```solidity
struct Proposal {
    uint256 stageIndex;           // Which milestone
    string evidenceHash;          // IPFS hash/link
    address proposer;             // Project owner
    uint256 votingDeadline;       // Unix timestamp
    uint256 votesFor;             // Weighted votes for
    uint256 votesAgainst;         // Weighted votes against
    bool executed;                // Has been executed
    bool passed;                  // Did it pass?
}
```

### Critical Functions

**createMilestoneProposal(uint256 stageIndex, string evidenceHash)**
- Only project owner can call
- Creates new proposal with voting deadline
- Emits `ProposalCreated` event

**vote(uint256 proposalId, bool inFavor)**
- Requires staked tokens >= minimumStake
- Cannot vote twice
- Voting power = staked token amount
- Weighted voting (more tokens = more weight)

**checkVoteResult(uint256 proposalId)**
- Can be called after voting deadline
- Checks:
  - votesFor > votesAgainst (majority)
  - Total votes >= 30% of total token supply (quorum)
- If passed, calls `escrowContract.releaseFunds()`
- Sets proposal as executed

**stakeTokens(uint256 amount)**
- Transfers tokens from user to contract
- Increases user's staked balance
- Required before voting

**unstakeTokens(uint256 amount)**
- Decreases user's staked balance
- Transfers tokens back to user

### Voting Rules
- Minimum stake required: 10 tokens (configurable)
- Quorum: 30% of total token supply must vote
- Majority: votesFor > votesAgainst
- Voting period: 7 days (configurable)

## GovernanceToken Contract

### Purpose
ERC20 token used for:
- Voting rights (via staking)
- Governance participation
- Potential future airdrops to donors

### Key Features
- Standard ERC20 functionality
- Mintable by authorized addresses
- Batch minting support
- Owner-controlled minter authorization

### Minting Flow
1. Owner adds minter: `addMinter(address)`
2. Minter mints tokens: `mint(to, amount)`
3. Tokens distributed to donors/voters

## Security Considerations

### Access Control
- FundingEscrow: Owner sets governance, governance releases funds
- MilestoneGovernance: Owner sets escrow, project owner creates proposals
- GovernanceToken: Owner controls minters

### Reentrancy Protection
- All external calls protected with ReentrancyGuard
- Checks-effects-interactions pattern followed

### Input Validation
- Zero address checks
- Amount > 0 checks
- Array length validation
- Deadline validation

### Economic Security
- All-or-nothing funding model
- Sequential milestone releases
- Quorum requirements prevent low-participation attacks
- Staking requirement aligns voter incentives

## Gas Optimization Notes

- Donor array stored on-chain (consider pagination for large projects)
- Proposal struct optimized for minimal storage
- Events used instead of return values where possible
- Batch operations available for token minting

## Known Limitations

1. **Donor Array**: Unbounded array could hit gas limits for very large projects
   - Solution: Implement pagination or off-chain tracking

2. **Voting Deadline**: Uses block.timestamp (miner manipulable)
   - Acceptable for testnet/mainnet with reasonable voting periods

3. **Evidence Storage**: Evidence hash stored as string (gas cost)
   - Solution: Use IPFS/Arweave, store hash in bytes32

4. **No Slashing**: Voters don't face penalties for bad votes
   - Future: Implement reputation/slashing mechanism

5. **Single Currency**: Only ETH supported
   - Future: Add ERC20 token support
