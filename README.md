# Milestone-Based Decentralized Funding Platform

A complete decentralized crowdfunding platform that uses blockchain smart contracts to enforce accountability through milestone-based fund releases verified by DAO governance.

## ?? Overview

This platform addresses a key weakness of traditional crowdfunding?the risk of project failure after receiving all funds?by implementing:

- **Smart Contract Escrow**: Funds held securely until milestones are verified
- **All-or-Nothing Funding**: Funds only accessible if total goal is met
- **DAO-Based Verification**: Governance token holders vote on milestone completion
- **Automatic Fund Release**: Smart contracts release funds upon successful verification
- **Transparent Tracking**: All transactions and votes recorded on-chain

## ??? Architecture

### Smart Contracts (`/contracts`)
- **FundingEscrow.sol**: Manages fund deposits, milestone-based releases, and refunds
- **MilestoneGovernance.sol**: DAO system for voting on milestone completion
- **GovernanceToken.sol**: ERC20 token for governance voting rights

### Frontend (`/frontend`)
- React 18 with Vite
- Wagmi v2 for Ethereum interactions
- RainbowKit for wallet connections
- Tailwind CSS for styling
- Complete UI for all platform features

### Backend (`/backend`)
- Express.js REST API
- SQLite database for off-chain data
- Blockchain event indexer
- IPFS integration for evidence storage

## ?? Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- MetaMask or another Ethereum wallet
- Sepolia ETH for deployment (get from [faucet](https://sepoliafaucet.com/))

### 1. Smart Contracts Setup

```bash
# Install dependencies
npm install

# Compile contracts
npm run compile

# Run tests
npm run test

# Deploy to Sepolia (update .env first)
npm run deploy:sepolia
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env
# Update .env with contract addresses and RPC URL

# Start backend server
npm start

# In another terminal, run the indexer
npm run index
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create .env file
cp .env.example .env
# Update .env with contract addresses and API URL

# Start development server
npm run dev
```

## ?? Project Structure

```
.
??? contracts/              # Solidity smart contracts
?   ??? FundingEscrow.sol
?   ??? MilestoneGovernance.sol
?   ??? GovernanceToken.sol
??? scripts/               # Deployment scripts
?   ??? deploy.js
?   ??? interact.js
??? test/                  # Hardhat tests
?   ??? FundingEscrow.test.js
?   ??? MilestoneGovernance.test.js
?   ??? GovernanceToken.test.js
??? backend/               # Node.js backend
?   ??? routes/           # API routes
?   ??? db/               # Database setup
?   ??? scripts/          # Indexer script
?   ??? server.js         # Express server
??? frontend/             # React frontend
    ??? src/
    ?   ??? components/  # React components
    ?   ??? pages/        # Page components
    ?   ??? config/       # Configuration
    ??? vite.config.js
```

## ?? Configuration

### Smart Contracts (.env)
```env
SEPOLIA_RPC_URL=https://rpc.sepolia.org
PRIVATE_KEY=your_private_key_here
ETHERSCAN_API_KEY=your_etherscan_api_key_here
```

### Backend (.env)
```env
PORT=5000
RPC_URL=https://rpc.sepolia.org
DATABASE_PATH=./data/database.db
CONTRACT_ADDRESSES={"FundingEscrow":"0x...","MilestoneGovernance":"0x...","GovernanceToken":"0x..."}
IPFS_API_URL=http://localhost:5001
CORS_ORIGIN=http://localhost:3000
```

### Frontend (.env)
```env
VITE_RPC_URL=https://rpc.sepolia.org
VITE_CONTRACT_ADDRESSES={"FundingEscrow":"0x...","MilestoneGovernance":"0x...","GovernanceToken":"0x..."}
VITE_API_URL=http://localhost:5000
VITE_IPFS_GATEWAY=https://ipfs.io/ipfs/
```

## ?? Usage Guide

### For Project Creators

1. **Create a Project**
   - Connect your wallet
   - Go to "Create Project"
   - Fill in project details, funding goal, deadline, and milestone allocations
   - Deploy the smart contract (or use factory pattern)

2. **Submit Milestone Completion**
   - Navigate to your project
   - Click "Submit Milestone Completion" for the current milestone
   - Upload evidence (photos, documents) to IPFS
   - Create a proposal with the IPFS hash

3. **Receive Funds**
   - Once the proposal passes voting, funds are automatically released

### For Donors/Voters

1. **Donate to Projects**
   - Browse projects on the homepage
   - Click on a project to view details
   - Enter donation amount and click "Donate"

2. **Participate in Governance**
   - Stake governance tokens (minimum required)
   - View active proposals
   - Review evidence and vote on milestone completion
   - Execute proposals after voting deadline

## ?? Testing

### Smart Contracts
```bash
npm run test
```

All 42 tests should pass, covering:
- Contract deployment
- Donations and fund management
- Milestone verification and voting
- Token staking and governance
- Refund mechanisms

## ?? Security Features

- **Reentrancy Protection**: All external calls protected
- **Access Control**: Owner and governance-only functions
- **Input Validation**: Comprehensive checks on all inputs
- **Safe Math**: Solidity 0.8.20 built-in overflow protection
- **Quorum Requirements**: Prevents low-participation attacks

## ?? Deployment

### Smart Contracts to Sepolia

1. Update `hardhat.config.js` with your network settings
2. Add private key to `.env`
3. Run: `npm run deploy:sepolia`
4. Save contract addresses to backend and frontend `.env` files

### Backend Deployment

- Deploy to any Node.js hosting (Heroku, Railway, DigitalOcean)
- Set environment variables
- Run indexer as a cron job or background service

### Frontend Deployment

- Build: `npm run build`
- Deploy `dist/` folder to Vercel, Netlify, or any static hosting
- Update environment variables

## ?? Documentation

- [Smart Contract Overview](./CONTRACT_OVERVIEW.md) - Detailed contract documentation
- [Frontend README](./frontend/README.md) - Frontend setup and usage
- [Backend README](./backend/README.md) - Backend API documentation

## ?? Future Enhancements

- [ ] Contract factory for easy project creation
- [ ] Gas fee abstraction for voters
- [ ] Kleros integration for dispute resolution
- [ ] Reputation system for voters
- [ ] Multi-token support (ERC20 donations)
- [ ] The Graph subgraph for advanced queries
- [ ] Mobile app support
- [ ] Email notifications
- [ ] Social features (comments, shares)

## ?? Contributing

Contributions are welcome! Please ensure all tests pass before submitting PRs.

## ?? License

MIT

## ?? Disclaimer

This is experimental software. Use at your own risk. Always audit smart contracts before deploying to mainnet.

## ?? Acknowledgments

Built with:
- Hardhat
- React & Vite
- Wagmi & RainbowKit
- Express.js
- SQLite
- IPFS
