# Milestone-Based Decentralized Funding Platform

A decentralized crowdfunding platform that uses blockchain smart contracts to enforce accountability through milestone-based fund releases. Built with Solidity, Hardhat, and designed for deployment on Ethereum Sepolia testnet.

## ?? Core Concept

This platform addresses a key weakness of traditional crowdfunding?the risk of project failure after receiving all funds?by implementing:

- **Smart Contract Escrow**: Funds are held in escrow until milestones are verified
- **All-or-Nothing Funding**: Funds are only accessible if the total funding goal is met
- **DAO-Based Verification**: Governance token holders vote on milestone completion
- **Automatic Fund Release**: Smart contracts automatically release funds upon successful verification
- **Transparent Tracking**: All transactions and votes are recorded on-chain

## ??? Architecture

### Smart Contracts

1. **FundingEscrow.sol**: Manages fund deposits, milestone-based releases, and refunds
2. **MilestoneGovernance.sol**: DAO system for voting on milestone completion
3. **GovernanceToken.sol**: ERC20 token for governance voting rights

### Key Features

- ? Milestone-specific fund allocation
- ? Decentralized voting mechanism
- ? Token staking for voting rights
- ? Automatic refunds if funding goal not met
- ? Reentrancy protection
- ? Comprehensive event logging

## ?? Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- MetaMask or another Ethereum wallet
- Sepolia ETH for deployment (get from [faucet](https://sepoliafaucet.com/))

## ?? Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Update `.env` with:
- `SEPOLIA_RPC_URL`: Your Sepolia RPC endpoint
- `PRIVATE_KEY`: Your deployer wallet private key
- `ETHERSCAN_API_KEY`: Your Etherscan API key (for verification)

### 3. Compile Contracts

```bash
npm run compile
```

### 4. Run Tests

```bash
npm run test
```

### 5. Deploy to Sepolia

```bash
npm run deploy:sepolia
```

## ?? Project Structure

```
.
??? contracts/              # Solidity smart contracts
?   ??? FundingEscrow.sol
?   ??? MilestoneGovernance.sol
?   ??? GovernanceToken.sol
??? scripts/               # Deployment and interaction scripts
?   ??? deploy.js
?   ??? interact.js
??? test/                  # Hardhat tests
?   ??? FundingEscrow.test.js
?   ??? MilestoneGovernance.test.js
?   ??? GovernanceToken.test.js
??? hardhat.config.js      # Hardhat configuration
??? package.json           # Dependencies
```

## ?? Usage

### Creating a Project

1. Deploy the contracts using `deploy.js`
2. Update the project owner address in the deployment script
3. Configure milestone allocations (must sum to funding goal)

### Donating to a Project

```javascript
await fundingEscrow.donate({ value: ethers.parseEther("10") });
```

### Creating a Milestone Proposal

```javascript
await milestoneGovernance.createMilestoneProposal(
  0, // stage index
  "QmHash123..." // IPFS evidence hash
);
```

### Voting on a Milestone

1. Stake governance tokens:
```javascript
await governanceToken.approve(milestoneGovernanceAddress, amount);
await milestoneGovernance.stakeTokens(amount);
```

2. Vote:
```javascript
await milestoneGovernance.vote(proposalId, true); // true = approve
```

3. Execute after voting deadline:
```javascript
await milestoneGovernance.checkVoteResult(proposalId);
```

## ?? Testing

Run all tests:
```bash
npm run test
```

Run specific test file:
```bash
npx hardhat test test/FundingEscrow.test.js
```

## ?? Security Features

- ReentrancyGuard protection on all external calls
- Access control with OpenZeppelin's Ownable
- Input validation on all functions
- Safe math operations (Solidity 0.8.20)
- Quorum requirements for voting

## ?? Smart Contract Details

### FundingEscrow

**Key Functions:**
- `donate()`: Contribute ETH to the project
- `releaseFunds(uint256 stageIndex)`: Release funds for a milestone (governance only)
- `refund()`: Refund donors if goal not met or project failed
- `markProjectAsFailed()`: Mark project as failed (governance only)

**Events:**
- `FundsDonated`: Emitted when a donation is made
- `FundsReleased`: Emitted when milestone funds are released
- `RefundIssued`: Emitted when a refund is processed

### MilestoneGovernance

**Key Functions:**
- `createMilestoneProposal(uint256 stageIndex, string evidenceHash)`: Create a new proposal
- `vote(uint256 proposalId, bool inFavor)`: Vote on a proposal
- `checkVoteResult(uint256 proposalId)`: Execute proposal if passed
- `stakeTokens(uint256 amount)`: Stake tokens for voting rights
- `unstakeTokens(uint256 amount)`: Unstake tokens

**Voting Requirements:**
- Minimum stake required to vote
- 30% quorum threshold
- Majority vote (>50%) for approval

## ?? Deployment

### Local Network

```bash
npx hardhat node
# In another terminal:
npx hardhat run scripts/deploy.js --network localhost
```

### Sepolia Testnet

```bash
npm run deploy:sepolia
```

## ?? Future Enhancements

- [ ] IPFS integration for evidence storage
- [ ] Gas fee abstraction for voters
- [ ] Kleros integration for dispute resolution
- [ ] Reputation system for voters
- [ ] Multi-token support (ERC20 donations)
- [ ] Frontend React/Vue application
- [ ] The Graph indexing for off-chain queries
- [ ] Batch operations for efficiency

## ?? License

MIT

## ?? Contributing

Contributions are welcome! Please ensure all tests pass before submitting a pull request.

## ?? Disclaimer

This is experimental software. Use at your own risk. Always audit smart contracts before deploying to mainnet.
