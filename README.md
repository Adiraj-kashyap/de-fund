# De-Fund

A decentralized milestone-based funding platform with DAO governance. Built on Ethereum, enabling transparent crowdfunding where funds are released through community-verified milestones.

## Overview

De-Fund combines smart contract escrow with decentralized governance to create a trustless funding platform. Projects receive funds incrementally as milestones are completed and verified through community voting, ensuring accountability and transparency.

### Key Features

- **Milestone-Based Escrow**: Funds locked in smart contracts, released upon milestone completion
- **DAO Governance**: Community voting on milestone verification and fund release
- **Voter Staking**: Stake-based voting mechanism for governance participation
- **IPFS Integration**: Decentralized storage for project metadata and evidence
- **Refund Protection**: Automatic refunds if funding goals aren't met

## Architecture

### Components

1. **Blockchain** (`blockchain/`) - Smart contracts on Hardhat
   - `FundingEscrow.sol`: Manages fund escrow and milestone-based releases
   - `MilestoneGovernance.sol`: DAO voting for milestone verification

2. **Backend** (`backend/`) - Express.js REST API
   - Project management and metadata storage
   - IPFS file upload and retrieval
   - SQLite database for off-chain data

3. **Frontend** (`frontend/`) - React + TypeScript
   - Web3 wallet integration (MetaMask, WalletConnect)
   - Project browsing and creation interface
   - Governance voting interface
   - Real-time transaction tracking

4. **Subgraph** (`subgraph/`) - The Graph Protocol
   - Indexes blockchain events for efficient querying

## Quick Start

### Prerequisites

- Node.js 18+
- MetaMask or compatible Web3 wallet
- Hardhat (for local blockchain)

### Installation

```bash
# Install dependencies for each component
cd blockchain && npm install
cd ../backend && npm install
cd ../frontend && npm install
```

### Local Development

1. **Start local blockchain**:
```bash
cd blockchain
npm run node
```

2. **Deploy contracts** (in a new terminal):
```bash
cd blockchain
npm run compile
npx hardhat run scripts/deploy.js --network localhost
```

3. **Start backend**:
```bash
cd backend
npm run dev
# Runs on http://localhost:3001
```

4. **Start frontend**:
```bash
cd frontend
npm run dev
# Runs on http://localhost:5173
```

### Configuration

Copy environment files and configure:

- **Frontend**: `frontend/.env` - Set contract addresses and network config
- **Backend**: `backend/.env` - Configure database and IPFS settings
- **Blockchain**: `blockchain/.env` - Set deployment keys and RPC URLs

## Project Structure

```
de-fund/
├── blockchain/          # Smart contracts (Hardhat)
│   ├── contracts/      # Solidity contracts
│   ├── scripts/        # Deployment scripts
│   └── test/           # Contract tests
├── backend/            # Express API
│   ├── src/
│   │   ├── routes/     # API endpoints
│   │   └── db/         # Database schema
│   └── database.sqlite # SQLite database
├── frontend/           # React application
│   └── src/
│       ├── components/ # UI components
│       ├── pages/      # Page routes
│       ├── hooks/      # Custom React hooks
│       └── contracts/  # Contract ABIs
└── subgraph/           # The Graph subgraph
```

## How It Works

1. **Project Creation**: Project owner deploys escrow contract with funding goal, deadline, and milestone allocations
2. **Funding Phase**: Contributors donate ETH to the escrow contract until goal is reached
3. **Milestone Verification**: Project owner submits milestone completion with IPFS evidence
4. **Governance Voting**: Staked voters review evidence and vote on milestone approval
5. **Fund Release**: Approved milestones trigger automatic fund release to project owner
6. **Refunds**: If funding goal isn't met by deadline, contributors can request refunds

## Technologies

- **Smart Contracts**: Solidity 0.8.20, OpenZeppelin
- **Frontend**: React 19, TypeScript, Wagmi, Viem, Tailwind CSS
- **Backend**: Express.js, SQLite, Ethers.js
- **Blockchain**: Hardhat, Ethereum
- **Storage**: IPFS
- **Indexing**: The Graph Protocol

## Scripts

### Blockchain
```bash
npm run compile        # Compile contracts
npm run test           # Run tests
npm run deploy:sepolia # Deploy to Sepolia
```

### Backend
```bash
npm run dev           # Development server
npm run db:migrate    # Run migrations
```

### Frontend
```bash
npm run dev           # Development server
npm run build         # Production build
npm run preview       # Preview build
```

## License

MIT

