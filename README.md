# ?? Milestone-Based Decentralized Funding Platform

A blockchain-based crowdfunding platform that releases funds in stages based on verified milestone completion, powered by smart contracts and DAO governance.

## ?? Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Smart Contracts](#smart-contracts)
- [Installation](#installation)
- [Testing](#testing)
- [Deployment](#deployment)
- [Usage](#usage)
- [Security Considerations](#security-considerations)
- [Future Enhancements](#future-enhancements)

## ?? Overview

This platform addresses a core weakness of traditional crowdfunding: the risk of project failure after funds are released. By implementing milestone-based fund release with decentralized verification, we ensure accountability and protect donor interests.

### Core Mechanism

1. **Project Creation**: Fundraiser creates a project with specific milestones (3-7 stages)
2. **Funding Phase**: Donors contribute crypto to a smart contract escrow
3. **Milestone Verification**: After each milestone, DAO votes on completion
4. **Fund Release**: Upon approval, funds for that stage are released automatically
5. **Refund Protection**: If funding goal isn't met, all funds are automatically refunded

## ? Key Features

### For Fundraisers
- ? Create projects with custom milestone stages (3-7 stages)
- ? Define funding goals and duration
- ? Allocate percentage of funds per milestone
- ? Submit evidence of milestone completion (IPFS hash)
- ? Receive funds automatically upon DAO approval

### For Donors
- ? Contribute to projects with confidence
- ? All-or-nothing funding model (refund if goal not met)
- ? Full transparency of fund usage
- ? Become a governance voter by staking
- ? Vote on milestone completion

### Platform Features
- ? **Smart Contract Escrow**: Funds held securely on-chain
- ? **DAO Governance**: Decentralized milestone verification
- ? **Stake-Weighted Voting**: Voting power based on stake + reputation
- ? **Automatic Execution**: Trustless fund release
- ? **Refund Mechanism**: Automatic refunds for failed projects
- ? **Full Transparency**: All transactions on-chain and auditable

## ??? Architecture

### Smart Contract Structure

```
???????????????????????????????????????????????
?          FundingEscrow.sol                  ?
?  - Holds donated funds in escrow            ?
?  - Manages donation tracking                ?
?  - Releases funds per milestone             ?
?  - Handles refunds                          ?
???????????????????????????????????????????????
                   ?
                   ? calls releaseFunds()
                   ?
???????????????????????????????????????????????
?       MilestoneGovernance.sol               ?
?  - Manages voter registration               ?
?  - Creates milestone proposals              ?
?  - Conducts voting                          ?
?  - Executes proposal results                ?
???????????????????????????????????????????????
```

## ?? Smart Contracts

### FundingEscrow.sol

Core escrow contract that manages funds.

**Key Functions:**
- `donate()`: Accept contributions from donors
- `releaseFunds(stageIndex)`: Release funds for completed milestone (governance only)
- `refund()`: Return funds to donors if project fails
- `cancelProject()`: Cancel project and enable refunds (governance only)
- `getProjectStatus()`: Get current project information

**Key Features:**
- Basis point allocation (1 basis point = 0.01%)
- Sequential milestone completion enforcement
- Reentrancy protection
- Emergency refund mechanism

### MilestoneGovernance.sol

DAO governance contract for milestone verification.

**Key Functions:**
- `registerVoter()`: Stake ETH to become a voter
- `createMilestoneProposal()`: Submit milestone for verification
- `vote(proposalId, inFavor)`: Vote on milestone proposals
- `executeProposal()`: Execute voting results and trigger fund release
- `withdrawStake()`: Withdraw stake after voting completion

**Key Features:**
- Stake-weighted voting (stake + reputation)
- 7-day voting period
- 51% quorum requirement
- Reputation system for voters
- IPFS evidence hash storage

## ??? Installation

### Prerequisites

- Node.js v18+ and npm
- Git

### Setup

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd milestone-funding-platform
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env
```

Edit `.env` and add:
- `SEPOLIA_RPC_URL`: Your Alchemy/Infura Sepolia RPC URL
- `PRIVATE_KEY`: Your wallet private key (for deployment)
- `ETHERSCAN_API_KEY`: Your Etherscan API key (for verification)

## ?? Testing

Run the comprehensive test suite:

```bash
# Run all tests
npm test

# Run with gas reporting
REPORT_GAS=true npm test

# Run with coverage
npx hardhat coverage
```

### Test Coverage

The test suite includes:
- ? Contract deployment validation
- ? Donation and refund mechanics
- ? Milestone fund release
- ? DAO voting mechanism
- ? Stake management
- ? Security (reentrancy, access control)
- ? Edge cases and error conditions

## ?? Deployment

### Local Development

1. **Start local Hardhat node**
```bash
npm run node
```

2. **Deploy to local network** (in another terminal)
```bash
npx hardhat run scripts/deploy.js --network localhost
```

### Sepolia Testnet

1. **Ensure you have Sepolia ETH**
   - Get testnet ETH from [Sepolia Faucet](https://sepoliafaucet.com/)

2. **Deploy contracts**
```bash
npm run deploy:sepolia
```

3. **Verify contracts on Etherscan**
```bash
npx hardhat verify --network sepolia <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>
```

The deployment script will:
- Deploy MilestoneGovernance contract
- Deploy FundingEscrow contract
- Link the contracts together
- Save deployment info to `deployments/` folder
- Display verification commands

### Deployment Configuration

Edit `scripts/deploy.js` to customize:
- `projectOwner`: Address of the project owner
- `fundingGoal`: Target funding amount (in ETH)
- `fundingDuration`: Funding period (in seconds)
- `totalStages`: Number of milestone stages (3-7)
- `stageAllocations`: Percentage allocation per stage (basis points, must sum to 10000)

## ?? Usage

### Interact with Deployed Contracts

Use the interaction script to check contract status:

```bash
npx hardhat run scripts/interact.js --network sepolia <ESCROW_ADDRESS> <GOVERNANCE_ADDRESS>
```

This displays:
- Current funding status and progress
- Donor information
- Governance voting power
- Active proposals
- Your participation status

### Example Workflow

#### 1. As a Project Owner

```javascript
// Create milestone proposal after completing stage
const tx = await governance.createMilestoneProposal(
  escrowAddress,
  0, // stage index
  "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG" // IPFS hash of evidence
);
```

#### 2. As a Donor

```javascript
// Donate to project
const tx = await escrow.donate({ value: ethers.parseEther("1.0") });

// Register as voter
const tx = await governance.registerVoter({ value: ethers.parseEther("0.1") });

// Vote on milestone
const tx = await governance.vote(proposalId, true); // true = approve
```

#### 3. Execute Proposal (Anyone)

```javascript
// After voting period ends, execute the result
const tx = await governance.executeProposal(proposalId);
```

## ?? Security Considerations

### Implemented Security Features

1. **Reentrancy Protection**: Uses OpenZeppelin's ReentrancyGuard
2. **Access Control**: Only authorized addresses can call sensitive functions
3. **Sequential Milestone Enforcement**: Stages must be completed in order
4. **Overflow Protection**: Solidity 0.8.x built-in overflow checks
5. **All-or-Nothing Funding**: Refund protection if goal not met
6. **Stake-Weighted Voting**: Economic incentives for honest voting

### Best Practices

- ? Never store private keys in code
- ? Use hardware wallets for mainnet deployments
- ? Audit contracts before mainnet launch
- ? Start with testnet deployments
- ? Test refund mechanisms thoroughly
- ? Monitor contract events for anomalies

### Known Limitations

- Quorum calculation based on total staked ETH (consider for low participation)
- Evidence stored as IPFS hash (requires external IPFS node)
- Gas costs for voting can be high during network congestion
- No slashing mechanism for malicious voters (future enhancement)

## ?? Future Enhancements

### Phase 2: Advanced Features

- [ ] **Governance Token (ERC20)**: Replace ETH staking with custom token
- [ ] **Reputation System**: Reward/penalize voters based on decision outcomes
- [ ] **Dispute Resolution**: Integrate Kleros for contentious votes
- [ ] **Multi-Token Support**: Accept USDC, DAI, etc.
- [ ] **Gas Fee Abstraction**: Meta-transactions for gasless voting
- [ ] **NFT Badges**: Issue NFTs to donors and successful project owners
- [ ] **Partial Refunds**: Return remaining funds if project partially completes

### Phase 3: Frontend & Integration

- [ ] **React Frontend**: Modern UI for project creation and voting
- [ ] **The Graph Integration**: Index events for fast querying
- [ ] **SQL Database**: Store off-chain data (descriptions, images)
- [ ] **IPFS/Arweave Integration**: Decentralized evidence storage
- [ ] **Mobile Wallet Support**: WalletConnect integration
- [ ] **Email Notifications**: Alert voters of new proposals

### Phase 4: Advanced Governance

- [ ] **Quadratic Voting**: Reduce whale influence
- [ ] **Delegate Voting**: Allow vote delegation
- [ ] **Time-Locked Funds**: Optional vesting schedules
- [ ] **Multi-Sig Integration**: Require multiple approvals for large releases
- [ ] **On-Chain Analytics**: Project success metrics

## ?? Project Structure

```
milestone-funding-platform/
??? contracts/
?   ??? FundingEscrow.sol        # Escrow contract
?   ??? MilestoneGovernance.sol  # DAO governance
??? test/
?   ??? FundingEscrow.test.js    # Escrow tests
?   ??? MilestoneGovernance.test.js # Governance tests
??? scripts/
?   ??? deploy.js                # Deployment script
?   ??? interact.js              # Interaction script
??? deployments/                 # Deployment records
??? hardhat.config.js            # Hardhat configuration
??? package.json                 # Dependencies
??? README.md                    # This file
```

## ?? Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## ?? License

This project is licensed under the MIT License.

## ?? Resources

- [Hardhat Documentation](https://hardhat.org/docs)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts)
- [Ethers.js Documentation](https://docs.ethers.org/)
- [Solidity Documentation](https://docs.soliditylang.org/)
- [IPFS Documentation](https://docs.ipfs.tech/)

## ?? Support

For questions or issues:
- Open an issue on GitHub
- Contact the development team

---

**Built with ?? for transparent and accountable crowdfunding**
